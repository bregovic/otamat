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

    useEffect(() => {
        if (isLoading) return;

        // If user is logged in, auto-create
        if (user) {
            connectAndCreate({ hostId: user.id });
        }
        // If not logged in, we wait for manual guest input (rendered below)
        return () => {
            if (socket) {
                socket.close();
            }
        };
    }, [user, isLoading]);

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

    const handleGuestCreate = () => {
        if (!guestNickname) return;
        connectAndCreate({
            guestInfo: { nickname: guestNickname, avatar: guestAvatar }
        });
    };

    if (!user && !gameState && !isLoading) {
        return (
            <div className="h-screen w-full bg-black text-white flex flex-col items-center justify-center p-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 to-black"></div>
                <div className="z-10 bg-white/10 p-12 rounded-3xl backdrop-blur-md border border-white/10 max-w-lg w-full text-center shadow-2xl">
                    <h1 className="text-6xl font-serif font-black mb-8 text-yellow-400">DIXIT</h1>
                    <h2 className="text-2xl mb-8 font-light">Vytvořit hru (Host)</h2>

                    <div className="space-y-6">
                        <input
                            type="text"
                            placeholder="Tvoje přezdívka"
                            className="w-full bg-black/50 text-white text-2xl p-4 rounded-xl border border-white/20 focus:border-yellow-400 outline-none text-center font-bold"
                            value={guestNickname}
                            onChange={e => setGuestNickname(e.target.value)}
                        />

                        <div className="flex justify-center gap-4">
                            {['cow', 'fox', 'pig', 'chicken'].map(av => (
                                <button
                                    key={av}
                                    onClick={() => setGuestAvatar(av)}
                                    className={`text-4xl p-4 rounded-xl transition-all ${guestAvatar === av ? 'bg-yellow-500 scale-110 shadow-lg' : 'bg-white/5 hover:bg-white/20'}`}
                                >
                                    {{ cow: '🐮', fox: '🦊', pig: '🐷', chicken: '🐔' }[av]}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={handleGuestCreate}
                            disabled={!guestNickname}
                            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:scale-105 text-white text-2xl font-black py-4 rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:scale-100 mt-4"
                        >
                            VYTVOŘIT HRU
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    useEffect(() => {
        const timer = setTimeout(() => {
            if (!gameState && !error) {
                setError('Hra se nenačetla. Zkontrolujte připojení.');
            }
        }, 8000);
        return () => clearTimeout(timer);
    }, [gameState]);

    const handleStart = () => {
        if (socket && gameState) socket.emit('dixit:start', { pin: gameState.pinCode });
    };

    const handleNextRound = () => {
        if (socket && gameState) socket.emit('dixit:nextRound', { pin: gameState.pinCode });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        setUploading(true);
        const formData = new FormData();
        Array.from(e.target.files).forEach(file => formData.append('files', file));
        try {
            const res = await fetch(`${BACKEND_URL}/dixit/upload`, { method: 'POST', body: formData });
            if (res.ok) { alert('Obrázky úspěšně nahrány!'); setIsSettingsOpen(false); }
            else alert('Chyba při nahrávání.');
        } catch (err) { console.error(err); alert('Chyba pří připojení k backendu.'); }
        finally { setUploading(false); }
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
                    <button onClick={() => setIsSettingsOpen(true)} className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-all text-2xl">⚙️</button>
                </div>
                {isSettingsOpen && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-8">
                        <div className="bg-zinc-900 p-8 rounded-2xl max-w-md w-full relative border border-white/10">
                            <button onClick={() => setIsSettingsOpen(false)} className="absolute top-4 right-4 text-white/50 hover:text-white">✕</button>
                            <h2 className="text-2xl font-bold mb-6">Správa karet</h2>
                            <label className="block w-full border-2 border-dashed border-white/20 rounded-xl p-8 text-center cursor-pointer hover:bg-white/5 transition-colors">
                                <input type="file" multiple accept="image/*" onChange={handleFileUpload} className="hidden" />
                                <div className="text-4xl mb-2">📤</div>
                                <div className="text-sm">Nahrát karty</div>
                            </label>
                            {uploading && <div className="mt-4 text-center animate-pulse">Nahrávání...</div>}
                        </div>
                    </div>
                )}
                <div className="z-10 flex flex-col items-center w-full max-w-7xl">
                    <h1 className="text-9xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 mb-8 drop-shadow-2xl">DIXIT</h1>
                    <div className="flex items-center gap-16 mb-16 bg-black/30 p-12 rounded-[3rem] border border-white/10 backdrop-blur-md">
                        <div className="flex flex-col items-center">
                            <div className="text-2xl uppercase text-white/40 tracking-widest font-bold mb-2">PIN KÓD</div>
                            <div className="text-9xl font-mono font-black tracking-wider text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">{gameState.pinCode}</div>
                        </div>
                        <div className="w-px h-32 bg-white/10"></div>
                        <div className="bg-white p-4 rounded-xl"><QRCode value={joinUrl} size={150} /></div>
                    </div>
                    <div className="flex flex-wrap justify-center gap-8 mb-16 w-full">
                        {gameState.players.map((p: any) => (
                            <div key={p.id} className="flex flex-col items-center animate-bounce-subtle">
                                <div className="text-6xl mb-2 drop-shadow-xl">{{ cow: '🐮', fox: '🦊' }[p.avatar as string] || '👤'}</div>
                                <div className="font-bold text-xl">{p.nickname}</div>
                            </div>
                        ))}
                        {gameState.players.length === 0 && <span className="text-white/30 text-2xl italic">Čekám na hráče...</span>}
                    </div>
                    <button onClick={handleStart} disabled={gameState.players.length < 3} className="bg-gradient-to-r from-green-500 to-emerald-600 hover:scale-105 text-white text-3xl px-16 py-6 font-black rounded-full shadow-[0_0_50px_rgba(16,185,129,0.4)] transition-all disabled:opacity-50 disabled:grayscale">START HRY</button>
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
                    <div className="flex flex-col items-center justify-center h-full animate-pulse">
                        <div className="text-9xl mb-8">🤔</div>
                        <h2 className="text-6xl font-bold mb-4 text-center">Vypravěč vybírá kartu...</h2>
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
                                {gameState.rounds?.[0]?.cardsPlayed && Object.entries(gameState.rounds[0].cardsPlayed).map(([pid, cardId]: [string, any], index: number) => {
                                    const isScoring = gameState.phase === 'SCORING';
                                    const isStorytellerCard = pid === gameState.storytellerId;
                                    const votes = gameState.rounds?.[0]?.votes as Record<string, string> | undefined;
                                    const voters = votes ? Object.entries(votes).filter(([_, target]) => target === pid).map(([vid]) => vid) : [];

                                    return (
                                        <div key={pid} className={`relative group perspective transition-all duration-500 ${isScoring && isStorytellerCard ? 'z-20 scale-105' : 'z-10'}`}>
                                            <div className={`
                                                relative w-48 h-72 rounded-xl overflow-hidden shadow-2xl transition-all duration-500 border-2
                                                ${isScoring && isStorytellerCard ? 'border-yellow-500 ring-4 ring-yellow-500/30' : 'border-white/10'}
                                                ${isScoring && !isStorytellerCard ? 'opacity-60 grayscale-[0.5]' : ''}
                                            `}>
                                                <img src={`/dixit/${cardId}`} className="w-full h-full object-cover" />
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
                                })}
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
