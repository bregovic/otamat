"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { Users, Check, Volume2, VolumeX } from "lucide-react";
import QRCode from "react-qr-code";
import { BACKEND_URL } from "../../utils/config";

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

function ScreenContent() {
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
    const [showLeaderboard, setShowLeaderboard] = useState(false);

    // Audio State
    const [soundEnabled, setSoundEnabled] = useState(true);
    const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);
    const soundEnabledRef = useRef(soundEnabled); // Ref to access current state in callbacks

    useEffect(() => {
        soundEnabledRef.current = soundEnabled;
        if (!soundEnabled) {
            stopBackgroundMusic();
        }
    }, [soundEnabled]);

    const playSound = (file: string, loop = false, volume = 0.5) => {
        if (!soundEnabledRef.current) return null;
        try {
            const audio = new Audio(`/sounds/${file}`);
            audio.loop = loop;
            audio.volume = volume;
            audio.play().catch(e => console.log("Audio play failed (autoplay policy?):", e));
            return audio;
        } catch (e) {
            console.error("Audio error:", e);
            return null;
        }
    };

    const stopBackgroundMusic = () => {
        if (backgroundMusicRef.current) {
            backgroundMusicRef.current.pause();
            backgroundMusicRef.current = null;
        }
    };

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
            playSound("join.mp3", false, 0.4);
        });

        newSocket.on("updatePlayerList", (playerList) => {
            setPlayers(playerList);
        });

        // Handle loading new quiz into same session
        newSocket.on("quizLoaded", () => {
            setGameStarted(false);
            setGameFinished(false);
            setShowResults(false);
            setResultsData(null);
            setFinalPlayers([]);
            setCurrentQuestion(null);
            setShowLeaderboard(false);
            stopBackgroundMusic();
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

            // Audio
            stopBackgroundMusic();
            playSound("question_start.mp3", false, 0.6);
            // Start thinking music after a short delay or immediately
            backgroundMusicRef.current = playSound("thinking.mp3", true, 0.3);
        });

        newSocket.on("answerSubmitted", (data) => {
            setAnswerStats({ count: data.count, total: data.total });
            playSound("pop.mp3", false, 0.2);
        });

        newSocket.on("questionEnd", (data) => {
            setResultsData(data);
            setShowResults(true);
            setShowLeaderboard(false);

            stopBackgroundMusic();
            playSound("time_up.mp3", false, 0.6);
        });

        newSocket.on("showLeaderboard", () => {
            setShowLeaderboard(true);
            playSound("leaderboard.mp3", false, 0.5);
        });

        newSocket.on("gameOver", (data) => {
            setFinalPlayers(data.players.sort((a: any, b: any) => b.score - a.score));
            setGameFinished(true);
            setGameStarted(false);

            stopBackgroundMusic();
            playSound("win.mp3", false, 0.7);
        });

        newSocket.on("countdownStart", (data) => {
            setCountdown(data.duration);
            setShowResults(false);
            playSound("countdown.mp3", false, 0.5);
        });

        return () => {
            stopBackgroundMusic();
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

    if (!pin) return <div className="text-white text-center mt-20">Chybí PIN hry.</div>;

    if (gameFinished) {
        // Final screen WITHOUT buttons
        const topPlayers = finalPlayers.slice(0, 5).reverse();
        const visiblePlayers = topPlayers.slice(0, revealCount);

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
                {/* Sound Toggle */}
                <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className="absolute top-8 left-8 z-50 p-4 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white transition-all hover:scale-110"
                >
                    {soundEnabled ? <Volume2 size={32} /> : <VolumeX size={32} />}
                </button>
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
                </div>
            </main>
        );
    }

    if (gameStarted && currentQuestion) {
        // Active Game View (NO CONTROLS)
        return (
            <main className="h-screen max-h-screen w-full overflow-hidden flex flex-col p-2 md:p-4 relative">
                {/* Sound Toggle */}
                <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className="absolute top-8 left-8 z-50 p-4 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white transition-all hover:scale-110"
                >
                    {soundEnabled ? <Volume2 size={32} /> : <VolumeX size={32} />}
                </button>
                {/* Header Info */}
                <div className="flex justify-between items-center mb-6 px-8 w-full max-w-[98vw] mx-auto shrink-0 z-10">
                    <div className="text-3xl font-bold text-gray-400">
                        Otázka {currentQuestion.index} / {currentQuestion.total}
                    </div>
                    <div className="text-6xl font-black text-white bg-white/10 px-8 py-4 rounded-2xl backdrop-blur-md border border-white/10 shadow-lg">
                        {timeLeft}s
                    </div>
                    <div className="text-3xl font-bold text-gray-400">
                        Odpovědi: {answerStats.count} / {answerStats.total}
                    </div>
                </div>

                {/* Question Area */}
                <div className="flex-1 min-h-0 flex flex-col items-center justify-center mb-8 relative w-full">
                    <div className="glass-card w-full !max-w-[98vw] !p-10 flex flex-col items-center justify-center h-full relative overflow-hidden border-white/10 shadow-2xl">
                        <h2 className="text-5xl md:text-7xl font-black text-center mb-8 leading-tight z-10 text-white drop-shadow-lg shrink-0 max-h-[25vh] overflow-y-auto custom-scrollbar">
                            {currentQuestion.text}
                        </h2>
                        <div className="flex-1 w-full flex items-center justify-center rounded-2xl relative overflow-hidden min-h-0 bg-black/20">
                            {currentQuestion.mediaUrl ? (
                                <img src={currentQuestion.mediaUrl} alt="Question Media" className="max-h-full max-w-full object-contain rounded-xl shadow-2xl" />
                            ) : (
                                <div className="text-white/10 text-[12rem] font-bold flex items-center justify-center w-full h-full">?</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Options Area */}
                <div className={`grid gap-6 w-full !max-w-[98vw] mx-auto shrink-0 ${currentQuestion.type === 'TRUE_FALSE' ? 'grid-cols-2' : 'grid-cols-2'}`} style={{ height: '30vh', minHeight: '220px', maxHeight: '400px' }}>
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
                                    rounded-3xl text-4xl md:text-6xl font-black text-white flex items-center justify-center gap-6 transition-all duration-300 relative overflow-hidden shadow-xl border-8 border-white/10
                                    ${showResults ? (isCorrect ? 'opacity-100 scale-105 z-10 ring-8 ring-white' : 'opacity-30 grayscale') : bgColor}
                                `}>
                                    <span className="drop-shadow-lg">{opt.text}</span>
                                    {isCorrect && <Check size={96} className="absolute right-12 top-1/2 -translate-y-1/2 text-white drop-shadow-xl" />}
                                </div>
                            );
                        }

                        return (
                            <div key={i} className={`
                                rounded-3xl text-3xl md:text-5xl font-bold text-white flex items-center justify-center gap-6 transition-all duration-300 relative overflow-hidden shadow-xl border-4 border-white/10
                                ${showResults ? (isCorrect ? 'bg-emerald-500 scale-105 z-10 ring-8 ring-white' : 'bg-white/5 opacity-30 grayscale') : `bg-gradient-to-br ${gradientClass}`}
                            `}>
                                <span className="absolute left-6 top-6 text-4xl opacity-50 z-20 font-black">{['▲', '◆', '●', '■'][i]}</span>
                                {opt.mediaUrl ? (
                                    <div className="w-full h-full absolute inset-0 flex items-center justify-center bg-black/40">
                                        <img src={opt.mediaUrl} alt="Option" className="max-w-full max-h-full object-contain opacity-80" />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="drop-shadow-2xl z-10 px-6 text-center bg-black/60 p-4 rounded-2xl backdrop-blur-sm">{opt.text}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <span className="drop-shadow-lg z-10 px-12 text-center">{opt.text}</span>
                                )}
                                {isCorrect && <Check size={80} className="absolute right-8 top-8 text-white drop-shadow-xl z-30" />}
                            </div>
                        );
                    })}
                </div>

                {/* Results Overlay */}
                {showResults && showLeaderboard && (
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-xl z-40 flex flex-col items-center justify-center p-12">
                        <h2 className="text-7xl font-bold text-white mb-16">Průběžné výsledky</h2>
                        <div className="w-full max-w-6xl space-y-6 mb-16">
                            {resultsData?.players.sort((a: any, b: any) => b.score - a.score).slice(0, 5).map((player: any, index: number) => (
                                <div key={player.id} className="flex items-center justify-between bg-white/10 p-8 rounded-3xl border border-white/5 shadow-xl">
                                    <div className="flex items-center gap-8">
                                        <span className={`text-4xl font-bold w-12 ${index === 0 ? 'text-yellow-400' : 'text-gray-400'}`}>#{index + 1}</span>
                                        <span className="text-6xl">{avatarMap[player.avatar] || player.avatar}</span>
                                        <span className="text-4xl font-bold text-white">{player.nickname}</span>
                                    </div>
                                    <span className="text-5xl font-bold text-emerald-400">{player.score} b</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {/* Countdown Overlay */}
                {countdown !== null && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center">
                        <div className="text-[25rem] font-black text-white animate-pulse">
                            {countdown}
                        </div>
                    </div>
                )}
            </main>
        );
    }

    // Lobby View
    return (
        <main className="min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden">
            <style jsx global>{`
                @keyframes float {
                    0% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                    100% { transform: translateY(0px); }
                }
                 .avatar-float {
                    animation: float 3s ease-in-out infinite;
                }
            `}</style>
            <div className="w-full max-w-[98vw] flex flex-col items-center text-center z-10 relative">
                <div className="absolute top-0 right-0 hidden lg:flex flex-col items-center bg-white p-6 rounded-3xl shadow-2xl transform rotate-2 hover:rotate-0 transition-transform duration-300">
                    <QRCode value={`https://hollyhop.cz/otamat/play?pin=${pin}`} size={200} fgColor="#000000" bgColor="#ffffff" />
                    <span className="text-black font-bold mt-4 text-xl">Naskenuj a hraj!</span>
                </div>

                <h1 className="text-8xl font-black mb-8 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 drop-shadow-2xl">Lobby</h1>
                <p className="text-4xl text-gray-300 mb-12">Připojte se na <span className="text-white font-black">hollyhop.cz</span> pomocí PINu:</p>
                <div className="text-[10rem] md:text-[12rem] font-black text-white bg-white/5 px-20 py-12 rounded-[3rem] border-8 border-white/10 mb-20 backdrop-blur-xl shadow-[0_0_100px_rgba(255,255,255,0.15)] animate-pulse tracking-widest">{pin}</div>

                <div className="glass-card w-full !max-w-[95vw] p-12 min-h-[600px] flex flex-col bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between mb-12 border-b border-white/10 pb-6">
                        <h2 className="text-6xl font-bold flex items-center gap-6 text-white"><Users size={64} /> Hráči ({players.length})</h2>
                        {players.length > 0 && <div className="text-emerald-400 font-bold text-4xl animate-pulse">Připraveni ke hře</div>}
                    </div>
                    {players.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center text-gray-500 text-5xl font-light">Čekání na hráče...</div>
                    ) : (
                        <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-16">
                            {players.map((player, i) => (
                                <div key={player.id} className="flex flex-col items-center gap-6 avatar-float" style={{ animationDelay: `${i * 0.1}s` }}>
                                    <div className="text-8xl bg-white/10 w-40 h-40 rounded-full flex items-center justify-center border-4 border-white/20 shadow-2xl backdrop-blur-md">
                                        {avatarMap[player.avatar] || player.avatar}
                                    </div>
                                    <div className="font-bold text-3xl text-white w-full break-words leading-tight drop-shadow-xl">{player.nickname}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                {/* NO CONTROLS HERE */}
                {/* Sound Toggle */}
                <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className="absolute top-8 left-8 z-50 p-4 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white transition-all hover:scale-110"
                >
                    {soundEnabled ? <Volume2 size={32} /> : <VolumeX size={32} />}
                </button>
            </div>
        </main>
    );
}

export default function ScreenPage() {
    return (
        <Suspense fallback={<div className="text-white text-center mt-20">Načítání...</div>}>
            <ScreenContent />
        </Suspense>
    );
}
