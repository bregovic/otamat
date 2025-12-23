"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { BACKEND_URL } from '@/utils/config';
import { getAvatarIcon } from '@/utils/avatars';
import { Check, X, Crown, Lightbulb, Trophy, ArrowRight, Loader2, Grid as GridIcon, Square, ChevronLeft, ChevronRight, Volume2, RotateCcw, Trash2 } from 'lucide-react';

interface DixitGameProps {
    socket: Socket;
    gameState: any;
    playerId: string;
    pinCode: string;
}

// --- SUB-COMPONENT: Card Selector with Gallery/Grid Toggle ---
const CardSelector = ({ cards, selectedCardId, onSelect, disabledIds = [], showOwner = false, owners = {} }: any) => {
    const [viewMode, setViewMode] = useState<'grid' | 'gallery'>('gallery');
    const [currentIndex, setCurrentIndex] = useState(0);
    const touchStartRef = useRef<number | null>(null);

    // Sync Gallery Index with Selection if externally set (only if not distinct to prevent loop, actually mostly for initial load)
    useEffect(() => {
        if (selectedCardId && viewMode === 'gallery') {
            const idx = cards.findIndex((c: any) => c === selectedCardId);
            if (idx !== -1 && idx !== currentIndex) setCurrentIndex(idx);
        }
    }, [selectedCardId]);

    // Preload Adjacent Images
    useEffect(() => {
        if (!cards || cards.length === 0) return;

        const preload = (idx: number) => {
            const img = new Image();
            img.src = `${BACKEND_URL}/dixit/image/${cards[idx]}`;
        };

        const next = (currentIndex + 1) % cards.length;
        const next2 = (currentIndex + 2) % cards.length;
        const prev = (currentIndex - 1 + cards.length) % cards.length;

        preload(next);
        preload(next2);
        preload(prev);
    }, [currentIndex, cards]);

    // Implicit Selection in Gallery Mode (Delayed)
    useEffect(() => {
        const cid = cards[currentIndex];
        if (viewMode === 'gallery' && cid && !disabledIds.includes(cid)) {
            // Defer slightly to avoid render loop if necessary, but direct call is usually fine in React 18+
            const t = setTimeout(() => {
                if (selectedCardId !== cid) onSelect(cid);
            }, 50);
            return () => clearTimeout(t);
        }
    }, [currentIndex, viewMode, cards, selectedCardId]);

    // Keyboard Navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (viewMode !== 'gallery') return;
            if (e.key === 'ArrowLeft') cycle(-1);
            if (e.key === 'ArrowRight') cycle(1);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [viewMode, currentIndex, cards.length]);

    const cycle = (dir: number) => {
        setCurrentIndex(prev => {
            const next = prev + dir;
            if (next < 0) return cards.length - 1;
            if (next >= cards.length) return 0;
            return next;
        });
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartRef.current = e.targetTouches[0].clientX;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!touchStartRef.current) return;
        const touchEnd = e.changedTouches[0].clientX;
        const diff = touchStartRef.current - touchEnd;
        if (Math.abs(diff) > 50) {
            if (diff > 0) cycle(1); // Swipe Left -> Next
            else cycle(-1); // Swipe Right -> Prev
        }
        touchStartRef.current = null;
    };

    const currentCardId = cards[currentIndex];

    return (
        <div className="w-full flex flex-col gap-4">
            {/* Toggle Header */}
            <div className="flex justify-end px-4 gap-2">
                <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:bg-slate-800'}`}
                >
                    <GridIcon size={20} />
                </button>
                <button
                    onClick={() => setViewMode('gallery')}
                    className={`p-2 rounded-lg transition-colors ${viewMode === 'gallery' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:bg-slate-800'}`}
                >
                    <Square size={20} />
                </button>
            </div>

            {/* Content */}
            {viewMode === 'grid' ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-4 pb-24">
                    {cards.map((cid: string) => {
                        const isDisabled = disabledIds.includes(cid);
                        const isSelected = selectedCardId === cid;
                        return (
                            <div
                                key={cid}
                                onClick={() => !isDisabled && onSelect(cid)}
                                className={`
                                    relative rounded-xl overflow-hidden cursor-pointer transition-all duration-200
                                    aspect-[2/3] bg-slate-800 border-2
                                    ${isSelected ? 'border-emerald-500 ring-4 ring-emerald-500/30 scale-105 z-10' : 'border-transparent hover:border-slate-600'}
                                    ${isDisabled ? 'opacity-40 grayscale pointer-events-none' : ''}
                                `}
                            >
                                <img src={`${BACKEND_URL}/dixit/image/${cid}`} className="w-full h-full object-cover" loading="lazy" />
                                {isSelected && (
                                    <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                                        <Check className="w-12 h-12 text-emerald-500 drop-shadow-md" />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div
                    className="flex flex-col items-center w-full px-4 pb-24"
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                >
                    {/* Gallery Card - Height constrained for mobile */}
                    <div className={`relative h-[55vh] aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl bg-slate-800 border-4 mx-auto transition-all duration-300 ${selectedCardId === currentCardId ? 'border-emerald-500 shadow-emerald-500/20 scale-[1.02]' : 'border-slate-700'}`}>
                        {/* Nav Buttons (Absolute) */}
                        <button onClick={() => cycle(-1)} className="absolute left-2 top-1/2 -translate-y-1/2 p-3 bg-black/40 text-white rounded-full z-20 backdrop-blur-sm hover:bg-black/60 border border-white/5 active:scale-95 transition-all">
                            <ChevronLeft size={28} />
                        </button>
                        <button onClick={() => cycle(1)} className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-black/40 text-white rounded-full z-20 backdrop-blur-sm hover:bg-black/60 border border-white/5 active:scale-95 transition-all">
                            <ChevronRight size={28} />
                        </button>

                        <img
                            src={`${BACKEND_URL}/dixit/image/${currentCardId}`}
                            className="w-full h-full object-cover animate-fade-in"
                            key={currentCardId}
                        />

                        {/* Status Overlay */}
                        {disabledIds.includes(currentCardId) && (
                            <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px] flex items-center justify-center z-10">
                                <span className="bg-black/80 px-4 py-2 rounded-xl text-white text-sm font-bold border border-white/10">Tvoje karta</span>
                            </div>
                        )}
                    </div>

                    {/* Indicator Dots */}
                    <div className="flex gap-2 mt-6 justify-center">
                        {cards.map((cid: string, i: number) => (
                            <div
                                key={cid}
                                className={`w-2 h-2 rounded-full transition-all ${i === currentIndex ? 'bg-white scale-125' : 'bg-white/20'}`}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const ResultsView = ({ players, isHost, onRestart, onEnd, onLeave }: { players: any[], isHost: boolean, onRestart: () => void, onEnd: () => void, onLeave: () => void }) => {
    const sorted = [...players].sort((a, b) => a.score - b.score); // Ascending
    const [visibleCount, setVisibleCount] = useState(0);

    useEffect(() => {
        if (visibleCount < sorted.length) {
            const timeout = setTimeout(() => {
                setVisibleCount(prev => prev + 1);
            }, 2000);
            return () => clearTimeout(timeout);
        }
    }, [visibleCount, sorted.length]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-[#09090b] to-black">
            <h1 className="text-4xl md:text-6xl font-black text-amber-500 mb-12 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)] animate-pulse">
                {visibleCount === sorted.length ? "🎉 VÍTĚZOVÉ 🎉" : "VÝSLEDKY..."}
            </h1>

            <div className="w-full max-w-xl flex flex-col-reverse gap-4">
                {sorted.map((p, i) => {
                    const isVisible = i < visibleCount;
                    const rank = sorted.length - i;

                    if (!isVisible) return null;

                    const isWinner = rank === 1;
                    return (
                        <div
                            key={p.id}
                            className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${isWinner
                                ? 'bg-gradient-to-r from-amber-500/20 to-amber-900/40 border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.2)]'
                                : 'bg-slate-800/50 border-white/5'
                                }`}
                        >
                            <div className="flex-1 min-w-0 flex items-center gap-2 md:gap-4">
                                <span className={`font-black text-base md:text-xl ${isWinner ? 'text-amber-500' : 'text-slate-500'}`}>#{rank}</span>
                                <span className="text-2xl md:text-4xl">{getAvatarIcon(p.avatar)}</span>
                                <span className={`text-base md:text-xl font-bold truncate ${isWinner ? 'text-white' : 'text-slate-300'}`}>{p.nickname}</span>
                                {isWinner && <Crown className="text-amber-500 w-4 h-4 md:w-6 md:h-6 animate-bounce shrink-0" />}
                            </div>
                            <div className={`text-2xl md:text-3xl font-black ${isWinner ? 'text-amber-500' : 'text-slate-400'}`}>
                                {p.score}
                            </div>
                        </div>
                    );
                })}
            </div>

            {visibleCount === sorted.length && (
                <div className="flex flex-col gap-4 items-center mt-12 w-full max-w-sm">
                    {/* Host Restart Button */}
                    {/* Host Controls */}
                    {isHost && (
                        <div className="w-full flex flex-col gap-3 mb-4">
                            <button
                                onClick={() => { if (confirm('Opravdu chcete spustit novou hru? Všichni budou vráceni do Lobby.')) onRestart(); }}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 px-8 rounded-xl transition-all shadow-lg hover:scale-105 flex items-center justify-center gap-2"
                            >
                                <RotateCcw size={24} /> NOVÁ HRA
                            </button>
                            <button
                                onClick={() => { if (confirm('Opravdu ukončit hru pro všechny?')) onEnd(); }}
                                className="w-full bg-red-900/80 hover:bg-red-600 text-white font-bold py-3 px-8 rounded-xl transition-all border border-red-500/30 flex items-center justify-center gap-2"
                            >
                                <Trash2 size={20} /> UKONČIT HRU
                            </button>
                        </div>
                    )}

                    {/* Back to Menu (Leave) */}
                    <button
                        onClick={onLeave}
                        className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-4 px-8 rounded-xl transition-all border border-white/20 hover:scale-105"
                    >
                        Zpět do menu
                    </button>
                </div>
            )}
        </div>
    );
};


export default function DixitGame({ socket, gameState, playerId, pinCode }: DixitGameProps) {
    const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
    const [clueInput, setClueInput] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [shuffledVotingCards, setShuffledVotingCards] = useState<string[]>([]);

    const clueMode = gameState.clueMode || 'TEXT';
    const phase = gameState.phase;
    const isStoryteller = gameState.storytellerId === playerId;
    const storyteller = gameState.players.find((p: any) => p.id === gameState.storytellerId);
    const myPlayer = gameState.players.find((p: any) => p.id === playerId);

    const activeRound = gameState.rounds && gameState.rounds.length > 0 ? gameState.rounds[0] : null;

    const getPlayedCards = (pid: string): string[] => {
        if (!activeRound || !activeRound.cardsPlayed) return [];
        const val = activeRound.cardsPlayed[pid];
        if (Array.isArray(val)) return val;
        if (val) return [val];
        return [];
    };

    const playerCount = gameState.players.length;
    const cardsRequiredToPlay = (playerCount === 3 && !isStoryteller) ? 2 : 1;
    const myPlayedCards = getPlayedCards(playerId);
    const hasPlayedAll = myPlayedCards.length >= cardsRequiredToPlay;

    useEffect(() => {
        setSelectedCardId(null);
        setClueInput("");
        setIsSubmitting(false);
    }, [phase]);

    useEffect(() => {
        setSelectedCardId(null);
        setIsSubmitting(false);
    }, [myPlayedCards.length]);

    // Shuffle Voting Cards logic
    useEffect(() => {
        if (activeRound && (phase === 'VOTING' || isStoryteller)) {
            const cards: string[] = [];
            Object.values(activeRound.cardsPlayed || {}).forEach((val: any) => {
                if (Array.isArray(val)) cards.push(...val);
                else cards.push(val);
            });

            // Compare with current shuffled state to see if we need update
            const canonical = [...cards].sort().join(',');
            const currentShuffledSorted = [...shuffledVotingCards].sort().join(',');

            if (canonical !== currentShuffledSorted || shuffledVotingCards.length === 0) {
                // Content diff -> Reshuffle
                // Use a better shuffle (Fisher-Yates) or just random sort
                setShuffledVotingCards([...cards].sort(() => Math.random() - 0.5));
            }
        }
    }, [activeRound, phase]);

    const submitClue = () => {
        if (!selectedCardId || isSubmitting) return;
        if (clueMode === 'TEXT' && !clueInput.trim()) return;

        setIsSubmitting(true);
        socket.emit('dixit:setClue', {
            pin: pinCode,
            playerId,
            cardId: selectedCardId,
            clue: clueMode === 'REAL' ? '(Hlasová nápověda)' : clueInput
        });
    };

    const submitCard = () => {
        if (!selectedCardId || isSubmitting) return;
        setIsSubmitting(true);
        socket.emit('dixit:submitCard', {
            pin: pinCode,
            playerId,
            cardId: selectedCardId
        });
    };

    const submitVote = () => {
        if (!selectedCardId || isSubmitting) return;
        setIsSubmitting(true);
        socket.emit('dixit:vote', {
            pin: pinCode,
            playerId,
            targetCardId: selectedCardId
        });
    };

    const nextRound = () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        socket.emit('dixit:nextRound', { pin: pinCode });
    };

    const speakClue = (text: string) => {
        if (!text) return;
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'cs-CZ';
        window.speechSynthesis.speak(u);
    };

    if (gameState.status === 'FINISHED') {
        const isHost = gameState.hostId === playerId || (!gameState.hostId && gameState.players[0]?.id === playerId);
        return <ResultsView
            players={gameState.players}
            isHost={isHost}
            onRestart={() => socket.emit('dixit:restart', { pin: pinCode })}
            onEnd={() => socket.emit('dixit:end', { pin: pinCode })}
            onLeave={() => { sessionStorage.removeItem('dixit_session'); window.location.href = '/otamat/dixit'; }}
        />;
    }

    if (phase === 'STORYTELLER_PICK') {
        if (isStoryteller) {
            return (
                <div className="flex flex-col items-center w-full max-w-6xl mx-auto min-h-[calc(100vh-80px)]">
                    <div className="text-center mb-4 px-4">
                        <div className="inline-block bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full text-xs font-bold uppercase mb-2 border border-amber-500/50">Jsi Vypravěč</div>
                        <h2 className="text-2xl md:text-3xl font-bold text-white">Vyber kartu</h2>
                    </div>

                    <CardSelector
                        cards={myPlayer?.hand || []}
                        selectedCardId={selectedCardId}
                        onSelect={setSelectedCardId}
                    />

                    <div className="fixed bottom-0 left-0 w-full p-4 bg-slate-950/90 backdrop-blur-lg border-t border-white/10 z-50 flex flex-col gap-2">
                        {clueMode === 'TEXT' ? (
                            <input
                                type="text"
                                placeholder={selectedCardId && !clueInput ? "👈 NAPIŠ NÁPOVĚDU SEM!" : "Zadej nápovědu..."}
                                value={clueInput}
                                onChange={e => setClueInput(e.target.value)}
                                className={`bg-slate-800 border-2 text-white placeholder-slate-400 p-4 rounded-xl text-xl font-bold outline-none transition-all text-center w-full shadow-[0_0_15px_rgba(0,0,0,0.5)] ${(selectedCardId && !clueInput)
                                    ? 'border-amber-500 animate-pulse ring-4 ring-amber-500/20'
                                    : 'border-slate-500 focus:border-emerald-400 focus:bg-slate-700'
                                    }`}
                            />
                        ) : (
                            <div className="bg-indigo-900/50 border border-indigo-500 text-indigo-200 p-4 rounded-xl text-center mb-2 font-bold animate-pulse flex items-center justify-center gap-2">
                                🗣️ Řekni nápovědu nahlas ostatním hráčům!
                            </div>
                        )}
                        <button
                            onClick={submitClue}
                            disabled={!selectedCardId || (clueMode === 'TEXT' && !clueInput) || isSubmitting}
                            className={`w-full py-4 rounded-xl font-black text-xl shadow-lg transition-all transform active:scale-95 ${(!selectedCardId || (clueMode === 'TEXT' && !clueInput))
                                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/30'
                                }`}
                        >
                            {!selectedCardId ? "1. VYBER KARTU" : ((clueMode === 'TEXT' && !clueInput) ? "2. ZADEJ NÁPOVĚDU" : "POTVRDIT VÝBĚR")}
                        </button>
                    </div>
                </div>
            );
        } else {
            return (
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
                    <div className="text-6xl mb-6">{getAvatarIcon(storyteller?.avatar)}</div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">{storyteller?.nickname || 'Vypravěč'} vybírá...</h2>
                    <p className="text-slate-400 animate-pulse">Připrav se na hádání!</p>
                </div>
            );
        }
    }

    if (phase === 'PLAYERS_PICK') {
        if (isStoryteller) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                    <h2 className="text-sm text-slate-400 uppercase tracking-widest font-bold mb-4">Nápověda</h2>
                    <div className="text-3xl md:text-5xl font-black text-white bg-slate-800/50 px-6 py-4 rounded-2xl border border-white/10 mb-8 max-w-full break-words">
                        "{activeRound?.clue}"
                    </div>
                    <p className="text-lg text-white mb-6">Čekáme na ostatní...</p>
                    <div className="flex gap-3 justify-center flex-wrap">
                        {gameState.players.filter((p: any) => p.id !== playerId).map((p: any) => {
                            const playedCount = getPlayedCards(p.id).length;
                            const pRequired = (playerCount === 3) ? 2 : 1;
                            const isReady = playedCount >= pRequired;
                            return (
                                <div key={p.id} className={`flex flex-col items-center transition-opacity ${isReady ? 'opacity-100' : 'opacity-40'}`}>
                                    <div className="text-2xl mb-1">{getAvatarIcon(p.avatar)}</div>
                                    <div className="text-[10px] font-bold text-slate-500">{playedCount}/{pRequired}</div>
                                    {isReady && <Check className="text-emerald-500 w-4 h-4" />}
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }

        if (hasPlayedAll) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
                    <Check className="w-20 h-20 text-emerald-500 mb-6 drop-shadow-[0_0_20px_rgba(16,185,129,0.5)]" />
                    <h2 className="text-2xl font-bold text-white mb-4">Máš vybráno!</h2>
                    <p className="text-slate-400">Čekáme na ostatní hráče...</p>
                </div>
            );
        }

        return (
            <div className="flex flex-col items-center w-full max-w-6xl mx-auto min-h-[calc(100vh-80px)]">
                <div className="text-center mb-2 pt-2 px-4 sticky top-0 z-30 bg-gradient-to-b from-slate-950 via-slate-950 to-transparent w-full">
                    <p className="text-[10px] md:text-xs text-slate-400 uppercase tracking-widest font-bold mb-1">Vypravěč {storyteller?.nickname}:</p>
                    <h2 className="text-lg md:text-4xl font-black text-white px-2 flex items-center justify-center gap-3 leading-tight">
                        "{activeRound?.clue}"
                        {clueMode === 'TEXT' && (
                            <button onClick={() => speakClue(activeRound?.clue)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 text-emerald-400 transition-colors shrink-0">
                                <Volume2 size={20} />
                            </button>
                        )}
                    </h2>
                    {cardsRequiredToPlay > 1 && (
                        <div className="mt-2 text-emerald-400 font-bold bg-emerald-900/30 inline-block px-3 py-1 rounded-full text-sm border border-emerald-500/30">
                            Vyber {myPlayedCards.length + 1}. kartu z {cardsRequiredToPlay}
                        </div>
                    )}
                </div>

                <CardSelector
                    cards={myPlayer?.hand || []}
                    selectedCardId={selectedCardId}
                    onSelect={setSelectedCardId}
                />

                <div className="fixed bottom-0 left-0 w-full p-4 bg-slate-950/90 backdrop-blur-lg border-t border-white/10 z-50">
                    <button
                        onClick={submitCard}
                        disabled={!selectedCardId || isSubmitting}
                        className={`w-full py-4 rounded-xl font-black text-xl shadow-lg transition-all transform active:scale-95 ${!selectedCardId
                            ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                            : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/30'
                            }`}
                    >
                        {!selectedCardId ? "VYBER KARTU" : "ZAHRÁT TUTO KARTU"}
                    </button>
                </div>
            </div>
        );
    }

    if (phase === 'VOTING') {
        const hasVoted = activeRound?.votes?.[playerId];
        const votingCards = shuffledVotingCards;

        const myPlayed = getPlayedCards(playerId);

        if (isStoryteller) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                    <h2 className="text-2xl font-bold text-white mb-6">Hráči hlasují...</h2>
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-2 px-2 w-full max-w-5xl opacity-40 pointer-events-none grayscale">
                        {votingCards.map((cid: string) => (
                            <div key={cid} className="aspect-[2/3] rounded-lg overflow-hidden bg-slate-800">
                                <img src={`${BACKEND_URL}/dixit/image/${cid}`} className="w-full h-full object-cover" />
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        if (hasVoted) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
                    <div className="text-5xl mb-4">🗳️</div>
                    <h2 className="text-2xl font-bold text-white mb-4">Hlas přijat!</h2>
                    <p className="text-slate-400">Výsledky se blíží...</p>
                </div>
            );
        }

        return (
            <div className="flex flex-col items-center w-full max-w-6xl mx-auto min-h-[calc(100vh-80px)]">
                <div className="text-center mb-2 pt-2 px-4 sticky top-0 z-30 bg-gradient-to-b from-slate-950 via-slate-950 to-transparent w-full">
                    <h2 className="text-lg md:text-3xl font-black text-white flex items-center justify-center gap-3 leading-tight">
                        "{activeRound?.clue}"
                        {clueMode === 'TEXT' && (
                            <button onClick={() => speakClue(activeRound?.clue)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 text-emerald-400 transition-colors shrink-0">
                                <Volume2 size={20} />
                            </button>
                        )}
                    </h2>
                    <p className="text-emerald-400 font-bold mt-1 text-sm">Hlasuj pro kartu vypravěče</p>
                </div>

                <CardSelector
                    cards={votingCards}
                    selectedCardId={selectedCardId}
                    onSelect={setSelectedCardId}
                    disabledIds={myPlayed}
                />

                <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-900 via-slate-900 to-transparent z-50">
                    <button
                        onClick={submitVote}
                        disabled={!selectedCardId || isSubmitting}
                        className={`w-full py-4 rounded-xl font-black text-xl shadow-lg transition-all transform active:scale-95 ${!selectedCardId
                            ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                            : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/30'
                            }`}
                    >
                        {!selectedCardId ? "VYBER KARTU" : "HLASOVAT"}
                    </button>
                </div>
            </div>
        );
    }

    if (phase === 'SCORING') {
        const sortedPlayers = [...gameState.players].sort((a: any, b: any) => b.score - a.score);
        const allCards: { id: string, ownerId: string }[] = [];
        Object.entries(activeRound?.cardsPlayed || {}).forEach(([pid, val]: [string, any]) => {
            if (Array.isArray(val)) { val.forEach(c => allCards.push({ id: c, ownerId: pid })); }
            else { allCards.push({ id: val, ownerId: pid }); }
        });

        return (
            <div className="flex flex-col items-center w-full max-w-4xl mx-auto p-4 pb-24">
                <h1 className="text-3xl font-black text-amber-500 mb-6 drop-shadow-lg text-center">VÝSLEDKY KOLA</h1>

                <div className="w-full mb-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {allCards.map((card) => {
                            const isStorytellerCard = card.ownerId === gameState.storytellerId;
                            const owner = gameState.players.find((p: any) => p.id === card.ownerId);
                            const votesForThis = Object.entries(activeRound?.votes || {})
                                .filter(([voterId, votedCardId]) => votedCardId === card.id)
                                .map(([voterId]) => gameState.players.find((p: any) => p.id === voterId));

                            return (
                                <div key={card.id} className={`relative rounded-xl overflow-hidden bg-slate-800 aspect-[2/3] ${isStorytellerCard ? 'ring-4 ring-amber-500' : ''}`}>
                                    <img src={`${BACKEND_URL}/dixit/image/${card.id}`} className="w-full h-full object-cover" />
                                    <div className="absolute top-1 left-1 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold text-white flex items-center gap-1">
                                        {getAvatarIcon(owner?.avatar)} {owner?.nickname}
                                        {isStorytellerCard && <Crown className="w-3 h-3 text-amber-500" />}
                                    </div>
                                    <div className="absolute inset-x-0 bottom-0 bg-black/80 backdrop-blur-sm p-1 flex flex-wrap gap-1 justify-center min-h-[24px]">
                                        {votesForThis.map((v: any) => (
                                            <span key={v.id} className="text-lg leading-none">{getAvatarIcon(v?.avatar)}</span>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="w-full bg-slate-900/50 rounded-2xl p-4 border border-white/10">
                    <h3 className="text-lg text-white mb-3 font-bold">Žebříček</h3>
                    <div className="space-y-2">
                        {sortedPlayers.map((p: any, i: number) => (
                            <div key={p.id} className="flex items-center justify-between bg-black/20 p-3 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <span className="text-lg font-bold text-slate-600 w-6">#{i + 1}</span>
                                    <span className="text-2xl">{getAvatarIcon(p.avatar)}</span>
                                    <span className={`text-lg font-bold ${p.id === playerId ? 'text-emerald-400' : 'text-white'}`}>
                                        {p.nickname}
                                    </span>
                                </div>
                                <div className="text-xl font-black text-white">{p.score}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {(isStoryteller || gameState.players[0].id === playerId) && (
                    <div className="fixed bottom-0 left-0 w-full p-4 bg-slate-950/90 backdrop-blur-lg flex justify-center z-50 border-t border-white/10">
                        <button
                            onClick={nextRound}
                            disabled={isSubmitting}
                            className="btn btn-primary bg-emerald-600 hover:bg-emerald-500 text-white text-lg px-8 py-3 rounded-xl shadow-xl flex items-center gap-2"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" /> : <>DALŠÍ KOLO <ArrowRight /></>}
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return <div className="text-white text-center p-10"><Loader2 className="animate-spin w-10 h-10 mx-auto mb-4" />Načítání fáze {phase}...</div>;
}
