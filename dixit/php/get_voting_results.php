<?php
header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');

require_once __DIR__ . '/database.php';

try {
    if (!isset($_GET['gameId']) || !isset($_GET['round'])) {
        throw new Exception('Chybí gameId nebo round');
    }

    $gameId = intval($_GET['gameId']);
    $round = intval($_GET['round']);

    $db = Database::getInstance();
    $conn = $db->getConnection();

    // Získání výsledků hlasování pro dané kolo
    $sql = "SELECT results FROM dixitResults WHERE gameId = ? AND round = ? ORDER BY calculateTime DESC LIMIT 1";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ii", $gameId, $round);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        throw new Exception('Výsledky hlasování nebyly nalezeny');
    }
    
    $row = $result->fetch_assoc();
    $results = json_decode($row['results'], true);
    
    // Získáme jména hráčů
    $sql = "SELECT gm.gamerHash, 
            CASE 
                WHEN gm.gamer = 'gamer1' THEN g.gamer1
                WHEN gm.gamer = 'gamer2' THEN g.gamer2
                WHEN gm.gamer = 'gamer3' THEN g.gamer3
                WHEN gm.gamer = 'gamer4' THEN g.gamer4
                WHEN gm.gamer = 'gamer5' THEN g.gamer5
                WHEN gm.gamer = 'gamer6' THEN g.gamer6
                WHEN gm.gamer = 'gamer7' THEN g.gamer7
                WHEN gm.gamer = 'gamer8' THEN g.gamer8
                WHEN gm.gamer = 'gamer9' THEN g.gamer9
                WHEN gm.gamer = 'gamer10' THEN g.gamer10
                WHEN gm.gamer = 'gamer11' THEN g.gamer11
                WHEN gm.gamer = 'gamer12' THEN g.gamer12
            END as player_name,
            CASE 
                WHEN gm.gamer = 'gamer1' THEN g.gamercolor1
                WHEN gm.gamer = 'gamer2' THEN g.gamercolor2
                WHEN gm.gamer = 'gamer3' THEN g.gamercolor3
                WHEN gm.gamer = 'gamer4' THEN g.gamercolor4
                WHEN gm.gamer = 'gamer5' THEN g.gamercolor5
                WHEN gm.gamer = 'gamer6' THEN g.gamercolor6
                WHEN gm.gamer = 'gamer7' THEN g.gamercolor7
                WHEN gm.gamer = 'gamer8' THEN g.gamercolor8
                WHEN gm.gamer = 'gamer9' THEN g.gamercolor9
                WHEN gm.gamer = 'gamer10' THEN g.gamercolor10
                WHEN gm.gamer = 'gamer11' THEN g.gamercolor11
                WHEN gm.gamer = 'gamer12' THEN g.gamercolor12
            END as player_color,
            CASE 
                WHEN gm.gamer = 'gamer1' THEN g.gamer1points
                WHEN gm.gamer = 'gamer2' THEN g.gamer2points
                WHEN gm.gamer = 'gamer3' THEN g.gamer3points
                WHEN gm.gamer = 'gamer4' THEN g.gamer4points
                WHEN gm.gamer = 'gamer5' THEN g.gamer5points
                WHEN gm.gamer = 'gamer6' THEN g.gamer6points
                WHEN gm.gamer = 'gamer7' THEN g.gamer7points
                WHEN gm.gamer = 'gamer8' THEN g.gamer8points
                WHEN gm.gamer = 'gamer9' THEN g.gamer9points
                WHEN gm.gamer = 'gamer10' THEN g.gamer10points
                WHEN gm.gamer = 'gamer11' THEN g.gamer11points
                WHEN gm.gamer = 'gamer12' THEN g.gamer12points
            END as player_points
            FROM gamerMap gm
            JOIN dixitGame g ON gm.gameId = g.id
            WHERE gm.gameId = ? AND gm.active = 1";
            
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $gameId);
    $stmt->execute();
    $playersResult = $stmt->get_result();
    
    $players = [];
    while ($row = $playersResult->fetch_assoc()) {
        $players[$row['gamerHash']] = [
            'name' => $row['player_name'],
            'color' => $row['player_color'],
            'points' => intval($row['player_points']),
            'pointsChange' => isset($results['playerPoints'][$row['gamerHash']]) ? 
                             intval($results['playerPoints'][$row['gamerHash']]) : 0
        ];
    }
    
    // Získáme informace o kartách, pro které se hlasovalo
    if (isset($results['cardVotes']) && is_array($results['cardVotes'])) {
        foreach ($results['cardVotes'] as &$cardVote) {
            $cardId = $cardVote['cardId'];
            
            // Získáme URL obrázku pro kartu
            $sql = "SELECT data FROM dixitData WHERE id = ?";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("i", $cardId);
            $stmt->execute();
            $cardResult = $stmt->get_result();
            
            if ($cardRow = $cardResult->fetch_assoc()) {
                $cardVote['image_url'] = "/dixit/dixitimage/" . str_replace('dixitimage/', '', $cardRow['data']);
            }
            
            // Přidáme informace o vlastníkovi karty
            if (isset($cardVote['ownerHash']) && isset($players[$cardVote['ownerHash']])) {
                $cardVote['ownerName'] = $players[$cardVote['ownerHash']]['name'];
                $cardVote['ownerColor'] = $players[$cardVote['ownerHash']]['color'];
            }
        }
    }
    
    // Finální výsledek
    $response = [
        'success' => true,
        'gameId' => $gameId,
        'round' => $round,
        'captainCardId' => $results['captainCardId'],
        'captainHash' => $results['captainHash'],
        'captainName' => $players[$results['captainHash']]['name'] ?? 'Neznámý kapitán',
        'captainColor' => $players[$results['captainHash']]['color'] ?? '#000000',
        'players' => $players,
        'cardVotes' => $results['cardVotes'] ?? [],
        'correctGuesses' => $results['correctGuesses'] ?? 0,
        'allPlayersGuessedCorrectly' => $results['allPlayersGuessedCorrectly'] ?? false,
        'noPlayerGuessedCorrectly' => $results['noPlayerGuessedCorrectly'] ?? false
    ];
    
    echo json_encode($response);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>