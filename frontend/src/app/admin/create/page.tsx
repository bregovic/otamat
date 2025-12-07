"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { Loader2, Users, Play, Check, Image as ImageIcon, Trash2, Plus, Save, X, ZoomIn, Move } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";

// Production Backend URL
const BACKEND_URL = "https://otamat-production.up.railway.app";
// const BACKEND_URL = "http://localhost:4000";

// Image Editor Component
function ImageEditorModal({ src, onSave, onCancel, aspectRatio }: { src: string, onSave: (data: string) => void, onCancel: () => void, aspectRatio: number }) {
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);

    useEffect(() => {
        const img = document.createElement('img');
        img.src = src;
        img.onload = () => {
            imageRef.current = img;
            draw();
        };
    }, [src]);

    useEffect(() => {
        draw();
    }, [zoom, offset]);

    const draw = () => {
        const canvas = canvasRef.current;
        const img = imageRef.current;
        if (!canvas || !img) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size (fixed preview size)
        const PREVIEW_WIDTH = 600;
        const PREVIEW_HEIGHT = PREVIEW_WIDTH / aspectRatio;
        canvas.width = PREVIEW_WIDTH;
        canvas.height = PREVIEW_HEIGHT;

        // Clear
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Calculate dimensions to fit image in canvas (cover)
        let drawWidth = canvas.width;
        let drawHeight = canvas.width / (img.width / img.height);

        if (drawHeight < canvas.height) {
            drawHeight = canvas.height;
            drawWidth = canvas.height * (img.width / img.height);
        }

        // Apply Zoom
        drawWidth *= zoom;
        drawHeight *= zoom;

        // Center image
        const centerX = (canvas.width - drawWidth) / 2;
        const centerY = (canvas.height - drawHeight) / 2;

        // Apply Offset
        const x = centerX + offset.x;
        const y = centerY + offset.y;

        ctx.drawImage(img, x, y, drawWidth, drawHeight);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        setOffset({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleSave = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            onSave(canvas.toDataURL('image/jpeg', 0.8));
        }
    };

    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-4xl w-full flex flex-col gap-6 shadow-2xl">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Move size={24} /> Úprava obrázku
                    </h2>
                    <button onClick={onCancel} className="text-gray-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="relative bg-black/50 rounded-xl overflow-hidden border border-white/10 cursor-move touch-none select-none"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    style={{ height: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    <canvas ref={canvasRef} className="max-w-full max-h-full shadow-lg" />
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 px-4 py-2 rounded-full text-white/70 text-sm pointer-events-none backdrop-blur-md">
                        Tažením posunete • Kolečkem přiblížíte
                    </div>
                </div>

                <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl">
                    <ZoomIn size={20} className="text-gray-400" />
                    <input
                        type="range"
                        min="1"
                        max="3"
                        step="0.1"
                        value={zoom}
                        onChange={(e) => setZoom(parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <span className="text-white font-mono w-12 text-right">{Math.round(zoom * 100)}%</span>
                </div>

                <div className="flex justify-end gap-4">
                    <button onClick={onCancel} className="px-6 py-3 rounded-xl text-gray-300 hover:bg-white/10 transition-colors font-medium">
                        Zrušit
                    </button>
                    <button onClick={handleSave} className="px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-500/20 transition-all transform hover:scale-105 flex items-center gap-2">
                        <Check size={20} /> Použít obrázek
                    </button>
                </div>
            </div>
        </div>
    );
}

function CreateQuizContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editQuizId = searchParams.get("edit");

    const [title, setTitle] = useState("");
    const [coverImage, setCoverImage] = useState("");
    const [isPublic, setIsPublic] = useState(false);
    const [questions, setQuestions] = useState<{
        text: string;
        mediaUrl?: string;
        type: 'MULTIPLE_CHOICE' | 'IMAGE_GUESS' | 'TRUE_FALSE';
        options: { text: string; mediaUrl?: string }[];
        correct: number;
    }[]>([{ text: "", type: 'MULTIPLE_CHOICE', options: [{ text: "" }, { text: "" }, { text: "" }, { text: "" }], correct: 0 }]);
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [gamePin, setGamePin] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [players, setPlayers] = useState<any[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(false);

    // Game Running State
    const [gameStarted, setGameStarted] = useState(false);
    const [currentQuestion, setCurrentQuestion] = useState<{ text: string, options: string[], index: number, total: number } | null>(null);
    const [answerStats, setAnswerStats] = useState<{ count: number, total: number }>({ count: 0, total: 0 });
    const [timeLeft, setTimeLeft] = useState(30);
    const [showResults, setShowResults] = useState(false);
    const [resultsData, setResultsData] = useState<{ correctIndex: number, players: any[] } | null>(null);
    const [gameFinished, setGameFinished] = useState(false);
    const [finalPlayers, setFinalPlayers] = useState<any[]>([]);

    // Image Editor State
    const [editingImage, setEditingImage] = useState<{
        src: string;
        type: 'cover' | 'question' | 'option';
        qIndex?: number;
        oIndex?: number;
    } | null>(null);

    // Image compression utility (optimized)
    const processImage = (file: File): Promise<string> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.onload = () => {
                    // Initial resize to manageable size before editing
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const MAX_DIM = 1200; // Higher quality for editing source

                    if (width > height) {
                        if (width > MAX_DIM) {
                            height *= MAX_DIM / width;
                            width = MAX_DIM;
                        }
                    } else {
                        if (height > MAX_DIM) {
                            width *= MAX_DIM / height;
                            height = MAX_DIM;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.9));
                };
                img.src = e.target?.result as string;
            };
            reader.readAsDataURL(file);
        });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'cover' | 'question' | 'option', qIndex?: number, oIndex?: number) => {
        const file = e.target.files?.[0];
        if (file) {
            const processed = await processImage(file);
            setEditingImage({ src: processed, type, qIndex, oIndex });
        }
        // Reset input
        e.target.value = '';
    };

    const handleSaveEditedImage = (finalImage: string) => {
        if (!editingImage) return;

        if (editingImage.type === 'cover') {
            setCoverImage(finalImage);
        } else if (editingImage.type === 'question' && editingImage.qIndex !== undefined) {
            const newQuestions = [...questions];
            newQuestions[editingImage.qIndex].mediaUrl = finalImage;
            setQuestions(newQuestions);
        } else if (editingImage.type === 'option' && editingImage.qIndex !== undefined && editingImage.oIndex !== undefined) {
            const newQuestions = [...questions];
            newQuestions[editingImage.qIndex].options[editingImage.oIndex].mediaUrl = finalImage;
            setQuestions(newQuestions);
        }
        setEditingImage(null);
    };

    const { user } = useAuth();

    useEffect(() => {
        if (editQuizId) {
            fetchQuizData(editQuizId);
        }
    }, [editQuizId]);

    const fetchQuizData = async (id: string) => {
        setIsLoadingData(true);
        try {
            const res = await fetch(`${BACKEND_URL}/quiz/${id}`);
            if (res.ok) {
                const data = await res.json();
                setTitle(data.title);
                setIsPublic(data.isPublic);
                if (data.questions && data.questions.length > 0) {
                    setQuestions(data.questions.map((q: any) => ({
                        text: q.text,
                        mediaUrl: q.mediaUrl,
                        type: q.type || 'MULTIPLE_CHOICE',
                        options: q.options.sort((a: any, b: any) => a.order - b.order).map((o: any) => ({
                            text: o.text || "",
                            mediaUrl: o.imageUrl || ""
                        })),
                        correct: q.options.findIndex((o: any) => o.isCorrect)
                    })));
                }
                if (data.coverImage) setCoverImage(data.coverImage);
            } else {
                setError("Nepodařilo se načíst kvíz.");
            }
        } catch (err) {
            console.error(err);
            setError("Chyba při načítání kvízu.");
        } finally {
            setIsLoadingData(false);
        }
    };

    useEffect(() => {
        const newSocket = io(BACKEND_URL, {
            transports: ['websocket'], // Force websocket to avoid polling SSL issues
            upgrade: false
        });
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
        setQuestions([...questions, { text: "", type: 'MULTIPLE_CHOICE', options: [{ text: "" }, { text: "" }, { text: "" }, { text: "" }], correct: 0 }]);
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

        const payload = {
            quizId: editQuizId || undefined,
            title,
            coverImage,
            questions,
            isPublic,
            userId: user?.id
        };

        socket.emit("saveQuiz", payload, (response: { success: boolean, message: string, quizId?: string }) => {
            if (response.success && response.quizId) {
                // Quiz saved, now start it
                socket.emit("createGameFromQuiz", { quizId: response.quizId }, (gameResponse: { success: boolean, pin?: string, message?: string }) => {
                    if (gameResponse.success && gameResponse.pin) {
                        router.push(`/admin/host?pin=${gameResponse.pin}`);
                    } else {
                        alert("Kvíz byl uložen, ale nepodařilo se spustit hru: " + (gameResponse.message || "Neznámá chyba"));
                        setIsSaving(false);
                    }
                });
            } else {
                console.error("Save failed:", response.message);
                alert("Chyba při ukládání: " + (response.message || "Neznámá chyba"));
                setError(response.message || "Chyba při ukládání.");
                setIsSaving(false);
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

        const payload = {
            quizId: editQuizId || undefined,
            title,
            coverImage,
            questions,
            isPublic,
            userId: user.id
        };

        console.log("Saving quiz payload:", {
            title,
            coverImageLength: coverImage ? coverImage.length : 0,
            questionsCount: questions.length,
            firstQuestionMediaUrlLength: questions[0]?.mediaUrl ? questions[0].mediaUrl.length : 0
        });
        const payloadSize = JSON.stringify(payload).length;
        console.log(`Payload size: ${(payloadSize / 1024 / 1024).toFixed(2)} MB`);

        socket.emit("saveQuiz", payload, (response: { success: boolean, message: string }) => {
            setIsSaving(false);
            if (response.success) {
                alert(editQuizId ? "Kvíz byl úspěšně aktualizován!" : "Kvíz byl úspěšně uložen!");
                router.push("/dashboard");
            } else {
                console.error("Save failed:", response.message);
                alert("Chyba při ukládání: " + (response.message || "Neznámá chyba"));
                setError(response.message || "Chyba při ukládání kvízu.");
            }
        });
    };

    const handleStartGame = () => {
        if (socket && gamePin) {
            socket.emit("startGame", { pin: gamePin });
        }
    };

    if (isLoadingData) {
        return <div className="flex justify-center items-center min-h-screen"><Loader2 className="animate-spin text-white" size={48} /></div>;
    }

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
            {/* Image Editor Modal */}
            {editingImage && (
                <ImageEditorModal
                    src={editingImage.src}
                    onSave={handleSaveEditedImage}
                    onCancel={() => setEditingImage(null)}
                    aspectRatio={editingImage.type === 'cover' ? 16 / 9 : (editingImage.type === 'question' ? 16 / 9 : 1)}
                />
            )}

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

                    <div className="mt-6">
                        <label className="block text-gray-400 mb-3 text-left font-medium">Titulní obrázek</label>
                        <div className="flex items-center gap-6">
                            {coverImage ? (
                                <div className="relative w-48 h-28 rounded-xl overflow-hidden border-2 border-white/20 shadow-lg group">
                                    <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <button onClick={() => setCoverImage("")} className="bg-red-500 p-2 rounded-full text-white hover:bg-red-600"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            ) : (
                                <label className="cursor-pointer bg-white/5 hover:bg-white/10 border-2 border-dashed border-white/20 hover:border-white/40 rounded-xl px-6 py-4 flex flex-col items-center gap-2 transition-all group">
                                    <div className="bg-white/10 p-3 rounded-full group-hover:scale-110 transition-transform">
                                        <ImageIcon size={24} className="text-blue-400" />
                                    </div>
                                    <span className="text-sm text-gray-300 font-medium">Nahrát obálku</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'cover')} />
                                </label>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
                        <input type="checkbox" id="isPublic" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} style={{ width: '20px', height: '20px', accentColor: 'var(--primary)' }} />
                        <label htmlFor="isPublic" style={{ color: '#fff', cursor: 'pointer' }}>Veřejný kvíz (viditelný pro ostatní)</label>
                    </div>
                </div>
                {questions.map((q, qIndex) => (
                    <div key={qIndex} className="glass-card" style={{ maxWidth: '100%', marginBottom: '2rem', position: 'relative' }}>
                        <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Otázka {qIndex + 1}</h3>
                            <select
                                value={q.type}
                                onChange={(e) => {
                                    const newQuestions = [...questions];
                                    const newType = e.target.value as any;
                                    newQuestions[qIndex].type = newType;

                                    if (newType === 'TRUE_FALSE') {
                                        newQuestions[qIndex].options = [{ text: "Pravda" }, { text: "Lež" }];
                                        newQuestions[qIndex].correct = 0;
                                    } else {
                                        newQuestions[qIndex].options = [{ text: "" }, { text: "" }, { text: "" }, { text: "" }];
                                    }
                                    setQuestions(newQuestions);
                                }}
                                className="rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                style={{ backgroundColor: '#1f2937', color: '#ffffff', border: '1px solid #374151' }}
                            >
                                <option value="MULTIPLE_CHOICE" style={{ backgroundColor: '#1f2937', color: '#ffffff' }}>Kvíz (Text)</option>
                                <option value="IMAGE_GUESS" style={{ backgroundColor: '#1f2937', color: '#ffffff' }}>Obrázkový kvíz</option>
                                <option value="TRUE_FALSE" style={{ backgroundColor: '#1f2937', color: '#ffffff' }}>Pravda / Lež</option>
                            </select>
                        </div>

                        {/* Question Image */}
                        <div className="mb-6">
                            <label className="block text-gray-400 mb-2 text-sm font-medium">Obrázek k otázce (volitelné)</label>
                            {q.mediaUrl ? (
                                <div className="relative w-full h-64 rounded-xl overflow-hidden border border-white/20 bg-black/40 group">
                                    <img src={q.mediaUrl} alt="Question" className="w-full h-full object-contain" />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                        <button onClick={() => { const newQuestions = [...questions]; newQuestions[qIndex].mediaUrl = ""; setQuestions(newQuestions); }} className="bg-red-500/80 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 backdrop-blur-sm transition-colors">
                                            <Trash2 size={18} /> Odstranit
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <label className="cursor-pointer block w-full border-2 border-dashed border-white/10 hover:border-blue-500/50 rounded-xl p-8 text-center hover:bg-blue-500/5 transition-all group">
                                    <div className="bg-white/5 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform group-hover:bg-blue-500/20">
                                        <ImageIcon className="text-gray-400 group-hover:text-blue-400" size={32} />
                                    </div>
                                    <span className="text-gray-300 font-medium block">Klikněte pro nahrání obrázku</span>
                                    <span className="text-gray-500 text-sm">JPG, PNG (max 10MB)</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'question', qIndex)} />
                                </label>
                            )}
                        </div>

                        <div className="input-wrapper mb-8">
                            <input type="text" placeholder="Zadejte otázku..." value={q.text} onChange={(e) => { const newQuestions = [...questions]; newQuestions[qIndex].text = e.target.value; setQuestions(newQuestions); }} style={{ textAlign: 'left', background: 'rgba(255,255,255,0.05)', fontSize: '1.2rem', padding: '1.2rem' }} />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            {q.options.map((opt, oIndex) => (
                                <div key={oIndex} style={{ position: 'relative' }} className="group">
                                    <div className="flex flex-col gap-2">
                                        {/* Option Content Based on Type */}
                                        {q.type === 'IMAGE_GUESS' ? (
                                            // Image Guess: Big Image Upload
                                            opt.mediaUrl ? (
                                                <div className="relative w-full h-40 rounded-xl overflow-hidden border-2 border-white/20 bg-black/20 group-hover:border-white/40 transition-colors">
                                                    <img src={opt.mediaUrl} alt="Option" className="w-full h-full object-cover" />
                                                    <button
                                                        onClick={() => { const newQuestions = [...questions]; newQuestions[qIndex].options[oIndex].mediaUrl = ""; setQuestions(newQuestions); }}
                                                        className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-lg hover:bg-red-500 transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <label className="cursor-pointer bg-white/5 hover:bg-white/10 border-2 border-dashed border-white/10 hover:border-white/30 rounded-xl h-40 flex flex-col items-center justify-center transition-all group">
                                                    <div className="bg-white/5 p-3 rounded-full mb-2 group-hover:scale-110 transition-transform">
                                                        <ImageIcon size={24} className="text-gray-400" />
                                                    </div>
                                                    <span className="text-xs text-gray-400 font-medium">Nahrát odpověď</span>
                                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'option', qIndex, oIndex)} />
                                                </label>
                                            )
                                        ) : q.type === 'TRUE_FALSE' ? (
                                            // True/False: Fixed Text
                                            <div className={`p-6 rounded-xl text-center font-bold text-2xl border-2 transition-all ${q.correct === oIndex ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400' : 'border-white/10 bg-white/5 text-gray-400'}`}>
                                                {opt.text}
                                            </div>
                                        ) : (
                                            // Multiple Choice: Text Only
                                            <input
                                                type="text"
                                                placeholder={`Možnost ${oIndex + 1}`}
                                                value={opt.text}
                                                onChange={(e) => { const newQuestions = [...questions]; newQuestions[qIndex].options[oIndex].text = e.target.value; setQuestions(newQuestions); }}
                                                style={{ textAlign: 'left', fontSize: '1.1rem', padding: '1.2rem', borderColor: q.correct === oIndex ? 'var(--success)' : 'var(--border-light)', width: '100%', background: q.correct === oIndex ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.05)' }}
                                            />
                                        )}
                                    </div>

                                    <div onClick={() => { const newQuestions = [...questions]; newQuestions[qIndex].correct = oIndex; setQuestions(newQuestions); }} style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', border: '2px solid ' + (q.correct === oIndex ? 'var(--success)' : '#666'), background: q.correct === oIndex ? 'var(--success)' : 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, transition: 'all 0.2s' }}>
                                        {q.correct === oIndex && <Check size={20} color="white" />}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '4rem' }}>
                    <button onClick={handleAddQuestion} className="btn btn-secondary" style={{ display: 'inline-flex', width: 'auto' }}>+ Přidat otázku</button>
                    <button onClick={handleSaveOnly} className="btn btn-secondary" style={{ display: 'inline-flex', width: 'auto' }} disabled={isSaving}>
                        {isSaving ? <Loader2 className="animate-spin" /> : <Check size={24} />} {editQuizId ? "Uložit změny" : "Pouze uložit"}
                    </button>
                    <button onClick={handleSaveAndStart} className="btn btn-primary" style={{ display: 'inline-flex', width: 'auto' }} disabled={isSaving}>
                        {isSaving ? <Loader2 className="animate-spin" /> : <Play size={24} />} Uložit a spustit
                    </button>
                </div>
            </div>
        </main>
    );
}

export default function CreateQuizPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><Loader2 className="animate-spin text-white" size={48} /></div>}>
            <CreateQuizContent />
        </Suspense>
    );
}
