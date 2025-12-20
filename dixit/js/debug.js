// Debug funkce
function forceStatusUpdate() {
    console.log("Forcing game status update...");
    loadGameStatus();
}

function clearConsole() {
    console.clear();
}

function toggleDebugPanel() {
    const panel = document.getElementById('debugPanel');
    if (panel) {
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }
}

function logGameState() {
    console.group("Aktuální stav hry");
    console.log("GameID:", gameId);
    console.log("PlayerHash:", playerHash);
    console.log("Karty hráče:", cards);
    console.log("Vybrané karty:", selectedCards);
    console.log("Fáze hlasování:", votingPhase);
    console.log("Hráč hlasoval:", hasVoted);
    console.log("Karta kapitána:", captainCardId);
    console.log("Hash kapitána:", captainHash);
    console.log("Zobrazení karet:", isCardViewerVisible);
    console.log("Zobrazení vybraných karet:", isSelectedCardsViewerVisible);
    console.groupEnd();
    
    return "Stav hry zaznamenán do konzole";
}

// Přidáme automatické logování stavu při chybách
window.addEventListener('error', function(event) {
    console.error("Zachycena chyba:", event.error);
    logGameState();
});

// Testovací funkce pro ověření fungování
function testConnection() {
    fetch(`/dixit/php/get_player_info.php?gameId=${gameId}&playerHash=${playerHash}`)
        .then(response => {
            console.log("Test spojení:", response.status);
            return response.json();
        })
        .then(data => {
            console.log("Test odpovědi:", data);
        })
        .catch(error => {
            console.error("Test chyba:", error);
        });
    
    return "Test spojení spuštěn, zkontrolujte konzoli";
}

// Diagnostická funkce pro obsluhu collation problémů
function analyzeCollationIssue() {
    // Tento kód se snaží dostat více informací o collation databáze
    fetch(`/dixit/php/debug_collation.php?gameId=${gameId}`)
        .then(response => response.json())
        .then(data => {
            console.group("Collation Analýza");
            console.log("Výsledky:", data);
            console.groupEnd();
        })
        .catch(error => {
            console.error("Chyba při analýze collation:", error);
        });
        
    return "Spouštím analýzu collation problémů...";
}