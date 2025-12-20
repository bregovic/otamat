// Závislost: config.js

// Globální proměnná pro sledování, zda už proběhlo první načtení
let initialLoadComplete = false;

// Funkce pro zobrazení informační zprávy
function showNotification(message, duration = 3000) {
    const indicator = document.getElementById('refreshIndicator');
    
    // Skryjeme automatické zprávy "Aktualizováno" po prvním načtení
    if (message === 'Aktualizováno') {
        if (initialLoadComplete) {
            return; // Nezobrazujeme po prvním načtení
        } else {
            initialLoadComplete = true; // Označíme první načtení jako dokončené
        }
    }
    
    // Zobrazíme jiné zprávy nebo výjimečně i "Aktualizováno" při prvním načtení
    indicator.textContent = message;
    indicator.style.display = 'block';
    
    // Automatické skrytí po určité době
    clearTimeout(window.notificationTimeout);
    window.notificationTimeout = setTimeout(() => {
        indicator.style.display = 'none';
    }, duration);
}

// Upravená funkce pro zobrazení indikátoru aktualizace - jen při prvním načtení
function showRefreshIndicator() {
    // Nebudeme zobrazovat běžné "Aktualizováno" notifikace
    // showNotification('Aktualizováno');
}

function toggleCardViewer() {
    // Skrýt prohlížeč vybraných karet, pokud je zobrazen
    if (isSelectedCardsViewerVisible) {
        toggleSelectedCardsViewer();
    }
    
    const cardViewer = document.getElementById('cardViewer');
    isCardViewerVisible = !isCardViewerVisible;
    cardViewer.classList.toggle('visible', isCardViewerVisible);
}

function toggleSelectedCardsViewer() {
    // Skrýt prohlížeč karet hráče, pokud je zobrazen
    if (isCardViewerVisible) {
        toggleCardViewer();
    }
    
    const viewer = document.getElementById('selectedCardsViewer');
    isSelectedCardsViewerVisible = !isSelectedCardsViewerVisible;
    viewer.classList.toggle('visible', isSelectedCardsViewerVisible);
    
    if (isSelectedCardsViewerVisible) {
        loadSelectedCards();
    }
}

function updateCardDisplay() {
    if (cards.length > 0) {
        const currentCard = cards[currentCardIndex];
        document.getElementById('currentCard').src = currentCard.image_url;
        document.getElementById('cardCounter').textContent = 
            `${currentCardIndex + 1}/${cards.length}`;
    }
}

function showNextCard() {
    if (cards.length > 0) {
        currentCardIndex = (currentCardIndex + 1) % cards.length;
        updateCardDisplay();
    }
}

function showPrevCard() {
    if (cards.length > 0) {
        currentCardIndex = (currentCardIndex - 1 + cards.length) % cards.length;
        updateCardDisplay();
    }
}

function updateSelectedCardDisplay() {
    if (selectedCards.length > 0) {
        const currentCard = selectedCards[currentSelectedCardIndex];
        document.getElementById('currentSelectedCard').src = currentCard.image_url;
        document.getElementById('selectedCardCounter').textContent = 
            `${currentSelectedCardIndex + 1}/${selectedCards.length}`;
        
        // Karty pro hlasování - vždy resetujeme onClick handler
        document.getElementById('currentSelectedCard').style.cursor = 'default';
        document.getElementById('currentSelectedCard').onclick = null;
        
        // Kontrola, zda je hlasovací fáze a hráč ještě nehlasoval
        if (votingPhase && !hasVoted && playerHash !== captainHash) {
            // Pouze karty, které nepatří kapitánovi můžou být vybrány pro hlasování
            if (currentCard.player_hash !== captainHash) {
                document.getElementById('selectedCardPlayerInfo').textContent = 'Klikněte na kartu pro hlasování';
                document.getElementById('currentSelectedCard').style.cursor = 'pointer';
                document.getElementById('currentSelectedCard').onclick = function() {
                    voteForCard(currentCard.id);
                };
            }
        } else if (currentCard.player_color && isVotingComplete) {
            // Po dokončení hlasování zobrazíme informace o vlastníkovi
            const playerInfoElement = document.getElementById('selectedCardPlayerInfo');
            playerInfoElement.innerHTML = `Karta hráče: <span style="color: ${currentCard.player_color}; font-weight: bold;">${currentCard.player_name}</span>`;
        } else {
            // Během hlasování skryjeme informace o vlastníkovi
            document.getElementById('selectedCardPlayerInfo').textContent = 'Vybrané karty hráčů';
        }
        
        // Karta kapitána se označí až po ukončení hlasování
        if (isVotingComplete && captainCardId && currentCard.id == captainCardId) {
            document.getElementById('currentSelectedCard').classList.add('captain-card');
        } else {
            document.getElementById('currentSelectedCard').classList.remove('captain-card');
        }
    }
}

function showNextSelectedCard() {
    if (selectedCards.length > 0) {
        currentSelectedCardIndex = (currentSelectedCardIndex + 1) % selectedCards.length;
        updateSelectedCardDisplay();
    }
}

function showPrevSelectedCard() {
    if (selectedCards.length > 0) {
        currentSelectedCardIndex = (currentSelectedCardIndex - 1 + selectedCards.length) % selectedCards.length;
        updateSelectedCardDisplay();
    }
}

function updateVotingInfo(pendingVoters, captainCardId) {
    const infoElement = document.getElementById('selectedCardPlayerInfo');
    
    if (pendingVoters && pendingVoters.length > 0) {
        infoElement.textContent = `Čekáme na hlasy: ${pendingVoters.join(', ')}`;
        isVotingComplete = false;
    } else {
        infoElement.textContent = 'Hlasování dokončeno!';
        isVotingComplete = true;
        // Aktualizujeme zobrazení, aby se označila kapitánova karta
        updateSelectedCardDisplay();
    }
}

// Inicializace CSS stylů
function initializeStyles() {
    const style = document.createElement('style');
    style.textContent = `
    .captain-card {
        box-shadow: 0 0 15px 5px gold;
        animation: pulse-gold 2s infinite;
    }

    @keyframes pulse-gold {
        0% { box-shadow: 0 0 15px 5px gold; }
        50% { box-shadow: 0 0 25px 10px gold; }
        100% { box-shadow: 0 0 15px 5px gold; }
    }
    
    /* Odstraněn overflow: hidden, aby šipky mohly přečnívat */
    .card-viewer {
        overflow: visible !important;
    }
    
    /* Větší navigační šipky */
    .nav-button {
        width: 50px !important;
        height: 50px !important;
        font-size: 24px !important;
        position: absolute;
        z-index: 100;
    }
    
    .nav-button.prev {
        left: -25px !important;
    }
    
    .nav-button.next {
        right: -25px !important;
    }
    
    /* Mobilní úpravy */
    @media (max-width: 768px) {
        .nav-button {
            width: 40px !important;
            height: 40px !important;
            font-size: 20px !important;
        }
    }
    
    /* Úprava refresh indikátoru pro zobrazení notifikací */
    #refreshIndicator {
        display: none;
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px 20px;
        border-radius: 20px;
        font-size: 1rem;
        z-index: 1000;
        max-width: 80%;
        text-align: center;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
        animation: fadeIn 0.3s ease-in-out;
    }
    
    @keyframes fadeIn {
        0% { opacity: 0; transform: translateY(-10px); }
        100% { opacity: 1; transform: translateY(0); }
    }
    
    /* Styl tlačítka pro herní pole */
    .dixit-gameboard-button {
        position: fixed;
        bottom: 20px;
        left: 180px;
        height: 40px;
        width: auto;
        padding: 8px 20px;
        background: linear-gradient(45deg, #3f51b5, #5c6bc0);
        color: white;
        border: none;
        border-radius: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 16px;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
        cursor: pointer;
        transition: all 0.3s ease;
        text-decoration: none;
    }

    .dixit-gameboard-button:hover {
        transform: translateY(-3px);
        box-shadow: 0 6px 15px rgba(0, 0, 0, 0.4);
    }
    
    .dixit-gameboard-button img {
        height: 24px;
        margin-right: 8px;
    }
    `;
    document.head.appendChild(style);
}

// Přidání podpory pro swipe gesta na mobilních zařízeních
function addSwipeSupport() {
    const cardViewer = document.getElementById('cardViewer');
    const selectedCardsViewer = document.getElementById('selectedCardsViewer');
    
    if (cardViewer) {
        addSwipeEvents(cardViewer, showPrevCard, showNextCard);
    }
    
    if (selectedCardsViewer) {
        addSwipeEvents(selectedCardsViewer, showPrevSelectedCard, showNextSelectedCard);
    }
}

function addSwipeEvents(element, onSwipeRight, onSwipeLeft) {
    let touchStartX = 0;
    let touchEndX = 0;
    
    element.addEventListener('touchstart', function(e) {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    
    element.addEventListener('touchend', function(e) {
        touchEndX = e.changedTouches[0].screenX;
        const swipeDistance = touchEndX - touchStartX;
        
        if (Math.abs(swipeDistance) > 50) { // Minimální vzdálenost pro detekci swipe
            if (swipeDistance > 0) {
                // Swipe doprava - předchozí karta
                onSwipeRight();
            } else {
                // Swipe doleva - další karta
                onSwipeLeft();
            }
        }
    }, { passive: true });
}

// Inicializace při načtení dokumentu
document.addEventListener('DOMContentLoaded', function() {
    initializeStyles();
    addSwipeSupport();
});