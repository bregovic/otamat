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

    // Získat základní informace o hře
    $sql = "SELECT * FROM dixitGame WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $gameId);
    $stmt->execute();
    $result = $stmt->get_result();
    $gameData = $result->fetch_assoc();

    if (!$gameData) {
        throw new Exception('Game not found');
    }

    // Získat aktivní kolo a kapitána
    $sql = "SELECT MAX(round) as current_round FROM dixitGameDetail WHERE gameId = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $gameId);
    $stmt->execute();
    $result = $stmt->get_result();
    $roundData = $result->fetch_assoc();
    $currentRound = $roundData['current_round'] ?? 0;

    $responseData = [
        'success' => true,
        'round' => $currentRound,
    ];

    // Pokud hra začala, zjistit kapitána a stav výběru karet
    if ($currentRound > 0) {
        // Získání kapitána kola
        $sql = "SELECT gd.gamerHash, gm.gamer 
                FROM dixitGameDetail gd
                JOIN gamerMap gm ON gd.gameId = gm.gameId AND gd.gamerHash = gm.gamerHash
                WHERE gd.gameId = ? AND gd.round = ?
                ORDER BY gd.id ASC LIMIT 1";
        
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("ii", $gameId, $currentRound);
        $stmt->execute();
        $result = $stmt->get_result();
        $captainData = $result->fetch_assoc();

        if ($captainData) {
            $captainHash = $captainData['gamerHash'];
            $captainColumn = $captainData['gamer']; // např. "gamer1"
            $captainColorColumn = str_replace('gamer', 'gamercolor', $captainColumn);
            
            $captainName = $gameData[$captainColumn] ?? 'Neznámý hráč';
            $captainColor = $gameData[$captainColorColumn] ?? '#000000';

            $responseData['activePlayer'] = [
                'hash' => $captainHash,
                'name' => $captainName,
                'color' => $captainColor
            ];

            // Zjistit, zda kapitán už vybral kartu
            $sql = "SELECT COUNT(*) as card_selected FROM dixitGameDetail 
                    WHERE gameId = ? AND round = ? AND gamerHash = ? AND selected = 1";
            
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("iis", $gameId, $currentRound, $captainHash);
            $stmt->execute();
            $result = $stmt->get_result();
            $cardSelected = $result->fetch_assoc()['card_selected'] > 0;

            $responseData['captainSelectedCard'] = $cardSelected;

            // Získání seznamu hráčů, kteří ještě nevybrali kartu
            $sql = "SELECT gm.gamer, g.gamer1, g.gamer2, g.gamer3, g.gamer4, g.gamer5, g.gamer6, 
                           g.gamer7, g.gamer8, g.gamer9, g.gamer10, g.gamer11, g.gamer12,
                           g.gamercolor1, g.gamercolor2, g.gamercolor3, g.gamercolor4, 
                           g.gamercolor5, g.gamercolor6, g.gamercolor7, g.gamercolor8, 
                           g.gamercolor9, g.gamercolor10, g.gamercolor11, g.gamercolor12
                    FROM gamerMap gm
                    JOIN dixitGame g ON gm.gameId = g.id
                    WHERE gm.gameId = ? AND gm.active = 1 
                    AND gm.gamerHash NOT IN (
                        SELECT gamerHash FROM dixitGameDetail 
                        WHERE gameId = ? AND round = ? AND selected = 1
                    )
                    AND gm.gamerHash != ?";
            
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("iiis", $gameId, $gameId, $currentRound, $captainHash);
            $stmt->execute();
            $result = $stmt->get_result();

            $pendingPlayers = [];
            $pendingPlayersInfo = [];
            
            while ($row = $result->fetch_assoc()) {
                $gamerColumn = $row['gamer']; // např. "gamer1"
                $playerName = $row[$gamerColumn];
                $colorColumn = str_replace('gamer', 'gamercolor', $gamerColumn);
                $playerColor = $row[$colorColumn] ?? '#000000';
                
                $pendingPlayers[] = $playerName;
                $pendingPlayersInfo[] = [
                    'name' => $playerName,
                    'color' => $playerColor
                ];
            }

            $responseData['pendingPlayers'] = $pendingPlayers;
            $responseData['pendingPlayersInfo'] = $pendingPlayersInfo;

            // Zjistit, zda všichni hráči vybrali karty
            $sql = "SELECT COUNT(DISTINCT gamerHash) as selected_count
                    FROM dixitGameDetail
                    WHERE gameId = ? AND round = ? AND selected = 1";
            
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("ii", $gameId, $currentRound);
            $stmt->execute();
            $selectedCount = $stmt->get_result()->fetch_assoc()['selected_count'];

            $sql = "SELECT COUNT(DISTINCT gamerHash) as player_count
                    FROM gamerMap
                    WHERE gameId = ? AND active = 1";
            
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("i", $gameId);
            $stmt->execute();
            $playerCount = $stmt->get_result()->fetch_assoc()['player_count'];

            $responseData['allPlayersSelected'] = $selectedCount >= $playerCount;
        }
    }

    echo json_encode($responseData);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>