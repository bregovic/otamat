<?php
header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');

require_once __DIR__ . '/database.php';

// Přidáme funkci pro logování
function debug_log($message) {
    error_log("[DIXIT SELECTED CARDS] " . date('Y-m-d H:i:s') . " - " . $message);
}

try {
    debug_log("Začátek get_selected_cards.php");

    if (!isset($_GET['gameId'])) {
        throw new Exception('Missing gameId');
    }

    $gameId = intval($_GET['gameId']);
    debug_log("Game ID: " . $gameId);
    
    $db = Database::getInstance();
    $conn = $db->getConnection();

    // Zjištění nejvyššího kola (round) pro danou hru
    $sql = "SELECT MAX(round) as max_round FROM dixitGameDetail WHERE gameId = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $gameId);
    $stmt->execute();
    $result = $stmt->get_result();
    $maxRound = $result->fetch_assoc()['max_round'];
    
    debug_log("Max round: " . ($maxRound !== null ? $maxRound : "null"));
    
    if (!$maxRound) {
        throw new Exception('Hra ještě nezačala');
    }

    // Zjistíme, zda všichni hráči vybrali karty
    $sql = "SELECT COUNT(DISTINCT gm.gamerHash) as player_count
            FROM gamerMap gm
            WHERE gm.gameId = ? AND gm.active = 1";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $gameId);
    $stmt->execute();
    $totalPlayers = $stmt->get_result()->fetch_assoc()['player_count'];
    
    $sql = "SELECT COUNT(DISTINCT gamerHash) as selected_count
            FROM dixitGameDetail
            WHERE gameId = ? AND round = ? AND selected = 1";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ii", $gameId, $maxRound);
    $stmt->execute();
    $selectedPlayers = $stmt->get_result()->fetch_assoc()['selected_count'];
    
    debug_log("Celkový počet hráčů: $totalPlayers, Počet hráčů s vybranými kartami: $selectedPlayers");
    
    // Všichni hráči vybrali karty?
    $allPlayersSelected = ($selectedPlayers >= $totalPlayers);
    
    // Pokud ještě nemají všichni hráči vybrané karty, vrátíme prázdné pole (žádné karty k zobrazení)
    if (!$allPlayersSelected) {
        debug_log("Ještě nemají všichni hráči vybrané karty");
        echo json_encode([
            'success' => true,
            'round' => $maxRound,
            'cards' => [],
            'message' => 'Někteří hráči ještě nevybrali kartu',
            'allPlayersSelected' => false
        ]);
        exit;
    }

    // Najít vybrané karty v aktuálním kole
    // UPRAVENÝ DOTAZ s explicitní konverzí collation a získáním barvy hráče
    $sql = "SELECT dd.id, dd.data, 
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
            gd.gamerHash
            FROM dixitGameDetail gd
            JOIN dixitData dd ON gd.card = dd.id
            JOIN gamerMap gm ON gd.gameId = gm.gameId AND CONVERT(gd.gamerHash USING utf8mb4) COLLATE utf8mb4_unicode_ci = CONVERT(gm.gamerHash USING utf8mb4) COLLATE utf8mb4_unicode_ci
            JOIN dixitGame g ON gd.gameId = g.id
            WHERE gd.gameId = ? AND gd.round = ? AND gd.selected = 1
            ORDER BY RAND()"; // Náhodné pořadí, aby karty nebyly vždy ve stejném pořadí

    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ii", $gameId, $maxRound);
    $stmt->execute();
    $result = $stmt->get_result();

    $cards = [];
    while ($row = $result->fetch_assoc()) {
        $cards[] = [
            'id' => $row['id'],
            'image_url' => "/dixit/dixitimage/" . str_replace('dixitimage/', '', $row['data']),
            'player_name' => $row['player_name'],
            'player_color' => $row['player_color'],
            'player_hash' => $row['gamerHash']
        ];
    }

    debug_log("Nalezeno " . count($cards) . " vybraných karet");
    
    // Najdeme kapitána kola (potřebujeme ho pro hlasování)
    $sql = "SELECT gd.gamerHash as captain_hash FROM dixitGameDetail gd
            WHERE gd.gameId = ? AND gd.round = ?
            ORDER BY gd.id ASC
            LIMIT 1";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ii", $gameId, $maxRound);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        $captainHash = $result->fetch_assoc()['captain_hash'];
        debug_log("Kapitán kola: " . $captainHash);
    } else {
        $captainHash = null;
        debug_log("Nenalezen kapitán kola");
    }
    
    echo json_encode([
        'success' => true,
        'round' => $maxRound,
        'cards' => $cards,
        'captainHash' => $captainHash,
        'allPlayersSelected' => true
    ]);

} catch (Exception $e) {
    debug_log("Chyba: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>