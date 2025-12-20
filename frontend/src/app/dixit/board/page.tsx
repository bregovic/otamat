"use client";
import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { BACKEND_URL } from '../../../utils/config';
import QRCode from 'react-qr-code';

import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';

export default function DixitBoard() {
    const { user } = useAuth();
    const router = useRouter();

    const [socket, setSocket] = useState<Socket | null>(null);
    const [gameState, setGameState] = useState<any>(null);

    useEffect(() => {
        if (!user) return; // Wait for user

        const newSocket = io(BACKEND_URL, {
            transports: ['websocket'],
            upgrade: false
        });
        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('Board connected');
            // Create game immediately
            newSocket.emit('dixit:create', { hostId: user.id }, (response: any) => {
                if (response.success) {
                    console.log('Game created:', response.gameId);
                } else {
                    console.error('Failed to create game:', response.error);
                }
            });
        });

        newSocket.on('dixit:created', (state) => {
            setGameState(state);
        });

        newSocket.on('dixit:update', (state) => {
            setGameState(state);
        });

        return () => {
            newSocket.disconnect();
        };
    }, [user]);

    // Redirect if not logged in (optional check, better handled by middleware or wrapping)
    useEffect(() => {
        const timer = setTimeout(() => {
            if (!user) {
                // router.push('/login'); 
                // We won't force redirect yet, maybe they are just loading auth
            }
        }, 2000);
        return () => clearTimeout(timer);
    }, [user, router]);


    const handleStart = () => {
        if (socket && gameState) {
            socket.emit('dixit:start', { pin: gameState.pinCode });
        }
    };

    const handleNextRound = () => {
        if (socket && gameState) {
            socket.emit('dixit:nextRound', { pin: gameState.pinCode });
        }
    };

    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (!gameState && !error) {
                setError('Hra se nenačetla. Ověřte, že běží backend na Railway a zkuste obnovit stránku.');
            }
        }, 5000);
        return () => clearTimeout(timer);
    }, [gameState]);

    if (!gameState) {
        return (
            <div className="h-screen w-full bg-black text-white flex flex-col items-center justify-center p-8 text-center">
                {error ? (
                    <div className="text-red-500 text-xl font-bold max-w-md">
                        ⚠️ {error}
                        <button onClick={() => window.location.reload()} className="mt-4 px-6 py-2 bg-white text-black rounded-lg block mx-auto hover:bg-gray-200">
                            Zkusit znovu
                        </button>
                    </div>
                ) : (
                    <div className="animate-pulse text-indigo-300">
                        Načítání magického světa...
                    </div>
                )}
            </div>
        );
    }

    // --- LOBBY VIEW ---
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [uploading, setUploading] = useState(false);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        setUploading(true);

        const formData = new FormData();
        Array.from(e.target.files).forEach(file => {
            formData.append('files', file);
        });

        try {
            const res = await fetch(`${BACKEND_URL}/dixit/upload`, {
                method: 'POST',
                body: formData
            });
            if (res.ok) {
                alert('Obrázky úspěšně nahrány!');
                setIsSettingsOpen(false);
            } else {
                alert('Chyba při nahrávání.');
            }
        } catch (err) {
            console.error(err);
            alert('Chyba pří připojení k backendu.');
        } finally {
            setUploading(false);
        }
    };

    if (gameState.phase === 'LOBBY') {
        const joinUrl = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}/dixit/play?pin=${gameState.pinCode}` : '';

        return (
            <main className="h-screen w-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900 via-purple-900 to-black text-white flex flex-col items-center justify-center p-8 relative overflow-hidden">
                {/* Magical Background Elements */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-0 left-0 w-full h-full bg-black/20 opacity-5 mix-blend-overlay"></div>
                    <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] animate-pulse"></div>
                    <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse delay-1000"></div>
                </div>

                {/* Settings Button */}
                <div className="absolute top-8 right-8 z-50">
                    <button onClick={() => setIsSettingsOpen(true)} className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-all text-2xl" title="Nastavení karet">
                        ⚙️
                    </button>
                </div>

                {/* Upload Modal */}
                {isSettingsOpen && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-8">
                        <div className="bg-zinc-900 border border-white/10 p-8 rounded-2xl max-w-md w-full relative">
                            <button onClick={() => setIsSettingsOpen(false)} className="absolute top-4 right-4 text-white/50 hover:text-white">✕</button>
                            <h2 className="text-2xl font-bold mb-6">Správa karet</h2>
                            <p className="mb-4 text-sm text-white/60">Nahrajte nové obrázky do hry. Systém je automaticky zmenší a uloží do databáze.</p>

                            <label className="block w-full border-2 border-dashed border-white/20 rounded-xl p-8 text-center cursor-pointer hover:bg-white/5 transition-colors">
                                <input type="file" multiple accept="image/*" onChange={handleFileUpload} className="hidden" />
                                <div className="text-4xl mb-2">📤</div>
                                <div>Klikni pro výběr souborů</div>
                                <div className="text-xs mt-2 text-white/40">(Možno vybrat více najednou)</div>
                            </label>

                            {uploading && <div className="mt-4 text-yellow-400 font-bold animate-pulse text-center">Nahrávání a komprese...</div>}
                        </div>
                    </div>
                )}

                <div className="z-10 flex flex-col items-center w-full max-w-7xl">
                    <h1 className="text-8xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-200 via-yellow-400 to-amber-500 mb-4 drop-shadow-[0_0_25px_rgba(234,179,8,0.4)] tracking-widest">
                        DIXIT
                    </h1>
                    <h2 className="text-3xl text-indigo-200/60 mb-16 uppercase tracking-[0.5em] font-light">Připojte se do hry</h2>

                    <div className="flex flex-col md:flex-row items-center gap-24 w-full justify-center">
                        {/* PIN Code */}
                        <div className="flex flex-col items-center group">
                            <div className="text-xl uppercase text-indigo-300 font-bold mb-4 tracking-widest">Herní PIN</div>
                            <div className="text-[10rem] leading-none font-mono font-black text-white bg-black/30 px-16 py-8 rounded-[3rem] border-4 border-white/10 shadow-[0_0_80px_rgba(139,92,246,0.2)] backdrop-blur-md group-hover:scale-105 transition-transform duration-500 group-hover:border-yellow-500/30 group-hover:shadow-[0_0_100px_rgba(234,179,8,0.3)]">
                                {gameState.pinCode}
                            </div>
                        </div>

                        {/* QR Code */}
                        <div className="p-6 bg-white rounded-3xl shadow-[0_0_60px_rgba(255,255,255,0.2)] rotate-3 hover:rotate-0 transition-transform duration-500 scale-110">
                            <QRCode value={joinUrl} size={300} />
                        </div>
                    </div>

                    {/* Players Grid */}
                    <div className="mt-20 w-full">
                        <div className="text-center text-xl text-indigo-200/40 mb-10 border-b border-indigo-500/20 pb-4 font-serif italic">
                            {gameState.players.length === 0 ? 'Čekám na první odvážlivce...' : `Připojeni ${gameState.players.length} snílci`}
                        </div>

                        <div className="flex flex-wrap justify-center gap-12">
                            {gameState.players.map((p: any) => (
                                <div key={p.id} className="flex flex-col items-center group">
                                    <div className="text-7xl mb-4 grayscale group-hover:grayscale-0 transition-all cursor-default transform group-hover:scale-125 group-hover:rotate-6 duration-300 drop-shadow-2xl">
                                        {{ cow: '🐮', fox: '🦊' }[p.avatar as string] || '👤'}
                                    </div>
                                    <div className="font-bold text-xl text-white group-hover:text-yellow-400 transition-colors">{p.nickname}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={handleStart}
                        disabled={gameState.players.length < 3}
                        className="mt-20 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-3xl px-20 py-8 font-black rounded-full shadow-[0_0_50px_rgba(16,185,129,0.4)] transition-all hover:scale-105 hover:shadow-[0_0_80px_rgba(16,185,129,0.6)] disabled:opacity-30 disabled:grayscale tracking-widest uppercase"
                    >
                        START HRY
                    </button>
                    {gameState.players.length < 3 && <div className="mt-6 text-indigo-300/40 text-lg animate-pulse">Ke hře jsou potřeba alespoň 3 hráči</div>}
                </div>
            </main>
        );
    }

    // --- GAME VIEW ---
    const storyteller = gameState.players.find((p: any) => p.id === gameState.storytellerId);

    return (
        <main className="h-screen w-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-900 via-[#1a103c] to-black text-white flex flex-col p-6 relative overflow-hidden">
            {/* Header */}
            <header className="flex justify-between items-center p-6 bg-black/40 rounded-3xl border border-white/5 backdrop-blur-xl z-10 shadow-2xl">
                <div className="text-3xl font-bold text-yellow-500 font-serif">Kolo {gameState.currentRound}</div>
                <div className="text-2xl">Vypravěč: <span className="font-black text-yellow-300 bg-yellow-500/10 px-4 py-1 rounded-lg border border-yellow-500/30">{storyteller?.nickname}</span></div>
                <div className="text-2xl font-mono text-indigo-300/50 tracking-widest font-bold">PIN: {gameState.pinCode}</div>
            </header>

            {/* Content based on phase */}
            <div className="flex-1 flex flex-col items-center justify-center relative z-10 w-full max-w-[1800px] mx-auto">

                {gameState.phase === 'STORYTELLER_PICK' && (
                    <div className="text-center transform scale-125">
                        <div className="text-9xl mb-12 animate-bounce-subtle filter drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">🤔</div>
                        <h2 className="text-6xl font-bold mb-6 font-serif">Vypravěč vybírá kartu...</h2>
                        <p className="text-3xl text-indigo-300/60 font-light">Všichni sledují {storyteller?.nickname}</p>
                    </div>
                )}

                {gameState.phase === 'PLAYERS_PICK' && (
                    <div className="text-center w-full flex flex-col items-center">
                        <div className="glass-card mb-20 px-24 py-16 bg-gradient-to-b from-indigo-900/50 to-purple-900/50 border border-indigo-500/30 shadow-[0_0_100px_rgba(79,70,229,0.2)] rounded-[3rem]">
                            <div className="text-2xl uppercase text-indigo-300 font-bold tracking-[0.5em] mb-4">Nápověda</div>
                            <h2 className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-yellow-200 to-white drop-shadow-lg font-serif italic">"{gameState.rounds?.[0]?.clue || '???'}"</h2>
                        </div>

                        <h3 className="text-3xl mb-12 text-indigo-200/50 font-light tracking-wide uppercase">Hráči vybírají karty</h3>

                        <div className="flex justify-center gap-8 flex-wrap">
                            {gameState.players.filter((p: any) => p.id !== gameState.storytellerId).map((p: any) => (
                                <div key={p.id} className={`
                                     relative group flex flex-col items-center
                                 `}>
                                    <div className={`
                                        w-32 h-48 rounded-2xl border-4 flex items-center justify-center transition-all duration-500 mb-4
                                        ${p.submittedCardId
                                            ? 'bg-gradient-to-br from-emerald-500 to-teal-600 border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.5)] scale-110 rotate-3'
                                            : 'bg-white/5 border-white/10 opacity-30 scale-95'}
                                     `}>
                                        <div className="text-4xl filter drop-shadow-md">
                                            {p.submittedCardId ? '🃏' : '...'}
                                        </div>
                                    </div>
                                    <div className={`font-bold text-lg transition-colors ${p.submittedCardId ? 'text-emerald-400' : 'text-white/30'}`}>{p.nickname}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {(gameState.phase === 'VOTING' || gameState.phase === 'SCORING') && (
                    <div className="w-full h-full flex flex-col">
                        {/* Clue display */}
                        <div className="text-center mb-10 mt-4">
                            <h2 className="text-5xl font-black text-white/90 font-serif italic drop-shadow-lg inline-block px-12 py-4 rounded-full bg-black/20 border border-white/5">
                                "{gameState.rounds?.[0]?.clue}"
                            </h2>
                        </div>

                        {/* Cards Grid */}
                        <div className="flex-1 flex items-center justify-center w-full px-8">
                            <div className="flex flex-wrap gap-8 justify-center items-center">
                                {gameState.rounds?.[0]?.cardsPlayed && Object.entries(gameState.rounds[0].cardsPlayed).map(([pid, cardId]: [string, any], index: number) => {
                                    const isScoring = gameState.phase === 'SCORING';
                                    const isStorytellerCard = pid === gameState.storytellerId;

                                    const votes = gameState.rounds?.[0]?.votes as Record<string, string> | undefined;
                                    const voters = votes ? Object.entries(votes).filter(([voterId, votedTarget]) => votedTarget === pid).map(([voterId]) => voterId) : [];

                                    return (
                                        <div key={pid} className="relative group perspective">
                                            {/* Card Image */}
                                            <div className={`
                                                   w-56 h-80 md:w-72 md:h-[26rem] rounded-2xl overflow-hidden shadow-2xl transition-all duration-700 ease-out border-4 relative z-10
                                                   ${isScoring && isStorytellerCard
                                                    ? 'border-yellow-400 ring-8 ring-yellow-500/20 shadow-[0_0_60px_rgba(234,179,8,0.4)] scale-105 z-20'
                                                    : 'border-white/10 hover:border-white/30 hover:scale-[1.02] hover:-translate-y-2 shadow-black/50'}
                                                   ${isScoring && !isStorytellerCard ? 'grayscale-[0.5] opacity-80' : ''}
                                               `}>
                                                <img src={`/dixit/${cardId}`} alt="Card" className="w-full h-full object-cover transform transition-transform duration-700 hover:scale-110" />
                                            </div>

                                            {/* Voting Number */}
                                            <div className="absolute -top-6 -left-6 w-16 h-16 bg-white text-black font-black text-3xl rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.5)] border-4 border-gray-900 z-30 font-serif">
                                                {index + 1}
                                            </div>

                                            {/* Votes appearing */}
                                            {(gameState.phase === 'SCORING' || gameState.phase === 'VOTING') && (
                                                <div className="absolute -bottom-8 w-full flex justify-center gap-2 z-30 perspective">
                                                    {voters.map(vid => {
                                                        const voter = gameState.players.find((p: any) => p.id === vid);
                                                        return (
                                                            <div key={vid} className="w-14 h-14 bg-gradient-to-b from-white to-gray-200 rounded-full flex items-center justify-center text-3xl shadow-[0_5px_15px_rgba(0,0,0,0.4)] border-2 border-white -ml-4 first:ml-0 transform hover:scale-125 transition-transform cursor-help z-10" title={voter?.nickname}>
                                                                {{ cow: '🐮', fox: '🦊' }[voter?.avatar as string || ''] || '👤'}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Owner Reveal (Scoring) */}
                                            {isScoring && (
                                                <div className={`
                                                        absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
                                                        px-6 py-3 rounded-xl backdrop-blur-xl border border-white/20
                                                        opacity-0 group-hover:opacity-100 transition-all duration-300
                                                        whitespace-nowrap z-50 pointer-events-none font-bold text-xl shadow-2xl
                                                        ${isStorytellerCard ? 'bg-yellow-500/80 text-black' : 'bg-black/80 text-white'}
                                                   `}>
                                                    {gameState.players.find((p: any) => p.id === pid)?.nickname}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {gameState.phase === 'SCORING' && (
                    <div className="absolute bottom-12 right-12 z-50">
                        <button onClick={handleNextRound} className="bg-white text-black text-2xl px-10 py-5 font-black rounded-full shadow-[0_0_50px_rgba(255,255,255,0.3)] hover:scale-105 transition-all hover:bg-yellow-400 animate-bounce">
                            DALŠÍ KOLO ➜
                        </button>
                    </div>
                )}
            </div>

            {/* Scoreboard Preview (Bottom) */}
            <div className="h-24 border-t border-white/5 bg-black/40 backdrop-blur-xl flex items-center justify-center gap-12 overflow-x-auto px-8 relative z-20">
                {gameState.players.sort((a: any, b: any) => b.score - a.score).map((p: any, i: number) => (
                    <div key={p.id} className={`flex items-center gap-4 transition-all ${i === 0 ? 'scale-110 opacity-100' : 'opacity-60 grayscale-[0.3]'}`}>
                        <span className="text-4xl filter drop-shadow-lg">{{ cow: '🐮', fox: '🦊' }[p.avatar as string] || '👤'}</span>
                        <div className="flex flex-col">
                            <span className={`font-bold text-lg leading-none ${i === 0 ? 'text-yellow-400' : 'text-white'}`}>{p.nickname}</span>
                            <span className="text-xs uppercase tracking-widest opacity-50">Body</span>
                        </div>
                        <span className={`text-3xl font-black font-mono ${i === 0 ? 'text-yellow-400' : 'text-white'}`}>{p.score}</span>
                    </div>
                ))}
            </div>
        </main>
    );
}
