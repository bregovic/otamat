<?php
header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');

require_once __DIR__ . '/database.php';

try {
    if (!isset($_GET['gameId'])) {
        throw new Exception('Missing gameId');
    }

    $gameId = intval($_GET['gameId']);

    $db = Database::getInstance();
    $conn = $db->getConnection();

    // Získat základní informace o hře včetně jmen, barev a bodů hráčů
    $sql = "SELECT 
        id, 
        gamer1, gamer2, gamer3, gamer4, gamer5, gamer6, gamer7, gamer8, gamer9, gamer10, gamer11, gamer12,
        gamercolor1, gamercolor2, gamercolor3, gamercolor4, gamercolor5, gamercolor6, gamercolor7, gamercolor8, gamercolor9, gamercolor10, gamercolor11, gamercolor12,
        gamer1points, gamer2points, gamer3points, gamer4points, gamer5points, gamer6points, gamer7points, gamer8points, gamer9points, gamer10points, gamer11points, gamer12points
        FROM dixitGame 
        WHERE id = ? AND active = 1";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $gameId);
    $stmt->execute();
    $result = $stmt->get_result();
    $gameData = $result->fetch_assoc();

    if (!$gameData) {
        throw new Exception('Game not found');
    }

    // Zjistit počet aktivních hráčů
    $sql = "SELECT COUNT(*) as active_players FROM gamerMap WHERE gameId = ? AND active = 1";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $gameId);
    $stmt->execute();
    $count = $stmt->get_result()->fetch_assoc();
    $activePlayersCount = $count['active_players'];

    // Sestavení dat pro odpověď
    $players = [];
    
    for ($i = 1; $i <= 12; $i++) {
        $playerName = $gameData["gamer$i"];
        $playerColor = $gameData["gamercolor$i"];
        $playerPoints = $gameData["gamer{$i}points"] ?? 0;
        
        if (!empty($playerName)) {
            $players[] = [
                'id' => $i,
                'name' => $playerName,
                'color' => $playerColor ?? '#000000',  // Defaultní barva, pokud není nastavena
                'points' => intval($playerPoints)
            ];
        }
    }

    // Seřazení hráčů podle bodů (sestupně)
    usort($players, function($a, $b) {
        return $b['points'] - $a['points'];
    });

    // Data o aktuálním kole
    $sql = "SELECT MAX(round) as current_round FROM dixitGameDetail WHERE gameId = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $gameId);
    $stmt->execute();
    $roundData = $stmt->get_result()->fetch_assoc();
    $currentRound = $roundData['current_round'] ?? 0;

    echo json_encode([
        'success' => true,
        'gameId' => $gameId,
        'players' => $players,
        'activePlayersCount' => $activePlayersCount,
        'currentRound' => $currentRound
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>