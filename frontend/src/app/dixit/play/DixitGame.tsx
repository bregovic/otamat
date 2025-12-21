"use client";
import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { BACKEND_URL } from '@/utils/config';
import { Check, X, Crown, Lightbulb, Trophy, ArrowRight, Loader2 } from 'lucide-react';

interface DixitGameProps {
    socket: Socket;
    gameState: any;
    playerId: string;
    pinCode: string;
}

export default function DixitGame({ socket, gameState, playerId, pinCode }: DixitGameProps) {
    const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
    const [clueInput, setClueInput] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Derived State
    const phase = gameState.phase;
    const isStoryteller = gameState.storytellerId === playerId;
    const storyteller = gameState.players.find((p: any) => p.id === gameState.storytellerId);
    const myPlayer = gameState.players.find((p: any) => p.id === playerId);

    // Normalize Round Data
    // Backend sends rounds ordered by desc, so [0] is current.
    const activeRound = gameState.rounds && gameState.rounds.length > 0 ? gameState.rounds[0] : null;

    // Normalize Cards Played (Backend sends Map<playerId, string[] | string>)
    const getPlayedCards = (pid: string): string[] => {
        if (!activeRound || !activeRound.cardsPlayed) return [];
        const val = activeRound.cardsPlayed[pid];
        if (Array.isArray(val)) return val;
        if (val) return [val];
        return [];
    };

    // 3-Player Support
    const playerCount = gameState.players.length;
    const cardsRequiredToPlay = (playerCount === 3 && !isStoryteller) ? 2 : 1;
    const myPlayedCards = getPlayedCards(playerId);
    const hasPlayedAll = myPlayedCards.length >= cardsRequiredToPlay;

    // Reset selection on phase change
    useEffect(() => {
        setSelectedCardId(null);
        setClueInput("");
        setIsSubmitting(false);
    }, [phase]);

    // Clear selection after successful partial submission (for 3-player 2nd card)
    useEffect(() => {
        setSelectedCardId(null);
        setIsSubmitting(false);
    }, [myPlayedCards.length]);

    // --- ACTIONS ---

    const submitClue = () => {
        if (!selectedCardId || !clueInput.trim() || isSubmitting) return;
        setIsSubmitting(true);
        socket.emit('dixit:setClue', {
            pin: pinCode,
            playerId,
            cardId: selectedCardId,
            clue: clueInput
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

    // --- RENDER HELPERS ---

    const Card = ({ id, onClick, selected, disabled, ownerId }: any) => (
        <div
            onClick={() => !disabled && onClick(id)}
            className={`
                relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300 transform
                ${selected ? 'scale-105 ring-4 ring-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)] z-10' : 'hover:scale-102 hover:shadow-xl'}
                ${disabled ? 'opacity-50 grayscale cursor-not-allowed' : ''}
                bg-slate-800 border border-slate-700
            `}
            style={{ aspectRatio: '2/3', minWidth: '160px', maxWidth: '240px' }}
        >
            <img
                src={`${BACKEND_URL}/dixit/image/${id}`}
                alt="Dixit Card"
                className="w-full h-full object-cover"
                loading="lazy"
            />
            {selected && (
                <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                    <Check className="w-12 h-12 text-emerald-500 drop-shadow-lg" />
                </div>
            )}
        </div>
    );

    // --- PHASES ---

    if (phase === 'STORYTELLER_PICK') {
        if (isStoryteller) {
            return (
                <div className="flex flex-col items-center w-full max-w-6xl mx-auto">
                    <div className="text-center mb-8">
                        <div className="inline-block bg-amber-500/20 text-amber-300 px-4 py-1 rounded-full text-sm font-bold uppercase mb-2 border border-amber-500/50">Jsi Vypravěč</div>
                        <h2 className="text-4xl font-bold text-white mb-2">Vyber kartu a vymysli nápovědu</h2>
                    </div>

                    <div className="w-full mb-8 overflow-x-auto pb-4 custom-scrollbar">
                        <div className="flex gap-4 justify-center px-4 min-w-max">
                            {myPlayer?.hand.map((cardId: string) => (
                                <Card
                                    key={cardId}
                                    id={cardId}
                                    selected={selectedCardId === cardId}
                                    onClick={setSelectedCardId}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="glass-card w-full max-w-lg p-6 flex flex-col gap-4">
                        <input
                            type="text"
                            placeholder="Zadej nápovědu (slovo, věta, zvuk...)"
                            value={clueInput}
                            onChange={e => setClueInput(e.target.value)}
                            className="bg-slate-900 border border-slate-700 text-white p-4 rounded-xl text-xl outline-none focus:border-emerald-500 transition-colors text-center"
                        />
                        <button
                            onClick={submitClue}
                            disabled={!selectedCardId || !clueInput.trim() || isSubmitting}
                            className="btn btn-primary w-full py-4 text-xl flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" /> : 'POTVRDIT VÝBĚR'}
                        </button>
                    </div>
                </div>
            );
        } else {
            return (
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                    <div className="text-6xl mb-4">{storyteller?.avatar}</div>
                    <h2 className="text-3xl font-bold text-white mb-2">{storyteller?.nickname || 'Vypravěč'} vybírá kartu...</h2>
                    <p className="text-slate-400 animate-pulse">Připrav se na hádání!</p>
                </div>
            );
        }
    }

    if (phase === 'PLAYERS_PICK') {
        if (isStoryteller) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                    <h2 className="text-2xl text-slate-400 uppercase tracking-widest font-bold mb-4">Nápověda</h2>
                    <div className="text-5xl font-black text-white bg-slate-800/50 px-8 py-4 rounded-2xl border border-white/10 mb-12">
                        "{activeRound?.clue}"
                    </div>
                    <p className="text-xl text-white">Čekáme, až ostatní vyberou karty...</p>
                    <div className="flex gap-4 mt-8 justify-center">
                        {gameState.players.filter((p: any) => p.id !== playerId).map((p: any) => {
                            const playedCount = getPlayedCards(p.id).length;
                            // Need 2 cards for 3 players mode, else 1
                            const pRequired = (playerCount === 3) ? 2 : 1;
                            const isReady = playedCount >= pRequired;

                            return (
                                <div key={p.id} className={`flex flex-col items-center transition-opacity ${isReady ? 'opacity-100' : 'opacity-30'}`}>
                                    <div className="text-3xl mb-1">{p.avatar}</div>
                                    <div className="text-xs font-bold text-slate-500">{playedCount}/{pRequired}</div>
                                    {isReady && <Check className="text-emerald-500 w-6 h-6" />}
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }

        if (hasPlayedAll) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                    <Check className="w-24 h-24 text-emerald-500 mb-6 drop-shadow-[0_0_20px_rgba(16,185,129,0.5)]" />
                    <h2 className="text-3xl font-bold text-white mb-4">Máš vybráno!</h2>
                    <p className="text-slate-400">Teď už jen čekáme na ostatní...</p>
                </div>
            );
        }

        return (
            <div className="flex flex-col items-center w-full max-w-6xl mx-auto">
                <div className="text-center mb-8 sticky top-0 bg-slate-950/90 backdrop-blur-md py-4 z-20 w-full border-b border-white/5">
                    <div className="text-sm text-slate-400 uppercase tracking-widest font-bold mb-2">Vypravěč {storyteller?.nickname} napovídá:</div>
                    <h2 className="text-3xl md:text-5xl font-black text-white px-4">"{activeRound?.clue}"</h2>
                    {cardsRequiredToPlay > 1 && (
                        <div className="mt-2 text-emerald-400 font-bold">
                            Vyber {myPlayedCards.length + 1}. kartu z {cardsRequiredToPlay}
                        </div>
                    )}
                </div>

                <p className="text-slate-300 mb-6">Vyber ze své ruky kartu, která se nejlépe hodí k nápovědě:</p>

                <div className="w-full mb-8 overflow-x-auto pb-4 custom-scrollbar">
                    <div className="flex gap-4 justify-center px-4 min-w-max">
                        {myPlayer?.hand.map((cardId: string) => (
                            <Card
                                key={cardId}
                                id={cardId}
                                selected={selectedCardId === cardId}
                                onClick={setSelectedCardId}
                            />
                        ))}
                    </div>
                </div>

                <div className="glass-card w-full max-w-md p-6">
                    <button
                        onClick={submitCard}
                        disabled={!selectedCardId || isSubmitting}
                        className="btn btn-primary w-full py-4 text-xl flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? <Loader2 className="animate-spin" /> : 'ZAHRÁT TUTO KARTU'}
                    </button>
                </div>
            </div>
        );
    }

    if (phase === 'VOTING') {
        const hasVoted = activeRound?.votes?.[playerId];

        // Collect all played cards from all players
        // In 3-player mode, players played 2 cards. Storyteller 1 (backend handles this logic? Wait. Storyteller plays 1 card)
        // We need to flatten the cardsPlayed map
        let votingCards: string[] = [];

        // activeRound.cardsPlayed is { pid: string[] | string }
        Object.values(activeRound?.cardsPlayed || {}).forEach((val: any) => {
            if (Array.isArray(val)) votingCards.push(...val);
            else votingCards.push(val);
        });

        // Randomize order (simple shuffle for display)
        // Note: ID-based shuffling might be unstable on re-render, so we should memoize or sort by ID for consistency if we want stable view
        // Or rely on backend order if backend sends array. But backend sends map.
        // We sort by ID to ensure all clients see same list? No, random is better.
        // But random on every render is bad.
        // Let's just sort by ID for now to be stable.
        votingCards.sort();

        if (isStoryteller) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                    <h2 className="text-3xl font-bold text-white mb-8">Hráči hlasují...</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-4 w-full max-w-5xl opacity-50 pointer-events-none grayscale">
                        {votingCards.map((cid: string) => (
                            <div key={cid} className="aspect-[2/3] rounded-xl overflow-hidden bg-slate-800">
                                <img src={`${BACKEND_URL}/dixit/image/${cid}`} className="w-full h-full object-cover" />
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        if (hasVoted) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                    <div className="text-6xl mb-4">🗳️</div>
                    <h2 className="text-3xl font-bold text-white mb-4">Hlas přijat!</h2>
                    <p className="text-slate-400">Jakmile odhlasují všichni, uvidíme výsledky.</p>
                </div>
            );
        }

        return (
            <div className="flex flex-col items-center w-full max-w-6xl mx-auto pb-20">
                <div className="text-center mb-6 sticky top-0 bg-slate-950/90 backdrop-blur-md py-4 z-20 w-full border-b border-white/5">
                    <div className="text-sm text-slate-400 uppercase tracking-widest font-bold">Nápověda:</div>
                    <h2 className="text-3xl font-bold text-white">"{activeRound?.clue}"</h2>
                    <p className="text-emerald-400 font-bold mt-2">Hlasuj pro kartu vypravěče (ne pro svou!)</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 px-4 w-full">
                    {votingCards.map((cid: string) => {
                        // Check if this card is MINE
                        const myCards = getPlayedCards(playerId);
                        const isMine = myCards.includes(cid);

                        // Determine Owner? Wait, we can't cheat.
                        // Frontend knows my cards.

                        return (
                            <Card
                                key={cid}
                                id={cid}
                                selected={selectedCardId === cid}
                                onClick={setSelectedCardId}
                                disabled={isMine} // Cannot vote for own card(s)
                            />
                        );
                    })}
                </div>

                <div className="fixed bottom-0 left-0 w-full p-4 bg-gradient-to-t from-slate-950 to-transparent flex justify-center z-30">
                    <button
                        onClick={submitVote}
                        disabled={!selectedCardId || isSubmitting}
                        className="btn btn-primary max-w-md w-full py-4 text-xl flex items-center justify-center gap-2 shadow-2xl"
                    >
                        {isSubmitting ? <Loader2 className="animate-spin" /> : 'HLASOVAT'}
                    </button>
                </div>
            </div>
        );
    }

    if (phase === 'SCORING') {
        const sortedPlayers = [...gameState.players].sort((a: any, b: any) => b.score - a.score);

        // Flatten voting cards again with Owner info
        const allCards: { id: string, ownerId: string }[] = [];
        Object.entries(activeRound?.cardsPlayed || {}).forEach(([pid, val]: [string, any]) => {
            if (Array.isArray(val)) {
                val.forEach(c => allCards.push({ id: c, ownerId: pid }));
            } else {
                allCards.push({ id: val, ownerId: pid });
            }
        });

        return (
            <div className="flex flex-col items-center w-full max-w-4xl mx-auto p-4 pb-24">
                <h1 className="text-4xl font-black text-amber-500 mb-8 drop-shadow-lg">VÝSLEDKY KOLA</h1>

                {/* Reveal Cards */}
                <div className="w-full mb-12">
                    <h3 className="text-xl text-white mb-4 font-bold border-b border-white/10 pb-2">Karty a Hlasování</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {allCards.map((card) => {
                            const isStorytellerCard = card.ownerId === gameState.storytellerId;
                            const owner = gameState.players.find((p: any) => p.id === card.ownerId);

                            // Find who voted for this
                            const votesForThis = Object.entries(activeRound?.votes || {})
                                .filter(([voterId, votedCardId]) => votedCardId === card.id)
                                .map(([voterId]) => gameState.players.find((p: any) => p.id === voterId));

                            return (
                                <div key={card.id} className={`relative rounded-xl overflow-hidden bg-slate-800 ${isStorytellerCard ? 'ring-4 ring-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.3)]' : ''}`}>
                                    <img src={`${BACKEND_URL}/dixit/image/${card.id}`} className="w-full aspect-[2/3] object-cover" />

                                    {/* Owner Badge */}
                                    <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md px-2 py-1 rounded-lg text-xs font-bold text-white flex items-center gap-1">
                                        {owner?.avatar} {owner?.nickname}
                                        {isStorytellerCard && <Crown className="w-3 h-3 text-amber-500" />}
                                    </div>

                                    {/* Voters */}
                                    {votesForThis.length > 0 && (
                                        <div className="absolute inset-x-0 bottom-0 bg-black/80 backdrop-blur-sm p-2 flex flex-wrap gap-1 justify-center">
                                            {votesForThis.map((v: any) => (
                                                <span key={v.id} className="text-xl" title={v.nickname}>{v.avatar}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Leaderboard */}
                <div className="w-full bg-slate-900/50 rounded-2xl p-6 border border-white/10">
                    <h3 className="text-xl text-white mb-4 font-bold">Žebříček</h3>
                    <div className="space-y-3">
                        {sortedPlayers.map((p: any, i: number) => (
                            <div key={p.id} className="flex items-center justify-between bg-black/20 p-4 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl font-bold text-slate-600 w-8">#{i + 1}</span>
                                    <span className="text-3xl">{p.avatar}</span>
                                    <span className={`text-xl font-bold ${p.id === playerId ? 'text-emerald-400' : 'text-white'}`}>
                                        {p.nickname}
                                        {p.id === gameState.storytellerId && <span className="text-xs ml-2 text-amber-500 uppercase border border-amber-500 px-1 rounded">Vypravěč</span>}
                                    </span>
                                </div>
                                <div className="text-2xl font-black text-white">{p.score} b</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Next Round Control */}
                {(isStoryteller || gameState.players[0].id === playerId) && (
                    <div className="fixed bottom-0 left-0 w-full p-4 bg-gradient-to-t from-slate-950 to-transparent flex justify-center z-50">
                        <button
                            onClick={nextRound}
                            disabled={isSubmitting}
                            className="btn btn-primary bg-emerald-600 hover:bg-emerald-500 text-white text-2xl px-12 py-4 rounded-xl shadow-2xl flex items-center gap-2"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" /> : <>DALŠÍ KOLO <ArrowRight /></>}
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return <div className="text-white text-center p-10">Načítání fáze {phase}...</div>;
}
