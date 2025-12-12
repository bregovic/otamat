"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { io, Socket } from "socket.io-client";
import { Users, Play, Check, Monitor, LayoutGrid, RotateCcw, Loader2 } from "lucide-react";
import QRCode from "react-qr-code";
import { BACKEND_URL } from "../../../utils/config";

const avatarCategories = {
    "Zvířátka": {
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
    },
    "Jídlo": {
        apple: '🍎', pear: '🍐', orange: '🍊', lemon: '🍋', banana: '🍌', watermelon: '🍉', grapes: '🍇', strawberry: '🍓',
        cherry: '🍒', peach: '🍑', pineapple: '🍍', coconut: '🥥', kiwi: '🥝', tomato: '🍅', avocado: '🥑', broccoli: '🥦',
        carrot: '🥕', corn: '🌽', potato: '🥔', bread: '🍞', cheese: '🧀', egg: '🥚', bacon: '🥓', steak: '🥩',
        hotdog: '🌭', burger: '🍔', fries: '🍟', pizza: '🍕', sandwich: '🥪', taco: '🌮', burrito: '🌯', popcorn: '🍿',
        donut: '🍩', cookie: '🍪', cake: '🍰', chocolate: '🍫', candy: '🍬', beer: '🍺', wine: '🍷', coffee: '☕'
    },
    "Sport": {
        soccer: '⚽', basketball: '🏀', football: '🏈', baseball: '⚾', tennis: '🎾', volleyball: '🏐', rugby: '🏉',
        pool: '🎱', pingpong: '🏓', badminton: '🏸', hockey: '🏒', golf: '⛳', boxing: '🥊', ski: '🎿', snowboard: '🏂',
        swim: '🏊‍♀️', surf: '🏄‍♀️', cycle: '🚴‍♀️', trophy: '🏆', medal: '🥇', guitar: '🎸', piano: '🎹', drum: '🥁',
        game: '🎮', dart: '🎯', dice: '🎲', bowling: '🎳', art: '🎨', mic: '🎤', movie: '🎬'
    },
    "Obličeje": {
        smile: '😀', laugh: '😂', wink: '😉', love: '😍', cool: '😎', nerd: '🤓', think: '🤔', mindblown: '🤯',
        cry: '😢', sob: '😭', scream: '😱', angry: '😡', devil: '😈', clown: '🤡', ghost: '👻', alien: '👽',
        robot: '🤖', poop: '💩', skull: '💀', mask: '😷', sick: '🤢', dizzy: '😵', cowboy: '🤠', party: '🥳'
    },
    "Věci": {
        watch: '⌚', phone: '📱', laptop: '💻', camera: '📷', tv: '📺', bulb: '💡', money: '💸', diamond: '💎',
        tool: '🛠', bomb: '💣', knife: '🔪', sword: '⚔️', shield: '🛡', pill: '💊', car: '🚗', bus: '🚌',
        plane: '✈️', rocket: '🚀', boat: '🚤', bike: '🚲', house: '🏠', castle: '🏰', heart: '❤️', star: '⭐',
        fire: '🔥', water: '💧', sun: '☀️', moon: '🌙', earth: '🌍', rainbow: '🌈', umbrella: '☂️', balloon: '🎈'
    }
};

// Flatten for lookup
const avatarMap: { [key: string]: string } = Object.assign({}, ...Object.values(avatarCategories));

function HostGameContent() {
    const searchParams = useSearchParams();
    const pin = searchParams.get("pin");

    const [socket, setSocket] = useState<Socket | null>(null);
    const [players, setPlayers] = useState<any[]>([]);

    // Game State
    const [gameStarted, setGameStarted] = useState(false);
    const [currentQuestion, setCurrentQuestion] = useState<{ text: string, mediaUrl?: string, type?: string, options: { text: string, mediaUrl?: string }[], index: number, total: number } | null>(null);
    const [answerStats, setAnswerStats] = useState<{ count: number, total: number }>({ count: 0, total: 0 });
    const [timeLeft, setTimeLeft] = useState(30);
    const [showResults, setShowResults] = useState(false);
    const [resultsData, setResultsData] = useState<{ correctIndex: number, players: any[] } | null>(null);
    const [gameFinished, setGameFinished] = useState(false);
    const [finalPlayers, setFinalPlayers] = useState<any[]>([]);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [revealCount, setRevealCount] = useState(0);

    // Multi-Game Logic
    const [showQuizSelector, setShowQuizSelector] = useState(false);
    const [myQuizzes, setMyQuizzes] = useState<any[]>([]);
    const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(false);

    // UI State for results flow
    const [showLeaderboard, setShowLeaderboard] = useState(false);

    // Prevent double clicks
    const [processingAction, setProcessingAction] = useState(false);

    useEffect(() => {
        if (!pin) return;

        const newSocket = io(BACKEND_URL, {
            transports: ['websocket'],
            upgrade: false
        });
        setSocket(newSocket);

        newSocket.emit('watchGame', { pin });

        newSocket.on("playerJoined", (player) => {
            setPlayers((prev) => [...prev, player]);
        });

        newSocket.on("updatePlayerList", (playerList) => {
            setPlayers(playerList);
        });

        // Listen for new quiz loading
        newSocket.on("quizLoaded", () => {
            // Reset UI for new game
            setGameStarted(false);
            setGameFinished(false);
            setShowResults(false);
            setResultsData(null);
            setFinalPlayers([]);
            setCurrentQuestion(null);
            setRevealCount(0);
            setShowLeaderboard(false);
            setProcessingAction(false);
        });

        newSocket.on("questionStart", (data) => {
            setCurrentQuestion({
                text: data.text,
                mediaUrl: data.mediaUrl,
                type: data.type,
                options: data.options,
                index: data.questionIndex,
                total: data.totalQuestions
            });
            setAnswerStats({ count: 0, total: players.length });
            setTimeLeft(data.timeLimit);
            setShowResults(false);
            setShowLeaderboard(false);
            setGameStarted(true);
            setProcessingAction(false); // Reset processing lock on new question start
        });

        newSocket.on("answerSubmitted", (data) => {
            setAnswerStats({ count: data.count, total: data.total });
        });

        newSocket.on("questionEnd", (data) => {
            setResultsData(data);
            setShowResults(true);
            setShowLeaderboard(false); // Enable "Answer Reveal" mode first
            setProcessingAction(false);
        });

        newSocket.on("showLeaderboard", () => {
            setShowLeaderboard(true);
            setProcessingAction(false);
        });

        newSocket.on("gameOver", (data) => {
            setFinalPlayers(data.players.sort((a: any, b: any) => b.score - a.score));
            setGameFinished(true);
            setGameStarted(false);
            setProcessingAction(false);
        });

        newSocket.on("countdownStart", (data) => {
            setCountdown(data.duration);
            setShowResults(false);
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
            }, 1500);
            return () => clearInterval(timer);
        }
    }, [gameStarted, showResults, timeLeft, countdown, gameFinished, finalPlayers, revealCount]);

    const handleNextQuestion = () => {
        if (processingAction) return;
        if (socket && pin) {
            setProcessingAction(true);
            socket.emit("nextQuestion", { pin });
            // Unlock after 2s if no response (safety net)
            setTimeout(() => setProcessingAction(false), 2000);
        }
    };

    const handleToggleLeaderboard = () => {
        if (processingAction) return;
        if (socket && pin) {
            setProcessingAction(true);
            socket.emit("showLeaderboard", { pin });
            // Unlock after 2s if no response (safety net)
            setTimeout(() => setProcessingAction(false), 2000);
        }
    };

    const handleStartGame = () => {
        if (processingAction) return;
        if (socket && pin) {
            setProcessingAction(true);
            socket.emit("startGame", { pin });
            setTimeout(() => setProcessingAction(false), 2000);
        }
    };

    const fetchMyQuizzes = async () => {
        setIsLoadingQuizzes(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${BACKEND_URL}/quiz/my`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await res.json();
            if (Array.isArray(data)) {
                setMyQuizzes(data);
            }
        } catch (e) {
            console.error(e);
        }
        setIsLoadingQuizzes(false);
    };

    const handleOpenQuizSelector = () => {
        setShowQuizSelector(true);
        fetchMyQuizzes();
    };

    const handleLoadNewQuiz = (quizId: string) => {
        if (socket && pin) {
            socket.emit("loadQuizToSession", { pin, quizId });
            setShowQuizSelector(false);
        }
    };

    const openPresentationMode = () => {
        window.open(`/otamat/screen?pin=${pin}`, '_blank');
    };

    if (!pin) return <div className="text-white text-center mt-20">Chybí PIN hry.</div>;

    // --- QUIZ SELECTOR MODAL ---
    if (showQuizSelector) {
        return (
            <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                <div className="glass-card w-full max-w-2xl p-8 max-h-[80vh] flex flex-col">
                    <h2 className="text-3xl font-bold mb-6 text-white flex items-center gap-2">
                        <LayoutGrid /> Vyberte další kvíz
                    </h2>

                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
                        {isLoadingQuizzes ? (
                            <div className="text-center text-gray-400 py-8">Načítání kvízů...</div>
                        ) : myQuizzes.length === 0 ? (
                            <div className="text-center text-gray-400 py-8">Nemáte žádné uložené kvízy.</div>
                        ) : (
                            myQuizzes.map((quiz) => (
                                <button
                                    key={quiz.id}
                                    onClick={() => handleLoadNewQuiz(quiz.id)}
                                    className="w-full text-left p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all flex items-center justify-between group"
                                >
                                    <div>
                                        <div className="text-xl font-bold text-white group-hover:text-primary transition-colors">{quiz.title}</div>
                                        <div className="text-sm text-gray-400">{quiz.questions?.length || 0} otázek</div>
                                    </div>
                                    <Play className="opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                                </button>
                            ))
                        )}
                    </div>

                    <button
                        onClick={() => setShowQuizSelector(false)}
                        className="btn btn-secondary mt-6 w-full"
                    >
                        Zrušit
                    </button>
                </div>
            </main>
        );
    }

    if (gameFinished) {
        // ... (Existing Game Over logic, but adding the "Next Game" button)
        const topPlayers = finalPlayers.slice(0, 5).reverse();
        const visiblePlayers = topPlayers.slice(0, revealCount);

        return (
            <main className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-[#09090b] to-black">
                {/* --- HEADER WITH CONTROLS --- */}
                <div className="absolute top-4 right-4 z-50 flex gap-4">
                    <button onClick={openPresentationMode} className="bg-white/10 hover:bg-white/20 p-3 rounded-full text-white backdrop-blur-md transition-colors" title="Otevřít Prezentaci (TV)">
                        <Monitor size={24} />
                    </button>
                </div>
                {/* --------------------------- */}

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

                {/* Confetti Effect */}
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

                    <div className="flex flex-col-reverse gap-4 items-center justify-end min-h-[500px]">
                        {visiblePlayers.map((player, index) => {
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
                        <div className="flex gap-4 justify-center mt-12 animate-bounce">
                            <Link href="/dashboard" className="btn btn-secondary text-xl px-8 py-4">
                                Ukončit
                            </Link>
                            <button
                                onClick={handleOpenQuizSelector}
                                className="btn btn-primary text-2xl px-12 py-4 flex items-center gap-2"
                            >
                                <RotateCcw /> Další Kvíz (Se stejnými hráči)
                            </button>
                        </div>
                    )}
                </div>
            </main>
        );
    }

    if (gameStarted && currentQuestion) {
        return (
            <main className="h-screen max-h-screen w-full overflow-hidden flex flex-col p-2 md:p-4 relative">
                {/* --- HEADER WITH CONTROLS --- */}
                <div className="absolute top-4 right-4 z-50 flex gap-4">
                    <button onClick={openPresentationMode} className="bg-white/10 hover:bg-white/20 p-3 rounded-full text-white backdrop-blur-md transition-colors" title="Otevřít Prezentaci (TV)">
                        <Monitor size={24} />
                    </button>
                </div>
                {/* --------------------------- */}

                {/* Header Info */}
                <div className="flex justify-between items-center mb-2 px-4 w-full max-w-[95vw] mx-auto shrink-0 z-10">
                    <div className="text-xl font-bold text-gray-400">
                        Otázka {currentQuestion.index} / {currentQuestion.total}
                    </div>
                    <div className="text-4xl font-black text-white bg-white/10 px-6 py-2 rounded-xl backdrop-blur-md border border-white/10 shadow-lg">
                        {timeLeft}s
                    </div>
                    <div className="text-xl font-bold text-gray-400">
                        Odpovědi: {answerStats.count} / {answerStats.total}
                    </div>
                </div>

                {/* Question & Image Area */}
                <div className="flex-1 min-h-0 flex flex-col items-center justify-center mb-4 relative w-full">
                    <div className="glass-card w-full !max-w-[95vw] !p-6 flex flex-col items-center justify-center h-full relative overflow-hidden border-white/10 shadow-2xl">
                        <h2 className="text-3xl md:text-5xl font-black text-center mb-6 leading-tight z-10 text-white drop-shadow-lg shrink-0 max-h-[20vh] overflow-y-auto custom-scrollbar">
                            {currentQuestion.text}
                        </h2>

                        {/* Image Placeholder or Actual Image */}
                        <div className="flex-1 w-full flex items-center justify-center rounded-xl relative overflow-hidden min-h-0 bg-black/20">
                            {currentQuestion.mediaUrl ? (
                                <img
                                    src={currentQuestion.mediaUrl}
                                    alt="Question Media"
                                    className="max-h-full max-w-full object-contain rounded-lg shadow-2xl"
                                />
                            ) : (
                                <div className="text-white/10 text-9xl font-bold flex items-center justify-center w-full h-full">?</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Options Area - Based on Type */}
                <div
                    className={`grid gap-4 w-full !max-w-[95vw] mx-auto shrink-0 ${currentQuestion.type === 'TRUE_FALSE' ? 'grid-cols-2' : 'grid-cols-2'}`}
                    style={{ height: '25vh', minHeight: '180px', maxHeight: '300px' }}
                >
                    {currentQuestion.options.map((opt, i) => {
                        const isCorrect = showResults && resultsData?.correctIndex === i;
                        const gradientClass = [
                            'from-[var(--opt-1-from)] to-[var(--opt-1-to)]',
                            'from-[var(--opt-2-from)] to-[var(--opt-2-to)]',
                            'from-[var(--opt-3-from)] to-[var(--opt-3-to)]',
                            'from-[var(--opt-4-from)] to-[var(--opt-4-to)]'
                        ][i % 4];

                        if (currentQuestion.type === 'TRUE_FALSE') {
                            const isTrue = i === 0;
                            const bgColor = isTrue ? 'bg-blue-600' : 'bg-red-600';
                            return (
                                <div key={i} className={`
                                    rounded-2xl text-3xl md:text-5xl font-black text-white flex items-center justify-center gap-4 transition-all duration-300 relative overflow-hidden shadow-lg border-4 border-white/10
                                    ${showResults
                                        ? (isCorrect ? 'opacity-100 scale-105 z-10 ring-4 ring-white' : 'opacity-30 grayscale')
                                        : bgColor
                                    }
                                `}>
                                    <span className="drop-shadow-md">{opt.text}</span>
                                    {isCorrect && <Check size={64} className="absolute right-8 top-1/2 -translate-y-1/2 text-white drop-shadow-md" />}
                                </div>
                            );
                        }

                        return (
                            <div key={i} className={`
                                rounded-2xl text-2xl md:text-3xl font-bold text-white flex items-center justify-center gap-4 transition-all duration-300 relative overflow-hidden shadow-lg border-2 border-white/10
                                ${showResults
                                    ? (isCorrect ? 'bg-emerald-500 scale-105 z-10 ring-4 ring-white' : 'bg-white/5 opacity-30 grayscale')
                                    : `bg-gradient-to-br ${gradientClass}`
                                }
                            `}>
                                <span className="absolute left-4 top-4 text-2xl opacity-50 z-20 font-black">{['▲', '◆', '●', '■'][i]}</span>

                                {opt.mediaUrl ? (
                                    <div className="w-full h-full absolute inset-0 flex items-center justify-center bg-black/40">
                                        <img src={opt.mediaUrl} alt="Option" className="max-w-full max-h-full object-contain opacity-80" />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="drop-shadow-xl z-10 px-4 text-center bg-black/50 p-2 rounded-lg">{opt.text}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <span className="drop-shadow-md z-10 px-8 text-center">{opt.text}</span>
                                )}

                                {isCorrect && <Check size={48} className="absolute right-4 top-4 text-white drop-shadow-md z-30" />}
                            </div>
                        );
                    })}
                </div>

                {/* Reveal Answer Mode Controls */}
                {showResults && !showLeaderboard && (
                    <div className="absolute inset-x-0 bottom-8 z-50 flex flex-col md:flex-row justify-center items-center gap-4 pointer-events-auto px-4 w-full">
                        <button
                            onClick={handleToggleLeaderboard}
                            disabled={processingAction}
                            className={`btn btn-secondary text-xl md:text-2xl px-8 py-4 md:py-6 flex items-center justify-center gap-3 shadow-2xl transition-all w-full md:w-auto ${processingAction ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
                        >
                            <Users size={32} /> Zobrazit žebříček
                        </button>
                        <button
                            onClick={handleNextQuestion}
                            disabled={processingAction}
                            className={`btn btn-primary text-xl md:text-2xl px-8 py-4 md:py-6 flex items-center justify-center gap-3 shadow-2xl transition-all w-full md:w-auto ${!processingAction && 'animate-bounce'} ${processingAction ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <Play size={32} /> Další otázka
                        </button>
                    </div>
                )}


                {/* Results Overlay */}
                {showResults && showLeaderboard && (
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
                            disabled={processingAction}
                            className={`btn btn-primary text-3xl px-12 py-6 flex items-center gap-4 shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-transform ${processingAction ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
                        >
                            <Play size={40} /> Další otázka
                        </button>
                    </div>
                )}


                {/* Countdown Overlay */}
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
            {/* --- HEADER WITH CONTROLS --- */}
            <div className="absolute top-4 right-4 z-50 flex gap-4">
                <button onClick={openPresentationMode} className="bg-white/10 hover:bg-white/20 p-3 rounded-full text-white backdrop-blur-md transition-colors" title="Otevřít Prezentaci (TV)">
                    <Monitor size={24} />
                </button>
            </div>
            {/* --------------------------- */}
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

            {/* ... Rest of Lobby (unchanged logic) ... */}
            <div className="w-full max-w-[95vw] flex flex-col items-center text-center z-10 relative">
                {/* QR Code Absolute Positioned */}
                <div className="absolute top-0 right-0 hidden md:flex flex-col items-center bg-white p-4 rounded-xl shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-300">
                    <QRCode
                        value={`https://hollyhop.cz/otamat/play?pin=${pin}`}
                        size={128}
                        fgColor="#000000"
                        bgColor="#ffffff"
                    />
                    <span className="text-black font-bold mt-2 text-sm">Naskenuj a hraj!</span>
                </div>

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

                <div className="flex gap-6 mt-12 flex-col md:flex-row items-center">
                    <Link href="/dashboard" className="btn btn-secondary text-2xl px-10 py-5 w-full md:w-auto text-center">
                        Ukončit hru
                    </Link>
                    <button
                        onClick={handleStartGame}
                        className={`btn btn-primary text-2xl px-16 py-5 flex items-center justify-center gap-4 transform transition-all shadow-xl w-full md:w-auto
                            ${processingAction ? 'opacity-70 cursor-wait scale-95 grayscale' : 'hover:scale-105'}
                        `}
                        disabled={players.length === 0 || processingAction}
                    >
                        {processingAction ? (
                            <>
                                <Loader2 className="animate-spin" size={32} />
                                <span className="animate-pulse">Spouštění...</span>
                            </>
                        ) : (
                            <>
                                <Play size={32} /> Spustit hru
                            </>
                        )}
                    </button>
                    <button onClick={handleOpenQuizSelector} className="btn btn-secondary text-2xl px-8 py-5 w-full md:w-auto flex items-center justify-center" title="Změnit kvíz">
                        <RotateCcw size={32} />
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
