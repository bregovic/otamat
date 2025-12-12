"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { Loader2, Check, X } from "lucide-react";

// Production Backend URL
const BACKEND_URL = "https://otamat-production.up.railway.app";
// const BACKEND_URL = "http://localhost:4000";

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

function LobbyContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pinFromUrl = searchParams.get("pin");

    const [pin, setPin] = useState(pinFromUrl || "");
    const [nickname, setNickname] = useState("");
    const [avatar, setAvatar] = useState("cow"); // Default avatar
    const [selectedCategory, setSelectedCategory] = useState<keyof typeof avatarCategories>("Zvířátka");
    const [socket, setSocket] = useState<Socket | null>(null);
    const [step, setStep] = useState<'pin' | 'nickname' | 'lobby' | 'game' | 'finished'>("pin");
    const [error, setError] = useState<string | null>(null);
    const [players, setPlayers] = useState<any[]>([]);

    // Game State
    const [currentQuestion, setCurrentQuestion] = useState<{ index: number, total: number, timeLimit: number, endTime?: number, type?: string, options?: { text: string, mediaUrl?: string }[] } | null>(null);
    const [answerSubmitted, setAnswerSubmitted] = useState<number | null>(null);
    const [result, setResult] = useState<{ correct: boolean, points: number, rank: number } | null>(null);
    const [showResultScreen, setShowResultScreen] = useState(false);
    const [score, setScore] = useState(0);

    // Prevent double submission
    const isSubmitting = useRef(false);

    // Timer State
    const [timeLeft, setTimeLeft] = useState(0);

    useEffect(() => {
        if (pinFromUrl) {
            setStep("nickname");
        }
    }, [pinFromUrl]);

    useEffect(() => {
        if (step !== 'game' || showResultScreen || !currentQuestion) return;

        const updateTimer = () => {
            if (currentQuestion.endTime) {
                const now = Date.now();
                const remaining = Math.max(0, Math.ceil((currentQuestion.endTime - now) / 1000));
                setTimeLeft(remaining);
            } else {
                // Fallback for old behavior
                setTimeLeft(prev => Math.max(0, prev - 1));
            }
        };

        // Update immediately
        updateTimer();

        const timer = setInterval(updateTimer, 1000);
        return () => clearInterval(timer);
    }, [step, showResultScreen, currentQuestion]);

    useEffect(() => {
        if (!socket) return;

        socket.on("playerJoined", (player) => {
            setPlayers((prev) => [...prev, player]);
        });

        socket.on("updatePlayerList", (playerList) => {
            setPlayers(playerList);
        });

        // NEW: Handle loading new quiz
        socket.on("quizLoaded", () => {
            setStep("lobby");
            setScore(0);
            setResult(null);
            setShowResultScreen(false);
            setCurrentQuestion(null);
            setAnswerSubmitted(null);
            isSubmitting.current = false;
        });

        socket.on("questionStart", (data) => {
            setStep("game");
            setCurrentQuestion({
                index: data.questionIndex,
                total: data.totalQuestions,
                timeLimit: data.timeLimit,
                endTime: data.endTime,
                type: data.type,
                options: data.options
            });
            setTimeLeft(data.timeLimit); // Initial display
            setAnswerSubmitted(null);
            isSubmitting.current = false; // Reset submission lock
            setShowResultScreen(false);
            setResult(null);
        });

        socket.on("questionEnd", (data) => {
            const myData = data.players.find((p: any) => p.id === socket.id);
            const isCorrect = data.correctIndex === answerSubmitted;

            if (myData) {
                setScore(myData.score);
            }

            setResult({
                correct: isCorrect,
                points: myData ? myData.score : 0,
                rank: 0
            });
            setShowResultScreen(true);
        });

        socket.on("gameOver", (data) => {
            setStep('finished');
        });

        return () => {
            socket.off("playerJoined");
            socket.off("updatePlayerList");
            socket.off("questionStart");
            socket.off("questionEnd");
            socket.off("gameOver");
            socket.off("quizLoaded");
        };
    }, [socket, answerSubmitted, router]);

    const handleConnect = () => {
        if (pin.length !== 6) { setError("PIN musí mít 6 číslic."); return; }
        setStep("nickname");
        setError(null);
    };

    const handleJoin = () => {
        if (!nickname.trim()) { setError("Zadej přezdívku."); return; }

        const newSocket = io(BACKEND_URL, {
            transports: ['websocket'], // Force websocket to avoid polling SSL issues
            upgrade: false
        });
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
        if (!socket || answerSubmitted !== null || isSubmitting.current) return;

        isSubmitting.current = true;
        setAnswerSubmitted(index);
        socket.emit("submitAnswer", { pin, answerIndex: index });
    };

    // --- RENDERERS ---

    if (step === 'pin') {
        return (
            <div className="glass-card">
                <h1 style={{ fontSize: '2.5rem', marginBottom: '2rem' }}>OtaMat</h1>
                <div className="input-wrapper">
                    <input
                        type="text"
                        placeholder="Herní PIN"
                        value={pin}
                        onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        style={{ textAlign: 'center', letterSpacing: '0.2em', fontSize: '2rem', fontWeight: 'bold' }}
                    />
                </div>
                <button onClick={handleConnect} className="btn btn-primary" style={{ width: '100%' }}>Pokračovat</button>
                {error && <p style={{ color: '#ef4444', marginTop: '1rem' }}>{error}</p>}
            </div>
        );
    }

    if (step === 'nickname') {
        return (
            <div className="glass-card w-full max-w-2xl">
                <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Tvoje postava</h1>

                {/* Category Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-2 mb-4 custom-scrollbar">
                    {Object.keys(avatarCategories).map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat as keyof typeof avatarCategories)}
                            className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${selectedCategory === cat
                                ? 'bg-white text-black font-bold'
                                : 'bg-white/10 text-white hover:bg-white/20'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                <div className="avatar-grid" style={{ maxHeight: '300px', overflowY: 'auto', padding: '1rem' }}>
                    {Object.entries(avatarCategories[selectedCategory]).map(([key, emoji]) => (
                        <div key={key} className={`avatar-option ${avatar === key ? 'selected' : ''}`} onClick={() => setAvatar(key)}>
                            {emoji}
                        </div>
                    ))}
                </div>
                <div className="input-wrapper mt-4">
                    <input
                        type="text"
                        placeholder="Přezdívka"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        style={{ textAlign: 'center' }}
                    />
                </div>
                <button onClick={handleJoin} className="btn btn-primary" style={{ width: '100%' }}>Vstoupit do hry</button>
                {error && <p style={{ color: '#ef4444', marginTop: '1rem' }}>{error}</p>}
            </div>
        );
    }

    if (step === 'lobby') {
        return (
            <div className="glass-card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>
                    {avatarMap[avatar] || avatar}
                </div>
                <h1 style={{ marginBottom: '0.5rem' }}>{nickname}</h1>
                <div style={{ color: '#10b981', fontWeight: 'bold', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '10px', height: '10px', background: '#10b981', borderRadius: '50%' }}></div>
                    Jsi ve hře!
                </div>
                <Loader2 className="animate-spin" size={48} style={{ margin: '0 auto', opacity: 0.5 }} />
                <p style={{ marginTop: '1rem', color: '#a1a1aa' }}>Čekáme na spuštění hry...</p>
                <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.5rem' }}>Vidíš své jméno na hlavní obrazovce?</p>
            </div>
        );
    }

    if (step === 'finished') {
        return (
            <div className="glass-card" style={{ textAlign: 'center' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Konec hry</h1>
                <div style={{ fontSize: '4rem', marginBottom: '2rem' }}>
                    🏆
                </div>
                <p style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Tvé konečné skóre:</p>
                <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#fbbf24', marginBottom: '2rem' }}>
                    {score}
                </div>

                <p style={{ color: '#a1a1aa' }}>Sleduj obrazovku pro vyhlášení vítězů.</p>
                <p style={{ marginTop: '1rem', color: '#10b981', fontWeight: 'bold' }}>Neodcházej! Hostitel může spustit další hru.</p>
            </div>
        );
    }

    if (step === 'game') {
        if (showResultScreen) {
            return (
                <div className="glass-card" style={{ textAlign: 'center', background: result?.correct ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', borderColor: result?.correct ? '#10b981' : '#ef4444' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>
                        {result?.correct ? <Check size={64} color="#10b981" /> : <X size={64} color="#ef4444" />}
                    </div>
                    <h1 style={{ marginBottom: '0.5rem' }}>{result?.correct ? "Správně!" : "Špatně"}</h1>
                    <p style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>{result?.correct ? "+ Body" : "Zkus to příště"}</p>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '12px', display: 'inline-block' }}>
                        <div style={{ fontSize: '0.9rem', color: '#aaa' }}>Celkové skóre</div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{score}</div>
                    </div>
                    <p style={{ marginTop: '2rem', color: '#a1a1aa' }}>Čekej na další otázku...</p>
                </div>
            );
        }

        return (
            <div style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#a1a1aa', padding: '0 1rem' }}>
                    <span style={{ fontSize: '0.9rem' }}>Otázka {currentQuestion?.index} / {currentQuestion?.total}</span>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', background: 'rgba(255,255,255,0.1)', padding: '0.25rem 1rem', borderRadius: '8px' }}>
                        {timeLeft}s
                    </div>
                    <span style={{ fontSize: '0.9rem' }}>Skóre: {score}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: currentQuestion?.type === 'TRUE_FALSE' ? '1fr 1fr' : '1fr 1fr', gap: '0.75rem', height: '50vh' }}>
                    {currentQuestion?.type === 'TRUE_FALSE' ? (
                        // True/False Buttons
                        <>
                            <button
                                onClick={() => submitAnswer(0)}
                                disabled={answerSubmitted !== null}
                                className={`
                                    rounded-xl flex flex-col items-center justify-center text-white transition-all duration-200 relative overflow-hidden
                                    ${answerSubmitted === null
                                        ? `bg-blue-600 shadow-md active:scale-95`
                                        : answerSubmitted === 0
                                            ? 'bg-white text-black scale-105 z-10 ring-4 ring-white/50'
                                            : 'bg-gray-800 opacity-20 grayscale'
                                    }
                                `}
                                style={{ fontSize: '2rem', fontWeight: 'bold' }}
                            >
                                PRAVDA
                            </button>
                            <button
                                onClick={() => submitAnswer(1)}
                                disabled={answerSubmitted !== null}
                                className={`
                                    rounded-xl flex flex-col items-center justify-center text-white transition-all duration-200 relative overflow-hidden
                                    ${answerSubmitted === null
                                        ? `bg-red-600 shadow-md active:scale-95`
                                        : answerSubmitted === 1
                                            ? 'bg-white text-black scale-105 z-10 ring-4 ring-white/50'
                                            : 'bg-gray-800 opacity-20 grayscale'
                                    }
                                `}
                                style={{ fontSize: '2rem', fontWeight: 'bold' }}
                            >
                                LEŽ
                            </button>
                        </>
                    ) : (
                        // Standard & Image Options
                        ['▲', '◆', '●', '■'].map((symbol, i) => {
                            const gradientClass = [
                                'from-[var(--opt-1-from)] to-[var(--opt-1-to)]',
                                'from-[var(--opt-2-from)] to-[var(--opt-2-to)]',
                                'from-[var(--opt-3-from)] to-[var(--opt-3-to)]',
                                'from-[var(--opt-4-from)] to-[var(--opt-4-to)]'
                            ][i % 4];

                            return (
                                <button
                                    key={i}
                                    onClick={() => submitAnswer(i)}
                                    disabled={answerSubmitted !== null}
                                    className={`
                                        rounded-xl flex flex-col items-center justify-center text-white transition-all duration-200 relative overflow-hidden
                                        ${answerSubmitted === null
                                            ? `bg-gradient-to-br ${gradientClass} shadow-md active:scale-95`
                                            : answerSubmitted === i
                                                ? 'bg-white text-black scale-105 z-10 ring-4 ring-white/50'
                                                : 'bg-gray-800 opacity-20 grayscale'
                                        }
                                    `}
                                    style={{ fontSize: '2.5rem' }}
                                >
                                    {currentQuestion?.options?.[i]?.mediaUrl ? (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                            <img
                                                src={currentQuestion.options[i].mediaUrl}
                                                alt="Option"
                                                className="max-w-full max-h-full object-contain opacity-90"
                                            />
                                        </div>
                                    ) : null}
                                    <span className="z-10 drop-shadow-md">{symbol}</span>
                                </button>
                            );
                        })
                    )}
                </div>

                {answerSubmitted !== null && (
                    <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '1.25rem', fontWeight: 'bold', color: '#10b981' }}>
                        Odpověď odeslána!
                    </div>
                )}
            </div>
        );
    }

    return null;
}

export default function PlayPage() {
    return (
        <main>
            <Suspense fallback={<Loader2 className="animate-spin" />}>
                <LobbyContent />
            </Suspense>
        </main>
    );
}
