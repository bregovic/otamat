<?php
/**
 * Funkce pro generování náhodné barvy z předem definované palety
 * @param array $usedColors Pole již použitých barev
 * @return string HEX kód barvy
 */
function getRandomPlayerColor($usedColors = []) {
    // Definujeme paletu barev (různé, dobře odlišitelné barvy)
    $colorPalette = [
        '#FF5252', // červená
        '#4CAF50', // zelená
        '#2196F3', // modrá
        '#FFC107', // žlutá
        '#9C27B0', // fialová
        '#00BCD4', // tyrkysová
        '#FF9800', // oranžová
        '#795548', // hnědá
        '#607D8B', // šedomodrá
        '#E91E63', // růžová
        '#3F51B5', // indigová
        '#8BC34A'  // světle zelená
    ];
    
    // Odstraníme již použité barvy
    $availableColors = array_diff($colorPalette, $usedColors);
    
    // Pokud jsou všechny barvy použité, vrátíme náhodnou z celé palety
    if (empty($availableColors)) {
        return $colorPalette[array_rand($colorPalette)];
    }
    
    // Vrátíme náhodnou barvu z dostupných
    return array_values($availableColors)[array_rand($availableColors)];
}

/**
 * Funkce pro získání již použitých barev v dané hře
 * @param mysqli $conn Připojení k databázi
 * @param int $gameId ID hry
 * @return array Pole použitých barev
 */
function getUsedColors($conn, $gameId) {
    $usedColors = [];
    
    $sql = "SELECT 
        gamercolor1, gamercolor2, gamercolor3, gamercolor4,
        gamercolor5, gamercolor6, gamercolor7, gamercolor8,
        gamercolor9, gamercolor10, gamercolor11, gamercolor12
        FROM dixitGame WHERE id = ?";
        
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $gameId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($row = $result->fetch_assoc()) {
        foreach ($row as $color) {
            if (!empty($color)) {
                $usedColors[] = $color;
            }
        }
    }
    
    return $usedColors;
}