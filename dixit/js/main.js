// Závislost: config.js, ui.js, api.js, debug.js

document.addEventListener('DOMContentLoaded', function() {
    // Inicializace stylů
    initializeStyles();

    // Initial loads
    loadPlayerCards();
    loadPlayerInfo();
    loadGameStatus();
    
    // Refresh intervals
    setInterval(loadPlayerCards, 5000);
    setInterval(loadPlayerInfo, 5000);
    setInterval(loadGameStatus, 2000);

    // Add visibility change listener
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible') {
            loadPlayerCards();
            loadPlayerInfo();
            loadGameStatus();
        }
    });

    // Add focus listener
    window.addEventListener('focus', function() {
        loadPlayerCards();
        loadPlayerInfo();
        loadGameStatus();
    });

    // Keyboard controls
    document.addEventListener('keydown', function(e) {
        if (isCardViewerVisible) {
            if (e.key === 'ArrowRight') {
                showNextCard();
            } else if (e.key === 'ArrowLeft') {
                showPrevCard();
            } else if (e.key === 'Escape') {
                toggleCardViewer();
            }
        } else if (isSelectedCardsViewerVisible) {
            if (e.key === 'ArrowRight') {
                showNextSelectedCard();
            } else if (e.key === 'ArrowLeft') {
                showPrevSelectedCard();
            } else if (e.key === 'Escape') {
                toggleSelectedCardsViewer();
            }
        }
    });
});