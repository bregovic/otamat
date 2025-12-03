"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { io, Socket } from "socket.io-client";
import { Loader2, Users, Play, Check, X } from "lucide-react";

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
        if (!socket) { setError("Nepodařilo se připojit k serveru."); return; }
        if (!title.trim()) { setError("Vyplňte název kvízu."); return; }

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

    // --- GAME RUNNING VIEW (OPTIMIZED) ---
    if (gameStarted && currentQuestion) {
        return (
            <main className="fixed inset-0 flex flex-col bg-black text-white overflow-hidden">
                {/* Header Stats */}
                <div className="flex justify-between items-center p-4 bg-black/40 backdrop-blur-md border-b border-white/5 z-10">
                    <div className="text-gray-400 font-medium text-sm md:text-base">
                        Otázka <span className="text-white font-bold">{currentQuestion.index}</span> / {currentQuestion.total}
                    </div>

                    {/* Timer */}
                    <div className={`text-2xl md:text-4xl font-black tabular-nums transition-colors ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                        {timeLeft}
                    </div>

                    <div className="text-gray-400 font-medium text-sm md:text-base flex items-center gap-2">
                        <Users size={18} />
                        <span className="text-white font-bold">{answerStats.count}</span> / {answerStats.total}
                    </div>
                </div>

                {/* Question Area - Takes available space */}
                <div className="flex-1 flex items-center justify-center p-6 md:p-12 text-center relative">
                    {/* Background Glow */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-primary/10 blur-[100px] rounded-full pointer-events-none" />

                    <h2 className="text-3xl md:text-5xl lg:text-6xl font-black leading-tight z-0 drop-shadow-2xl max-w-5xl">
                        {currentQuestion.text}
                    </h2>
                </div>

                {/* Options Grid - Bottom aligned */}
                <div className="p-4 md:p-6 pb-8 md:pb-10 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 w-full max-w-7xl mx-auto z-10">
                    {currentQuestion.options.map((opt, i) => {
                        const isCorrect = showResults && resultsData?.correctIndex === i;
                        const isWrong = showResults && resultsData?.correctIndex !== i;

                        // Define gradients for each option
                        const gradients = [
                            'from-[var(--opt-1-from)] to-[var(--opt-1-to)]',
                            'from-[var(--opt-2-from)] to-[var(--opt-2-to)]',
                            'from-[var(--opt-3-from)] to-[var(--opt-3-to)]',
                            'from-[var(--opt-4-from)] to-[var(--opt-4-to)]'
                        ];

                        const symbols = ['▲', '◆', '●', '■'];

                        return (
                            <div key={i}
                                className={`
                                    relative overflow-hidden rounded-xl md:rounded-2xl p-4 md:p-6 flex items-center gap-4 md:gap-6 transition-all duration-500
                                    ${showResults
                                        ? (isCorrect
                                            ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 scale-[1.02] shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-400'
                                            : 'bg-white/5 opacity-30 grayscale')
                                        : 'bg-white/5 hover:bg-white/10 border border-white/10'
                                    }
                                `}
                            >
                                {/* Color Bar / Indicator */}
                                {!showResults && (
                                    <div className={`absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b ${gradients[i % 4]}`} />
                                )}

                                {/* Symbol */}
                                <div className={`
                                    w-10 h-10 md:w-14 md:h-14 rounded-lg md:rounded-xl flex items-center justify-center text-xl md:text-2xl font-bold shadow-inner
                                    ${showResults && isCorrect ? 'bg-white/20 text-white' : `bg-gradient-to-br ${gradients[i % 4]} text-white`}
                                `}>
                                    {symbols[i]}
                                </div>

                                {/* Text */}
                                <span className="text-lg md:text-2xl font-bold text-white flex-1 text-left leading-snug">
                                    {opt}
                                </span>

                                {/* Result Icon */}
                                {showResults && isCorrect && <Check className="text-white w-8 h-8 md:w-10 md:h-10 animate-in zoom-in spin-in-90 duration-300" />}
                                {showResults && isWrong && <X className="text-red-400 w-8 h-8 opacity-50" />}
                            </div>
                        );
                    })}
                </div>

                {/* Next Question Progress Bar */}
                {showResults && (
                    <div className="h-1 bg-white/10 w-full">
                        <div className="h-full bg-white animate-[progress_5s_linear_forwards]" />
                    </div>
                )}
            </main>
        );
    }

    // --- LOBBY VIEW (OPTIMIZED) ---
    if (gamePin) {
        return (
            <main className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
                {/* Background Elements */}
                <div className="absolute top-0 left-0 w-full h-full bg-[url('/otamat/grid.svg')] opacity-10 pointer-events-none" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 blur-[150px] rounded-full pointer-events-none" />

                <div className="z-10 w-full max-w-4xl flex flex-col items-center text-center">
                    <h1 className="text-4xl md:text-6xl font-black mb-2 tracking-tight">Hra připravena!</h1>
                    <p className="text-xl text-gray-400 mb-8">Připojte se na <span className="text-white font-bold">hollyhop.cz/otamat</span></p>

                    {/* PIN Card */}
                    <div className="glass-card p-8 md:p-12 mb-12 relative group animate-in zoom-in duration-500">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-500/20 blur-xl opacity-50 group-hover:opacity-100 transition-opacity" />
                        <div className="text-sm uppercase tracking-widest text-gray-400 mb-2 font-bold">Game PIN</div>
                        <div className="text-7xl md:text-9xl font-black text-white tracking-widest drop-shadow-[0_0_30px_rgba(139,92,246,0.5)]">
                            {gamePin}
                        </div>
                    </div>

                    {/* Players Grid */}
                    <div className="w-full mb-8">
                        <div className="flex items-center justify-between mb-4 px-4">
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                <Users className="text-primary" />
                                Hráči <span className="bg-white/10 px-2 py-0.5 rounded-md text-sm">{players.length}</span>
                            </h2>
                            {players.length > 0 && <span className="text-emerald-400 font-bold animate-pulse">Čekáme na start...</span>}
                        </div>

                        <div className="glass-card p-6 min-h-[200px] max-h-[400px] overflow-y-auto custom-scrollbar">
                            {players.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-500 py-12">
                                    <Loader2 className="w-12 h-12 animate-spin mb-4 opacity-20" />
                                    <p>Čekání na první odvážlivce...</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {players.map((player) => (
                                        <div key={player.id} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors animate-in zoom-in duration-300">
                                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-800 to-black border border-white/10 flex items-center justify-center text-3xl shadow-lg">
                                                {player.avatar === "cow" ? "🐮" : player.avatar}
                                            </div>
                                            <div className="font-bold truncate w-full text-center text-sm md:text-base">{player.nickname}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-4 w-full md:w-auto">
                        <Link href="/" className="btn btn-secondary flex-1 md:flex-none justify-center">
                            Zrušit
                        </Link>
                        <button
                            onClick={handleStartGame}
                            className="btn btn-primary flex-1 md:flex-none px-12 py-4 text-xl font-bold shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:scale-105 transition-all"
                            disabled={players.length === 0}
                        >
                            <Play className="mr-2 fill-current" /> Spustit hru
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    // --- CREATE FORM (Standard) ---
    return (
        <main className="min-h-screen flex flex-col items-center p-4 md:p-8">
            <div className="w-full max-w-3xl flex flex-col items-center">
                <div className="w-48 md:w-64 mb-8">
                    <Image src="/otamat/logo.png" alt="OtaMat" width={300} height={100} className="w-full h-auto" priority />
                </div>

                {error && (
                    <div className="w-full bg-red-500/10 border border-red-500/20 text-red-200 p-4 rounded-xl mb-6 text-center">
                        {error}
                    </div>
                )}

                <div className="glass-card w-full p-6 mb-6">
                    <label className="block text-sm font-medium text-gray-400 mb-2">Název kvízu</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Např. Filmový kvíz 2024"
                        className="w-full bg-black/20 border border-white/10 rounded-lg p-4 text-xl font-bold text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    />
                </div>

                <div className="space-y-6 w-full mb-12">
                    {questions.map((q, qIndex) => (
                        <div key={qIndex} className="glass-card p-6 relative group">
                            <div className="absolute -left-3 -top-3 w-8 h-8 bg-primary rounded-full flex items-center justify-center font-bold text-white shadow-lg">
                                {qIndex + 1}
                            </div>

                            <input
                                type="text"
                                placeholder="Zadejte otázku..."
                                value={q.text}
                                onChange={(e) => {
                                    const newQuestions = [...questions];
                                    newQuestions[qIndex].text = e.target.value;
                                    setQuestions(newQuestions);
                                }}
                                className="w-full bg-transparent border-b border-white/10 p-2 text-lg font-medium text-white placeholder-gray-600 focus:border-primary outline-none mb-6 transition-colors"
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {q.options.map((opt, oIndex) => (
                                    <div key={oIndex} className="relative">
                                        <div className={`absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-gradient-to-br ${['from-[var(--opt-1-from)] to-[var(--opt-1-to)]', 'from-[var(--opt-2-from)] to-[var(--opt-2-to)]', 'from-[var(--opt-3-from)] to-[var(--opt-3-to)]', 'from-[var(--opt-4-from)] to-[var(--opt-4-to)]'][oIndex]
                                            }`} />
                                        <input
                                            type="text"
                                            placeholder={`Možnost ${oIndex + 1}`}
                                            value={opt}
                                            onChange={(e) => {
                                                const newQuestions = [...questions];
                                                newQuestions[qIndex].options[oIndex] = e.target.value;
                                                setQuestions(newQuestions);
                                            }}
                                            className={`w-full bg-white/5 border rounded-lg pl-8 pr-12 py-3 text-white focus:bg-white/10 outline-none transition-all ${q.correct === oIndex ? 'border-emerald-500 ring-1 ring-emerald-500/50' : 'border-white/10 focus:border-white/30'
                                                }`}
                                        />
                                        <button
                                            onClick={() => {
                                                const newQuestions = [...questions];
                                                newQuestions[qIndex].correct = oIndex;
                                                setQuestions(newQuestions);
                                            }}
                                            className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-md flex items-center justify-center transition-all ${q.correct === oIndex ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-gray-600 hover:bg-white/10'
                                                }`}
                                            title="Označit jako správnou"
                                        >
                                            <Check size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="fixed bottom-0 left-0 right-0 p-4 bg-black/80 backdrop-blur-lg border-t border-white/10 flex justify-center gap-4 z-50">
                    <button onClick={handleAddQuestion} className="btn btn-secondary py-3 px-6">
                        + Přidat otázku
                    </button>
                    <button onClick={handleSaveAndStart} className="btn btn-primary py-3 px-8 shadow-lg shadow-primary/20" disabled={isSaving}>
                        {isSaving ? <Loader2 className="animate-spin" /> : "Uložit a spustit"}
                    </button>
                </div>
                <div className="h-24" /> {/* Spacer for fixed footer */}
            </div>
        </main>
    );
}
