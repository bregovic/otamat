"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { io, Socket } from "socket.io-client";
import { Loader2, Users, Play, Check } from "lucide-react";
import { useAuth } from "../../../context/AuthContext"; // Import AuthContext

// Production Backend URL
const BACKEND_URL = "https://otamat-production.up.railway.app";

export default function CreateQuizPage() {
    const { user } = useAuth(); // Get user from context
    const [title, setTitle] = useState("");
    const [isPublic, setIsPublic] = useState(false);
    const [questions, setQuestions] = useState([{ text: "", options: ["", "", "", ""], correct: 0 }]);
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [gamePin, setGamePin] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [players, setPlayers] = useState<any[]>([]);

    // Game Running State
    const [gameStarted, setGameStarted] = useState(false);
    const [currentQuestion, setCurrentQuestion] = useState<{ text: string, options: string[], index: number, total: number } | null>(null);
    const [answerStats, setAnswerStats] = useState<{ count: number, total: number }>({ count: 0, total: 0 });
    const [timeLeft, setTimeLeft] = useState(30);
    const [showResults, setShowResults] = useState(false);
    const [resultsData, setResultsData] = useState<{ correctIndex: number, players: any[] } | null>(null);
    const [gameFinished, setGameFinished] = useState(false);
    const [finalPlayers, setFinalPlayers] = useState<any[]>([]);

    useEffect(() => {
        const newSocket = io(BACKEND_URL);
        setSocket(newSocket);

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
    }, []);

    useEffect(() => {
        if (!gameStarted || showResults || timeLeft <= 0) return;
        const timer = setInterval(() => {
            setTimeLeft((prev) => prev - 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [gameStarted, showResults, timeLeft]);

    const handleAddQuestion = () => {
        setQuestions([...questions, { text: "", options: ["", "", "", ""], correct: 0 }]);
    };

    const handleSaveAndStart = () => {
        if (!socket) {
            setError("Nepodařilo se připojit k serveru.");
            return;
        }
        if (!title.trim()) {
            setError("Vyplňte název kvízu.");
            return;
        }

        setIsSaving(true);
        setError(null);

        // Send userId if available
        const payload = {
            title,
            questions,
            isPublic,
            userId: user?.id // Pass userId
        };

        socket.emit("createGame", payload, (response: { success: boolean, pin: string }) => {
            setIsSaving(false);
            if (response.success) {
                setGamePin(response.pin);
            } else {
                setError("Chyba při vytváření hry.");
            }
        });
    };

    const handleSaveOnly = () => {
        if (!socket) {
            setError("Nepodařilo se připojit k serveru.");
            return;
        }
        if (!title.trim()) {
            setError("Vyplňte název kvízu.");
            return;
        }
        if (!user) {
            setError("Pro uložení kvízu musíte být přihlášeni.");
            return;
        }

        setIsSaving(true);
        setError(null);

        // Send userId
        const payload = {
            title,
            questions,
            isPublic,
            userId: user.id
        };

        socket.emit("saveQuiz", payload, (response: { success: boolean, message: string }) => {
            setIsSaving(false);
            if (response.success) {
                alert("Kvíz byl úspěšně uložen!");
                window.location.href = "/otamat/dashboard"; // Redirect to dashboard
            } else {
                setError(response.message || "Chyba při ukládání kvízu.");
            }
        });
    };

    const handleStartGame = () => {
        if (socket && gamePin) {
            socket.emit("startGame", { pin: gamePin });
        }
    };

    if (gameFinished) {
        return (
            <main>
                <div style={{ width: '100%', maxWidth: '800px', textAlign: 'center' }}>
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

                        <Link href="/" className="btn btn-primary" style={{ marginTop: '3rem', display: 'inline-block' }}>
                            Zpět na úvod
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    if (gameStarted && currentQuestion) {
        return (
            <main>
                <div style={{ width: '100%', maxWidth: '1000px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
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

    if (gamePin) {
        const avatarMap: { [key: string]: string } = { cow: '🐮', fox: '🦊', cat: '🐱', dog: '🐶', lion: '🦁', panda: '🐼', koala: '🐨', pig: '🐷' };
        return (
            <main>
                <div style={{ width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>Hra vytvořena!</h1>
                    <p style={{ fontSize: '1.5rem', marginBottom: '2rem', color: '#a1a1aa' }}>Připojte se pomocí PINu:</p>
                    <div style={{
                        fontSize: '6rem', fontWeight: 'bold', color: 'var(--primary)',
                        background: 'rgba(255,255,255,0.1)', padding: '2rem 4rem', borderRadius: '24px',
                        border: '2px solid var(--primary)', marginBottom: '3rem',
                        textShadow: '0 0 30px rgba(255,255,255,0.3)'
                    }}>
                        {gamePin}
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
                        <Link href="/" className="btn btn-secondary" style={{ display: 'inline-flex', width: 'auto' }}>Ukončit hru</Link>
                        <button onClick={handleStartGame} className="btn btn-primary" style={{ display: 'inline-flex', width: 'auto', padding: '1rem 3rem', fontSize: '1.25rem' }} disabled={players.length === 0}>
                            <Play size={24} /> Spustit hru
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main>
            <div style={{ width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '100%', maxWidth: '350px', marginBottom: '2rem', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Image src="/otamat/logo.png" alt="OtaMat Logo" width={350} height={150} style={{ width: '100%', height: 'auto', objectFit: 'contain' }} priority />
                </div>
                {error && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', width: '100%', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                        {error}
                    </div>
                )}
                <div className="glass-card" style={{ maxWidth: '100%', marginBottom: '2rem' }}>
                    <div className="input-wrapper">
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#a1a1aa', fontWeight: '500', textAlign: 'left' }}>Název kvízu</label>
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Např. Hlavní města Evropy" style={{ textAlign: 'left' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                        <input type="checkbox" id="isPublic" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} style={{ width: '20px', height: '20px', accentColor: 'var(--primary)' }} />
                        <label htmlFor="isPublic" style={{ color: '#fff', cursor: 'pointer' }}>Veřejný kvíz (viditelný pro ostatní)</label>
                    </div>
                </div>
                {questions.map((q, qIndex) => (
                    <div key={qIndex} className="glass-card" style={{ maxWidth: '100%', marginBottom: '2rem', position: 'relative' }}>
                        <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: 'bold' }}>Otázka {qIndex + 1}</h3>
                        <div className="input-wrapper">
                            <input type="text" placeholder="Zadejte otázku..." value={q.text} onChange={(e) => { const newQuestions = [...questions]; newQuestions[qIndex].text = e.target.value; setQuestions(newQuestions); }} style={{ textAlign: 'left', background: 'rgba(255,255,255,0.05)' }} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            {q.options.map((opt, oIndex) => (
                                <div key={oIndex} style={{ position: 'relative' }}>
                                    <input type="text" placeholder={`Možnost ${oIndex + 1}`} value={opt} onChange={(e) => { const newQuestions = [...questions]; newQuestions[qIndex].options[oIndex] = e.target.value; setQuestions(newQuestions); }} style={{ textAlign: 'left', fontSize: '1rem', padding: '1rem', borderColor: q.correct === oIndex ? 'var(--success)' : 'var(--border-light)' }} />
                                    <div onClick={() => { const newQuestions = [...questions]; newQuestions[qIndex].correct = oIndex; setQuestions(newQuestions); }} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', width: '24px', height: '24px', borderRadius: '50%', border: '2px solid ' + (q.correct === oIndex ? 'var(--success)' : '#666'), background: q.correct === oIndex ? 'var(--success)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {q.correct === oIndex && <Check size={16} color="white" />}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '4rem' }}>
                    <button onClick={handleAddQuestion} className="btn btn-secondary" style={{ display: 'inline-flex', width: 'auto' }}>+ Přidat otázku</button>
                    <button onClick={handleSaveOnly} className="btn btn-secondary" style={{ display: 'inline-flex', width: 'auto' }} disabled={isSaving}>
                        {isSaving ? <Loader2 className="animate-spin" /> : <Check size={24} />} Pouze uložit
                    </button>
                    <button onClick={handleSaveAndStart} className="btn btn-primary" style={{ display: 'inline-flex', width: 'auto' }} disabled={isSaving}>
                        {isSaving ? <Loader2 className="animate-spin" /> : <Play size={24} />} Uložit a spustit
                    </button>
                </div>
            </div>
        </main>
    );
}
