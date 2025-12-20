<?php
header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');

require_once __DIR__ . '/database.php';

// Přidáme funkci pro logování
function debug_log($message) {
    error_log("[DIXIT START] " . date('Y-m-d H:i:s') . " - " . $message);
}

try {
    debug_log("Začátek start_round.php");
    
    $rawInput = file_get_contents('php://input');
    debug_log("Raw input: " . $rawInput);
    
    $data = json_decode($rawInput, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON input: ' . json_last_error_msg());
    }
    
    if (!isset($data['gameId'])) {
        throw new Exception('Missing gameId');
    }

    $gameId = intval($data['gameId']);
    debug_log("Game ID: " . $gameId);
    
    $db = Database::getInstance();
    $conn = $db->getConnection();
    
    // Začátek transakce
    $conn->begin_transaction();

    try {
        // 1. Zjistit, jestli hra už nezačala
        debug_log("Kontrola, zda hra již začala");
        $sql = "SELECT COUNT(*) as count FROM dixitGameDetail WHERE gameId = ? AND round > 0";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $gameId);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        
        if ($row['count'] > 0) {
            debug_log("Hra již byla zahájena - count: " . $row['count']);
            throw new Exception('Hra již byla zahájena');
        }

        // 2. Získat seznam všech hráčů v této hře z gamerMap
        debug_log("Získání seznamu hráčů");
        $sql = "SELECT gm.gamerHash, gm.gamer, 
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
                WHERE gm.gameId = ? AND gm.active = 1";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $gameId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $players = [];
        while ($row = $result->fetch_assoc()) {
            $players[] = [
                'hash' => $row['gamerHash'],
                'gamer' => $row['gamer'],
                'name' => $row['player_name']
            ];
            debug_log("Nalezen hráč: " . $row['player_name'] . " hash: " . $row['gamerHash']);
        }

        if (count($players) < 2) {
            debug_log("Nedostatek hráčů: " . count($players));
            throw new Exception('Nedostatek hráčů pro zahájení hry (minimum 2)');
        }

        // 3. Náhodně vybrat hráče
        $randomIndex = array_rand($players);
        $selectedPlayer = $players[$randomIndex];
        debug_log("Vybrán hráč: " . $selectedPlayer['name'] . " hash: " . $selectedPlayer['hash']);

        // 4. Nejprve nastavíme výchozí hodnoty selected pro všechny karty
        debug_log("Nastavuji výchozí hodnoty selected = 0 pro všechny karty");
        $sql = "UPDATE dixitGameDetail SET selected = 0 WHERE gameId = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $gameId);
        $stmt->execute();
        
        // 5. Nastavit round=1 pro všechny karty vybraného hráče
        debug_log("Nastavuji round=1 pro karty vybraného hráče");
        $sql = "UPDATE dixitGameDetail 
                SET round = 1
                WHERE gameId = ? AND gamerHash = ? AND round IS NULL";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("is", $gameId, $selectedPlayer['hash']);
        $stmt->execute();
        
        $affectedRows = $stmt->affected_rows;
        debug_log("Počet aktualizovaných záznamů: " . $affectedRows);
        
        if ($affectedRows === 0) {
            debug_log("Žádné záznamy nebyly aktualizovány");
            
            // Pokud nebyly aktualizovány žádné záznamy, zkusme zjistit proč
            $sql = "SELECT COUNT(*) as count FROM dixitGameDetail WHERE gameId = ? AND gamerHash = ?";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("is", $gameId, $selectedPlayer['hash']);
            $stmt->execute();
            $count = $stmt->get_result()->fetch_assoc()['count'];
            debug_log("Počet záznamů hráče v databázi: " . $count);
            
            if ($count === 0) {
                throw new Exception('Vybraný hráč nemá žádné záznamy v databázi');
            }
            
            // Zkusme aktualizovat karty na round=1 bez podmínky IS NULL
            debug_log("Zkouším aktualizovat bez podmínky IS NULL");
            $sql = "UPDATE dixitGameDetail 
                   SET round = 1 
                   WHERE gameId = ? AND gamerHash = ?";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("is", $gameId, $selectedPlayer['hash']);
            $stmt->execute();
            $affectedRows = $stmt->affected_rows;
            debug_log("Počet aktualizovaných záznamů (bez podmínky IS NULL): " . $affectedRows);
            
            if ($affectedRows === 0) {
                // Vytvořit nový záznam jako poslední pokus
                debug_log("Vytvářím nový záznam s round=1");
                $sql = "INSERT INTO dixitGameDetail (gameId, gamer, gamerHash, round, card, created_at) 
                       VALUES (?, ?, ?, 1, 0, NOW())";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("iss", $gameId, $selectedPlayer['name'], $selectedPlayer['hash']);
                $stmt->execute();
            }
        }

        $conn->commit();
        debug_log("Transakce úspěšně dokončena");

        echo json_encode([
            'success' => true,
            'selectedPlayer' => [
                'name' => $selectedPlayer['name'],
                'hash' => $selectedPlayer['hash']
            ],
            'affectedRows' => $affectedRows
        ]);

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
?>