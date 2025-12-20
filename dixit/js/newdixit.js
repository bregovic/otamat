let isLoading = false;
let lastGamesHash = '';

document.addEventListener('DOMContentLoaded', function() {
    const enableTimeLimit = document.getElementById('enableTimeLimit');
    const timeLimitSection = document.getElementById('timeLimitSection');
    const gameSetupForm = document.getElementById('gameSetupForm');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const refreshIndicator = document.getElementById('refreshIndicator');
    const playerNameModal = new bootstrap.Modal(document.getElementById('playerNameModal'));
    const confirmJoinGame = document.getElementById('confirmJoinGame');
    const selectedGameId = document.getElementById('selectedGameId');
    const joinPlayerName = document.getElementById('joinPlayerName');

    enableTimeLimit.addEventListener('change', function() {
        timeLimitSection.style.display = this.checked ? 'block' : 'none';
    });

    gameSetupForm.addEventListener('submit', handleGameSetup);
    confirmJoinGame.addEventListener('click', handleJoinGame);
    
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible') {
            loadActiveGames(true);
        }
    });

    window.addEventListener('focus', () => loadActiveGames(true));

    loadActiveGames(true);
    setInterval(() => loadActiveGames(false), 2000);
});

function calculateGamesHash(games) {
    return games.map(game => `${game.id}-${game.player_count}`).join('|');
}

// Upravená funkce, která nebude zobrazovat indikátor "Aktualizováno"
function showRefreshIndicator() {
    // Prázdná funkce - nic se nebude zobrazovat
}

function setLoading(loading) {
    isLoading = loading;
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.style.display = loading ? 'flex' : 'none';
    }
}

async function loadActiveGames(force = false) {
    if (isLoading) return;
    
    setLoading(true);
    try {
        const timestamp = new Date().getTime();
        const response = await fetch(`/dixit/php/get_active_games.php?_=${timestamp}`, {
            method: 'GET',
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            },
            cache: 'no-store'
        });
        
        if (!response.ok) {
            console.error('Network response was not ok:', response.status);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            const gamesContainer = document.getElementById('activeGames');
            if (!gamesContainer) return;
            
            // Výpočet hash stávajících her
            const newGamesHash = calculateGamesHash(data.games);
            
            // Pokud se hash nezměnil a není vynucená aktualizace, neprovádíme žádné změny v DOM
            if (!force && newGamesHash === lastGamesHash) {
                setLoading(false);
                return;
            }
            
            // Uložíme nový hash
            lastGamesHash = newGamesHash;
            
            // Aktualizace obsahu - minimalizujeme překreslování DOM
            const existingGameIds = new Map();
            Array.from(gamesContainer.children).forEach(child => {
                const gameCard = child.querySelector('.game-card');
                if (gameCard && gameCard.dataset.gameId) {
                    existingGameIds.set(parseInt(gameCard.dataset.gameId), child);
                }
            });
            
            // Vytvoříme fragment pro nový obsah
            const fragment = document.createDocumentFragment();
            let hasVisibleChanges = false;
            
            data.games.forEach(game => {
                const existingElement = existingGameIds.get(game.id);
                
                if (existingElement) {
                    // Aktualizace existujícího prvku
                    const playerCount = existingElement.querySelector('.player-count');
                    if (playerCount && playerCount.textContent !== `Hráči: ${game.player_count}/12`) {
                        playerCount.textContent = `Hráči: ${game.player_count}/12`;
                        hasVisibleChanges = true;
                    }
                    
                    const updateTime = existingElement.querySelector('.game-update');
                    if (updateTime) {
                        updateTime.textContent = `Aktualizováno: ${new Date(game.modify).toLocaleTimeString()}`;
                    }
                    
                    fragment.appendChild(existingElement);
                    existingGameIds.delete(game.id);
                } else {
                    // Vytvoření nového prvku
                    const gameCard = createGameCard(game);
                    fragment.appendChild(gameCard);
                    hasVisibleChanges = true;
                }
            });
            
            // Pokud došlo k viditelné změně nebo je vyžadována aktualizace, aktualizujeme DOM
            if (hasVisibleChanges || force || existingGameIds.size > 0) {
                gamesContainer.innerHTML = '';
                gamesContainer.appendChild(fragment);
            }
        }
    } catch (error) {
        console.error('Error loading games:', error);
    } finally {
        setLoading(false);
    }
}

function createGameCard(game) {
    const col = document.createElement('div');
    col.className = 'col-md-4 col-sm-6 mb-3';
    
    col.innerHTML = `
        <div class="game-card" data-game-id="${game.id}">
            <div class="game-group">${game.group || 'Skupina bez názvu'}</div>
            <div class="player-count">Hráči: ${game.player_count}/12</div>
            <div class="game-update">Aktualizováno: ${new Date(game.modify).toLocaleTimeString()}</div>
        </div>
    `;
    
    // Přidání event listeneru pro kliknutí na kartu
    const gameCardElement = col.querySelector('.game-card');
    if (gameCardElement) {
        gameCardElement.addEventListener('click', () => joinGame(game.id));
    }
    
    return col;
}

function joinGame(gameId) {
    const selectedGameIdEl = document.getElementById('selectedGameId');
    if (selectedGameIdEl) {
        selectedGameIdEl.value = gameId;
    }
    
    const playerNameModal = new bootstrap.Modal(document.getElementById('playerNameModal'));
    playerNameModal.show();
}

async function handleJoinGame() {
    const joinPlayerNameEl = document.getElementById('joinPlayerName');
    const selectedGameIdEl = document.getElementById('selectedGameId');
    
    if (!joinPlayerNameEl || !selectedGameIdEl) return;
    
    const playerName = joinPlayerNameEl.value.trim();
    const gameId = selectedGameIdEl.value;
    
    if (!playerName) {
        alert('Prosím zadejte své jméno');
        return;
    }

    try {
        setLoading(true);
        const response = await fetch('/dixit/php/join_game.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            },
            body: JSON.stringify({
                gameId: gameId,
                playerName: playerName
            })
        });

        const data = await response.json();
        
        if (data.success) {
            await loadActiveGames(true);
            window.location.href = `dixit.html#${data.gameId}#${data.playerHash}`;
        } else {
            alert('Chyba při připojování ke hře: ' + (data.error || 'Neznámá chyba'));
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Chyba při připojování ke hře: ' + error.message);
    } finally {
        setLoading(false);
    }
}

async function handleGameSetup(e) {
    e.preventDefault();
    
    const groupNameEl = document.getElementById('groupName');
    const playerNameEl = document.getElementById('playerName');
    const enableTimeLimitEl = document.getElementById('enableTimeLimit');
    const timeLimitEl = document.getElementById('timeLimit');
    
    if (!groupNameEl || !playerNameEl || !enableTimeLimitEl || !timeLimitEl) return;
    
    const groupName = groupNameEl.value.trim();
    const playerName = playerNameEl.value.trim();
    
    if (!playerName) {
        alert('Prosím zadejte jméno hráče');
        return;
    }
    
    const gameSettings = {
        group: groupName,
        players: [playerName],
        timeLimit: {
            enabled: enableTimeLimitEl.checked,
            duration: enableTimeLimitEl.checked 
                ? parseInt(timeLimitEl.value) 
                : 60
        }
    };

    try {
        setLoading(true);
        const response = await fetch('/dixit/php/create_game.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            },
            body: JSON.stringify(gameSettings)
        });

        const data = await response.json();
        
        if (data.success) {
            // Explicitně vynutíme aktualizaci seznamu her před přesměrováním
            await loadActiveGames(true);
            window.location.href = `dixit.html#${data.gameId}#${data.playerHash}`;
        } else {
            alert('Chyba při vytváření hry: ' + (data.error || 'Neznámá chyba'));
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Chyba při vytváření hry: ' + error.message);
    } finally {
        setLoading(false);
    }
}