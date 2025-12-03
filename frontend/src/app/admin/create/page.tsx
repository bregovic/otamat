"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { io, Socket } from "socket.io-client";
import { Loader2, Users, Play, Check } from "lucide-react";

// Production Backend URL
const BACKEND_URL = "https://otamat-production.up.railway.app";

export default function CreateQuizPage() {
    const [title, setTitle] = useState("");
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

    useEffect(() => {
        const newSocket = io(BACKEND_URL);
        setSocket(newSocket);

        newSocket.on("playerJoined", (player) => {
            console.log("Player joined:", player);
            setPlayers((prev) => [...prev, player]);
        });

        newSocket.on("updatePlayerList", (playerList) => {
            console.log("Updated player list:", playerList);
            setPlayers(playerList);
        });

        newSocket.on("questionStart", (data) => {
            console.log("Host: Question started", data);
            setCurrentQuestion({
                text: data.text,
                options: data.options,
                index: data.questionIndex,
                total: data.totalQuestions
            });
            setAnswerStats({ count: 0, total: players.length }); // Reset stats
            setTimeLeft(data.timeLimit);
            setShowResults(false);
            setGameStarted(true);
        });

        newSocket.on("answerSubmitted", (data) => {
            setAnswerStats({ count: data.count, total: data.total });
        });

        newSocket.on("questionEnd", (data) => {
            console.log("Host: Question ended", data);
            setResultsData(data);
            setShowResults(true);
        });

        newSocket.on("gameOver", (data) => {
            alert("Hra skončila! Vítěz: " + data.players.sort((a: any, b: any) => b.score - a.score)[0].nickname);
        });

        return () => {
            newSocket.disconnect();
        };
    }, []);

    // Timer effect
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

        socket.emit("createGame", { title, questions }, (response: { success: boolean, pin: string }) => {
            setIsSaving(false);
            if (response.success) {
                setGamePin(response.pin);
            } else {
                setError("Chyba při vytváření hry.");
            }
        });
    };

    const handleStartGame = () => {
        if (socket && gamePin) {
            socket.emit("startGame", { pin: gamePin });
        }
    };

    if (gameStarted && currentQuestion) {
        return (
            <main>
                <div style={{ width: '100%', maxWidth: '1000px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>

                    {/* Top Bar */}
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

                    <div className="glass-card" style={{ width: '100%', marginBottom: '2rem', padding: '3rem' }}>
                        <h2 style={{ fontSize: '2.5rem', marginBottom: '2rem' }}>{currentQuestion.text}</h2>

                        <div style={{ marginTop: '3rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            {currentQuestion.options.map((opt, i) => {
                                const isCorrect = showResults && resultsData?.correctIndex === i;
                                const isWrong = showResults && resultsData?.correctIndex !== i;
                                const colors = ['#ef4444', '#3b82f6', '#eab308', '#22c55e'];

                                return (
                                    <div key={i} style={{
                                        padding: '2rem',
                                        background: showResults
                                            ? (isCorrect ? '#22c55e' : 'rgba(255,255,255,0.05)')
                                            : colors[i % 4],
                                        borderRadius: '16px',
                                        fontSize: '1.5rem',
                                        fontWeight: 'bold',
                                        color: 'white',
                                        opacity: isWrong ? 0.3 : 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1rem',
                                        transition: 'all 0.3s ease'
                                    }}>
                                        <span style={{ fontSize: '2rem' }}>{['▲', '◆', '●', '■'][i]}</span>
                                        {opt}
                                        {isCorrect && <Check size={32} style={{ marginLeft: 'auto' }} />}
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
        return (
            <main>
                <div style={{ width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>Hra vytvořena!</h1>
                    <p style={{ fontSize: '1.5rem', marginBottom: '2rem', color: '#a1a1aa' }}>Připojte se pomocí PINu:</p>

                    <div style={{
                        fontSize: '6rem',
                        fontWeight: 'bold',
                        color: 'var(--primary)',
                        background: 'rgba(255,255,255,0.1)',
                        padding: '2rem 4rem',
                        borderRadius: '24px',
                        border: '2px solid var(--primary)',
                        marginBottom: '3rem',
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
                                            {player.avatar === "cow" ? "🐮" : player.avatar}
                                        </div>
                                        <div style={{ fontWeight: 'bold' }}>{player.nickname}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <Link href="/" className="btn btn-secondary" style={{ display: 'inline-flex', width: 'auto' }}>
                            Ukončit hru
                        </Link>
                        <button
                            onClick={handleStartGame}
                            className="btn btn-primary"
                            style={{ display: 'inline-flex', width: 'auto', padding: '1rem 3rem', fontSize: '1.25rem' }}
                            disabled={players.length === 0}
                        >
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

                {/* Consistent Logo Header */}
                <div style={{
                    width: '100%',
                    maxWidth: '350px',
                    marginBottom: '2rem',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <Image
                        src="/otamat/logo.png"
                        alt="OtaMat Logo"
                        width={350}
                        height={150}
                        style={{
                            width: '100%',
                            height: 'auto',
                            objectFit: 'contain',
                        }}
                        priority
                    />
                </div>

                {error && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', width: '100%', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                        {error}
                    </div>
                )}

                <div className="glass-card" style={{ maxWidth: '100%', marginBottom: '2rem' }}>
                    <div className="input-wrapper">
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#a1a1aa', fontWeight: '500', textAlign: 'left' }}>Název kvízu</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Např. Hlavní města Evropy"
                            style={{ textAlign: 'left' }}
                        />
                    </div>
                </div>

                {questions.map((q, qIndex) => (
                    <div key={qIndex} className="glass-card" style={{ maxWidth: '100%', marginBottom: '2rem', position: 'relative' }}>
                        <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: 'bold' }}>Otázka {qIndex + 1}</h3>

                        <div className="input-wrapper">
                            <input
                                type="text"
                                placeholder="Zadejte otázku..."
                                value={q.text}
                                onChange={(e) => {
                                    const newQuestions = [...questions];
                                    newQuestions[qIndex].text = e.target.value;
                                    setQuestions(newQuestions);
                                }}
                                style={{ textAlign: 'left', background: 'rgba(255,255,255,0.05)' }}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            {q.options.map((opt, oIndex) => (
                                <div key={oIndex} style={{ position: 'relative' }}>
                                    <input
                                        type="text"
                                        placeholder={`Možnost ${oIndex + 1}`}
                                        value={opt}
                                        onChange={(e) => {
                                            const newQuestions = [...questions];
                                            newQuestions[qIndex].options[oIndex] = e.target.value;
                                            setQuestions(newQuestions);
                                        }}
                                        style={{
                                            textAlign: 'left',
                                            fontSize: '1rem',
                                            padding: '1rem',
                                            borderColor: q.correct === oIndex ? 'var(--success)' : 'var(--border-light)'
                                        }}
                                    />
                                    <div
                                        onClick={() => {
                                            const newQuestions = [...questions];
                                            newQuestions[qIndex].correct = oIndex;
                                            setQuestions(newQuestions);
                                        }}
                                        style={{
                                            position: 'absolute',
                                            right: '10px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            width: '24px',
                                            height: '24px',
                                            borderRadius: '50%',
                                            border: '2px solid ' + (q.correct === oIndex ? 'var(--success)' : '#666'),
                                            background: q.correct === oIndex ? 'var(--success)' : 'transparent',
                                            cursor: 'pointer'
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                <div style={{ display: 'flex', gap: '1rem', marginBottom: '4rem' }}>
                    <button onClick={handleAddQuestion} className="btn btn-secondary">
                        + Přidat otázku
                    </button>
                    <button onClick={handleSaveAndStart} className="btn btn-primary" disabled={isSaving}>
                        {isSaving ? <Loader2 className="animate-spin" /> : "Uložit a spustit"}
                    </button>
                </div>

                <div style={{ textAlign: 'center' }}>
                    <Link href="/" className="link-text" prefetch={false}>← Zpět na hlavní stránku</Link>
                </div>
            </div>
        </main>
    );
}
