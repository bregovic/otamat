"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { Loader2, Check, X, Trophy } from "lucide-react";

// Production Backend URL
const BACKEND_URL = "https://otamat-production.up.railway.app";

function LobbyContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pinFromUrl = searchParams.get("pin");

    const [pin, setPin] = useState(pinFromUrl || "");
    const [nickname, setNickname] = useState("");
    const [avatar, setAvatar] = useState("cow"); // Default avatar
    const [socket, setSocket] = useState<Socket | null>(null);
    const [step, setStep] = useState<'pin' | 'nickname' | 'lobby' | 'game'>("pin");
    const [error, setError] = useState<string | null>(null);
    const [players, setPlayers] = useState<any[]>([]);

    // Game State
    const [currentQuestion, setCurrentQuestion] = useState<{ index: number, total: number, timeLimit: number } | null>(null);
    const [answerSubmitted, setAnswerSubmitted] = useState<number | null>(null);
    const [result, setResult] = useState<{ correct: boolean, points: number, rank: number } | null>(null);
    const [showResultScreen, setShowResultScreen] = useState(false);
    const [score, setScore] = useState(0);

    useEffect(() => {
        if (pinFromUrl) {
            setStep("nickname");
        }
    }, [pinFromUrl]);

    useEffect(() => {
        if (!socket) return;

        socket.on("playerJoined", (player) => {
            setPlayers((prev) => [...prev, player]);
        });

        socket.on("updatePlayerList", (playerList) => {
            setPlayers(playerList);
        });

        socket.on("questionStart", (data) => {
            setStep("game");
            setCurrentQuestion({
                index: data.questionIndex,
                total: data.totalQuestions,
                timeLimit: data.timeLimit
            });
            setAnswerSubmitted(null);
            setShowResultScreen(false);
            setResult(null);
        });

        socket.on("questionEnd", (data) => {
            // Find my score
            const myData = data.players.find((p: any) => p.id === socket.id);
            const isCorrect = data.correctIndex === answerSubmitted;

            if (myData) {
                setScore(myData.score);
            }

            setResult({
                correct: isCorrect,
                points: myData ? myData.score : 0, // This is total score, ideally we want points gained this round
                rank: 0 // TODO: Calculate rank
            });
            setShowResultScreen(true);
        });

        socket.on("gameOver", (data) => {
            alert("Konec hry! Tvé skóre: " + (data.players.find((p: any) => p.id === socket.id)?.score || 0));
            router.push("/");
        });

        return () => {
            socket.off("playerJoined");
            socket.off("updatePlayerList");
            socket.off("questionStart");
            socket.off("questionEnd");
            socket.off("gameOver");
        };
    }, [socket, answerSubmitted, router]);

    const handleConnect = () => {
        if (pin.length !== 6) { setError("PIN musí mít 6 číslic."); return; }
        setStep("nickname");
        setError(null);
    };

    const handleJoin = () => {
        if (!nickname.trim()) { setError("Zadej přezdívku."); return; }

        const newSocket = io(BACKEND_URL);
        setSocket(newSocket);

        newSocket.emit("joinGame", { pin, nickname, avatar }, (response: { success: boolean, message: string }) => {
            if (response.success) {
                setStep("lobby");
                setError(null);
            } else {
                setError(response.message);
                newSocket.disconnect();
            }
        });
    };

    const submitAnswer = (index: number) => {
        if (!socket || answerSubmitted !== null) return;
        setAnswerSubmitted(index);
        socket.emit("submitAnswer", { pin, answerIndex: index });
    };

    // --- RENDERERS ---

    if (step === 'pin') {
        return (
            <div className="w-full max-w-sm">
                <h1 className="text-3xl font-bold mb-8 text-center">Vložit PIN</h1>
                <input
                    type="text"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full bg-white/10 border border-white/20 rounded-xl p-4 text-center text-4xl tracking-widest font-bold mb-4 focus:border-primary outline-none"
                    placeholder="000000"
                    autoFocus
                />
                <button onClick={handleConnect} className="btn btn-primary w-full py-4 text-xl">Pokračovat</button>
                {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
            </div>
        );
    }

    if (step === 'nickname') {
        return (
            <div className="w-full max-w-sm">
                <h1 className="text-3xl font-bold mb-8 text-center">Tvoje postava</h1>

                <div className="grid grid-cols-4 gap-4 mb-8">
                    {['cow', 'fox', 'cat', 'dog', 'lion', 'panda', 'koala', 'pig'].map((a) => (
                        <button
                            key={a}
                            onClick={() => setAvatar(a)}
                            className={`aspect-square rounded-xl flex items-center justify-center text-3xl transition-all ${avatar === a ? 'bg-primary scale-110 shadow-lg shadow-primary/50' : 'bg-white/10 hover:bg-white/20'}`}
                        >
                            {a === 'cow' ? '🐮' : a === 'fox' ? '🦊' : a === 'cat' ? '🐱' : a === 'dog' ? '🐶' : a === 'lion' ? '🦁' : a === 'panda' ? '🐼' : a === 'koala' ? '🐨' : '🐷'}
                        </button>
                    ))}
                </div>

                <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-xl p-4 text-center text-xl font-bold mb-4 focus:border-primary outline-none"
                    placeholder="Přezdívka"
                />
                <button onClick={handleJoin} className="btn btn-primary w-full py-4 text-xl">Vstoupit do hry</button>
                {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
            </div>
        );
    }

    if (step === 'lobby') {
        return (
            <div className="text-center w-full max-w-md">
                <div className="mb-8 animate-bounce">
                    <div className="w-24 h-24 mx-auto bg-gradient-to-br from-primary to-purple-600 rounded-full flex items-center justify-center text-5xl shadow-xl shadow-primary/30">
                        {avatar === 'cow' ? '🐮' : avatar === 'fox' ? '🦊' : avatar === 'cat' ? '🐱' : avatar === 'dog' ? '🐶' : avatar === 'lion' ? '🦁' : avatar === 'panda' ? '🐼' : avatar === 'koala' ? '🐨' : '🐷'}
                    </div>
                </div>
                <h1 className="text-4xl font-black mb-2">{nickname}</h1>
                <div className="inline-block px-4 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm font-bold mb-8 animate-pulse">
                    Jsi ve hře!
                </div>
                <p className="text-gray-400">Vidíš své jméno na obrazovce?</p>
                <div className="mt-12 p-6 bg-white/5 rounded-2xl border border-white/10">
                    <div className="text-sm text-gray-500 uppercase tracking-widest mb-2">Čekáme na start</div>
                    <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
                </div>
            </div>
        );
    }

    if (step === 'game') {
        if (showResultScreen) {
            return (
                <div className={`fixed inset-0 flex flex-col items-center justify-center p-6 ${result?.correct ? 'bg-emerald-900/20' : 'bg-red-900/20'}`}>
                    <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-6 shadow-2xl ${result?.correct ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                        {result?.correct ? <Check size={64} /> : <X size={64} />}
                    </div>

                    <h1 className="text-4xl font-black mb-2">{result?.correct ? "Správně!" : "Špatně"}</h1>
                    <p className="text-xl text-gray-400 mb-8">{result?.correct ? "+ Body" : "Zkus to příště"}</p>

                    <div className="glass-card p-6 w-full max-w-xs text-center">
                        <div className="text-sm text-gray-400 uppercase tracking-widest mb-1">Celkové skóre</div>
                        <div className="text-4xl font-black text-white">{score}</div>
                    </div>

                    <div className="mt-8 text-gray-500 animate-pulse">Čekej na další otázku...</div>
                </div>
            );
        }

        return (
            <div className="fixed inset-0 flex flex-col bg-black">
                {/* Header */}
                <div className="p-4 flex justify-between items-center bg-white/5">
                    <div className="font-bold text-gray-400">Otázka {currentQuestion?.index}</div>
                    <div className="font-bold text-white bg-primary px-3 py-1 rounded-lg">{score} bodů</div>
                </div>

                {/* Answer Area */}
                <div className="flex-1 p-4 grid grid-cols-2 gap-4">
                    {['▲', '◆', '●', '■'].map((symbol, i) => {
                        const gradients = [
                            'from-[var(--opt-1-from)] to-[var(--opt-1-to)]',
                            'from-[var(--opt-2-from)] to-[var(--opt-2-to)]',
                            'from-[var(--opt-3-from)] to-[var(--opt-3-to)]',
                            'from-[var(--opt-4-from)] to-[var(--opt-4-to)]'
                        ];

                        return (
                            <button
                                key={i}
                                onClick={() => submitAnswer(i)}
                                disabled={answerSubmitted !== null}
                                className={`
                                    relative rounded-2xl flex flex-col items-center justify-center transition-all duration-200 active:scale-95
                                    ${answerSubmitted === null
                                        ? `bg-gradient-to-br ${gradients[i]} shadow-lg`
                                        : answerSubmitted === i
                                            ? 'bg-white text-black scale-105 z-10 ring-4 ring-white/50'
                                            : 'bg-gray-800 opacity-20 grayscale'
                                    }
                                `}
                            >
                                <span className="text-6xl mb-2 filter drop-shadow-md">{symbol}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Footer Status */}
                <div className="p-6 text-center">
                    {answerSubmitted !== null ? (
                        <div className="text-xl font-bold text-white animate-pulse">Odpověď odeslána!</div>
                    ) : (
                        <div className="text-gray-400">Vyber správnou odpověď</div>
                    )}
                </div>
            </div>
        );
    }

    return null;
}

export default function PlayPage() {
    return (
        <main className="min-h-screen flex flex-col items-center justify-center bg-bg-dark text-white p-4">
            <Suspense fallback={<Loader2 className="animate-spin" />}>
                <LobbyContent />
            </Suspense>
        </main>
    );
}
