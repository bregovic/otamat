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
    const [currentQuestion, setCurrentQuestion] = useState<{ text: string, options: string[], index: number, total: number } | null>(null);
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
    }, [pin]); // Removed 'players.length' from dependency array to avoid reconnection loops, rely on updatePlayerList

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
                                        <span style={{ fontSize: '2.5rem' }}>{['🐮', '🦊', '🐱', '🐶', '🦁', '🐼', '🐨', '🐷'][['cow', 'fox', 'cat', 'dog', 'lion', 'panda', 'koala', 'pig'].indexOf(player.avatar)] || player.avatar}</span>
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
            <main>
                <div style={{ width: '100%', maxWidth: '1000px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', margin: '0 auto', paddingTop: '2rem' }}>
                    <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', padding: '0 1rem' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#a1a1aa' }}>
                            Otázka {currentQuestion.index} / {currentQuestion.total}
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white', background: 'rgba(255,255,255,0.1)', padding: '0.5rem 1.5rem', borderRadius: '12px' }}>
                            {timeLeft}s
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#a1a1aa' }}>
                            Odpovědi: {answerStats.count} / {answerStats.total}
                        </div>
                    </div>

                    <div className="glass-card" style={{ width: '100%', maxWidth: '800px', marginBottom: '2rem', padding: '4rem' }}>
                        <h2 style={{ fontSize: '3.5rem', marginBottom: '3rem', lineHeight: '1.2' }}>{currentQuestion.text}</h2>
                        <div style={{ marginTop: '3rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
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
                                        p-6 rounded-2xl text-3xl font-bold text-white flex items-center gap-4 transition-all duration-300
                                        ${showResults
                                            ? (isCorrect ? 'bg-emerald-500' : 'bg-white/5 opacity-30')
                                            : `bg-gradient-to-br ${gradientClass}`
                                        }
                                    `}>
                                        <span style={{ fontSize: '2.5rem' }}>{['▲', '◆', '●', '■'][i]}</span>
                                        {opt}
                                        {isCorrect && <Check size={40} style={{ marginLeft: 'auto' }} />}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    {showResults && (
                        <div style={{ marginTop: '1rem', fontSize: '1.5rem', color: '#a1a1aa' }}>
                            Další otázka za 5 sekund...
                        </div>
                    )}
                </div>
            </main>
        );
    }

    const avatarMap: { [key: string]: string } = { cow: '🐮', fox: '🦊', cat: '🐱', dog: '🐶', lion: '🦁', panda: '🐼', koala: '🐨', pig: '🐷' };
    return (
        <main>
            <div style={{ width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', margin: '0 auto', paddingTop: '4rem' }}>
                <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>Lobby</h1>
                <p style={{ fontSize: '1.5rem', marginBottom: '2rem', color: '#a1a1aa' }}>Připojte se pomocí PINu:</p>
                <div style={{
                    fontSize: '6rem', fontWeight: 'bold', color: 'var(--primary)',
                    background: 'rgba(255,255,255,0.1)', padding: '2rem 4rem', borderRadius: '24px',
                    border: '2px solid var(--primary)', marginBottom: '3rem',
                    textShadow: '0 0 30px rgba(255,255,255,0.3)'
                }}>
                    {pin}
                </div>
                <div className="glass-card" style={{ width: '100%', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Users /> Hráči ({players.length})
                        </h2>
                        {players.length > 0 && (
                            <div style={{ color: '#10b981', fontWeight: 'bold' }}>Připraveni</div>
                        )}
                    </div>
                    {players.length === 0 ? (
                        <p style={{ color: '#a1a1aa', padding: '2rem' }}>Čekání na hráče...</p>
                    ) : (
                        <div className="avatar-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))' }}>
                            {players.map((player) => (
                                <div key={player.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                    <div style={{ fontSize: '2.5rem', background: 'rgba(255,255,255,0.1)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {avatarMap[player.avatar] || player.avatar}
                                    </div>
                                    <div style={{ fontWeight: 'bold' }}>{player.nickname}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <Link href="/dashboard" className="btn btn-secondary" style={{ display: 'inline-flex', width: 'auto' }}>Ukončit hru</Link>
                    <button onClick={handleStartGame} className="btn btn-primary" style={{ display: 'inline-flex', width: 'auto', padding: '1rem 3rem', fontSize: '1.25rem' }} disabled={players.length === 0}>
                        <Play size={24} /> Spustit hru
                    </button>
                </div>
            </div>
        </main>
    );
}

export default function HostGamePage() {
    return (
        <Suspense fallback={<div className="text-white text-center mt-20">Načítání...</div>}>
            <HostGameContent />
        </Suspense>
    );
}
