<?php
header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');

require_once __DIR__ . '/database.php';

// Přidáme funkci pro logování
function debug_log($message) {
    error_log("[DIXIT SELECT] " . date('Y-m-d H:i:s') . " - " . $message);
}

try {
    debug_log("Začátek select_card.php");
    
    $data = json_decode(file_get_contents('php://input'), true);
    debug_log("Received data: " . print_r($data, true));
    
    if (!isset($data['gameId']) || !isset($data['playerHash']) || !isset($data['cardId'])) {
        throw new Exception('Chybí povinné parametry: ' . 
            (!isset($data['gameId']) ? 'gameId ' : '') . 
            (!isset($data['playerHash']) ? 'playerHash ' : '') . 
            (!isset($data['cardId']) ? 'cardId' : ''));
    }

    $gameId = intval($data['gameId']);
    $playerHash = $data['playerHash'];
    $cardId = intval($data['cardId']);
    $getNewCard = isset($data['getNewCard']) ? (bool)$data['getNewCard'] : false;

    debug_log("Game ID: $gameId, Player Hash: $playerHash, Card ID: $cardId, Get New Card: " . ($getNewCard ? "Yes" : "No"));

    $db = Database::getInstance();
    $conn = $db->getConnection();

    // Začátek transakce
    $conn->begin_transaction();

    try {
        // Získání aktuálního kola
        $sql = "SELECT MAX(round) as current_round FROM dixitGameDetail WHERE gameId = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $gameId);
        $stmt->execute();
        $result = $stmt->get_result();
        $currentRound = $result->fetch_assoc()['current_round'];
        
        debug_log("Aktuální kolo: " . ($currentRound ?? "NULL"));
        
        if (!$currentRound) {
            throw new Exception('Hra ještě nezačala');
        }

        // Kontrola, zda karta existuje a je ve vlastnictví hráče
        $sql = "SELECT id FROM dixitGameDetail 
                WHERE gameId = ? AND CONVERT(gamerHash USING utf8mb4) COLLATE utf8mb4_unicode_ci = CONVERT(? USING utf8mb4) COLLATE utf8mb4_unicode_ci AND card = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("isi", $gameId, $playerHash, $cardId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            throw new Exception('Tato karta vám nepatří');
        }

        // Najdeme kapitána kola
        $sql = "SELECT gd.gamerHash as captain_hash FROM dixitGameDetail gd
                WHERE gd.gameId = ? AND gd.round = ?
                ORDER BY gd.id ASC
                LIMIT 1";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("ii", $gameId, $currentRound);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            throw new Exception('Nepodařilo se najít kapitána kola');
        }
        
        $captainHash = $result->fetch_assoc()['captain_hash'];
        $isCaptain = (strtolower($captainHash) === strtolower($playerHash));
        
        debug_log("Kapitán hash: $captainHash, Hráč hash: $playerHash, Je kapitán: " . ($isCaptain ? "Ano" : "Ne"));

        // Kontrola, zda kapitán už vybral kartu
        $sql = "SELECT COUNT(*) as captain_selected FROM dixitGameDetail 
                WHERE gameId = ? AND CONVERT(gamerHash USING utf8mb4) COLLATE utf8mb4_unicode_ci = CONVERT(? USING utf8mb4) COLLATE utf8mb4_unicode_ci AND round = ? AND selected = 1";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("isi", $gameId, $captainHash, $currentRound);
        $stmt->execute();
        $captainSelectedCard = $stmt->get_result()->fetch_assoc()['captain_selected'] > 0;
        
        debug_log("Kapitán už vybral kartu: " . ($captainSelectedCard ? "Ano" : "Ne"));

        // Kontrola, zda hráč již nevybral kartu
        $sql = "SELECT COUNT(*) as already_selected FROM dixitGameDetail 
                WHERE gameId = ? AND CONVERT(gamerHash USING utf8mb4) COLLATE utf8mb4_unicode_ci = CONVERT(? USING utf8mb4) COLLATE utf8mb4_unicode_ci AND round = ? AND selected = 1";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("isi", $gameId, $playerHash, $currentRound);
        $stmt->execute();
        $alreadySelected = $stmt->get_result()->fetch_assoc()['already_selected'] > 0;

        if ($alreadySelected) {
            throw new Exception('Už jste vybrali kartu pro toto kolo');
        }

        // Hlavní logika výběru karet
        if ($isCaptain) {
            // Kapitán může vždy vybrat kartu, pokud tak ještě neudělal
            debug_log("Kapitán vybírá kartu");
        } else {
            // Ostatní hráči mohou vybrat kartu, jen pokud kapitán již vybral svou
            if (!$captainSelectedCard) {
                throw new Exception('Musíte počkat, až kapitán kola vybere kartu');
            }
        }

        // Nastavíme hodnotu round pro všechny karty v této hře, které mají round <= 0 nebo NULL
        // Tím zajistíme, že všechny karty budou mít správnou hodnotu round
        $sql = "UPDATE dixitGameDetail 
                SET round = ?
                WHERE gameId = ? AND (round IS NULL OR round <= 0)";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("ii", $currentRound, $gameId);
        $stmt->execute();
        
        $updatedRoundCards = $stmt->affected_rows;
        debug_log("Aktualizováno karet s round <= 0: " . $updatedRoundCards);

        // Označení vybrané karty (nastavíme selected = 1)
        $sql = "UPDATE dixitGameDetail 
                SET selected = 1
                WHERE gameId = ? AND CONVERT(gamerHash USING utf8mb4) COLLATE utf8mb4_unicode_ci = CONVERT(? USING utf8mb4) COLLATE utf8mb4_unicode_ci AND card = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("isi", $gameId, $playerHash, $cardId);
        $stmt->execute();
        
        $affectedRows = $stmt->affected_rows;
        debug_log("Označena karta jako selected: " . $affectedRows . " řádků");
        
        if ($affectedRows === 0) {
            // Pokud se aktualizace nezdařila, zkusíme zjistit proč
            $sql = "SELECT * FROM dixitGameDetail 
                    WHERE gameId = ? AND CONVERT(gamerHash USING utf8mb4) COLLATE utf8mb4_unicode_ci = CONVERT(? USING utf8mb4) COLLATE utf8mb4_unicode_ci AND card = ?";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("isi", $gameId, $playerHash, $cardId);
            $stmt->execute();
            $result = $stmt->get_result();
            $existingRecord = $result->fetch_assoc();
            
            if ($existingRecord) {
                debug_log("Nalezen záznam, ale nebylo možné ho aktualizovat: " . print_r($existingRecord, true));
                
                // Zkusíme "natvrdo" nastavit selected=1
                $sql = "UPDATE dixitGameDetail 
                        SET selected = 1, round = ?
                        WHERE id = ?";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("ii", $currentRound, $existingRecord['id']);
                $stmt->execute();
                
                $newAffectedRows = $stmt->affected_rows;
                debug_log("Zkouška přímé aktualizace na ID: " . $newAffectedRows . " řádků");
                
                if ($newAffectedRows === 0) {
                    throw new Exception('Nepodařilo se označit kartu ani alternativní metodou');
                }
            } else {
                debug_log("Nenalezen žádný záznam pro tuto kartu");
                throw new Exception('Nepodařilo se označit kartu - záznam nenalezen');
            }
        }

        // Získání nové karty
        $newCard = null;
        if ($getNewCard) {
            // Získat náhodnou kartu, která ještě není ve hře
            $sql = "SELECT id, data FROM dixitData 
                    WHERE id NOT IN (
                        SELECT card FROM dixitGameDetail WHERE gameId = ?
                    )
                    ORDER BY RAND() LIMIT 1";
            
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("i", $gameId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result && $result->num_rows > 0) {
                $cardRow = $result->fetch_assoc();
                $newCardId = $cardRow['id'];
                $newCardImageUrl = "/dixit/dixitimage/" . str_replace('dixitimage/', '', $cardRow['data']);
                
                // Vložíme novou kartu pro hráče
                $sql = "INSERT INTO dixitGameDetail (gameId, gamerHash, card) 
                        VALUES (?, ?, ?)";
                
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("isi", $gameId, $playerHash, $newCardId);
                $stmt->execute();
                
                if ($stmt->affected_rows > 0) {
                    $newCard = [
                        'id' => $newCardId,
                        'image_url' => $newCardImageUrl
                    ];
                    debug_log("Přidána nová karta: ID: $newCardId, URL: $newCardImageUrl");
                } else {
                    debug_log("Nepodařilo se přidat novou kartu");
                }
            } else {
                debug_log("Nenalezena žádná dostupná nová karta");
            }
        }

        $conn->commit();
        debug_log("Transakce úspěšně dokončena");

        // Získat seznam hráčů, kteří ještě nevybrali kartu
        $pendingPlayers = [];
        
        // UPRAVENÝ DOTAZ s explicitní konverzí collation
        $sql = "SELECT DISTINCT 
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
                LEFT JOIN (
                    SELECT DISTINCT gamerHash 
                    FROM dixitGameDetail 
                    WHERE gameId = ? AND round = ? AND selected = 1
                ) as selected ON CONVERT(gm.gamerHash USING utf8mb4) COLLATE utf8mb4_unicode_ci = CONVERT(selected.gamerHash USING utf8mb4) COLLATE utf8mb4_unicode_ci
                WHERE gm.gameId = ? AND gm.active = 1 
                AND selected.gamerHash IS NULL";
        
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("iii", $gameId, $currentRound, $gameId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        while ($row = $result->fetch_assoc()) {
            if ($row['player_name']) {
                $pendingPlayers[] = $row['player_name'];
            }
        }

        // Spočítáme, zda všichni hráči vybrali karty
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
        $stmt->bind_param("ii", $gameId, $currentRound);
        $stmt->execute();
        $selectedPlayers = $stmt->get_result()->fetch_assoc()['selected_count'];
        
        $allPlayersSelected = ($selectedPlayers >= $totalPlayers);
        debug_log("Všichni hráči vybrali karty: " . ($allPlayersSelected ? "Ano" : "Ne"));

        // Připravit odpověď
        $response = [
            'success' => true,
            'message' => 'Karta byla vybrána',
            'pendingPlayers' => $pendingPlayers,
            'isCaptain' => $isCaptain,
            'captainSelectedCard' => true, // Nastavíme true, protože jsme právě vybrali kartu
            'updatedCards' => $updatedRoundCards,
            'allPlayersSelected' => $allPlayersSelected
        ];

        // Přidáme informace o nové kartě, pokud byla přidána
        if ($newCard) {
            $response['newCard'] = $newCard;
        }

        echo json_encode($response);

    } catch (Exception $e) {
        $conn->rollback();
        debug_log("Chyba v transakci: " . $e->getMessage());
        throw $e;
    }

} catch (Exception $e) {
    debug_log("Chyba: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}