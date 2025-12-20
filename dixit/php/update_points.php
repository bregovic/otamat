<?php
header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');

require_once __DIR__ . '/database.php';

/**
 * Pomocná funkce pro získání sloupce gamer podle hash
 */
function getPlayerColumnByHash($conn, $gameId, $playerHash) {
    $sql = "SELECT gamer FROM gamerMap WHERE gameId = ? AND gamerHash = ? AND active = 1";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("is", $gameId, $playerHash);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($row = $result->fetch_assoc()) {
        return $row['gamer']; // např. "gamer1"
    }
    
    return null;
}

try {
    // Přijmout data z POST požadavku
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['gameId']) || !isset($data['playerHash']) || !isset($data['points'])) {
        throw new Exception('Chybí povinná data: gameId, playerHash nebo points');
    }
    
    $gameId = intval($data['gameId']);
    $playerHash = $data['playerHash'];
    $points = intval($data['points']);
    
    // Ověřit, že body jsou kladné číslo
    if ($points < 0) {
        throw new Exception('Body nemohou být záporné');
    }
    
    $db = Database::getInstance();
    $conn = $db->getConnection();
    
    $conn->begin_transaction();
    
    try {
        // Zjistit sloupec hráče (gamer1, gamer2, ...)
        $playerColumn = getPlayerColumnByHash($conn, $gameId, $playerHash);
        
        if (!$playerColumn) {
            throw new Exception('Hráč nebyl nalezen');
        }
        
        // Vytvořit název sloupce pro body
        $pointsColumn = $playerColumn . "points"; // např. "gamer1points"
        
        // Aktualizovat body hráče
        $sql = "UPDATE dixitGame SET $pointsColumn = ? WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("ii", $points, $gameId);
        
        if (!$stmt->execute()) {
            throw new Exception('Nepodařilo se aktualizovat body: ' . $conn->error);
        }
        
        $conn->commit();
        
        echo json_encode([
            'success' => true,
            'message' => 'Body byly úspěšně aktualizovány',
            'gameId' => $gameId,
            'playerColumn' => $playerColumn,
            'points' => $points
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