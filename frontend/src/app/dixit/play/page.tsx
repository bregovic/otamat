"use client";
import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { BACKEND_URL } from '../../../utils/config';

// Reusing avatar categories logic or similar... simplifies to basic emojies for now.
const AVATARS = ['🐮', '🦊', '🐱', '🐶', '🦁', '🐼', '🐨', '🐷', '🐸', '🐯', '🐰', '🐹'];

function DixitPlayContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pinFromUrl = searchParams.get('pin');

    // Connection State
    const [socket, setSocket] = useState<Socket | null>(null);
    const [connected, setConnected] = useState(false);

    // Player State
    const [nickname, setNickname] = useState('');
    const [avatar, setAvatar] = useState('🐮');
    const [playerId, setPlayerId] = useState<string | null>(null);
    const [joined, setJoined] = useState(false);

    // Game State
    const [gameState, setGameState] = useState<any>(null); // Use appropriate type if possible

    // Local Inputs
    const [clueInput, setClueInput] = useState('');
    const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
    const [votedTargetId, setVotedTargetId] = useState<string | null>(null);

    useEffect(() => {
        if (!pinFromUrl) return;

        const newSocket = io(BACKEND_URL, {
            transports: ['websocket'],
            upgrade: false
        });
        setSocket(newSocket);
        setConnected(true);

        newSocket.on('dixit:update', (state) => {
            setGameState(state);
        });

        return () => {
            newSocket.disconnect();
        };
    }, [pinFromUrl]);

    const handleJoin = () => {
        if (socket && pinFromUrl && nickname) {
            socket.emit('dixit:join', { pin: pinFromUrl, nickname, avatar }, (response: any) => {
                if (response.success) {
                    setPlayerId(response.playerId);
                    setJoined(true);
                } else {
                    alert('Chyba: ' + response.error);
                }
            });
        }
    };

    const submitClue = () => {
        if (socket && gameState && selectedCardId && clueInput) {
            socket.emit('dixit:setClue', {
                pin: gameState.pinCode,
                playerId,
                clue: clueInput,
                cardId: selectedCardId
            });
            setSelectedCardId(null);
        }
    };

    const submitCard = () => {
        if (socket && gameState && selectedCardId) {
            socket.emit('dixit:submitCard', {
                pin: gameState.pinCode,
                playerId,
                cardId: selectedCardId
            });
            setSelectedCardId(null);
        }
    };

    const castVote = (targetOwnerId: string) => {
        if (socket && gameState) {
            socket.emit('dixit:vote', {
                pin: gameState.pinCode,
                playerId,
                targetCardOwnerId: targetOwnerId
            });
            setVotedTargetId(targetOwnerId);
        }
    }

    if (!pinFromUrl) return <div className="p-8 text-white min-h-screen bg-black flex items-center justify-center">Chybí PIN. Jděte zpět na úvod.</div>;

    // --- JOIN SCREEN ---
    if (!joined) {
        return (
            <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900 via-purple-900 to-black text-white flex flex-col items-center p-6 justify-center">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-0 left-0 w-full h-full bg-black/5 mix-blend-overlay"></div>
                </div>

                <h1 className="text-5xl font-black mt-8 mb-8 text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-amber-500 drop-shadow-lg font-serif tracking-widest">DIXIT</h1>

                <div className="w-full max-w-sm glass-card p-8 space-y-8 bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl relative z-10">
                    <div>
                        <label className="text-xs opacity-60 font-bold uppercase tracking-widest mb-2 block text-indigo-200">Jak si říkáš?</label>
                        <input
                            value={nickname} onChange={e => setNickname(e.target.value)}
                            className="w-full bg-black/50 border border-indigo-500/30 p-4 rounded-xl text-xl text-center focus:border-yellow-500 focus:outline-none transition-all placeholder-white/20 font-bold"
                            placeholder="Tvoje jméno..."
                        />
                    </div>

                    <div>
                        <label className="text-xs opacity-60 font-bold uppercase tracking-widest mb-4 block text-indigo-200">Vyber si avatara</label>
                        <div className="grid grid-cols-4 gap-3">
                            {AVATARS.map(a => (
                                <button
                                    key={a}
                                    onClick={() => setAvatar(a)}
                                    className={`text-3xl p-3 rounded-xl transition-all duration-300 ${avatar === a ? 'bg-gradient-to-br from-yellow-400 to-amber-600 scale-110 shadow-lg shadow-yellow-500/30' : 'bg-white/5 hover:bg-white/10 scale-95 opacity-70'}`}
                                >
                                    {a}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={handleJoin}
                        className="btn btn-primary w-full py-5 text-xl font-black rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:scale-[1.02] transition-transform shadow-[0_0_30px_rgba(16,185,129,0.4)]"
                    >
                        VSTOUPIT DO HRY
                    </button>
                </div>
            </main>
        );
    }

    if (!gameState) return <div className="min-h-screen bg-black flex items-center justify-center text-white font-mono animate-pulse">Načítání magického světa...</div>;

    const me = gameState.players.find((p: any) => p.id === playerId);
    if (!me) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Hráč nenalezen...</div>;

    // --- LOBBY WAITING ---
    if (gameState.phase === 'LOBBY') {
        return (
            <main className="min-h-screen bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-950 via-black to-black text-white flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[100px] animate-pulse pointer-events-none"></div>

                <div className="relative z-10">
                    <div className="text-8xl mb-6 animate-bounce-subtle filter drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">{me.avatar}</div>
                    <h2 className="text-4xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-indigo-200">{me.nickname}</h2>
                    <div className="text-emerald-400 font-bold uppercase tracking-widest text-sm bg-emerald-500/10 px-4 py-2 rounded-full inline-block border border-emerald-500/30 mt-4 animate-pulse">Jsi ve hře!</div>
                    <p className="mt-12 text-white/40 font-serif italic max-w-xs mx-auto leading-relaxed">"Sledujte velkou obrazovku, kouzlo brzy začne..."</p>
                </div>
            </main>
        );
    }

    // --- GAME ---
    const myHand = me.hand || [];

    return (
        <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-[#0d0725] to-black text-white relative overflow-y-auto pb-32">
            {/* Sticky Header */}
            <div className="sticky top-0 bg-[#0d0725]/80 backdrop-blur-xl border-b border-white/5 p-4 flex justify-between items-center z-50 shadow-lg">
                <div className="font-black text-yellow-400 text-xl font-mono">{me.score} b</div>
                <div className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-indigo-300/50 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/10">{gameState.phase.replace('_', ' ')}</div>
                <div className="text-2xl">{me.avatar}</div>
            </div>

            <div className="p-4 flex flex-col items-center max-w-lg mx-auto w-full">
                {gameState.phase === 'STORYTELLER_PICK' && (
                    gameState.storytellerId === me.id ? (
                        // AM STORYTELLER
                        <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-gradient-to-br from-yellow-500/10 to-amber-600/10 border border-yellow-500/30 p-6 rounded-2xl text-center backdrop-blur-md">
                                <h2 className="font-black text-yellow-500 text-2xl mb-1 uppercase tracking-widest">Jsi vypravěč!</h2>
                                <p className="opacity-70 text-sm font-serif italic">"Vyber kartu, která inspiruje tvůj příběh..."</p>
                            </div>

                            <input
                                value={clueInput} onChange={e => setClueInput(e.target.value)}
                                placeholder="Napiš svou nápovědu..."
                                className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-lg text-center focus:border-yellow-500 transition-colors focus:bg-black/60 focus:outline-none"
                            />

                            <div className="relative w-full h-[50vh] flex items-center justify-center">
                                <button
                                    onClick={() => setSelectedCardId(myHand[(myHand.indexOf(selectedCardId || myHand[0]) - 1 + myHand.length) % myHand.length])}
                                    className="absolute left-0 z-20 p-4 text-4xl text-white/50 hover:text-white bg-black/20 hover:bg-black/40 rounded-r-2xl backdrop-blur-sm transition-all"
                                >
                                    ‹
                                </button>

                                <div className="w-full h-full flex items-center justify-center overflow-hidden relative">
                                    {myHand.map((card: string, idx: number) => {
                                        const currentIdx = myHand.indexOf(selectedCardId || myHand[0]);
                                        // Simple logic to set initial selection if null
                                        if (!selectedCardId && idx === 0) setTimeout(() => setSelectedCardId(card), 0);

                                        if (card !== selectedCardId) return null;

                                        return (
                                            <div key={card} className="relative w-full h-full flex items-center justify-center animate-in fade-in zoom-in duration-300">
                                                <img
                                                    src={`${BACKEND_URL}/dixit/image/${card}`}
                                                    className="max-h-full max-w-full object-contain rounded-xl shadow-2xl"
                                                    alt="Card"
                                                />
                                            </div>
                                        );
                                    })}
                                </div>

                                <button
                                    onClick={() => setSelectedCardId(myHand[(myHand.indexOf(selectedCardId || myHand[0]) + 1) % myHand.length])}
                                    className="absolute right-0 z-20 p-4 text-4xl text-white/50 hover:text-white bg-black/20 hover:bg-black/40 rounded-l-2xl backdrop-blur-sm transition-all"
                                >
                                    ›
                                </button>
                            </div>

                            <div className="flex justify-center gap-2 mb-4">
                                {myHand.map((card: string) => (
                                    <div
                                        key={card}
                                        className={`w-2 h-2 rounded-full transition-all ${selectedCardId === card ? 'bg-yellow-500 w-4' : 'bg-white/20'}`}
                                    />
                                ))}
                            </div>

                            <div className="fixed bottom-6 left-0 w-full px-4 z-50">
                                <button onClick={submitClue} disabled={!selectedCardId || !clueInput} className="bg-yellow-500 text-black font-black w-full py-4 text-xl rounded-2xl shadow-xl hover:bg-yellow-400 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale uppercase tracking-wider">
                                    Potvrdit nápovědu
                                </button>
                            </div>
                        </div>
                    ) : (
                        // WAITING FOR STORYTELLER
                        <div className="flex flex-col items-center justify-center h-[60vh] text-center px-6">
                            <div className="text-7xl animate-bounce mb-8 filter drop-shadow-lg">⏳</div>
                            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-200 to-white">Vypravěč přemýšlí...</h2>
                            <p className="text-white/40 mt-4 max-w-xs mx-auto leading-relaxed">Dej mu chvilku čas na vymýšlení té nejlepší nápovědy.</p>
                        </div>
                    )
                )}

                {gameState.phase === 'PLAYERS_PICK' && (
                    gameState.storytellerId === me.id ? (
                        <div className="flex flex-col items-center justify-center h-[60vh] text-center px-6">
                            <div className="text-7xl animate-pulse mb-8">👀</div>
                            <h2 className="text-2xl font-bold mb-2">Hráči vybírají...</h2>
                            <div className="bg-white/5 p-4 rounded-xl border border-white/10 mt-6 max-w-xs mx-auto">
                                <p className="text-xs uppercase tracking-widest opacity-50 mb-2">Tvoje nápověda</p>
                                <p className="font-serif italic text-yellow-400 text-xl">"{gameState.rounds?.[0]?.clue}"</p>
                            </div>
                        </div>
                    ) : (
                        !me.submittedCardId ? (
                            // PICK CARD
                            <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="bg-gradient-to-br from-indigo-500/10 to-blue-600/10 border border-indigo-500/30 p-6 rounded-2xl text-center backdrop-blur-md shadow-lg">
                                    <p className="opacity-50 text-xs uppercase font-bold tracking-[0.2em] mb-3 text-indigo-300">Nápověda</p>
                                    <h2 className="font-black text-3xl text-white font-serif italic mb-2">"{gameState.rounds?.[0]?.clue}"</h2>
                                    <p className="text-indigo-200/60 text-sm mt-3 border-t border-white/5 pt-3">Vyber kartu, která se k tomu nejlépe hodí.</p>
                                </div>

                                <div className="relative w-full h-[50vh] flex items-center justify-center">
                                    <button
                                        onClick={() => setSelectedCardId(myHand[(myHand.indexOf(selectedCardId || myHand[0]) - 1 + myHand.length) % myHand.length])}
                                        className="absolute left-0 z-20 p-4 text-4xl text-white/50 hover:text-white bg-black/20 hover:bg-black/40 rounded-r-2xl backdrop-blur-sm transition-all"
                                    >
                                        ‹
                                    </button>

                                    <div className="w-full h-full flex items-center justify-center overflow-hidden relative">
                                        {myHand.map((card: string, idx: number) => {
                                            if (!selectedCardId && idx === 0) setTimeout(() => setSelectedCardId(card), 0);
                                            if (card !== selectedCardId) return null;

                                            return (
                                                <div key={card} className="relative w-full h-full flex items-center justify-center animate-in fade-in zoom-in duration-300">
                                                    <img
                                                        src={`${BACKEND_URL}/dixit/image/${card}`}
                                                        className="max-h-full max-w-full object-contain rounded-xl shadow-2xl"
                                                        alt="Card"
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <button
                                        onClick={() => setSelectedCardId(myHand[(myHand.indexOf(selectedCardId || myHand[0]) + 1) % myHand.length])}
                                        className="absolute right-0 z-20 p-4 text-4xl text-white/50 hover:text-white bg-black/20 hover:bg-black/40 rounded-l-2xl backdrop-blur-sm transition-all"
                                    >
                                        ›
                                    </button>
                                </div>

                                <div className="flex justify-center gap-2 mb-4">
                                    {myHand.map((card: string) => (
                                        <div
                                            key={card}
                                            className={`w-2 h-2 rounded-full transition-all ${selectedCardId === card ? 'bg-indigo-500 w-4' : 'bg-white/20'}`}
                                        />
                                    ))}
                                </div>

                                <div className="fixed bottom-6 left-0 w-full px-4 z-50">
                                    <button onClick={submitCard} disabled={!selectedCardId} className="bg-indigo-600 text-white font-black w-full py-4 text-xl rounded-2xl shadow-xl hover:bg-indigo-500 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale uppercase tracking-wider">
                                        Odeslat kartu
                                    </button>
                                </div>
                            </div>
                        ) : (
                            // WAITING FOR OTHERS
                            <div className="flex flex-col items-center justify-center h-[60vh] text-center px-6">
                                <div className="text-7xl mb-8 text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.5)] animate-bounce-subtle">✅</div>
                                <h2 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-300 to-white">Odesláno!</h2>
                                <p className="text-white/40 mt-4 leading-relaxed">Teď musíme počkat na ostatní snílky.</p>
                            </div>
                        )
                    )
                )}

                {gameState.phase === 'VOTING' && (
                    gameState.storytellerId === me.id ? (
                        <div className="flex flex-col items-center justify-center h-[60vh] text-center px-6">
                            <div className="text-7xl mb-6">🗳️</div>
                            <h2 className="text-2xl font-bold">Hráči hlasují...</h2>
                            <p className="opacity-50 mt-4 text-sm max-w-xs mx-auto">Ty jako vypravěč nehlasuješ, jen sleduj chaos, který jsi způsobil.</p>
                        </div>
                    ) : (
                        !me.votedCardId ? (
                            // VOTE
                            <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="text-center mb-6 pt-2">
                                    <p className="opacity-50 text-xs uppercase font-bold tracking-[0.2em] mb-2 text-yellow-500/80">Hlasování</p>
                                    <h2 className="font-black text-2xl font-serif italic text-white/90">"{gameState.rounds?.[0]?.clue}"</h2>
                                    <p className="text-yellow-400 font-bold mt-3 text-sm bg-yellow-400/10 inline-block px-4 py-1 rounded-full border border-yellow-400/20">Která karta je vypravěče?</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pb-24">
                                    {gameState.rounds?.[0]?.cardsPlayed && Object.entries(gameState.rounds[0].cardsPlayed).map(([pid, cardId]: [string, any]) => {
                                        if (pid === me.id) return null;

                                        return (
                                            <div key={pid} onClick={() => setVotedTargetId(pid)} className={`relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300 ${votedTargetId === pid ? 'ring-4 ring-yellow-500 scale-105 z-10 shadow-[0_0_30px_rgba(234,179,8,0.5)]' : 'opacity-80 hover:opacity-100 hover:scale-[1.02]'}`}>
                                                <img src={`${BACKEND_URL}/dixit/image/${cardId}`} className="w-full h-auto object-cover" />
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="fixed bottom-6 left-0 w-full px-4 z-50">
                                    <button onClick={() => castVote(votedTargetId!)} disabled={!votedTargetId} className="bg-yellow-500 text-black font-black w-full py-4 text-xl rounded-2xl shadow-xl hover:bg-yellow-400 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale uppercase tracking-wider">
                                        Hlasovat
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-[60vh] text-center px-6">
                                <div className="text-7xl mb-8 text-yellow-500 drop-shadow-[0_0_20px_rgba(234,179,8,0.4)] animate-pulse">🗳️</div>
                                <h2 className="text-3xl font-black text-white">Odhalsováno!</h2>
                                <p className="text-white/40 mt-4">Drž si palce...</p>
                            </div>
                        )
                    )
                )}

                {gameState.phase === 'SCORING' && (
                    <div className="flex flex-col items-center justify-center h-[60vh] text-center px-6 animate-in zoom-in duration-500">
                        <h2 className="text-3xl font-bold mb-8 font-serif text-white/80">Konec kola</h2>
                        <div className="bg-gradient-to-br from-indigo-900/40 to-black border border-white/10 p-10 rounded-3xl w-full max-w-xs shadow-2xl backdrop-blur-xl relative overflow-hidden group hover:scale-105 transition-transform duration-500">
                            <div className="absolute inset-0 bg-gradient-to-tr from-yellow-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <div className="text-xs opacity-50 uppercase mb-4 tracking-[0.3em] font-bold">Tvoje skóre</div>
                            <div className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-amber-600 drop-shadow-xl">{me.score}</div>
                        </div>
                        <p className="opacity-40 mt-12 text-sm uppercase tracking-widest animate-pulse">Sleduj obrazovku pro detailní výsledky</p>
                    </div>
                )}
            </div>
        </main>
    );
}

export default function DixitPlay() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white bg-black">Načítání magie...</div>}>
            <DixitPlayContent />
        </Suspense>
    );
}
