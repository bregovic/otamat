<?php
header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Cache-Control: post-check=0, pre-check=0', false);
header('Pragma: no-cache');
header('Expires: Sun, 02 Jan 1990 00:00:00 GMT');

require_once __DIR__ . '/database.php';
require_once __DIR__ . '/color_functions.php';

function generateUniqueHash($conn) {
    do {
        $chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        $hash = '';
        for ($i = 0; $i < 10; $i++) {
            $hash .= $chars[rand(0, strlen($chars) - 1)];
        }
        
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

function findExistingPlayer($conn, $gameId, $playerName) {
    // Normalizujeme vstupní jméno
    $normalizedInputName = mb_strtolower(trim($playerName), 'UTF-8');
    
    // Nejprve získáme řádek hry podle ID
    $sql = "SELECT * FROM dixitGame WHERE id = ? AND active = 1";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $gameId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($row = $result->fetch_assoc()) {
        // Procházíme sloupce gamer1-gamer12 a hledáme shodu
        for ($i = 1; $i <= 12; $i++) {
            $column = "gamer" . $i;
            if (mb_strtolower(trim($row[$column] ?? ''), 'UTF-8') === $normalizedInputName) {
                // Našli jsme shodu, získáme hash z gamerMap
                $sql = "SELECT gamerHash FROM gamerMap 
                       WHERE gameId = ? AND gamer = ? AND active = 1";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("is", $gameId, $column);
                $stmt->execute();
                $hashResult = $stmt->get_result();
                
                if ($hashRow = $hashResult->fetch_assoc()) {
                    return [
                        'hash' => $hashRow['gamerHash'],
                        'slot' => $column
                    ];
                }
            }
        }
    }
    
    return null;
}

function assignCardsIfNeeded($conn, $gameId, $playerName, $gamerHash) {
    $sql = "SELECT COUNT(*) as card_count 
            FROM dixitGameDetail 
            WHERE gameId = ? AND gamerHash = ? AND round IS NULL";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("is", $gameId, $gamerHash);
    $stmt->execute();
    $result = $stmt->get_result();
    $currentCards = $result->fetch_assoc()['card_count'];
    
    if ($currentCards === 0) {
        $cardsNeeded = 5;
        
        for($i = 0; $i < $cardsNeeded; $i++) {
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
                $sql = "INSERT INTO dixitGameDetail (gameId, gamer, gamerHash, card) 
                       VALUES (?, ?, ?, ?)";
                
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("issi", $gameId, $playerName, $gamerHash, $cardRow['id']);
                $stmt->execute();
            }
        }
    }
}

try {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['gameId']) || !isset($data['playerName'])) {
        throw new Exception('Missing required data');
    }
    
    $gameId = intval($data['gameId']);
    $playerName = trim($data['playerName']);
    
    $db = Database::getInstance();
    $conn = $db->getConnection();
    
    $conn->begin_transaction();
    
    try {
        $existingPlayer = findExistingPlayer($conn, $gameId, $playerName);
        
        if ($existingPlayer) {
            $conn->commit();
            echo json_encode([
                'success' => true,
                'gameId' => $gameId,
                'playerHash' => $existingPlayer['hash']
            ]);
            exit;
        }
        
        $sql = "SELECT 
                CASE
                    WHEN gamer2 IS NULL THEN 'gamer2'
                    WHEN gamer3 IS NULL THEN 'gamer3'
                    WHEN gamer4 IS NULL THEN 'gamer4'
                    WHEN gamer5 IS NULL THEN 'gamer5'
                    WHEN gamer6 IS NULL THEN 'gamer6'
                    WHEN gamer7 IS NULL THEN 'gamer7'
                    WHEN gamer8 IS NULL THEN 'gamer8'
                    WHEN gamer9 IS NULL THEN 'gamer9'
                    WHEN gamer10 IS NULL THEN 'gamer10'
                    WHEN gamer11 IS NULL THEN 'gamer11'
                    WHEN gamer12 IS NULL THEN 'gamer12'
                    ELSE NULL
                END as empty_slot
                FROM dixitGame 
                WHERE id = ? AND active = 1
                FOR UPDATE";
                
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $gameId);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        
        if (!$row || !$row['empty_slot']) {
            throw new Exception('No empty slots available');
        }
        
        $gamerSlot = $row['empty_slot'];
        $gamerHash = generateUniqueHash($conn);
        
        // Získání již použitých barev ve hře
        $usedColors = getUsedColors($conn, $gameId);
        
        // Vygenerování unikátní barvy pro hráče
        $playerColor = getRandomPlayerColor($usedColors);
        
        $currentDateTime = date('Y-m-d H:i:s');
        $colorColumnName = str_replace('gamer', 'gamercolor', $gamerSlot);
        
        $sql = "UPDATE dixitGame SET " . $gamerSlot . " = ?, " . $colorColumnName . " = ?, modify = ? WHERE id = ?";
        
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("sssi", $playerName, $playerColor, $currentDateTime, $gameId);
        
        if (!$stmt->execute()) {
            throw new Exception("Failed to update game");
        }
        
        $sql = "INSERT INTO gamerMap (gameId, gamer, gamerHash) VALUES (?, ?, ?)";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("iss", $gameId, $gamerSlot, $gamerHash);
        
        if (!$stmt->execute()) {
            throw new Exception("Failed to create gamer mapping");
        }
        
        assignCardsIfNeeded($conn, $gameId, $playerName, $gamerHash);
        
        $conn->commit();
        
        echo json_encode([
            'success' => true,
            'gameId' => $gameId,
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