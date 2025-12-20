<?php
header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Cache-Control: post-check=0, pre-check=0', false);
header('Pragma: no-cache');
header('Expires: Sun, 02 Jan 1990 00:00:00 GMT');

require_once __DIR__ . '/database.php';

try {
    $db = Database::getInstance();
    $conn = $db->getConnection();
    
    // Vylepšený dotaz počítající aktivní hráče pomocí gamerMap
    $sql = "SELECT 
            g.id,
            g.`group`,
            g.modify,
            (SELECT COUNT(*) 
             FROM gamerMap gm 
             WHERE gm.gameId = g.id 
             AND gm.active = 1) as player_count
            FROM dixitGame g
            WHERE g.active = 1 
            ORDER BY g.modify DESC";
    
    $result = $conn->query($sql);
    
    if (!$result) {
        throw new Exception("Database query failed: " . $conn->error);
    }
    
    $games = [];
    while ($row = $result->fetch_assoc()) {
        // Explicitně převedeme hodnoty na správné typy
        $games[] = [
            'id' => intval($row['id']),
            'group' => $row['group'],
            'player_count' => intval($row['player_count']),
            'modify' => $row['modify']
        ];
    }
    
    // Přidáme debugging informace
    $debug = [
        'query_time' => date('Y-m-d H:i:s'),
        'game_count' => count($games),
        'server_time' => time()
    ];
    
    echo json_encode([
        'success' => true,
        'games' => $games,
        'debug' => $debug
    ]);
    
} catch (Exception $e) {
    error_log("Error in get_active_games.php: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>