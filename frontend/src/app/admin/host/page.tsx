"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { io, Socket } from "socket.io-client";
import { Users, Play, Check } from "lucide-react";

// Production Backend URL
const BACKEND_URL = "https://otamat-production.up.railway.app";

function HostGameContent() {
    const searchParams = useSearchParams();
    const pin = searchParams.get("pin");

    const [socket, setSocket] = useState<Socket | null>(null);
    const [players, setPlayers] = useState<any[]>([]);

    // Game State
    const [gameStarted, setGameStarted] = useState(false);
    const [currentQuestion, setCurrentQuestion] = useState<{ text: string, mediaUrl?: string, options: string[], index: number, total: number } | null>(null);
    const [answerStats, setAnswerStats] = useState<{ count: number, total: number }>({ count: 0, total: 0 });
    const [timeLeft, setTimeLeft] = useState(30);
    const [showResults, setShowResults] = useState(false);
    const [resultsData, setResultsData] = useState<{ correctIndex: number, players: any[] } | null>(null);
    const [gameFinished, setGameFinished] = useState(false);
    const [finalPlayers, setFinalPlayers] = useState<any[]>([]);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [revealCount, setRevealCount] = useState(0);

    useEffect(() => {
        if (!pin) return;

        const newSocket = io(BACKEND_URL);
        setSocket(newSocket);

        newSocket.emit('watchGame', { pin });

        newSocket.on("playerJoined", (player) => {
            setPlayers((prev) => [...prev, player]);
        });

        newSocket.on("updatePlayerList", (playerList) => {
            setPlayers(playerList);
        });

        newSocket.on("questionStart", (data) => {
            setCurrentQuestion({
                text: data.text,
                mediaUrl: data.mediaUrl,
                options: data.options,
                index: data.questionIndex,
                total: data.totalQuestions
            });
            setAnswerStats({ count: 0, total: players.length });
            setTimeLeft(data.timeLimit);
            setShowResults(false);
            setGameStarted(true);
        });

        newSocket.on("answerSubmitted", (data) => {
            setAnswerStats({ count: data.count, total: data.total });
        });

        newSocket.on("questionEnd", (data) => {
            setResultsData(data);
            setShowResults(true);
        });

        newSocket.on("gameOver", (data) => {
            setFinalPlayers(data.players.sort((a: any, b: any) => b.score - a.score));
            setGameFinished(true);
            setGameStarted(false);
        });

        newSocket.on("countdownStart", (data) => {
            setCountdown(data.duration);
            setShowResults(false); // Hide results if showing
        });

        return () => {
            newSocket.disconnect();
        };
    }, [pin]);

    useEffect(() => {
        // Game Timer
        if (gameStarted && !showResults && timeLeft > 0 && countdown === null) {
            const timer = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
            return () => clearInterval(timer);
        }

        // Countdown Timer
        if (countdown !== null && countdown > 0) {
            const timer = setInterval(() => {
                setCountdown((prev) => (prev !== null ? prev - 1 : null));
            }, 1000);
            return () => clearInterval(timer);
        } else if (countdown === 0) {
            setCountdown(null);
        }

        // Final Results Reveal Animation
        if (gameFinished && finalPlayers.length > 0 && revealCount < Math.min(5, finalPlayers.length)) {
            const timer = setInterval(() => {
                setRevealCount((prev) => prev + 1);
            }, 1500); // Reveal one player every 1.5 seconds
            return () => clearInterval(timer);
        }
    }, [gameStarted, showResults, timeLeft, countdown, gameFinished, finalPlayers, revealCount]);

    const handleNextQuestion = () => {
        if (socket && pin) {
            socket.emit("nextQuestion", { pin });
        }
    };

    const handleStartGame = () => {
        if (socket && pin) {
            socket.emit("startGame", { pin });
        }
    };

    if (!pin) return <div className="text-white text-center mt-20">Chybí PIN hry.</div>;

    if (gameFinished) {
        const topPlayers = finalPlayers.slice(0, 5).reverse(); // Get top 5 and reverse for display (5th to 1st)
        // Adjust reveal logic: we want to show from bottom (lowest rank) to top (1st place)
        // If revealCount is 1, show the last item of topPlayers.
        // If revealCount is 5, show all.

        const visiblePlayers = topPlayers.slice(Math.max(0, topPlayers.length - revealCount));

        return (
            <main className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-[#09090b] to-black">
                <style jsx global>{`
                    @keyframes popIn {
                        0% { transform: scale(0); opacity: 0; }
                        80% { transform: scale(1.1); opacity: 1; }
                        100% { transform: scale(1); opacity: 1; }
                    }
                    @keyframes confetti {
                        0% { transform: translateY(0) rotate(0deg); opacity: 1; }
                        100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
                    }
                    .pop-in { animation: popIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
                    .confetti-piece {
                        position: absolute;
                        width: 10px;
                        height: 10px;
                        background: #ffd700;
                        top: -10px;
                        animation: confetti 3s linear infinite;
                    }
                `}</style>

                {/* Confetti Effect (Simple CSS) */}
                {revealCount >= topPlayers.length && (
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        {[...Array(50)].map((_, i) => (
                            <div key={i} className="confetti-piece" style={{
                                left: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 3}s`,
                                backgroundColor: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff'][Math.floor(Math.random() * 5)]
                            }} />
                        ))}
                    </div>
                )}

                <div style={{ width: '100%', maxWidth: '1000px', textAlign: 'center', margin: '0 auto', zIndex: 10 }}>
                    <h1 className="text-6xl md:text-8xl font-black mb-12 bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 via-yellow-500 to-yellow-700 drop-shadow-2xl">
                        VÍTĚZOVÉ
                    </h1>

                    <div className="flex flex-col-reverse gap-4 items-center justify-end min-h-[600px]">
                        {visiblePlayers.map((player, index) => {
                            // Calculate actual rank (since we reversed the array)
                            const rank = topPlayers.length - index;
                            const isWinner = rank === 1;

                            return (
                                <div key={player.id} className={`pop-in flex items-center justify-between w-full max-w-3xl p-6 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-md
                                    ${isWinner ? 'bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border-yellow-500/50 scale-110 mb-8' : 'bg-white/5'}
                                `}>
                                    <div className="flex items-center gap-6">
                                        <div className={`
                                            w-16 h-16 rounded-full flex items-center justify-center text-3xl font-bold border-4
                                            ${rank === 1 ? 'bg-yellow-500 text-black border-yellow-300' :
                                                rank === 2 ? 'bg-gray-400 text-black border-gray-300' :
                                                    rank === 3 ? 'bg-orange-700 text-white border-orange-500' :
                                                        'bg-slate-800 text-white border-slate-700'}
                                        `}>
                                            {rank}
                                        </div>
                                        <div className="text-6xl">{avatarMap[player.avatar] || player.avatar}</div>
                                        <div className={`text-3xl md:text-4xl font-bold ${isWinner ? 'text-yellow-400' : 'text-white'}`}>
                                            {player.nickname}
                                        </div>
                                    </div>
                                    <div className="text-4xl md:text-5xl font-black text-white">
                                        {player.score} <span className="text-2xl text-gray-400 font-normal">b</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {revealCount >= topPlayers.length && (
                        <Link href="/dashboard" className="btn btn-primary text-2xl px-12 py-4 mt-12 inline-flex animate-bounce">
                            Zpět na dashboard
                        </Link>
                    )}
                </div>
            </main>
        );
    }

    if (gameStarted && currentQuestion) {
        return (
            <main className="h-screen flex flex-col p-4">
                {/* Header Info */}
                <div className="flex justify-between items-center mb-4 px-4 w-full max-w-[95vw] mx-auto">
                    <div className="text-xl font-bold text-gray-400">
                        Otázka {currentQuestion.index} / {currentQuestion.total}
                    </div>
                    <div className="text-3xl font-bold text-white bg-white/10 px-6 py-2 rounded-xl">
                        {timeLeft}s
                    </div>
                    <div className="text-xl font-bold text-gray-400">
                        Odpovědi: {answerStats.count} / {answerStats.total}
                    </div>
                </div>

                {/* Question & Image Area */}
                <div className="flex-1 flex flex-col items-center justify-center mb-4 relative">
                    <div className="glass-card w-full !max-w-[95vw] p-8 flex flex-col items-center justify-center h-full relative overflow-hidden">
                        <h2 className="text-4xl md:text-6xl font-bold text-center mb-8 leading-tight z-10 text-white drop-shadow-lg">
                            {currentQuestion.text}
                        </h2>

                        {/* Image Placeholder or Actual Image */}
                        <div className="flex-1 w-full flex items-center justify-center rounded-xl mb-4 relative overflow-hidden" style={{ minHeight: '200px' }}>
                            {currentQuestion.mediaUrl ? (
                                <img src={currentQuestion.mediaUrl} alt="Question Media" className="max-h-full max-w-full object-contain rounded-lg shadow-2xl" />
                            ) : (
                                <div className="text-white/10 text-9xl font-bold">?</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Options Area - 2x2 Grid */}
                <div className="grid grid-cols-2 gap-4 w-full !max-w-[95vw] mx-auto mb-4" style={{ height: '35vh', minHeight: '250px' }}>
                    {currentQuestion.options.map((opt, i) => {
                        const isCorrect = showResults && resultsData?.correctIndex === i;
                        const gradientClass = [
                            'from-[var(--opt-1-from)] to-[var(--opt-1-to)]',
                            'from-[var(--opt-2-from)] to-[var(--opt-2-to)]',
                            'from-[var(--opt-3-from)] to-[var(--opt-3-to)]',
                            'from-[var(--opt-4-from)] to-[var(--opt-4-to)]'
                        ][i % 4];

                        return (
                            <div key={i} className={`
                                rounded-2xl text-2xl md:text-3xl font-bold text-white flex items-center justify-center gap-4 transition-all duration-300 relative overflow-hidden shadow-lg border-2 border-white/10
                                ${showResults
                                    ? (isCorrect ? 'bg-emerald-500 scale-105 z-10' : 'bg-white/5 opacity-30 grayscale')
                                    : `bg-gradient-to-br ${gradientClass}`
                                }
                            `}>
                                <span className="absolute left-4 text-3xl opacity-50">{['▲', '◆', '●', '■'][i]}</span>
                                <span className="z-10 text-center px-8 truncate w-full drop-shadow-md">{opt}</span>
                                {isCorrect && <Check size={48} className="absolute right-4 text-white drop-shadow-md" />}
                            </div>
                        );
                    })}
                </div>

                {showResults && (
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-md z-40 flex flex-col items-center justify-center p-8">
                        <h2 className="text-5xl font-bold text-white mb-8">Průběžné výsledky</h2>

                        <div className="w-full max-w-4xl space-y-4 mb-12">
                            {resultsData?.players.sort((a: any, b: any) => b.score - a.score).slice(0, 5).map((player: any, index: number) => (
                                <div key={player.id} className="flex items-center justify-between bg-white/10 p-4 rounded-xl border border-white/5">
                                    <div className="flex items-center gap-4">
                                        <span className={`text-2xl font-bold w-8 ${index === 0 ? 'text-yellow-400' : 'text-gray-400'}`}>#{index + 1}</span>
                                        <span className="text-4xl">{avatarMap[player.avatar] || player.avatar}</span>
                                        <span className="text-2xl font-bold text-white">{player.nickname}</span>
                                    </div>
                                    <span className="text-3xl font-bold text-emerald-400">{player.score} b</span>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={handleNextQuestion}
                            className="btn btn-primary text-3xl px-12 py-6 flex items-center gap-4 shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-105 transition-transform"
                        >
                            <Play size={40} /> Další otázka
                        </button>
                    </div>
                )}

                {countdown !== null && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center">
                        <div className="text-[15rem] font-black text-white animate-pulse">
                            {countdown}
                        </div>
                    </div>
                )}
            </main>
        );
    }

    return (
        <main className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
            <style jsx global>{`
                @keyframes float {
                    0% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                    100% { transform: translateY(0px); }
                }
                @keyframes pulse-glow {
                    0% { box-shadow: 0 0 0 0 rgba(var(--primary-rgb), 0.4); }
                    70% { box-shadow: 0 0 0 20px rgba(var(--primary-rgb), 0); }
                    100% { box-shadow: 0 0 0 0 rgba(var(--primary-rgb), 0); }
                }
                .avatar-float {
                    animation: float 3s ease-in-out infinite;
                }
            `}</style>

            <div className="w-full max-w-[95vw] flex flex-col items-center text-center z-10">
                <h1 className="text-6xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                    Lobby
                </h1>
                <p className="text-2xl text-gray-400 mb-8">Připojte se na <span className="text-white font-bold">hollyhop.cz</span> pomocí PINu:</p>

                <div className="text-8xl md:text-9xl font-black text-white bg-white/10 px-12 py-8 rounded-3xl border-4 border-white/20 mb-12 backdrop-blur-lg shadow-[0_0_50px_rgba(255,255,255,0.1)] animate-pulse">
                    {pin}
                </div>

                <div className="glass-card w-full !max-w-[95vw] p-8 min-h-[500px] flex flex-col">
                    <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-4">
                        <h2 className="text-4xl font-bold flex items-center gap-3">
                            <Users size={40} /> Hráči ({players.length})
                        </h2>
                        {players.length > 0 && (
                            <div className="text-emerald-400 font-bold text-2xl animate-pulse">Připraveni ke hře</div>
                        )}
                    </div>

                    {players.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center text-gray-500 text-3xl">
                            Čekání na hráče...
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-12">
                            {players.map((player, i) => (
                                <div key={player.id} className="flex flex-col items-center gap-4 avatar-float" style={{ animationDelay: `${i * 0.1}s` }}>
                                    <div className="text-7xl bg-white/10 w-32 h-32 rounded-full flex items-center justify-center border-4 border-white/20 shadow-lg">
                                        {avatarMap[player.avatar] || player.avatar}
                                    </div>
                                    <div className="font-bold text-2xl text-white w-full break-words leading-tight drop-shadow-md">{player.nickname}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex gap-6 mt-12">
                    <Link href="/dashboard" className="btn btn-secondary text-2xl px-10 py-5">
                        Ukončit hru
                    </Link>
                    <button
                        onClick={handleStartGame}
                        className="btn btn-primary text-2xl px-16 py-5 flex items-center gap-4 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all shadow-xl"
                        disabled={players.length === 0}
                    >
                        <Play size={32} /> Spustit hru
                    </button>
                </div>
            </div>
        </main>
    );
}

const avatarMap: { [key: string]: string } = {
    cow: '🐮', fox: '🦊', cat: '🐱', dog: '🐶', lion: '🦁', panda: '🐼', koala: '🐨', pig: '🐷',
    mouse: '🐭', frog: '🐸', bear: '🐻', tiger: '🐯', rabbit: '🐰', hamster: '🐹', dragon: '🐲', monkey: '🐵',
    chicken: '🐔', penguin: '🐧', bird: '🐦', duck: '🦆', eagle: '🦅', owl: '🦉', bat: '🦇', wolf: '🐺',
    boar: '🐗', horse: '🐴', unicorn: '🦄', bee: '🐝', bug: '🐛', butterfly: '🦋', snail: '🐌', beetle: '🐞',
    ant: '🐜', spider: '🕷', scorpion: '🦂', turtle: '🐢', snake: '🐍', lizard: '🦎', t_rex: '🦖', sauropod: '🦕',
    octopus: '🐙', squid: '🦑', shrimp: '🦐', lobster: '🦞', crab: '🦀', puffer: '🐡', fish: '🐠', dolphin: '🐬',
    whale: '🐳', shark: '🦈', crocodile: '🐊', leopard: '🐆', zebra: '🦓', gorilla: '🦍', orangutan: '🦧', elephant: '🐘',
    hippo: '🦛', rhino: '🦏', camel: '🐫', llama: '🦙', giraffe: '🦒', buffalo: '🐃', ox: '🐂', ram: '🐏',
    sheep: '🐑', goat: '🐐', deer: '🦌', turkey: '🦃', rooster: '🐓', peacock: '🦚', parrot: '🦜', swan: '🦢',
    flamingo: '🦩', dove: '🕊', raccoon: '🦝', skunk: '🦨', badger: '🦡', beaver: '🦫', otter: '🦦', sloth: '🦥'
};

export default function HostGamePage() {
    return (
        <Suspense fallback={<div className="text-white text-center mt-20">Načítání...</div>}>
            <HostGameContent />
        </Suspense>
    );
}
