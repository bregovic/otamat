<?php
header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');

require_once __DIR__ . '/database.php';

try {
    if (!isset($_GET['gameId']) || !isset($_GET['playerHash'])) {
        throw new Exception('Missing required parameters');
    }

    $gameId = intval($_GET['gameId']);
    $playerHash = trim($_GET['playerHash']);

    $db = Database::getInstance();
    $conn = $db->getConnection();

    // Get player's cards - přidáme podmínku WHERE selected = 0 nebo IS NULL
    $sql = "SELECT dd.id, dd.data 
            FROM dixitData dd
            JOIN dixitGameDetail gd ON dd.id = gd.card
            WHERE gd.gamerHash = ? 
            AND (gd.round IS NULL OR gd.round = 0)
            AND (gd.selected = 0 OR gd.selected IS NULL)
            ORDER BY dd.id";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $playerHash);
    $stmt->execute();
    $result = $stmt->get_result();

    $cards = [];
    while ($row = $result->fetch_assoc()) {
        $cards[] = [
            'id' => $row['id'],
            'image_url' => "/dixit/dixitimage/" . str_replace('dixitimage/', '', $row['data'])  // Odstraníme přebytečné 'dixitimage/'
        ];
    }

    echo json_encode([
        'success' => true,
        'cards' => $cards
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>