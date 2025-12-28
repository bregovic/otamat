"use client";

import { useTimesUpSocket } from "@/context/TimesUpSocketContext";
import { useState, useEffect } from "react";
import { Play, Plus, Minus, Settings } from "lucide-react";
import QRCode from "react-qr-code";
import Link from "next/link";

export default function HostPage() {
    const socket = useTimesUpSocket();
    const [step, setStep] = useState<'SETUP' | 'LOBBY' | 'GAME'>('SETUP');

    // Setup Form State
    const [hostName, setHostName] = useState('');
    const [hostAvatar, setHostAvatar] = useState('🐶');
    const [gameMode, setGameMode] = useState<'LOBBY' | 'SINGLE_DEVICE'>('LOBBY');

    // Restore Game Mode from LocalStorage
    useEffect(() => {
        const storedMode = localStorage.getItem('timesup_gameMode');
        if (storedMode === 'SINGLE_DEVICE' || storedMode === 'LOBBY') {
            setGameMode(storedMode);
        }
    }, []);
    const [manualPlayersText, setManualPlayersText] = useState('');

    // Game Settings
    const [teamCount, setTeamCount] = useState(2);
    const [timeLimit, setTimeLimit] = useState(60);

    // New: Category State
    const [difficulty, setDifficulty] = useState<number>(1);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [availableCats, setAvailableCats] = useState<string[]>([]);
    const [showCatModal, setShowCatModal] = useState(false);
    const [cardCount, setCardCount] = useState(40);

    // Live Game State
    const [createdGame, setCreatedGame] = useState<any>(null);
    const [players, setPlayers] = useState<any[]>([]);
    const [timeLeft, setTimeLeft] = useState(0);

    // Local Single Device State (Moved to Top Level)
    const [localState, setLocalState] = useState<{
        activePlayerId: number | null,
        activeCardId: number | null,
        turnExpiresAt: number | null,
        scores: Record<number, number>,
        allCards: any[],
        shuffledCards: any[],
        guessedCardIds: number[],
        currentRound: number,
        currentTeamId: number | null,
        teamPlayerIndices: Record<number, number>,
        savedRemainingTime: number | null
    }>({
        activePlayerId: null,
        activeCardId: null,
        turnExpiresAt: null,
        scores: {},
        allCards: [],
        shuffledCards: [],
        guessedCardIds: [],
        currentRound: 1,
        currentTeamId: null,
        teamPlayerIndices: {},
        savedRemainingTime: null
    });
    const [localTimeLeft, setLocalTimeLeft] = useState(0);

    // Sync Local State with Game
    // Initialize Local State & Cards
    useEffect(() => {
        const initData = async () => {
            if (!createdGame) return;

            // 0. Sync basic game state
            setLocalState(prev => ({
                ...prev,
                activePlayerId: createdGame.activePlayerId || prev.activePlayerId,
                activeCardId: createdGame.activeCardId || prev.activeCardId,
                turnExpiresAt: createdGame.turnExpiresAt ? new Date(createdGame.turnExpiresAt).getTime() : prev.turnExpiresAt,
                currentTeamId: prev.currentTeamId || createdGame.currentTeamId || (createdGame.teams?.[0]?.id) || null
            }));

            // 1. Setup Cards
            if (localState.allCards.length === 0) {
                let cardsToUse = createdGame.cards || [];

                // Fallback: Fetch from Admin API (If backend not updated)
                if (cardsToUse.length === 0) {
                    try {
                        const apiUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
                            ? 'http://localhost:4000'
                            : 'https://otamat-production.up.railway.app';
                        const res = await fetch(`${apiUrl}/timesup/admin/cards`);
                        const allCards = await res.json();

                        // Simple Local Filter
                        cardsToUse = allCards.filter((c: any) => {
                            // Default to Level 1 if not set, fallback to local state 'difficulty'
                            const gameDiff = createdGame.difficulty ?? difficulty ?? 1;
                            const cardLevel = Number(c.level);
                            const targetDiff = Number(gameDiff);

                            // Logic:
                            // Diff 1 (Easy) -> Level 1 only (or 0/1)
                            // Diff 2 (Medium) -> Level 1 & 2
                            // Diff 3 (Hard) -> All levels
                            let levelMatch = false;

                            if (targetDiff === 1) levelMatch = cardLevel <= 1;
                            else if (targetDiff === 2) levelMatch = cardLevel <= 2;
                            else levelMatch = true; // Level 3+ includes everything

                            const cats = createdGame.selectedCategories ? createdGame.selectedCategories.split(';') : (selectedCategories || []);
                            const catMatch = cats.length > 0 ? cats.includes(c.category) : true;

                            return levelMatch && catMatch;
                        });

                        // Limit to reasonable number (e.g. 40 or custom)
                        // Fallback to local 'cardCount' if createdGame doesn't have it (e.g. old backend)
                        const limit = createdGame.cardCount ?? cardCount ?? 40;
                        cardsToUse = cardsToUse.sort(() => Math.random() - 0.5).slice(0, limit);
                    } catch (e) {
                        console.error("Failed to fetch fallback cards", e);
                    }
                }

                if (cardsToUse.length > 0) {
                    const shuffled = [...cardsToUse].sort(() => Math.random() - 0.5);
                    setLocalState(prev => ({
                        ...prev,
                        allCards: cardsToUse,
                        shuffledCards: shuffled,
                        guessedCardIds: []
                    }));
                }
            }

            // 2. Sync Scores
            if (createdGame.players && Array.isArray(createdGame.players)) {
                const s: Record<number, number> = {};
                createdGame.players.forEach((p: any) => {
                    if (p && p.id) s[p.id] = p.score || 0;
                });
                setLocalState(prev => ({ ...prev, scores: { ...prev.scores, ...s } }));
            }
        };

        initData();
    }, [createdGame]);

    // Local Timer Effect
    useEffect(() => {
        const interval = setInterval(() => {
            if (localState.turnExpiresAt) {
                const diff = (localState.turnExpiresAt - Date.now()) / 1000;
                setLocalTimeLeft(Math.max(0, Math.ceil(diff)));
            } else {
                setLocalTimeLeft(0);
            }
        }, 100);
        return () => clearInterval(interval);
    }, [localState.turnExpiresAt]);

    // TIMER LOGIC
    useEffect(() => {
        const expiresAt = localState.turnExpiresAt || createdGame?.turnExpiresAt;
        if (expiresAt) {
            // Immediate update
            const updateTimer = () => {
                const now = Date.now();
                const target = typeof expiresAt === 'number' ? expiresAt : new Date(expiresAt).getTime();
                const diff = (target - now) / 1000;
                setLocalTimeLeft(Math.max(0, Math.ceil(diff)));
            };

            updateTimer();
            const interval = setInterval(updateTimer, 100);
            return () => clearInterval(interval);
        } else {
            setLocalTimeLeft(0);
        }
    }, [createdGame?.turnExpiresAt, localState.turnExpiresAt]);

    // DETECT END OF TURN (Timer hit 0) -> Rotate Team
    useEffect(() => {
        // Calculate real remaining time to avoid relying on potentially stale 'localTimeLeft'
        const now = Date.now();
        const expiresAt = localState.turnExpiresAt || 0;
        const remaining = expiresAt - now;

        // Condition: Must have an expiration, active player, AND time must be effectively up (e.g. < 200ms)
        // Also ensure we are NOT in a "saved time" transition (though turnExpiresAt should be null then)
        if (localState.turnExpiresAt && localState.activePlayerId && remaining <= 200) {
            // Turn ended naturally by time

            // Rotate Team
            setLocalState(prev => {
                if (!createdGame || !createdGame.teams || createdGame.teams.length === 0) return { ...prev, activePlayerId: null, turnExpiresAt: null };

                // Find current team index
                const currentIdx = createdGame.teams.findIndex((t: any) => t.id === prev.currentTeamId);
                const nextIdx = (currentIdx + 1) % createdGame.teams.length;
                const nextTeamId = createdGame.teams[nextIdx].id;

                return {
                    ...prev,
                    activePlayerId: null, // Reset active player
                    turnExpiresAt: null,
                    currentTeamId: nextTeamId
                };
            });
        }
    }, [localTimeLeft, localState.turnExpiresAt, localState.activePlayerId, createdGame]);

    useEffect(() => {
        // Fetch categories
        const apiUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
            ? 'http://localhost:4000'
            : 'https://otamat-production.up.railway.app';

        fetch(`${apiUrl}/timesup/admin/cards/categories`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setAvailableCats(data);
            })
            .catch(err => console.error("Failed to load categories", err));
    }, []);

    const toggleCategory = (cat: string) => {
        if (selectedCategories.includes(cat)) {
            setSelectedCategories(selectedCategories.filter(c => c !== cat));
        } else {
            setSelectedCategories([...selectedCategories, cat]);
        }
    };

    useEffect(() => {
        if (!socket) return;

        // Check for existing session
        const storedHostId = localStorage.getItem('timesup_hostId');
        if (storedHostId) {
            console.log("Restoring session for host:", storedHostId);
            socket.emit('timesup:getHostGame', { hostId: storedHostId });
        }

        // Listen for events from TimesUpGateway
        socket.on('timesup:created', (game) => {
            console.log("Game Created:", game);
            localStorage.setItem('timesup_hostId', game.hostId);
            setCreatedGame(game);
            setPlayers(game.players || []);
            setStep('LOBBY');
        });

        socket.on('timesup:gameData', (game) => {
            console.log("Game Restored:", game);
            setCreatedGame(game);
            setPlayers(game.players || []);
            if (game.status === 'PLAYING' || game.status === 'ROUND_1') {
                setStep('GAME');
            } else {
                setStep('LOBBY');
            }
        });

        socket.on('timesup:gameStarted', (game) => {
            console.log("Game Started:", game);
            setCreatedGame(game);
            setPlayers(game.players || []);
            setStep('GAME');
        });

        socket.on('timesup:playerJoined', (player) => {
            console.log("Player Joined:", player);
            setPlayers(prev => [...prev, player]);
        });

        socket.on('timesup:turnStarted', (game) => {
            setCreatedGame(game);
        });

        socket.on('timesup:cardGuessed', (game) => {
            setCreatedGame(game);
        });

        socket.on('timesup:roundOver', (game) => {
            alert("Kolo skončilo!");
            setCreatedGame(game);
        });

        return () => {
            socket.off('timesup:created');
            socket.off('timesup:gameData');
            socket.off('timesup:gameStarted');
            socket.off('timesup:playerJoined');
            socket.off('timesup:turnStarted');
            socket.off('timesup:cardGuessed');
            socket.off('timesup:roundOver');
        };
    }, [socket]);

    const createGame = () => {
        if (!socket) return;
        if (!hostName) return alert("Zadej jméno organizátora!");

        const manualPlayers = gameMode === 'SINGLE_DEVICE'
            ? manualPlayersText.split('\n').map(s => s.trim()).filter(s => s.length > 0)
            : [];

        if (gameMode === 'SINGLE_DEVICE' && manualPlayers.length < 1) return alert("Zadej alespoň 1 dalšího hráče!");

        socket.emit('timesup:create', {
            hostName,
            hostAvatar,
            mode: gameMode,
            players: manualPlayers,
            teamCount,
            timeLimit,
            difficulty,
            selectedCategories,
            cardCount
        });

        // Save mode
        localStorage.setItem('timesup_gameMode', gameMode);
    };

    const startGame = () => {
        if (!socket) return;
        socket.emit('timesup:startGame', { gameCode: createdGame.gameCode });
    }

    // === RENDER: GAME BOARD (GAME) ===
    if (step === 'GAME' && createdGame) {
        // Single Device / Co-op Mode Logic (TeamCount=1 or Explicit Mode)
        if (createdGame.teamCount === 1 || gameMode === 'SINGLE_DEVICE') {
            // Data derivation (Prefer Local, Fallback to Server)
            const activePlayerId = localState.activePlayerId || createdGame.activePlayerId;
            const activeCardId = localState.activeCardId || createdGame.activeCardId;

            // Consolidate Player List (from top-level or teams)
            const allPlayers: any[] = [];
            if (createdGame.players && Array.isArray(createdGame.players)) {
                allPlayers.push(...createdGame.players);
            }
            if (createdGame.teams && Array.isArray(createdGame.teams)) {
                createdGame.teams.forEach((t: any) => {
                    if (t.players && Array.isArray(t.players)) {
                        // Avoid duplicates if player is in both lists
                        t.players.forEach((tp: any) => {
                            if (!allPlayers.find(p => p.id === tp.id)) {
                                allPlayers.push(tp);
                            }
                        });
                    }
                });
            }

            // Safety check for players array
            const activePlayer = allPlayers.find((p: any) => p && p.id === activePlayerId);

            // Fix: Look for card in createdGame OR localState (fallback)
            const activeCard = activeCardId
                ? (createdGame.cards?.find((c: any) => c.id === activeCardId) || localState.shuffledCards.find(c => c.id === activeCardId))
                : null;

            const isTurnActive = activePlayer && localTimeLeft > 0;

            const handleExit = () => {
                if (confirm("Opravdu ukončit hru a vrátit se do lobby?")) {
                    localStorage.removeItem('timesup_host_id');
                    setStep('LOBBY');
                    setCreatedGame(null);
                    window.location.reload();
                }
            };

            const startTurn = () => {
                // 1. Try Server (Sync for Lobby Mode)
                if (gameMode !== 'SINGLE_DEVICE' && socket) {
                    socket.emit('timesup:startTurn', { gameCode: createdGame.gameCode });
                }

                // Check if any cards left in this round
                const availableCards = localState.shuffledCards.filter(c => !localState.guessedCardIds.includes(c.id));

                if (availableCards.length === 0) {
                    // Start Next Round Logic check (should handle in handleGuess mostly, but just in case)
                    alert("Zdá se, že v tomto kole už nejsou karty. Ukončete kolo.");
                    return;
                }

                // 2. Run Local Logic (Immediate Feedback)

                // Identify Team and Player
                let nextPlayer: any = null;
                const currentTeamId = localState.currentTeamId;

                if (currentTeamId) {
                    const team = createdGame.teams?.find((t: any) => t.id === currentTeamId);
                    if (team && team.players && team.players.length > 0) {
                        // Round Robin within team
                        const playerIdx = localState.teamPlayerIndices[currentTeamId] || 0;
                        nextPlayer = team.players[playerIdx % team.players.length];

                        // Increment index for next time this team plays
                        setLocalState(prev => ({
                            ...prev,
                            teamPlayerIndices: {
                                ...prev.teamPlayerIndices,
                                [currentTeamId]: (prev.teamPlayerIndices[currentTeamId] || 0) + 1
                            }
                        }));
                    }
                }

                // Fallback to random if no team logic works
                if (!nextPlayer && allPlayers.length > 0) {
                    nextPlayer = allPlayers[Math.floor(Math.random() * allPlayers.length)];
                }

                if (!nextPlayer || !nextPlayer.id) return;

                // Pick Card
                const nextCard = availableCards[Math.floor(Math.random() * availableCards.length)];

                if (!nextCard || !nextCard.id) return;

                // Determine Time Limit (Default or Carry-over)
                const duration = localState.savedRemainingTime || timeLimit;
                setLocalTimeLeft(duration);

                setLocalState(prev => ({
                    ...prev,
                    activePlayerId: nextPlayer.id,
                    activeCardId: nextCard.id,
                    turnExpiresAt: Date.now() + (duration * 1000),
                    savedRemainingTime: null // Clear saved time after using it
                }));
            };

            const handleGuess = (guesserId: number) => {
                // 1. Try Server (Sync for Lobby Mode)
                if (gameMode !== 'SINGLE_DEVICE' && socket) {
                    socket.emit('timesup:guess', { gameCode: createdGame.gameCode, guesserId });
                }

                setLocalState(prev => {
                    const newScores = { ...prev.scores };
                    if (prev.activePlayerId) newScores[prev.activePlayerId] = (newScores[prev.activePlayerId] || 0) + 1;
                    newScores[guesserId] = (newScores[guesserId] || 0) + 1;

                    // Add to guessed
                    const newGuessedIds = [...prev.guessedCardIds, prev.activeCardId as number];

                    // Check remaining
                    const remaining = prev.shuffledCards.filter(c => !newGuessedIds.includes(c.id));

                    if (remaining.length === 0) {
                        // END OF ROUND
                        const nextRound = prev.currentRound + 1;

                        // Calculate remaining time
                        const now = Date.now();
                        const expiresAt = prev.turnExpiresAt || 0;
                        const remainingSeconds = Math.max(0, Math.ceil((expiresAt - now) / 1000));

                        if (nextRound > 3) {
                            // GAME OVER
                            alert("KONEC HRY! Všechna kola odehrána.");
                            return {
                                ...prev,
                                scores: newScores,
                                activeCardId: null,
                                turnExpiresAt: null,
                                guessedCardIds: newGuessedIds,
                                currentRound: 4, // 4 = Ended
                                savedRemainingTime: null
                            };
                        } else {
                            // NEXT ROUND PREP
                            let msg = `KOLO ${prev.currentRound} UKONČENO! Připravte se na Kolo ${nextRound}.`;
                            let savedTime = null;
                            let newIndices = { ...prev.teamPlayerIndices };

                            if (remainingSeconds > 0 && prev.currentTeamId) {
                                msg += `\n\nHráč pokračuje se zbývajícím časem: ${remainingSeconds}s`;
                                savedTime = remainingSeconds;
                                // Decrement index so the SAME player goes again
                                const currentIdx = newIndices[prev.currentTeamId] || 0;
                                newIndices[prev.currentTeamId] = Math.max(0, currentIdx - 1);
                            }

                            alert(msg);

                            // Reshuffle all cards
                            const reshuffled = [...prev.allCards].sort(() => Math.random() - 0.5);
                            return {
                                ...prev,
                                scores: newScores,
                                activeCardId: null,
                                turnExpiresAt: null,
                                guessedCardIds: [], // Reset guessed for new round
                                shuffledCards: reshuffled,
                                currentRound: nextRound,
                                savedRemainingTime: savedTime,
                                teamPlayerIndices: newIndices
                            };
                        }
                    }

                    // Pick Next Card
                    const nextCard = remaining[Math.floor(Math.random() * remaining.length)];

                    return {
                        ...prev,
                        scores: newScores,
                        activeCardId: nextCard.id,
                        guessedCardIds: newGuessedIds
                    };
                });
            };

            return (
                <div className="min-h-screen bg-[#0a0a0f] text-white p-8 flex flex-col items-center w-full relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('/otamat/grid.svg')] opacity-10 pointer-events-none"></div>

                    <button
                        onClick={handleExit}
                        className="absolute top-8 left-8 z-50 bg-red-500/10 text-red-500 hover:bg-red-600 hover:text-white px-6 py-3 rounded-xl font-bold transition-all"
                    >
                        UKONČIT HRU
                    </button>

                    {/* Top Info */}
                    <div className="z-10 w-full flex justify-between items-start max-w-6xl">
                        <div className="flex flex-col">
                            <div className="text-xl font-bold text-slate-500 tracking-widest uppercase">
                                {localState.currentRound === 1 && "Kolo 1: Popis slovy"}
                                {localState.currentRound === 2 && "Kolo 2: Jedno slovo"}
                                {localState.currentRound === 3 && "Kolo 3: Pantomima"}
                                {localState.currentRound > 3 && "KONEC HRY"}
                            </div>
                            <div className="text-sm text-slate-600 font-bold">
                                Zbývá karet: {localState.shuffledCards.length - localState.guessedCardIds.length}
                            </div>
                        </div>
                        <div className="text-4xl font-black font-mono text-purple-500 tabular-nums">{localTimeLeft}s</div>
                    </div>

                    {/* Center: Action */}
                    <div className="flex-1 flex flex-col items-center justify-center z-10 w-full max-w-4xl gap-8">
                        {!isTurnActive ? (
                            <div className="flex flex-col items-center gap-8 animate-in fade-in zoom-in duration-300">
                                {localState.currentRound > 3 ? (
                                    <>
                                        <h2 className="text-5xl font-black text-white glow-text">VÍTĚZOVÉ</h2>
                                        <div className="grid grid-cols-2 gap-8 w-full">
                                            {Object.entries(localState.scores)
                                                .sort(([, a], [, b]) => b - a)
                                                .map(([pid, score], idx) => {
                                                    const p = players.find(p => p.id === parseInt(pid));
                                                    return (
                                                        <div key={pid} className="bg-[#1e1e24] p-6 rounded-2xl flex items-center justify-between border border-[#2a2a35] shadow-xl">
                                                            <div className="flex items-center gap-4">
                                                                <span className="text-3xl font-black text-slate-500">#{idx + 1}</span>
                                                                <div className="text-4xl">{p?.avatar}</div>
                                                                <div className="text-xl font-bold text-white">{p?.name || 'Hráč'}</div>
                                                            </div>
                                                            <div className="text-4xl font-black text-purple-500">{score}</div>
                                                        </div>
                                                    )
                                                })}
                                        </div>
                                        <button onClick={handleExit} className="bg-white text-black px-12 py-6 rounded-2xl font-black text-3xl mt-8">Zpět do menu</button>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex flex-wrap gap-8 justify-center w-full mb-8">
                                            {createdGame.teams?.map((team: any) => {
                                                const isCurrentTeam = localState.currentTeamId === team.id;
                                                // Determine next player for this team
                                                const nextPlayerIdx = localState.teamPlayerIndices[team.id] || 0;
                                                const nextPlayerInTeam = team.players?.[nextPlayerIdx % team.players?.length];

                                                return (
                                                    <div key={team.id} className={`p-6 rounded-2xl border-2 transition-all min-w-[200px] flex flex-col gap-2 ${isCurrentTeam ? 'border-purple-500 bg-purple-500/10 scale-105 shadow-xl shadow-purple-500/10' : 'border-[#2a2a35] bg-[#15151a] opacity-60'}`}>
                                                        <div className="text-xl font-black uppercase text-slate-300">{team.name}</div>
                                                        <div className="text-4xl font-black text-white">{localState.scores[team.id] || team.score || 0}</div>
                                                        <div className="h-px bg-white/10 my-2"></div>
                                                        <div className="flex flex-col gap-1">
                                                            {team.players?.map((p: any, idx: number) => (
                                                                <div key={p.id} className={`flex items-center gap-2 ${p.id === nextPlayerInTeam?.id && isCurrentTeam ? 'text-purple-400 font-bold' : 'text-slate-500'}`}>
                                                                    <span>{p.avatar}</span>
                                                                    <span>{p.name}</span>
                                                                    {p.id === nextPlayerInTeam?.id && isCurrentTeam && <span className="text-xs bg-purple-500 text-white px-1 rounded ml-auto">NA ŘADĚ</span>}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {localState.savedRemainingTime && (
                                            <div className="bg-yellow-500/20 border border-yellow-500 text-yellow-500 px-6 py-3 rounded-xl mb-6 font-bold animate-pulse text-xl">
                                                ⏱️ Pokračujeme s časem: {localState.savedRemainingTime}s
                                            </div>
                                        )}

                                        <h2 className="text-4xl font-bold text-slate-300">Připraveni?</h2>
                                        <button onClick={startTurn} className="bg-white text-black px-16 py-8 rounded-[3rem] text-5xl font-black shadow-2xl shadow-white/20 hover:scale-105 transition-all hover:bg-purple-50 flex items-center gap-4">
                                            <Play size={48} fill="currentColor" /> START
                                        </button>
                                    </>
                                )}
                            </div>
                        ) : (
                            <>
                                <div className="text-center animate-in slide-in-from-top duration-300">
                                    <p className="text-slate-400 uppercase tracking-widest text-sm mb-2 font-bold">Předvádí</p>
                                    <h2 className="text-5xl font-black text-white flex items-center justify-center gap-3">
                                        <span className="text-4xl">{activePlayer?.avatar}</span> {activePlayer?.name}
                                    </h2>
                                </div>

                                <div className="bg-white !text-black p-12 rounded-[3rem] shadow-2xl w-full text-center flex flex-col items-center gap-4 animate-in zoom-in duration-300 transform hover:scale-105 transition-transform border-[6px] border-purple-500">
                                    <h1 className="text-7xl font-black tracking-tighter leading-tight break-words !text-black" style={{ color: 'black' }}>{activeCard?.value || "..."}</h1>
                                    {activeCard?.description && <p className="text-2xl font-bold !text-slate-500 mt-2" style={{ color: '#64748b' }}>{activeCard.description}</p>}
                                    {activeCard?.imageUrl && <img src={activeCard.imageUrl} alt="Card" className="max-h-64 rounded-xl mt-4 object-contain" />}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Bottom: Guessers */}
                    {isTurnActive && (
                        <div className="z-10 w-full mb-4 animate-in slide-in-from-bottom duration-500">
                            <p className="text-center text-slate-500 mb-6 font-bold uppercase tracking-widest text-sm">Kdo uhodl?</p>
                            <div className="flex flex-wrap gap-4 justify-center">
                                {createdGame.teams?.find((t: any) => t.id === localState.currentTeamId)?.players?.filter((p: any) => p.id !== activePlayer?.id).map((p: any) => (
                                    <button
                                        key={p.id}
                                        onClick={() => handleGuess(p.id)}
                                        className="bg-[#1e1e24] border-2 border-[#2a2a35] hover:border-green-500 hover:bg-green-500/10 px-6 py-4 rounded-2xl flex flex-col items-center gap-2 transition-all active:scale-95 min-w-[120px] group"
                                    >
                                        <span className="text-3xl group-hover:scale-110 transition-transform">{p.avatar}</span>
                                        <span className="font-bold text-lg text-slate-200 group-hover:text-white">{p.name}</span>
                                        <span className="text-xs bg-black/30 px-2 py-1 rounded-full font-mono text-slate-400">
                                            {(localState.scores[p.id] || 0) + (p.score || 0) > localState.scores[p.id] ? (localState.scores[p.id] || 0) + (p.score || 0) : (localState.scores[p.id] || p.score || 0)} bodů
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        // Legacy UI (Standard TV Scoreboard)
        return (
            <div className="min-h-screen bg-[#0a0a0f] text-white p-8 flex flex-col items-center w-full relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('/otamat/grid.svg')] opacity-10 pointer-events-none"></div>

                <div className="text-center z-10 mt-12 mb-8 space-y-2">
                    <h2 className="text-purple-500 font-bold tracking-widest uppercase">KOLO {createdGame.round || 1}</h2>
                    <h1 className="text-6xl font-black text-white tracking-tighter">
                        {createdGame.round === 1 && "POPIS SLOVY"}
                        {createdGame.round === 2 && "JEDNO SLOVO"}
                        {createdGame.round === 3 && "PANTOMIMA"}
                    </h1>
                    <p className="text-xl text-slate-500 font-bold animate-pulse mt-4">
                        Sledujte instrukce na svém zařízení!
                    </p>
                </div>

                {/* Scoreboard */}
                <div className="flex gap-8 z-10 w-full max-w-4xl justify-center mb-12">
                    {createdGame.teams?.map((team: any, idx: number) => (
                        <div key={team.id} className={`glass-card p-6 flex-1 rounded-2xl border-t-4 transition-all ${createdGame.currentTeamId === team.id ? 'border-yellow-400 bg-white/10 scale-105 shadow-yellow-500/20 shadow-2xl' : 'border-slate-700 opacity-70'}`}>
                            <div className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Tým {idx + 1}</div>
                            <div className="text-2xl font-bold truncate mb-2">{team.name}</div>
                            <div className="text-5xl font-black font-mono">{team.score || 0}</div>
                        </div>
                    ))}
                </div>

                {/* Active Player Info */}
                <div className="z-10 bg-[#1e1e24] p-12 rounded-3xl border border-[#2a2a35] shadow-2xl flex flex-col items-center gap-6">
                    {createdGame.currentTeamId ? (
                        <>
                            <p className="text-2xl text-slate-300">Na řadě je:</p>
                            <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                                {createdGame.teams.find((t: any) => t.id === createdGame.currentTeamId)?.name}
                            </h2>
                        </>
                    ) : (
                        <h2 className="text-4xl font-bold">Připravte se!</h2>
                    )}
                </div>
            </div>
        )
    }

    // === RENDER: LOBBY (LOBBY) ===
    if (step === 'LOBBY' && createdGame) {
        const joinUrl = `https://hollyhop.cz/otamat/timesup/join?code=${createdGame.gameCode}`;

        return (
            <div className="min-h-screen bg-[#0a0a0f] text-white p-8 flex flex-col items-center justify-between w-full relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('/otamat/grid.svg')] opacity-10 pointer-events-none"></div>

                <button
                    onClick={() => {
                        if (confirm("Opravdu ukončit lobby a vrátit se do menu?")) {
                            localStorage.removeItem('timesup_host_id');
                            setStep('SETUP');
                            setCreatedGame(null);
                            window.location.reload();
                        }
                    }}
                    className="absolute top-8 left-8 z-50 bg-red-500/10 text-red-500 hover:bg-red-600 hover:text-white px-6 py-3 rounded-xl font-bold transition-all"
                >
                    UKONČIT DO MENU
                </button>

                <div className="flex flex-col items-center gap-2 mt-10 z-10 w-full relative">
                    <h1 className="text-4xl font-black mb-2 tracking-tighter">Lobby</h1>
                    <p className="text-slate-400 text-lg">Připojte se na <span className="font-bold text-white">hollyhop.cz</span> pomocí PINu:</p>

                    <div className="bg-[#1e1e24] border-2 border-[#2a2a35] rounded-3xl px-12 py-4 shadow-2xl mt-2">
                        <span className="text-8xl font-black text-white tracking-widest tabular-nums leading-none">
                            {createdGame.gameCode}
                        </span>
                    </div>

                    <div className="absolute right-0 top-0 hidden xl:flex flex-col items-center gap-2 bg-white p-3 rounded-xl shadow-xl transform rotate-3 hover:rotate-0 transition-transform duration-300">
                        <QRCode value={joinUrl} size={150} />
                        <p className="text-black font-bold text-sm uppercase tracking-wider">Naskenuj a hraj!</p>
                    </div>
                </div>

                <div className="w-full max-w-4xl flex-1 mt-12 mb-8 z-10">
                    <div className="bg-[#15151a] border border-[#2a2a35] rounded-3xl p-8 h-full min-h-[400px] flex flex-col shadow-2xl">
                        <div className="flex items-center gap-4 border-b border-[#2a2a35] pb-6 mb-6">
                            <div className="flex items-center gap-2 text-2xl font-bold text-white">
                                <span className="text-purple-500">👥</span>
                                Hráči ({players.length})
                            </div>
                        </div>

                        {players.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-4">
                                <div className="animate-pulse text-6xl">⏳</div>
                                <p className="text-2xl font-medium">Čekání na hráče...</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto pr-2">
                                {players.map((p) => (
                                    <div key={p.id} className="bg-[#1e1e24] p-4 rounded-xl flex items-center gap-3 border border-[#2a2a35] animate-in zoom-in duration-300">
                                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-xl shadow-lg">
                                            {p.avatar || '👤'}
                                        </div>
                                        <span className="font-bold text-lg truncate flex items-center gap-2">
                                            {p.name}
                                            {p.isHost && <span className="text-xs bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-full border border-yellow-500/50">HOST</span>}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-6 z-10 mb-8">
                    <button onClick={startGame} className="bg-white hover:bg-slate-200 text-black px-12 py-5 rounded-2xl font-black text-xl flex items-center gap-3 shadow-lg shadow-white/10 hover:scale-105 transition-all active:scale-95 group">
                        <Play size={24} className="fill-black group-hover:scale-110 transition-transform" />
                        SPUSTIT HRU
                    </button>
                </div>
            </div>
        )
    }

    // === RENDER: SETUP WIZARD (SETUP) ===
    return (
        <div className="min-h-screen flex items-center justify-center p-8 relative overflow-hidden w-full bg-[#0a0a0f]">
            <div className="absolute inset-0 bg-[url('/otamat/grid.svg')] opacity-10 pointer-events-none"></div>

            <Link href="/timesup/admin" className="absolute top-8 right-8 text-slate-600 hover:text-white transition-colors p-2 z-20 bg-[#15151a] rounded-full border border-[#2a2a35] hover:border-slate-500 shadow-xl">
                <Settings size={24} />
            </Link>

            <div className="w-full max-w-6xl relative z-10 flex flex-col gap-8">
                <h1 className="text-5xl font-black text-white text-center tracking-tighter mb-4">Vytvořit hru</h1>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

                    {/* LEFT CARD: IDENTITY & MODE */}
                    <div className="bg-[#15151a] border border-[#2a2a35] p-8 rounded-3xl shadow-2xl space-y-8 h-full">
                        <div className="space-y-4">
                            <label className="text-slate-400 text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-purple-500"></span> Organizátor
                            </label>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <input
                                        type="text"
                                        placeholder="Tvoje jméno"
                                        className="w-full bg-[#0a0a0f] border-2 border-[#2a2a35] rounded-2xl p-5 text-xl text-white font-bold focus:border-purple-500 focus:outline-none transition-colors placeholder:text-slate-700"
                                        value={hostName}
                                        onChange={e => setHostName(e.target.value)}
                                    />
                                </div>
                                <button className="w-20 h-[72px] bg-[#0a0a0f] border-2 border-[#2a2a35] rounded-2xl text-4xl flex items-center justify-center hover:bg-[#1e1e24] transition-colors relative group">
                                    {hostAvatar}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="text-slate-400 text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span> Režim hry
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setGameMode('LOBBY')}
                                    className={`p-6 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all active:scale-95 ${gameMode === 'LOBBY' ? 'border-blue-500 bg-blue-500/10 text-white shadow-lg shadow-blue-500/10' : 'border-[#2a2a35] bg-[#0a0a0f] text-slate-500 hover:border-slate-600 hover:text-slate-300'}`}
                                >
                                    <span className="text-4xl mb-1">📱</span>
                                    <span className="font-black text-lg">Lobby</span>
                                    <span className="text-xs font-semibold opacity-60">Každý na svém mobilu</span>
                                </button>
                                <button
                                    onClick={() => setGameMode('SINGLE_DEVICE')}
                                    className={`p-6 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all active:scale-95 ${gameMode === 'SINGLE_DEVICE' ? 'border-blue-500 bg-blue-500/10 text-white shadow-lg shadow-blue-500/10' : 'border-[#2a2a35] bg-[#0a0a0f] text-slate-500 hover:border-slate-600 hover:text-slate-300'}`}
                                >
                                    <span className="text-4xl mb-1">📺</span>
                                    <span className="font-black text-lg">Jedno zařízení</span>
                                    <span className="text-xs font-semibold opacity-60">Hra koluje dokola</span>
                                </button>
                            </div>
                        </div>

                        {/* Card Count */}
                        <div className="bg-[#1e1e24] p-6 rounded-2xl border border-[#2a2a35] flex flex-col gap-4">
                            <div className="flex items-center gap-3 text-slate-300">
                                <Settings size={20} className="text-purple-400" />
                                <span className="font-bold uppercase tracking-wider text-sm">Počet karet</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                                <button
                                    onClick={() => setCardCount(Math.max(10, cardCount - 5))}
                                    className="p-3 bg-[#2a2a35] rounded-xl hover:bg-white hover:text-black transition-colors"
                                >
                                    <Minus size={20} />
                                </button>
                                <span className="text-3xl font-black min-w-[3ch] text-center">{cardCount}</span>
                                <button
                                    onClick={() => setCardCount(Math.min(200, cardCount + 5))}
                                    className="p-3 bg-[#2a2a35] rounded-xl hover:bg-white hover:text-black transition-colors"
                                >
                                    <Plus size={20} />
                                </button>
                            </div>
                            <p className="text-xs text-slate-500 text-center">Doporučeno: 40 pro krátkou hru</p>
                        </div>
                    </div>

                    {/* RIGHT CARD: SETTINGS & CATEGORY */}
                    <div className="bg-[#15151a] border border-[#2a2a35] p-8 rounded-3xl shadow-2xl space-y-8 h-full flex flex-col">

                        {/* Difficulty Selection */}
                        <div className="space-y-4">
                            <label className="text-slate-400 text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-pink-500"></span> Obtížnost
                            </label>
                            <div className="grid grid-cols-4 gap-2">
                                <button onClick={() => setDifficulty(1)} className={`p-3 rounded-xl border-2 font-bold transition-all ${difficulty === 1 ? 'border-yellow-400 bg-yellow-400/20 text-yellow-50' : 'border-[#2a2a35] text-slate-500'}`}>1</button>
                                <button onClick={() => setDifficulty(2)} className={`p-3 rounded-xl border-2 font-bold transition-all ${difficulty === 2 ? 'border-orange-400 bg-orange-400/20 text-orange-50' : 'border-[#2a2a35] text-slate-500'}`}>2</button>
                                <button onClick={() => setDifficulty(3)} className={`p-3 rounded-xl border-2 font-bold transition-all ${difficulty === 3 ? 'border-red-500 bg-red-500/20 text-red-50' : 'border-[#2a2a35] text-slate-500'}`}>3</button>
                                <button onClick={() => setDifficulty(0)} className={`p-3 rounded-xl border-2 font-bold transition-all ${difficulty === 0 ? 'border-green-400 bg-green-400/20 text-green-50' : 'border-[#2a2a35] text-slate-500'}`}>Děti</button>
                            </div>
                        </div>

                        {/* Categories Selection */}
                        <div className="space-y-4">
                            <label className="text-slate-400 text-sm font-bold uppercase tracking-widest flex items-center gap-2 justify-between">
                                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-purple-500"></span> Kategorie</div>
                                <span className="text-xs normal-case opacity-50 text-right">{selectedCategories.length === 0 ? 'Všechny' : `${selectedCategories.length} vybráno`}</span>
                            </label>

                            <button
                                onClick={() => setShowCatModal(true)}
                                className="w-full bg-[#0a0a0f] border-2 border-[#2a2a35] hover:border-purple-500 rounded-xl p-4 text-left flex items-center justify-between group transition-colors"
                            >
                                <span className="text-slate-300 font-medium truncate">
                                    {selectedCategories.length === 0 ? 'Všechny kategorie' : selectedCategories.join(', ')}
                                </span>
                                <Settings size={18} className="text-slate-500 group-hover:text-purple-500 transition-colors" />
                            </button>
                        </div>

                        {/* Category Modal */}
                        {showCatModal && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                                <div className="bg-[#15151a] border border-[#2a2a35] w-full max-w-2xl max-h-[80vh] rounded-3xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
                                    <div className="p-6 border-b border-[#2a2a35] flex items-center justify-between">
                                        <h2 className="text-2xl font-black text-white">Vyber kategorie</h2>
                                        <button onClick={() => setShowCatModal(false)} className="bg-[#2a2a35] hover:bg-slate-700 p-2 rounded-full transition-colors">
                                            <Minus className="rotate-45" /> {/* Close Icon */}
                                        </button>
                                    </div>
                                    <div className="p-6 overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {availableCats.length === 0 && <span className="text-slate-500 col-span-3 text-center py-8 italic">Žádné kategorie k dispozici</span>}
                                        {availableCats.map(cat => (
                                            <button
                                                key={cat}
                                                onClick={() => toggleCategory(cat)}
                                                className={`px-4 py-3 rounded-xl text-sm font-bold border-2 transition-all flex items-center justify-between ${selectedCategories.includes(cat) ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-500/20' : 'bg-[#0a0a0f] border-[#2a2a35] text-slate-400 hover:border-slate-500 hover:text-slate-200'}`}
                                            >
                                                <span>{cat}</span>
                                                {selectedCategories.includes(cat) && <div className="w-2 h-2 rounded-full bg-white"></div>}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="p-6 border-t border-[#2a2a35] flex justify-end gap-4">
                                        <button onClick={() => setSelectedCategories([])} className="px-6 py-3 rounded-xl font-bold text-slate-400 hover:text-white hover:bg-[#2a2a35] transition-colors">
                                            Zrušit výběr
                                        </button>
                                        <button onClick={() => setShowCatModal(false)} className="bg-white hover:bg-slate-200 text-black px-8 py-3 rounded-xl font-black shadow-lg hover:scale-105 transition-all">
                                            HOTOVO
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {gameMode === 'SINGLE_DEVICE' && (
                            <div className="space-y-3 flex-1 flex flex-col min-h-[200px] mt-4">
                                <label className="text-slate-400 text-sm font-bold uppercase tracking-widest">Hráči (každý na nový řádek)</label>
                                <textarea
                                    className="w-full flex-1 bg-[#0a0a0f] border-2 border-[#2a2a35] rounded-2xl p-4 text-white font-medium focus:border-purple-500 focus:outline-none transition-colors resize-none placeholder:text-slate-700 leading-relaxed"
                                    placeholder={`Jirka\nKarel\nAlena\n...`}
                                    value={manualPlayersText}
                                    onChange={e => setManualPlayersText(e.target.value)}
                                />
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-6 mt-6">
                            <div className="space-y-3">
                                <label className="text-slate-400 text-sm font-bold uppercase tracking-widest">Týmy</label>
                                <div className="flex items-center justify-between bg-[#0a0a0f] rounded-2xl p-2 border-2 border-[#2a2a35]">
                                    <button onClick={() => setTeamCount(Math.max(1, teamCount - 1))} className="w-12 h-12 hover:bg-[#2a2a35] rounded-xl transition text-slate-300 hover:text-white flex items-center justify-center"><Minus size={20} /></button>
                                    <span className="text-2xl font-black text-white tabular-nums">{teamCount}</span>
                                    <button onClick={() => setTeamCount(Math.min(8, teamCount + 1))} className="w-12 h-12 hover:bg-[#2a2a35] rounded-xl transition text-slate-300 hover:text-white flex items-center justify-center"><Plus size={20} /></button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-slate-400 text-sm font-bold uppercase tracking-widest">Čas / Kolo</label>
                                <div className="flex items-center justify-between bg-[#0a0a0f] rounded-2xl p-2 border-2 border-[#2a2a35]">
                                    <button onClick={() => setTimeLimit(Math.max(30, timeLimit - 10))} className="w-12 h-12 hover:bg-[#2a2a35] rounded-xl transition text-slate-300 hover:text-white flex items-center justify-center"><Minus size={20} /></button>
                                    <div className="text-center">
                                        <span className="text-2xl font-black text-pink-500 tabular-nums">{timeLimit}</span>
                                        <span className="text-xs font-bold text-slate-500 ml-1">s</span>
                                    </div>
                                    <button onClick={() => setTimeLimit(Math.min(120, timeLimit + 10))} className="w-12 h-12 hover:bg-[#2a2a35] rounded-xl transition text-slate-300 hover:text-white flex items-center justify-center"><Plus size={20} /></button>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 mt-auto">
                            <button onClick={createGame} className="w-full bg-white hover:bg-slate-200 text-black font-black text-xl py-6 rounded-2xl flex items-center justify-center gap-3 group shadow-xl shadow-white/5 hover:scale-[1.02] transition-all">
                                <Play size={28} className="fill-black group-hover:scale-110 transition-transform" />
                                VYTVOŘIT HRU
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
