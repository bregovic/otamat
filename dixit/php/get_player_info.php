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

    // Najít číslo hráče (gamer1, gamer2, atd.) podle hashe
    $sql = "SELECT gamer FROM gamerMap WHERE gameId = ? AND gamerHash = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("is", $gameId, $playerHash);
    $stmt->execute();
    $result = $stmt->get_result();
    $gamerRow = $result->fetch_assoc();

    if (!$gamerRow) {
        throw new Exception('Player not found');
    }

    $gamerColumn = $gamerRow['gamer']; // např. "gamer1"

    // Získat jméno a barvu hráče z dixitGame
    $colorColumn = str_replace('gamer', 'gamercolor', $gamerColumn);
    $sql = "SELECT " . $gamerColumn . " as playerName, " . $colorColumn . " as playerColor FROM dixitGame WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $gameId);
    $stmt->execute();
    $result = $stmt->get_result();
    $gameRow = $result->fetch_assoc();

    echo json_encode([
        'success' => true,
        'playerName' => $gameRow['playerName'],
        'playerColor' => $gameRow['playerColor']
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>