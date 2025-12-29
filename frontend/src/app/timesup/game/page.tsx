"use client";

import { useTimesUpSocket } from "@/context/TimesUpSocketContext";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function GameControllerContent() {
    const searchParams = useSearchParams();
    const code = searchParams.get('code');
    const socket = useTimesUpSocket();

    // Game State
    const [status, setStatus] = useState('WAITING');
    const [playerId, setPlayerId] = useState<number | null>(null);
    const [activePlayerId, setActivePlayerId] = useState<number | null>(null);
    const [activeCard, setActiveCard] = useState<any>(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [round, setRound] = useState(1);
    const [guesserInfo, setGuesserInfo] = useState<string>("");

    useEffect(() => {
        if (!socket || !code) return;

        // Restore Player ID
        const storedId = localStorage.getItem('timesup_playerId');
        if (storedId) {
            const pid = parseInt(storedId);
            setPlayerId(pid);
            socket.emit('timesup:rejoin', { playerId: pid }, (response: any) => {
                if (response.success && response.player) {
                    console.log("Rejoined:", response);
                    // Sync state from rejoined game if active
                    const game = response.player.game;
                    if (game.status === 'PLAYING' || game.status === 'ROUND_1' || game.status === 'ROUND_2' || game.status === 'ROUND_3') {
                        setStatus('PLAYING');
                        setActivePlayerId(game.activePlayerId);
                        // Find active card if any
                        if (game.activeCardId) {
                            const card = game.cards.find((c: any) => c.id === game.activeCardId);
                            setActiveCard(card);
                        }
                    }
                }
            });
        }

        // --- SOCKET LISTENERS ---

        socket.on('timesup:gameStarted', (game) => {
            setStatus('PLAYING');
            setRound(game.round || 1);
        });

        socket.on('timesup:turnStarted', (game) => {
            setStatus('PLAYING');
            setActivePlayerId(game.activePlayerId);

            // Find Active Card
            if (game.activeCardId) {
                const card = game.cards?.find((c: any) => c.id === game.activeCardId);
                setActiveCard(card);
            }

            // Find Active Player Name for others
            const activePlayer = game.players.find((p: any) => p.id === game.activePlayerId);
            setGuesserInfo(activePlayer ? activePlayer.name : "Někdo");

            // Timer
            if (game.turnExpiresAt) {
                const now = Date.now();
                const expires = new Date(game.turnExpiresAt).getTime();
                setTimeLeft(Math.max(0, Math.ceil((expires - now) / 1000)));
            }
        });

        socket.on('timesup:cardGuessed', (game) => {
            // Update Card
            if (game.activeCardId) {
                const card = game.cards?.find((c: any) => c.id === game.activeCardId);
                setActiveCard(card);
            }
        });

        socket.on('timesup:roundOver', () => {
            setActiveCard(null);
            setActivePlayerId(null);
            alert("Konec kola!");
            // Optionally set status to ROUND_OVER
        });

        socket.on('timesup:gameEnded', () => {
            localStorage.removeItem('timesup_playerId');
            alert("Hra byla ukončena hostitelem.");
            window.location.href = '/otamat/timesup/join';
        });

        return () => {
            socket.off('timesup:gameStarted');
            socket.off('timesup:turnStarted');
            socket.off('timesup:cardGuessed');
            socket.off('timesup:roundOver');
            socket.off('timesup:gameEnded');
        };
    }, [socket, code]);

    // Simple Timer Countdown
    useEffect(() => {
        if (timeLeft <= 0) return;
        const interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
        return () => clearInterval(interval);
    }, [timeLeft]);


    const sendSuccess = () => {
        if (socket && playerId) {
            socket.emit('timesup:guess', { gameCode: code, guesserId: playerId });
        }
    };

    if (!code) return <div className="text-white text-center p-8">Chybí kód hry!</div>;

    // === RENDER ===

    // 1. Waiting Screen
    if (status === 'WAITING') {
        return (
            <div className="min-h-screen bg-slate-950 text-white p-4 flex flex-col items-center justify-center w-full">
                <h1 className="text-4xl md:text-5xl font-black mb-12 text-slate-800 font-sans tracking-tight uppercase">MÍSTNOST {code}</h1>
                <div className="text-center space-y-6 flex flex-col items-center">
                    <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center border-4 border-slate-800 animate-pulse shadow-2xl relative">
                        <span className="text-4xl animate-spin-slow">⏳</span>
                        <div className="absolute inset-0 rounded-full border border-purple-500/30 animate-ping"></div>
                    </div>

                    <div className="space-y-1">
                        <p className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600 tracking-tight">
                            Čekám na zahájení hry...
                        </p>
                        <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">
                            Sleduj TV obrazovku
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // 2. Active Player Screen
    if (status === 'PLAYING' && playerId === activePlayerId) {
        return (
            <div className="min-h-screen bg-emerald-600 flex flex-col items-center justify-between p-6">
                <div className="text-center mt-4">
                    <h2 className="text-emerald-900 font-black uppercase tracking-widest text-sm mb-2">Jsi na řadě!</h2>
                    <div className="bg-emerald-800/20 px-6 py-2 rounded-full inline-block">
                        <span className="text-4xl font-black text-white font-mono">{timeLeft}s</span>
                    </div>
                </div>

                <div className="bg-white text-black w-full max-w-md aspect-[3/4] rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-2xl animate-in zoom-in duration-300">
                    {activeCard ? (
                        <>
                            <h1 className="text-5xl font-black mb-4 break-words leading-tight">{activeCard.value}</h1>
                            <p className="text-slate-500 text-xl font-medium leading-relaxed">{activeCard.description}</p>
                            {activeCard.imageUrl && <img src={activeCard.imageUrl} className="mt-4 max-h-32 object-contain rounded-lg" />}
                        </>
                    ) : (
                        <h1 className="text-4xl font-bold text-slate-300">Připravuji kartu...</h1>
                    )}
                </div>

                <button
                    onClick={sendSuccess}
                    className="w-full bg-white text-emerald-600 h-24 mb-4 rounded-2xl text-4xl font-black shadow-lg hover:scale-105 transition-transform flex items-center justify-center gap-4 active:scale-95"
                >
                    MÁM TO! 👍
                </button>
            </div>
        );
    }

    // 3. Inactive Player Screen
    return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background noise/pattern */}
            <div className="absolute inset-0 bg-[url('/otamat/grid.svg')] opacity-5 pointer-events-none"></div>

            <div className="text-center z-10">
                <div className="w-20 h-20 bg-slate-800 rounded-full mx-auto mb-6 flex items-center justify-center text-3xl shadow-xl">
                    👀
                </div>
                <h2 className="text-slate-500 font-bold uppercase tracking-widest mb-2">Právě hraje</h2>
                <h1 className="text-4xl font-black text-white mb-8">{guesserInfo || "Ostatní"}</h1>

                <div className="bg-slate-800 px-8 py-4 rounded-2xl border border-slate-700">
                    <span className="text-5xl font-mono font-black text-purple-400">{timeLeft}s</span>
                </div>
            </div>
        </div>
    );
}

export default function GameController() {
    return (
        <Suspense fallback={<div className="text-white">Načítám...</div>}>
            <GameControllerContent />
        </Suspense>
    );
}
