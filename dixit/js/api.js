// Funkce pro porovnání obsahu bez HTML tagů
function compareTextContent(text1, text2) {
    // Funkce odstraní HTML tagy a porovná čistý text
    function stripHTML(html) {
        const temp = document.createElement('div');
        temp.innerHTML = html;
        return temp.textContent || temp.innerText || '';
    }
    
    return stripHTML(text1) === stripHTML(text2);
}

// Funkce pro ovládání herního API
async function selectCard(cardId) {
    if (isLoading) return;
    isLoading = true;
    
    try {
        console.log("Vybírám kartu s ID:", cardId, "pro hru:", gameId, "hráč:", playerHash);
        
        const response = await fetch('/dixit/php/select_card.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                gameId: parseInt(gameId),
                playerHash: playerHash,
                cardId: parseInt(cardId),
                getNewCard: true  // Požadavek na novou kartu
            })
        });

        const data = await response.json();
        console.log("Select card response:", data); // Debug výpis
        
        if (data.success) {
            // Odstranění vybrané karty z lokálního pole
            const cardIndex = cards.findIndex(card => card.id === cardId);
            if (cardIndex !== -1) {
                // Odstranit kartu z pole
                cards.splice(cardIndex, 1);
                
                // Pokud server vrátil novou kartu, přidáme ji do balíčku
                if (data.newCard) {
                    cards.push({
                        id: data.newCard.id,
                        image_url: data.newCard.image_url
                    });
                }
                
                // Úprava indexu, pokud je potřeba
                if (currentCardIndex >= cards.length) {
                    currentCardIndex = cards.length - 1;
                    if (currentCardIndex < 0) currentCardIndex = 0;
                }
                
                // Aktualizace zobrazení
                if (cards.length > 0) {
                    updateCardDisplay();
                } else {
                    // Pokud nemáme žádné karty, zavřeme prohlížeč
                    toggleCardViewer();
                }
            }
            
            // Zavřít prohlížeč karet po výběru
            if (isCardViewerVisible) {
                toggleCardViewer();
            }
            
            // Aktualizujeme stav hry a seznam karet
            await loadGameStatus();
            await loadPlayerCards();
            
            showNotification('Karta byla úspěšně vybrána!');
        } else {
            showNotification('Chyba při výběru karty: ' + (data.error || 'Neznámá chyba'));
        }
    } catch (error) {
        console.error('Error selecting card:', error);
        showNotification('Chyba při výběru karty: ' + error.message);
    } finally {
        isLoading = false;
    }
}

// Načtení informací o hráči
async function loadPlayerInfo() {
    if (isLoading) return;
    
    try {
        const timestamp = Date.now();
        const response = await fetch(`/dixit/php/get_player_info.php?gameId=${gameId}&playerHash=${playerHash}&_=${timestamp}`);
        const data = await response.json();
        
        if (data.success) {
            // Aktualizace jména hráče
            const playerNameElement = document.getElementById('playerName');
            if (playerNameElement.textContent !== data.playerName) {
                playerNameElement.textContent = data.playerName;
                // Nezobrazujeme indikátor, jen aktualizujeme obsah
            }
            
            // Aktualizace barvy hráče, pokud je k dispozici
            if (data.playerColor) {
                playerNameElement.style.backgroundColor = data.playerColor;
                // Určení barvy textu podle světlosti pozadí
                const isLightColor = isColorLight(data.playerColor);
                playerNameElement.style.color = isLightColor ? 'black' : 'white';
            }
        }
    } catch (error) {
        console.error('Error loading player info:', error);
    }
}

// Funkce pro určení, zda je barva světlá nebo tmavá
function isColorLight(hexColor) {
    // Odstraníme # ze začátku, pokud existuje
    const hex = hexColor.replace('#', '');
    
    // Převedeme hex na RGB
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Výpočet jasu podle vzorce pro luminositu
    // YIQ = (R * 299 + G * 587 + B * 114) / 1000
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    
    // Vrátíme true pro světlé barvy (více než 128), false pro tmavé
    return brightness > 128;
}

// Načtení stavu hry
async function loadGameStatus() {
    if (isLoading) return;
    
    try {
        const timestamp = Date.now();
        const response = await fetch(`/dixit/php/get_game_status.php?gameId=${gameId}&_=${timestamp}`);
        const data = await response.json();
        
        if (data.success) {
            const statusElement = document.querySelector('.game-status');
            const startButton = document.querySelector('.start-button');
            const selectedCardsButton = document.getElementById('selectedCardsButton');
            
            let newStatus = '';
            if (data.round === 0) {
                newStatus = 'Čekání na zahájení hry...';
                startButton.disabled = false;
                selectedCardsButton.style.display = 'none';
                
                // Resetujeme hlasovací stav
                votingPhase = false;
                hasVoted = false;
                
            } else {
                // Kapitán kola
                const isCaptain = data.activePlayer && data.activePlayer.hash === playerHash;
                startButton.disabled = true;
                
                // Uložení barvy a hashe kapitána pro pozdější použití
                if (data.activePlayer) {
                    captainHash = data.activePlayer.hash;
                    captainColor = data.activePlayer.color;
                }
                
                if (data.captainSelectedCard) {
                    // Kapitán už vybral kartu, ostatní hráči vybírají
                    if (isCaptain) {
                        if (data.pendingPlayers && data.pendingPlayers.length > 0) {
                            // Zobrazení seznamu čekajících hráčů s jejich barvami
                            if (data.pendingPlayersInfo && data.pendingPlayersInfo.length > 0) {
                                const playersList = data.pendingPlayersInfo.map(player => 
                                    `<span style="color: ${player.color}; font-weight: bold;">${player.name}</span>`
                                ).join(', ');
                                newStatus = `Čekání na karty od: ${playersList}`;
                            } else {
                                newStatus = `Čekání na karty od: ${data.pendingPlayers.join(', ')}`;
                            }
                        } else {
                            newStatus = 'Všichni hráči vybrali karty.';
                        }
                    } else {
                        // Zobrazení jména kapitána s jeho barvou
                        newStatus = `Hráč <span style="color: ${data.activePlayer.color}; font-weight: bold;">${data.activePlayer.name}</span> vybral kartu, zvolte svou kartu do hry.`;
                    }
                    
                    // Zobrazit tlačítko vybraných karet, pokud všichni hráči vybrali karty
                    if (data.allPlayersSelected) {
                        selectedCardsButton.style.display = 'block';
                        // Nastavit globální instrukce pro všechny hráče
                        newStatus = 'Všechny karty byly vybrány. Prohlédněte si je!';
                        
                        // Automaticky zobrazit galerii vybraných karet, pokud ještě není zobrazena
                        if (!isSelectedCardsViewerVisible && !isCardViewerVisible) {
                            setTimeout(() => {
                                toggleSelectedCardsViewer();
                            }, 1000); // Počkáme 1 sekundu, aby uživatel viděl, že se něco změnilo
                        }
                        
                        // Nastavíme hlasovací fázi
                        votingPhase = true;
                    } else {
                        selectedCardsButton.style.display = 'none';
                        votingPhase = false;
                    }
                } else {
                    // Kapitán ještě nevybral kartu
                    if (isCaptain) {
                        newStatus = 'Jste na tahu! Vyberte kartu...';
                    } else {
                        // Zobrazení jména kapitána s jeho barvou
                        newStatus = `Na tahu je <span style="color: ${data.activePlayer.color}; font-weight: bold;">${data.activePlayer.name}</span>`;
                    }
                    selectedCardsButton.style.display = 'none';
                    votingPhase = false;
                }
            }
            
            // Kontrola, zda se obsah skutečně změnil
            let statusChanged = false;
            
            if (newStatus.includes('<span')) {
                // Pro HTML obsah musíme porovnávat textContent
                if (!compareTextContent(statusElement.innerHTML, newStatus)) {
                    statusElement.innerHTML = newStatus;
                    statusChanged = true;
                }
            } else {
                // Pro čistý text používáme přímé porovnání
                if (statusElement.textContent !== newStatus) {
                    statusElement.textContent = newStatus;
                    statusChanged = true;
                }
            }
            
            // Zobrazíme notifikaci pouze pokud se obsah skutečně změnil
            if (statusChanged) {
                // Nezobrazovat "Aktualizováno" při běžných aktualizacích
                // showRefreshIndicator();
            }
        }
    } catch (error) {
        console.error('Error loading game status:', error);
    }
}

// Načtení karet hráče
async function loadPlayerCards() {
    if (isLoading) return;
    
    try {
        const timestamp = Date.now();
        const response = await fetch(`/dixit/php/get_player_cards.php?gameId=${gameId}&playerHash=${playerHash}&_=${timestamp}`);
        const data = await response.json();
        
        if (data.success && data.cards && data.cards.length > 0) {
            const hasChanges = JSON.stringify(cards) !== JSON.stringify(data.cards);
            
            if (hasChanges) {
                cards = data.cards;
                updateCardDisplay();
                // Nezobrazovat "Aktualizováno" při běžných aktualizacích
                // showRefreshIndicator();
            }
        }
    } catch (error) {
        console.error('Error loading cards:', error);
    }
}

// Načtení vybraných karet
async function loadSelectedCards() {
    if (isLoading) return;
    isLoading = true;
    
    try {
        const timestamp = Date.now();
        const response = await fetch(`/dixit/php/get_selected_cards.php?gameId=${gameId}&_=${timestamp}`);
        const data = await response.json();
        
        if (data.success && data.cards && data.cards.length > 0) {
            selectedCards = data.cards;
            currentSelectedCardIndex = 0;
            
            // Nastavíme hlasovací fázi, pokud všichni hráči vybrali karty
            votingPhase = data.allPlayersSelected;
            
            // Aktualizace kapitánova hashe
            if (data.captainHash) {
                captainHash = data.captainHash;
            }
            
            updateSelectedCardDisplay();
        } else {
            selectedCards = [];
            document.getElementById('currentSelectedCard').src = '';
            document.getElementById('selectedCardCounter').textContent = '0/0';
            document.getElementById('selectedCardPlayerInfo').textContent = '';
        }
    } catch (error) {
        console.error('Error loading selected cards:', error);
    } finally {
        isLoading = false;
    }
}

// Spuštění hry
async function startGame() {
    if (isLoading) return;
    isLoading = true;
    
    try {
        const response = await fetch('/dixit/php/start_round.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                gameId: gameId
            })
        });

        const data = await response.json();
        
        if (data.success) {
            // Okamžitá aktualizace
            await loadGameStatus();
            
            // Informuj uživatele, jen pokud je vybrán aktivní hráč
            if (data.selectedPlayer && data.selectedPlayer.name) {
                showNotification(`Hra začala! Na tahu je ${data.selectedPlayer.name}`, 5000);
            } else {
                showNotification("Hra byla úspěšně zahájena!", 5000);
            }
        } else {
            showNotification('Chyba při spuštění hry: ' + (data.error || 'Neznámá chyba'), 5000);
        }
    } catch (error) {
        console.error('Error starting game:', error);
        showNotification('Chyba při spuštění hry: ' + error.message, 5000);
    } finally {
        isLoading = false;
    }
}

// Function to vote for a card
async function voteForCard(cardId) {
    if (isLoading) return;
    isLoading = true;
    
    try {
        console.log("Voting for card with ID:", cardId, "in game:", gameId, "player:", playerHash);
        
        const response = await fetch('/dixit/php/vote_for_card.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                gameId: parseInt(gameId),
                playerHash: playerHash,
                cardId: parseInt(cardId)
            })
        });

        const data = await response.json();
        console.log("Vote response:", data); // Debug output
        
        if (data.success) {
            hasVoted = true;
            
            // Update voting info
            updateVotingInfo(data.pendingVoters, data.captainCardId);
            
            // Store captain card ID from response if provided
            if (data.captainCardId) {
                captainCardId = data.captainCardId;
            }
            
            // Show appropriate notification
            if (data.isCorrect !== undefined) {
                showNotification(
                    data.isCorrect ? 
                    'Gratuluji! Našli jste správnou kartu!' : 
                    'Bohužel, to není karta kapitána.',
                    5000
                );
            } else {
                showNotification('Váš hlas byl zaznamenán!', 3000);
            }
            
            // Show results notification if voting is complete
            if (data.results) {
                // All votes are in, show results
                setTimeout(() => {
                    showNotification('Hlasování dokončeno! Zobrazují se výsledky.', 5000);
                }, 1000);
            }
            
            // Update the card display to refresh voting state
            updateSelectedCardDisplay();
            
        } else {
            showNotification('Chyba při hlasování: ' + (data.error || 'Neznámá chyba'), 5000);
        }
    } catch (error) {
        console.error('Error voting:', error);
        showNotification('Chyba při hlasování: ' + error.message, 5000);
    } finally {
        isLoading = false;
    }
}