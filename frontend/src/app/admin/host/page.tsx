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

        return () => {
            newSocket.disconnect();
        };
    }, [pin]);

    useEffect(() => {
        if (!gameStarted || showResults || timeLeft <= 0) return;
        const timer = setInterval(() => {
            setTimeLeft((prev) => prev - 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [gameStarted, showResults, timeLeft]);

    const handleStartGame = () => {
        if (socket && pin) {
            socket.emit("startGame", { pin });
        }
    };

    if (!pin) return <div className="text-white text-center mt-20">Chybí PIN hry.</div>;

    if (gameFinished) {
        return (
            <main>
                <div style={{ width: '100%', maxWidth: '800px', textAlign: 'center', margin: '0 auto', paddingTop: '4rem' }}>
                    <h1 style={{ fontSize: '4rem', marginBottom: '2rem', background: 'linear-gradient(to right, #facc15, #fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Konec hry!
                    </h1>

                    <div className="glass-card" style={{ padding: '3rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {finalPlayers.slice(0, 5).map((player, index) => (
                                <div key={player.id} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '1rem', background: index === 0 ? 'rgba(250, 204, 21, 0.2)' : 'rgba(255,255,255,0.05)',
                                    borderRadius: '12px', border: index === 0 ? '1px solid #facc15' : 'none'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <span style={{ fontSize: '2rem', fontWeight: 'bold', width: '40px' }}>#{index + 1}</span>
                                        <span style={{ fontSize: '2.5rem' }}>{avatarMap[player.avatar] || player.avatar}</span>
                                        <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{player.nickname}</span>
                                    </div>
                                    <span style={{ fontSize: '2rem', fontWeight: 'bold' }}>{player.score} b</span>
                                </div>
                            ))}
                        </div>

                        <Link href="/dashboard" className="btn btn-primary" style={{ marginTop: '3rem', display: 'inline-block' }}>
                            Zpět na dashboard
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    if (gameStarted && currentQuestion) {
        return (
            <main className="h-screen flex flex-col p-4">
                {/* Header Info */}
                <div className="flex justify-between items-center mb-4 px-4">
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
                    <div className="glass-card w-full max-w-[95vw] p-8 flex flex-col items-center justify-center h-full relative overflow-hidden">
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

                {/* Options Area - Compact Height */}
                <div className="grid grid-cols-4 gap-6 h-32 md:h-40 w-full max-w-[95vw] mx-auto">
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
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/90 text-white px-12 py-6 rounded-2xl text-4xl font-bold backdrop-blur-xl z-50 border border-white/20 shadow-2xl animate-bounce">
                        Další otázka za 5 sekund...
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

                <div className="glass-card w-full p-8 min-h-[500px] flex flex-col">
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
