<?php
header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');

require_once __DIR__ . '/database.php';

// Přidáme funkci pro logování
function debug_log($message) {
    error_log("[DIXIT VOTE] " . date('Y-m-d H:i:s') . " - " . $message);
}

/**
 * Pomocná funkce pro získání sloupce hráče podle hashe
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

/**
 * Získání ID karty podle hashe kapitána a aktuálního kola
 */
function getCaptainCardId($conn, $gameId, $round) {
    $sql = "SELECT gd.card as card_id, gd.gamerHash as captain_hash
            FROM dixitGameDetail gd
            JOIN gamerMap gm ON gd.gameId = gm.gameId AND CONVERT(gd.gamerHash USING utf8mb4) COLLATE utf8mb4_unicode_ci = CONVERT(gm.gamerHash USING utf8mb4) COLLATE utf8mb4_unicode_ci
            WHERE gd.gameId = ? AND gd.round = ? AND gd.selected = 1
            ORDER BY gd.id ASC
            LIMIT 1";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ii", $gameId, $round);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result && $row = $result->fetch_assoc()) {
        return [
            'card_id' => $row['card_id'],
            'captain_hash' => $row['captain_hash']
        ];
    }
    
    return null;
}

/**
 * Získání hashe hráče, který vybral určitou kartu v daném kole
 */
function getPlayerHashByCardId($conn, $gameId, $round, $cardId) {
    $sql = "SELECT gamerHash FROM dixitGameDetail 
            WHERE gameId = ? AND round = ? AND card = ? AND selected = 1";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("iii", $gameId, $round, $cardId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result && $row = $result->fetch_assoc()) {
        return $row['gamerHash'];
    }
    
    return null;
}

/**
 * Uložení hlasu hráče
 */
function saveVote($conn, $gameId, $round, $playerHash, $cardId) {
    // Nejprve ověříme, zda už hráč nehlasoval
    $sql = "SELECT id FROM dixitVotes WHERE gameId = ? AND round = ? AND CONVERT(voterHash USING utf8mb4) COLLATE utf8mb4_unicode_ci = CONVERT(? USING utf8mb4) COLLATE utf8mb4_unicode_ci";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("iis", $gameId, $round, $playerHash);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        // Aktualizujeme existující hlas
        $sql = "UPDATE dixitVotes SET cardId = ?, voteTime = NOW() 
                WHERE gameId = ? AND round = ? AND CONVERT(voterHash USING utf8mb4) COLLATE utf8mb4_unicode_ci = CONVERT(? USING utf8mb4) COLLATE utf8mb4_unicode_ci";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("iiis", $cardId, $gameId, $round, $playerHash);
    } else {
        // Přidáme nový hlas
        $sql = "INSERT INTO dixitVotes (gameId, round, voterHash, cardId, voteTime) 
                VALUES (?, ?, ?, ?, NOW())";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("iisi", $gameId, $round, $playerHash, $cardId);
    }
    
    $result = $stmt->execute();
    debug_log("Vote saved: " . ($result ? "success" : "failed") . " for player $playerHash and card $cardId");
    return $result;
}

/**
 * Uložení hlasu hráče do staré tabulky (pro kompatibilitu)
 */
function saveVoteOldTable($conn, $gameId, $round, $playerHash, $cardId) {
    // Přidáváme hlas také do staré tabulky pro zpětnou kompatibilitu
    $sql = "INSERT INTO dixitRoundVote (gameId, gamerHash, round, card) 
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE card = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("isiii", $gameId, $playerHash, $round, $cardId, $cardId);
    $result = $stmt->execute();
    debug_log("Old-style vote saved: " . ($result ? "success" : "failed"));
    return $result;
}

/**
 * Kontrola, zda všichni hráči kromě kapitána hlasovali
 */
function areAllVotesIn($conn, $gameId, $round, $captainHash) {
    // Počet aktivních hráčů kromě kapitána
    $sql = "SELECT COUNT(*) as player_count 
            FROM gamerMap 
            WHERE gameId = ? AND active = 1 
            AND CONVERT(gamerHash USING utf8mb4) COLLATE utf8mb4_unicode_ci <> CONVERT(? USING utf8mb4) COLLATE utf8mb4_unicode_ci";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("is", $gameId, $captainHash);
    $stmt->execute();
    $playerCount = $stmt->get_result()->fetch_assoc()['player_count'];
    
    // Počet hlasů v aktuálním kole
    $sql = "SELECT COUNT(*) as vote_count 
            FROM dixitVotes 
            WHERE gameId = ? AND round = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ii", $gameId, $round);
    $stmt->execute();
    $voteCount = $stmt->get_result()->fetch_assoc()['vote_count'];
    
    debug_log("Player count: $playerCount, Vote count: $voteCount");
    return $voteCount >= $playerCount;
}

/**
 * Získání informací o hlasech v kole
 */
function getVoteResults($conn, $gameId, $round) {
    $sql = "SELECT v.voterHash, v.cardId, 
            (SELECT gamerHash FROM dixitGameDetail 
             WHERE gameId = v.gameId AND round = v.round AND card = v.cardId AND selected = 1) as cardOwnerHash
            FROM dixitVotes v 
            WHERE v.gameId = ? AND v.round = ?";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ii", $gameId, $round);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $votes = [];
    while ($row = $result->fetch_assoc()) {
        $votes[] = [
            'voterHash' => $row['voterHash'],
            'cardId' => $row['cardId'],
            'cardOwnerHash' => $row['cardOwnerHash']
        ];
    }
    
    return $votes;
}

/**
 * Aktualizace bodů hráče
 */
function updatePlayerPoints($conn, $gameId, $playerHash, $pointsToAdd) {
    // Zjistit sloupec hráče
    $playerColumn = getPlayerColumnByHash($conn, $gameId, $playerHash);
    if (!$playerColumn) {
        debug_log("Player column not found for hash: $playerHash");
        return false;
    }
    
    // Zjistit aktuální body
    $pointsColumn = $playerColumn . "points";
    $sql = "SELECT $pointsColumn as current_points FROM dixitGame WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $gameId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($row = $result->fetch_assoc()) {
        $currentPoints = intval($row['current_points']);
        // Vypočítat nové body (nikdy ne méně než 0)
        $newPoints = max(0, $currentPoints + $pointsToAdd);
        
        debug_log("Updating points for $playerHash: $currentPoints + $pointsToAdd = $newPoints");
        
        // Aktualizovat body
        $sql = "UPDATE dixitGame SET $pointsColumn = ? WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("ii", $newPoints, $gameId);
        return $stmt->execute();
    }
    
    return false;
}

/**
 * Záznam výsledků hlasování
 */
function recordVotingResults($conn, $gameId, $round, $results) {
    $sql = "INSERT INTO dixitResults (gameId, round, results, calculateTime)
            VALUES (?, ?, ?, NOW())";
    $stmt = $conn->prepare($sql);
    $resultsJson = json_encode($results);
    $stmt->bind_param("iis", $gameId, $round, $resultsJson);
    $result = $stmt->execute();
    debug_log("Results recorded: " . ($result ? "success" : "failed"));
    return $result;
}

/**
 * Vyhodnocení kola - přidělení bodů podle pravidel Dixit
 */
function evaluateRound($conn, $gameId, $round, $captainCardId, $captainHash) {
    debug_log("Evaluating round $round for game $gameId, captain card: $captainCardId, captain: $captainHash");
    
    // Získat všechny hlasy
    $votes = getVoteResults($conn, $gameId, $round);
    
    // Sledujeme, kolik hlasů dostala každá karta
    $cardVotes = [];
    // Sledujeme, pro které karty hlasoval každý hráč
    $playerVotes = [];
    // Sledujeme, kdo je vlastníkem každé karty
    $cardOwners = [];
    
    // Inicializace výsledků
    $results = [
        'captainCardId' => $captainCardId,
        'captainHash' => $captainHash,
        'playerPoints' => [],
        'cardVotes' => [],
        'correctGuesses' => 0,
        'allPlayersGuessedCorrectly' => false,
        'noPlayerGuessedCorrectly' => false
    ];
    
    // Projdeme každý hlas
    foreach ($votes as $vote) {
        $voterHash = $vote['voterHash'];
        $cardId = $vote['cardId'];
        $cardOwnerHash = $vote['cardOwnerHash'];
        
        // Přidáme informaci o vlastníkovi karty
        $cardOwners[$cardId] = $cardOwnerHash;
        
        // Počítáme hlasy pro každou kartu
        if (!isset($cardVotes[$cardId])) {
            $cardVotes[$cardId] = 0;
        }
        $cardVotes[$cardId]++;
        
        // Zaznamenáme, pro jakou kartu každý hráč hlasoval
        $playerVotes[$voterHash] = $cardId;
        
        // Sledujeme, kolik hráčů uhodlo kartu kapitána
        if ($cardId == $captainCardId) {
            $results['correctGuesses']++;
        }
    }
    
    // Zjistíme počet hlasujících hráčů (kromě kapitána)
    $voterCount = count($playerVotes);
    
    // Žádný hráč neuhodl správně NEBO všichni hádali správně
    $results['allPlayersGuessedCorrectly'] = ($results['correctGuesses'] == $voterCount && $voterCount > 0);
    $results['noPlayerGuessedCorrectly'] = ($results['correctGuesses'] == 0 && $voterCount > 0);
    
    debug_log("Voter count: $voterCount, Correct guesses: {$results['correctGuesses']}");
    debug_log("All correct: " . ($results['allPlayersGuessedCorrectly'] ? "Yes" : "No") . 
              ", None correct: " . ($results['noPlayerGuessedCorrectly'] ? "Yes" : "No"));
    
    // Pokud nikdo neuhodl nebo všichni uhodli, kapitán nezíská body
    if ($results['allPlayersGuessedCorrectly'] || $results['noPlayerGuessedCorrectly']) {
        // Kapitán ztrácí 2 body
        updatePlayerPoints($conn, $gameId, $captainHash, -2);
        $results['playerPoints'][$captainHash] = -2;
    } else {
        // Kapitán získá 3 body, pokud alespoň 1 hráč, ale ne všichni, uhodli jeho kartu
        updatePlayerPoints($conn, $gameId, $captainHash, 3);
        $results['playerPoints'][$captainHash] = 3;
    }
    
    // Projdeme znovu hlasy a přidělíme body
    foreach ($votes as $vote) {
        $voterHash = $vote['voterHash'];
        $votedCardId = $vote['cardId'];
        
        // Hráč uhodl kartu kapitána
        if ($votedCardId == $captainCardId) {
            // Hráč získá 3 body, pokud správně uhodl a ne všichni uhodli správně
            if (!$results['allPlayersGuessedCorrectly']) {
                updatePlayerPoints($conn, $gameId, $voterHash, 3);
                $results['playerPoints'][$voterHash] = ($results['playerPoints'][$voterHash] ?? 0) + 3;
                debug_log("Player $voterHash gets 3 points for correct guess");
            }
        } else {
            // Hráč hlasoval pro jinou kartu - body získá vlastník této karty
            $cardOwnerHash = $cardOwners[$votedCardId];
            
            // Vlastník karty získá 1 bod za každého oklamaného hráče, max. 3 body
            if ($cardOwnerHash && $cardOwnerHash != $captainHash) {
                $pointsToAdd = min(3, $cardVotes[$votedCardId]);
                updatePlayerPoints($conn, $gameId, $cardOwnerHash, $pointsToAdd);
                $results['playerPoints'][$cardOwnerHash] = ($results['playerPoints'][$cardOwnerHash] ?? 0) + $pointsToAdd;
                debug_log("Player $cardOwnerHash gets $pointsToAdd points for fooling others");
            }
        }
    }
    
    // Zaznamenáme výsledky hlasů pro každou kartu
    foreach ($cardVotes as $cardId => $voteCount) {
        $isCorrect = ($cardId == $captainCardId);
        $ownerHash = $cardOwners[$cardId] ?? null;
        
        $results['cardVotes'][] = [
            'cardId' => $cardId,
            'voteCount' => $voteCount,
            'isCaptainCard' => $isCorrect,
            'ownerHash' => $ownerHash
        ];
    }
    
    // Uložíme výsledky do databáze
    recordVotingResults($conn, $gameId, $round, $results);
    
    return $results;
}

/**
 * Získání seznamu hráčů, kteří ještě nehlasovali
 */
function getPendingVoters($conn, $gameId, $round, $captainHash) {
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
            END as player_name
            FROM gamerMap gm
            JOIN dixitGame g ON gm.gameId = g.id
            WHERE gm.gameId = ? AND gm.active = 1 
            AND CONVERT(gm.gamerHash USING utf8mb4) COLLATE utf8mb4_unicode_ci <> CONVERT(? USING utf8mb4) COLLATE utf8mb4_unicode_ci
            AND gm.gamerHash NOT IN (
                SELECT voterHash FROM dixitVotes WHERE gameId = ? AND round = ?
            )";
                
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("isis", $gameId, $captainHash, $gameId, $round);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $pendingVoters = [];
    while ($row = $result->fetch_assoc()) {
        if ($row['player_name']) {
            $pendingVoters[] = $row['player_name'];
        }
    }
    
    return $pendingVoters;
}

try {
    debug_log("Starting vote_for_card.php");
    
    // Přijmout data z POST požadavku
    $rawData = file_get_contents('php://input');
    $data = json_decode($rawData, true);
    
    debug_log("Received data: " . print_r($data, true));
    
    if (!isset($data['gameId']) || !isset($data['playerHash']) || !isset($data['cardId'])) {
        throw new Exception('Chybí povinná data: gameId, playerHash nebo cardId');
    }
    
    $gameId = intval($data['gameId']);
    $playerHash = $data['playerHash'];
    $cardId = intval($data['cardId']);
    
    debug_log("Game ID: $gameId, Player Hash: $playerHash, Card ID: $cardId");
    
    $db = Database::getInstance();
    $conn = $db->getConnection();
    
    $conn->begin_transaction();
    
    try {
        // Zjistíme aktuální kolo
        $sql = "SELECT MAX(round) as max_round FROM dixitGameDetail WHERE gameId = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $gameId);
        $stmt->execute();
        $result = $stmt->get_result();
        $round = $result->fetch_assoc()['max_round'];
        
        if (!$round) {
            throw new Exception('Hra ještě nezačala');
        }
        
        debug_log("Current round: $round");
        
        // Získáme kapitána a jeho kartu
        $captainInfo = getCaptainCardId($conn, $gameId, $round);
        if (!$captainInfo) {
            throw new Exception('Kapitán nebyl nalezen');
        }
        
        $captainCardId = $captainInfo['card_id'];
        $captainHash = $captainInfo['captain_hash'];
        
        debug_log("Captain hash: $captainHash, Captain card: $captainCardId");
        
        // Ověříme, že hlasující hráč není kapitán
        if (strtolower($playerHash) === strtolower($captainHash)) {
            throw new Exception('Kapitán nemůže hlasovat');
        }
        
        // Ověříme, že karta existuje a je vybraná pro aktuální kolo
        $sql = "SELECT COUNT(*) as card_exists FROM dixitGameDetail 
                WHERE gameId = ? AND card = ? AND round = ? AND selected = 1";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("iii", $gameId, $cardId, $round);
        $stmt->execute();
        $cardExists = $stmt->get_result()->fetch_assoc()['card_exists'] > 0;
        
        if (!$cardExists) {
            throw new Exception('Vybraná karta neexistuje nebo není součástí aktuálního kola');
        }
        
        // Uložíme hlas hráče v obou tabulkách pro kompatibilitu
        if (!saveVote($conn, $gameId, $round, $playerHash, $cardId)) {
            throw new Exception('Nepodařilo se uložit hlas');
        }
        
        // Uložíme také do staré tabulky pro zpětnou kompatibilitu
        saveVoteOldTable($conn, $gameId, $round, $playerHash, $cardId);
        
        // Zkontrolujeme, zda už hlasovali všichni hráči
        $allVotesIn = areAllVotesIn($conn, $gameId, $round, $captainHash);
        debug_log("All votes in: " . ($allVotesIn ? "Yes" : "No"));
        
        // Pokud všichni hlasovali, vyhodnotíme kolo
        $results = null;
        if ($allVotesIn) {
            $results = evaluateRound($conn, $gameId, $round, $captainCardId, $captainHash);
        }
        
        $conn->commit();
        
        // Seznam hráčů, kteří ještě nehlasovali
        $pendingVoters = [];
        if (!$allVotesIn) {
            $pendingVoters = getPendingVoters($conn, $gameId, $round, $captainHash);
        }
        
        // Určit, zda hráč hlasoval pro správnou kartu
        $isCorrect = ($cardId == $captainCardId);
        
        echo json_encode([
            'success' => true,
            'message' => $isCorrect ? 'Gratuluji! Našli jste správnou kartu!' : 'Bohužel, to není karta kapitána.',
            'isCorrect' => $isCorrect,
            'round' => $round,
            'allVotesIn' => $allVotesIn,
            'pendingVoters' => $pendingVoters,
            'captainCardId' => $captainCardId,
            'results' => $results
        ]);
        
        debug_log("Vote processed successfully");
        
    } catch (Exception $e) {
        $conn->rollback();
        debug_log("Error in transaction: " . $e->getMessage());
        throw $e;
    }
    
} catch (Exception $e) {
    debug_log("Error: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>