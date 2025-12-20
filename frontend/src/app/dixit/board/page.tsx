"use client";
import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { BACKEND_URL } from '../../../utils/config';
import QRCode from 'react-qr-code';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';

const QUESTIONS = [
    "Jakou kartu vybere vypravěč?",
    "Kdo bude mít nejlepší intuici?",
    "Který obrázek je ten pravý?"
];

const POINTS = 30;

// Generate positions for a winding path (Snake style)
// 0 (Start) -> 30 (End)
const getMapPosition = (index: number) => {
    // 3 Rows of 10? Or winding curve.
    // Let's do a large S-curve across the bottom screen area or full screen overlay.
    // Normalized 0-30.
    // We want a clear path.

    // Let's try 4 rows.
    // Row 0 (Bottom): 0-7
    // Row 1: 8-15
    // Row 2: 16-23
    // Row 3 (Top): 24-30

    if (index > POINTS) index = POINTS;

    const row = Math.floor(index / 8);
    const col = index % 8;

    // ZigZag: Even rows (0, 2) go Right. Odd rows (1, 3) go Left.
    const isEvenRow = row % 2 === 0;

    const xStep = 100 / 9; // spacing
    const yStep = 18; // vertical spacing %

    const x = isEvenRow ? (col + 1) * xStep : 100 - ((col + 1) * xStep);
    const y = 90 - (row * yStep); // Start from bottom (90%)

    return { left: `${x}%`, top: `${y}%` };
};

export default function DixitBoard() {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    const [socket, setSocket] = useState<Socket | null>(null);
    const [gameState, setGameState] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [stagedFiles, setStagedFiles] = useState<{ file: File, id: string, rotation: number, preview: string }[]>([]);

    useEffect(() => {
        // Auto-create game on mount
        connectAndCreate({});

        return () => {
            if (socket) socket.close();
        };
    }, []);

    const connectAndCreate = (data: { hostId?: string, guestInfo?: { nickname: string, avatar: string } }) => {
        const newSocket = io(BACKEND_URL, {
            transports: ['websocket'],
            upgrade: false
        });
        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('Board connected');
            newSocket.emit('dixit:create', data, (response: any) => {
                if (response.success) {
                    console.log('Game created:', response.gameId);
                } else {
                    console.error('Failed to create game:', response.error);
                    setError(response.error || 'Failed to create game');
                }
            });
        });

        newSocket.on('dixit:created', (state) => setGameState(state));
        newSocket.on('dixit:update', (state) => setGameState(state));
    };

    // Guest Login State
    const [guestNickname, setGuestNickname] = useState('');
    const [guestAvatar, setGuestAvatar] = useState('cow');

    const [isCreating, setIsCreating] = useState(false);

    const handleCreateBoard = () => {
        setIsCreating(true);
        console.log("Starting board creation...");

        setError(null);

        // Force new connection
        if (socket) socket.close();

        const newSocket = io(BACKEND_URL, {
            transports: ['websocket'],
            upgrade: false,
            reconnection: true,
            reconnectionAttempts: 3
        });
        setSocket(newSocket);

        // Timeout safety
        const timeout = setTimeout(() => {
            if (isCreating) {
                setIsCreating(false);
                setError("Odezva serveru trvá příliš dlouho. Zkuste to znovu.");
                newSocket.close();
            }
        }, 10000);

        newSocket.on('connect', () => {
            console.log('socket connected, emitting create...');
            // We do NOT send guestInfo anymore. The Host must join via phone to play.
            newSocket.emit('dixit:create', {}, (response: any) => {
                clearTimeout(timeout);
                setIsCreating(false);

                if (!response?.success && response?.event !== 'dixit:created') {
                    setError(response?.error || 'Nepodařilo se vytvořit hru (Backend Error)');
                }
            });
        });

        newSocket.on('connect_error', (err) => {
            console.error('Socket connect error:', err);
            clearTimeout(timeout);
            setIsCreating(false);
            setError(`Chyba připojení: ${err.message}`);
        });

        newSocket.on('dixit:created', (state) => {
            clearTimeout(timeout);
            setGameState(state);
        });
        newSocket.on('dixit:update', (state) => setGameState(state));
    };

    // Timeout warning (only if logged in and waiting)
    useEffect(() => {
        if (!user) return;
        const timer = setTimeout(() => {
            if (!gameState && !error) {
                setError('Hra se nenačetla. Zkontrolujte připojení.');
            }
        }, 8000);
        return () => clearTimeout(timer);
    }, [gameState, user, error]);



    const handleStart = () => {
        if (socket && gameState) socket.emit('dixit:start', { pin: gameState.pinCode });
    };

    const handleNextRound = () => {
        if (socket && gameState) socket.emit('dixit:nextRound', { pin: gameState.pinCode });
    };

    // ... File Staging State & Logic (Keep as is, just reinserting strictly for context match if needed, but I'm skipping to avoid messing it up. Actually, I only need to replace up to the Staging Logic start)
    // Wait, the ReplacementContent must fully replace the target.
    // I will encompass the Staging Logic in the target to be safe, or just stop before it.
    // The previous code had `handleGuestCreate` then `useEffect` then `if(!user...)` then `handleStart`.
    // My replacement redefines `handleCreateBoard` (renamed), `useEffect`, `if(!user...)` and `handleStart` and `handleNextRound`.

    // VISUAL FIXES IN LOBBY:
    // I need to update the LOBBY JSX as well, which is further down.
    // I will return the updated functions here, and then do a second edit for the Lobby JSX.


    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        const newFiles = Array.from(e.target.files).map(file => ({
            file,
            id: Math.random().toString(36).substr(2, 9),
            rotation: 0,
            preview: URL.createObjectURL(file)
        }));
        setStagedFiles(prev => [...prev, ...newFiles]);
        e.target.value = ''; // Reset input to allow re-selecting same files
    };

    const rotateStaged = (id: string) => {
        setStagedFiles(prev => prev.map(f => f.id === id ? { ...f, rotation: (f.rotation + 90) % 360 } : f));
    };

    const removeStaged = (id: string) => {
        setStagedFiles(prev => prev.filter(f => f.id !== id));
    };

    const getRotatedBlob = (file: File, rotation: number): Promise<Blob> => {
        if (rotation === 0) return Promise.resolve(file);

        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d')!;

                if (rotation % 180 !== 0) {
                    canvas.width = img.height;
                    canvas.height = img.width;
                } else {
                    canvas.width = img.width;
                    canvas.height = img.height;
                }

                ctx.translate(canvas.width / 2, canvas.height / 2);
                ctx.rotate(rotation * Math.PI / 180);
                ctx.drawImage(img, -img.width / 2, -img.height / 2);

                canvas.toBlob(blob => resolve(blob!), 'image/jpeg', 0.95);
            };
            img.src = URL.createObjectURL(file);
        });
    };

    const uploadStaged = async () => {
        if (stagedFiles.length === 0) return;
        setUploading(true);
        const formData = new FormData();

        try {
            for (const item of stagedFiles) {
                const processedBlob = await getRotatedBlob(item.file, item.rotation);
                formData.append('files', processedBlob as any, item.file.name);
            }

            const res = await fetch(`${BACKEND_URL}/dixit/upload`, { method: 'POST', body: formData });
            if (res.ok) {
                alert('Obrázky úspěšně nahrány!');
                setStagedFiles([]);
                setIsSettingsOpen(false);
            } else {
                alert('Chyba při nahrávání.');
            }
        } catch (err) {
            console.error(err);
            alert('Chyba při připojení k backendu.');
        } finally {
            setUploading(false);
        }
    };

    if (!gameState) {
        return (
            <div className="h-screen w-full bg-black text-white flex flex-col items-center justify-center p-8 text-center">
                {!user && !isLoading ? (
                    <div className="text-yellow-400 text-xl font-bold">
                        ⚠️ Nejste přihlášeni. Přesměrovávám na přihlášení...
                    </div>
                ) : error ? (
                    <div className="text-red-500 text-xl font-bold max-w-md">
                        ⚠️ {error}
                        <button onClick={() => window.location.reload()} className="mt-4 px-6 py-2 bg-white text-black rounded-lg block mx-auto hover:bg-gray-200">
                            Zkusit znovu
                        </button>
                    </div>
                ) : (
                    <div className="animate-pulse text-indigo-300">
                        {isLoading ? 'Ověřování uživatele...' : 'Načítání magického světa...'}
                    </div>
                )}
            </div>
        );
    }

    // --- VICTORY SCREEN ---
    if (gameState.status === 'FINISHED') {
        const winner = gameState.players.reduce((prev: any, current: any) => (prev.score > current.score) ? prev : current);
        return (
            <main className="h-screen w-full bg-black text-white flex flex-col items-center justify-center p-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-yellow-600/20 to-black"></div>
                <div className="text-[150px] animate-bounce mb-8">👑</div>
                <h2 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-500 to-yellow-200 mb-8 max-w-4xl text-center leading-tight drop-shadow-2xl">
                    {winner.nickname} vítězí!
                </h2>
                <div className="text-4xl text-white/50 font-serif italic mb-20">{winner.score} bodů</div>

                <div className="flex gap-12 items-end">
                    {gameState.players.sort((a: any, b: any) => b.score - a.score).map((p: any, i: number) => (
                        <div key={p.id} className={`flex flex-col items-center ${i === 0 ? 'scale-125 order-2' : 'opacity-70 scale-90 order-1'}`}>
                            <div className="text-6xl mb-4 drop-shadow-lg">{{ cow: '🐮', fox: '🦊' }[p.avatar as string] || '👤'}</div>
                            <div className="text-2xl font-bold">{p.nickname}</div>
                            <div className="text-white/50 font-mono">{p.score}</div>
                        </div>
                    ))}
                </div>
            </main>
        );
    }

    // --- LOBBY ---
    if (gameState.phase === 'LOBBY') {
        const joinUrl = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}/dixit/play?pin=${gameState.pinCode}` : '';
        return (
            <main className="h-screen w-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900 via-purple-900 to-black text-white flex flex-col items-center justify-center p-8 relative overflow-hidden">
                {/* ... Lobby UI ... */}
                <div className="absolute top-8 right-8 z-50">
                    <button onClick={() => setIsSettingsOpen(true)} className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-all text-2xl" title="Nastavení a Karty">⚙️</button>
                </div>
                {isSettingsOpen && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-8">
                        <div className="bg-zinc-900 p-8 rounded-2xl max-w-md w-full relative border border-white/10 shadow-2xl">
                            <button onClick={() => setIsSettingsOpen(false)} className="absolute top-4 right-4 text-white/50 hover:text-white text-xl">✕</button>
                            <h2 className="text-2xl font-bold mb-6 text-center text-yellow-400 font-serif">Správa karet</h2>

                            <label className="block w-full border-2 border-dashed border-white/20 rounded-xl p-8 text-center cursor-pointer hover:bg-white/5 transition-colors group mb-4">
                                <input type="file" multiple accept="image/*" onChange={handleFileSelect} className="hidden" disabled={uploading} />
                                <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">➕</div>
                                <div className="text-lg font-bold">Vybrat obrázky</div>
                            </label>

                            {stagedFiles.length > 0 && (
                                <div className="grid grid-cols-2 gap-4 max-h-[40vh] overflow-y-auto mb-4 custom-scrollbar pr-2">
                                    {stagedFiles.map((item) => (
                                        <div key={item.id} className="relative group bg-black/40 rounded-lg p-2 border border-white/10">
                                            <div className="relative aspect-[2/3] overflow-hidden rounded mb-2">
                                                <img
                                                    src={item.preview}
                                                    className="w-full h-full object-contain transition-transform duration-300"
                                                    style={{ transform: `rotate(${item.rotation}deg)` }}
                                                />
                                            </div>
                                            <div className="flex justify-between gap-2">
                                                <button onClick={() => rotateStaged(item.id)} className="flex-1 bg-white/10 hover:bg-white/20 py-1 rounded text-sm" title="Otočit">↻</button>
                                                <button onClick={() => removeStaged(item.id)} className="flex-1 bg-red-500/20 hover:bg-red-500/40 text-red-300 py-1 rounded text-sm" title="Odstranit">✕</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {stagedFiles.length > 0 && (
                                <button
                                    onClick={uploadStaged}
                                    disabled={uploading}
                                    className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all disabled:opacity-50"
                                >
                                    {uploading ? 'Nahrávám...' : `Nahrát ${stagedFiles.length} karet`}
                                </button>
                            )}

                            {/* Progrss / Spinner */}
                            {uploading && (
                                <div className="mt-4 text-center">
                                    <div className="flex justify-center mb-2">
                                        <div className="w-8 h-8 boundary border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                </div>
                            )}

                            <p className="mt-6 text-xs text-center text-white/30">
                                Karty se automaticky zmenší a přidají do balíčku. <br />
                                <span className="text-yellow-500/50">Tip: Zkontrolujte otočení před nahráním!</span>
                            </p>
                        </div>
                    </div>
                )}
                <div className="z-10 flex flex-col items-center w-full max-w-7xl">
                    <h1 className="text-9xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 mb-8 drop-shadow-2xl">DIXIT</h1>

                    {/* Updated PIN Container with better responsiveness and sizing */}
                    <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16 mb-12 bg-black/30 p-8 md:p-12 rounded-[3rem] border border-white/10 backdrop-blur-md">
                        <div className="flex flex-col items-center">
                            <div className="text-2xl uppercase text-white/40 tracking-widest font-bold mb-2">PIN KÓD</div>
                            <div className="text-7xl md:text-9xl font-mono font-black tracking-wider text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">{gameState.pinCode}</div>
                        </div>
                        <div className="w-full h-px md:w-px md:h-32 bg-white/10"></div>
                        <div className="bg-white p-4 rounded-xl shadow-2xl"><QRCode value={joinUrl} size={150} /></div>
                    </div>

                    {/* Players List with margin */}
                    <div className="flex flex-wrap justify-center gap-12 mb-12 w-full min-h-[100px]">
                        {gameState.players.map((p: any) => (
                            <div key={p.id} className="flex flex-col items-center animate-bounce-subtle">
                                <div className="text-6xl mb-2 drop-shadow-xl">{{ cow: '🐮', fox: '🦊', pig: '🐷', chicken: '🐔' }[p.avatar as string] || '👤'}</div>
                                <div className="font-bold text-xl">{p.nickname}</div>
                            </div>
                        ))}
                        {gameState.players.length === 0 && <span className="text-white/30 text-2xl italic">Čekám na hráče...</span>}
                    </div>

                    {/* Start Button with margin */}
                    <button
                        onClick={handleStart}
                        disabled={gameState.players.length < 2}
                        className="mt-8 bg-gradient-to-r from-green-500 to-emerald-600 hover:scale-105 text-white text-3xl px-16 py-6 font-black rounded-full shadow-[0_0_50px_rgba(16,185,129,0.4)] transition-all disabled:opacity-50 disabled:grayscale disabled:scale-100 disabled:shadow-none"
                    >
                        {gameState.players.length < 2 ? `ČEKÁM NA DALŠÍ HRÁČE (${gameState.players.length}/2)` : "START HRY"}
                    </button>
                </div>
            </main>
        );
    }

    // --- GAME VIEW ---
    const storyteller = gameState.players.find((p: any) => p.id === gameState.storytellerId);

    // Determine if we show the Map overlay (only during results or if toggled? Let's show it always at bottom or as background?)
    // User wants "Animated board".
    // Let's make the Map visible as a background layer or distinct section.
    // We'll put it in a fixed overlay at the bottom that expands?
    // Or just visible behind the cards.
    // Let's put it as a semi-transparent overlay at the bottom 1/3 of screen.

    return (
        <main className="h-screen w-full bg-[#1a103c] text-white flex flex-col relative overflow-hidden">
            {/* Background Map (Full Screen Overlay with low opacity, or dedicated area) */}
            {/* We will use a dedicated Map Layer at the bottom */}

            {/* Header */}
            <header className="h-20 flex justify-between items-center px-8 bg-black/30 backdrop-blur-md z-30 border-b border-white/5">
                <div className="text-2xl font-serif text-yellow-400 font-bold">Kolo {gameState.currentRound}</div>
                <div className="text-2xl">Vypravěč: <span className="font-bold text-yellow-300">{storyteller?.nickname}</span></div>
            </header>

            {/* Main Content Area */}
            <div className="flex-1 relative z-20 flex flex-col items-center p-4 pb-[30vh]"> {/* Padding bottom for Map */}

                {gameState.phase === 'STORYTELLER_PICK' && (
                    <div className="flex flex-col items-center w-full justify-center h-full">
                        <div className="flex gap-12 flex-wrap justify-center items-center">
                            {gameState.players.map((p: any) => {
                                const isStoryteller = p.id === gameState.storytellerId;
                                return (
                                    <div key={p.id} className={`flex flex-col items-center transition-all duration-500 ${isStoryteller ? 'scale-125 opacity-100' : 'scale-90 opacity-40 grayscale'}`}>
                                        <div className={`text-6xl mb-4 drop-shadow-xl ${isStoryteller ? 'animate-bounce-subtle' : ''}`}>{{ cow: '🐮', fox: '🦊', pig: '🐷', chicken: '🐔' }[p.avatar as string] || '👤'}</div>
                                        <div className={`font-bold text-2xl ${isStoryteller ? 'text-yellow-400' : 'text-white'}`}>{p.nickname}</div>
                                        {isStoryteller && (
                                            <div className="mt-4 px-6 py-2 bg-yellow-500/10 border border-yellow-500/50 rounded-full text-yellow-300 text-sm font-bold uppercase tracking-widest animate-pulse">
                                                Vypravěč vybírá...
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {gameState.phase === 'PLAYERS_PICK' && (
                    <div className="flex flex-col items-center w-full">
                        <div className="bg-white/5 px-12 py-8 rounded-3xl border border-white/10 mb-12 text-center backdrop-blur-md">
                            <div className="text-xl uppercase tracking-widest text-indigo-300 mb-2">Nápověda</div>
                            <h2 className="text-6xl font-serif italic text-yellow-100">"{gameState.rounds?.[0]?.clue}"</h2>
                        </div>
                        <div className="flex gap-4 flex-wrap justify-center">
                            {gameState.players.filter((p: any) => p.id !== gameState.storytellerId).map((p: any) => (
                                <div key={p.id} className={`flex flex-col items-center transition-all duration-500 ${p.submittedCardId ? 'opacity-100 scale-110' : 'opacity-50'}`}>
                                    <div className="text-5xl mb-2">{{ cow: '🐮', fox: '🦊' }[p.avatar as string] || '👤'}</div>
                                    <div className={`font-bold ${p.submittedCardId ? 'text-green-400' : 'text-white/50'}`}>{p.nickname}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {(gameState.phase === 'VOTING' || gameState.phase === 'SCORING') && (
                    <div className="w-full h-full flex flex-col items-center">
                        <div className="text-3xl font-serif italic mb-6 text-yellow-100/80">"{gameState.rounds?.[0]?.clue}"</div>
                        <div className="flex-1 flex items-center justify-center w-full overflow-visible">
                            <div className="flex flex-wrap gap-4 justify-center items-center">
                                {(() => {
                                    const cardsPlayed = gameState.rounds?.[0]?.cardsPlayed || {};
                                    // Flatten
                                    const allCards = Object.entries(cardsPlayed).flatMap(([pid, cards]) => {
                                        if (Array.isArray(cards)) {
                                            return cards.map(c => ({ pid, cardId: c }));
                                        }
                                        return [{ pid, cardId: cards as string }];
                                    });

                                    // Deterministic Shuffle (Sort by cardId to keep it stable but random-looking)
                                    allCards.sort((a, b) => a.cardId.localeCompare(b.cardId));

                                    return allCards.map((cardData, index) => {
                                        const { pid, cardId } = cardData;
                                        const isScoring = gameState.phase === 'SCORING';
                                        const isStorytellerCard = pid === gameState.storytellerId;
                                        const votes = gameState.rounds?.[0]?.votes as Record<string, string> | undefined;

                                        // Find voters handling targetCardId
                                        const voters = votes ? Object.entries(votes)
                                            .filter(([_, targetCardId]) => targetCardId === cardId)
                                            .map(([vid]) => vid)
                                            : [];

                                        return (
                                            <div key={cardId} className={`relative group perspective transition-all duration-500 ${isScoring && isStorytellerCard ? 'z-20 scale-105' : 'z-10'}`}>
                                                <div className={`
                                                    relative w-48 h-72 rounded-xl overflow-hidden shadow-2xl transition-all duration-500 border-2
                                                    ${isScoring && isStorytellerCard ? 'border-yellow-500 ring-4 ring-yellow-500/30' : 'border-white/10'}
                                                    ${isScoring && !isStorytellerCard ? 'opacity-60 grayscale-[0.5]' : ''}
                                                `}>
                                                    <img src={`${BACKEND_URL}/dixit/image/${cardId}`} className="w-full h-full object-cover" />
                                                </div>

                                                {/* Number */}
                                                <div className="absolute -top-4 -left-4 w-10 h-10 bg-black text-white font-bold flex items-center justify-center rounded-full border-2 border-white/20 shadow-lg text-xl z-30">{index + 1}</div>

                                                {/* Voters */}
                                                {(isScoring || gameState.phase === 'VOTING') && voters.length > 0 && (
                                                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex -space-x-3 w-max px-2 py-1">
                                                        {voters.map(vid => {
                                                            const v = gameState.players.find((p: any) => p.id === vid);
                                                            return <div key={vid} className="text-2xl filter drop-shadow-md hover:scale-125 transition-transform" title={v?.nickname}>{{ cow: '🐮', fox: '🦊' }[v?.avatar as string] || '👤'}</div>
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </div>
                        {gameState.phase === 'SCORING' && (
                            <div className="absolute bottom-[35vh] z-50 animate-bounce">
                                <button onClick={handleNextRound} className="bg-yellow-500 hover:bg-yellow-400 text-black font-black text-xl px-12 py-4 rounded-full shadow-xl transition-colors">DALŠÍ KOLO ➜</button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* --- MAP VISUALIZATION (Bottom 30%) --- */}
            <div className="fixed bottom-0 left-0 w-full h-[30vh] bg-black/60 backdrop-blur-lg border-t-4 border-white/10 z-10 overflow-hidden">
                <div className="relative w-full h-full max-w-7xl mx-auto px-12 py-8">
                    {/* The Path Line */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20" preserveAspectRatio="none">
                        {/* Simple connection lines between dots */}
                        <path d={Array.from({ length: POINTS + 1 }).map((_, i) => {
                            const pos = getMapPosition(i);
                            const x = parseFloat(pos.left);
                            const y = parseFloat(pos.top);
                            // Need to convert % to approximate coordinates for SVG path d?
                            // CSS % is relative to container. SVG coord system is arbitrary.
                            // Let's just draw dots with div for simplicity, SVG line might be hard to align perfectly with % div positions without fixed size.
                            return "";
                        }).join(" ")} />
                    </svg>

                    {/* Map Dots */}
                    {Array.from({ length: POINTS + 1 }).map((_, i) => {
                        const pos = getMapPosition(i);
                        return (
                            <div key={i} className="absolute w-4 h-4 bg-white/10 rounded-full transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center text-[10px] text-white/30 font-mono" style={{ left: pos.left, top: pos.top }}>
                                {i % 5 === 0 && i}
                            </div>
                        );
                    })}

                    {/* Finish Flag */}
                    <div className="absolute text-4xl transform -translate-x-1/2 -translate-y-1/2 filter drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" style={{ ...getMapPosition(POINTS), top: '10%' }}>🏰</div>

                    {/* Avatars */}
                    {gameState.players.map((p: any) => {
                        const score = Math.min(p.score, POINTS);
                        const pos = getMapPosition(score);
                        return (
                            <div key={p.id}
                                className="absolute transition-all duration-[2000ms] ease-in-out transform -translate-x-1/2 -translate-y-1/2 z-20 hover:scale-150 cursor-pointer group"
                                style={{ left: pos.left, top: pos.top }}
                            >
                                <div className="text-4xl filter drop-shadow-[0_5px_10px_rgba(0,0,0,0.5)] group-hover:drop-shadow-[0_0_20px_rgba(255,255,0,0.8)] transition-all">
                                    {{ cow: '🐮', fox: '🦊' }[p.avatar as string] || '👤'}
                                </div>
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity pointer-events-none">
                                    {p.nickname} ({p.score})
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </main>
    );
}
