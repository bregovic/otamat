<?php
header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');

require_once __DIR__ . '/database.php';
require_once __DIR__ . '/color_functions.php';

function generateUniqueHash($conn) {
    do {
        $chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        $hash = '';
        for ($i = 0; $i < 10; $i++) {
            $hash .= $chars[rand(0, strlen($chars) - 1)];
        }
        
        // Check if hash exists in either table
        $sql = "SELECT COUNT(*) as count FROM (
            SELECT gamerHash FROM gamerMap 
            UNION 
            SELECT gamerHash FROM dixitGameDetail
        ) as hashes WHERE gamerHash = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("s", $hash);
        $stmt->execute();
        $result = $stmt->get_result();
        $exists = $result->fetch_assoc()['count'] > 0;
    } while ($exists);
    
    return $hash;
}

function assignCards($conn, $gameId, $playerName, $gamerHash) {
    // Check current card count
    $sql = "SELECT COUNT(*) as card_count 
            FROM dixitGameDetail 
            WHERE gameId = ? AND gamerHash = ? AND round IS NULL";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("is", $gameId, $gamerHash);
    $stmt->execute();
    $result = $stmt->get_result();
    $currentCards = $result->fetch_assoc()['card_count'];
    
    // Calculate how many cards we need to add
    $cardsNeeded = 5 - $currentCards;
    
    // Add cards if needed
    for($i = 0; $i < $cardsNeeded; $i++) {
        // Get random card from dixitData
        $sql = "SELECT id FROM dixitData 
                WHERE id NOT IN (
                    SELECT card FROM dixitGameDetail WHERE gameId = ?
                )
                ORDER BY RAND() LIMIT 1";
        
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $gameId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if($cardRow = $result->fetch_assoc()) {
            // Insert new card for player
            $sql = "INSERT INTO dixitGameDetail (gameId, gamer, gamerHash, card) 
                   VALUES (?, ?, ?, ?)";
            
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("issi", $gameId, $playerName, $gamerHash, $cardRow['id']);
            $stmt->execute();
        }
    }
}

try {
    $rawData = file_get_contents('php://input');
    $data = json_decode($rawData, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON: ' . json_last_error_msg());
    }
    
    if (!isset($data['players']) || !is_array($data['players']) || empty($data['players'][0])) {
        throw new Exception('Invalid players data');
    }
    
    $playerName = trim($data['players'][0]);
    $groupName = isset($data['group']) ? trim($data['group']) : null;
    $timeEnabled = isset($data['timeLimit']['enabled']) ? ($data['timeLimit']['enabled'] ? 1 : 0) : 0;
    $timeValue = isset($data['timeLimit']['duration']) ? intval($data['timeLimit']['duration']) : 60;
    $currentDateTime = date('Y-m-d H:i:s');
    
    $db = Database::getInstance();
    $conn = $db->getConnection();
    
    $conn->begin_transaction();
    
    try {
        // Získání barvy pro prvního hráče
        $playerColor = getRandomPlayerColor();
        
        // Create game
        $sql = "INSERT INTO dixitGame (
            `group`, gamer1, gamercolor1, time, timeValue, active, modify
        ) VALUES (?, ?, ?, ?, ?, 1, ?)";
        
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("sssiss", 
            $groupName,
            $playerName,
            $playerColor,
            $timeEnabled,
            $timeValue,
            $currentDateTime
        );
        
        if (!$stmt->execute()) {
            throw new Exception("Failed to create game");
        }
        
        $gameId = $stmt->insert_id;
        
        // Generate hash for player
        $gamerHash = generateUniqueHash($conn);
        
        // Save to gamerMap
        $sql = "INSERT INTO gamerMap (gameId, gamer, gamerHash) VALUES (?, 'gamer1', ?)";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("is", $gameId, $gamerHash);
        
        if (!$stmt->execute()) {
            throw new Exception("Failed to create gamer mapping");
        }
        
        // Assign cards
        assignCards($conn, $gameId, $playerName, $gamerHash);
        
        $conn->commit();
        
        echo json_encode([
            'success' => true,
            'gameId' => (string)$gameId,
            'playerHash' => $gamerHash
        ]);
        
    } catch (Exception $e) {
        $conn->rollback();
        throw $e;
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>