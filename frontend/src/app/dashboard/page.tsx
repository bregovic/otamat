"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { Plus, Play, Edit, Trash2, Loader2, Download, Upload, FileSpreadsheet } from "lucide-react";
import { io } from "socket.io-client";
import { exportQuizToExcel, importQuizFromExcel, downloadTemplate } from "../../utils/excel";

// Production Backend URL
const BACKEND_URL = "https://otamat-production.up.railway.app";

export default function DashboardPage() {
    const { user, token, isLoading, logout } = useAuth();
    const router = useRouter();
    const [quizzes, setQuizzes] = useState<any[]>([]);
    const [loadingQuizzes, setLoadingQuizzes] = useState(true);
    const [startingGameId, setStartingGameId] = useState<string | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!isLoading && !user) {
            router.push("/login");
        }
    }, [isLoading, user, router]);

    useEffect(() => {
        if (user && token) {
            fetchMyQuizzes();
        }
    }, [user, token]);

    const fetchMyQuizzes = async () => {
        try {
            const res = await fetch(`${BACKEND_URL}/quiz/my`, {
                headers: { Authorization: `Bearer ${token}` },
                credentials: 'include',
            });

            if (res.status === 401) {
                logout();
                return;
            }

            if (res.ok) {
                const data = await res.json();
                setQuizzes(data);
            }
        } catch (err) {
            console.error("Failed to fetch quizzes", err);
        } finally {
            setLoadingQuizzes(false);
        }
    };

    const handleStartGame = (quizId: string) => {
        setStartingGameId(quizId);
        const socket = io(BACKEND_URL);

        socket.emit("createGameFromQuiz", { quizId }, (response: { success: boolean, pin: string, message?: string }) => {
            if (response.success) {
                router.push(`/admin/host?pin=${response.pin}`);
            } else {
                alert(response.message || "Chyba při spouštění hry.");
                setStartingGameId(null);
            }
            socket.disconnect();
        });
    };

    const handleDelete = async (quizId: string) => {
        if (!confirm("Opravdu chcete smazat tento kvíz?")) return;

        try {
            const res = await fetch(`${BACKEND_URL}/quiz/${quizId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                setQuizzes(quizzes.filter((q) => q.id !== quizId));
            } else {
                alert("Nepodařilo se smazat kvíz.");
            }
        } catch (err) {
            console.error("Failed to delete quiz", err);
        }
    };

    const handleEdit = (quizId: string) => {
        router.push(`/admin/create?edit=${quizId}`);
    };

    const handleExport = async (quizId: string) => {
        try {
            // Fetch full quiz data first
            const res = await fetch(`${BACKEND_URL}/quiz/${quizId}`);
            if (!res.ok) throw new Error("Failed to fetch quiz details");
            const quiz = await res.json();

            exportQuizToExcel(quiz);
        } catch (err) {
            console.error("Export failed:", err);
            alert("Nepodařilo se exportovat kvíz.");
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        try {
            const quizData = await importQuizFromExcel(file);

            // Save via Socket (reusing existing logic)
            const socket = io(BACKEND_URL);
            const payload = {
                title: quizData.title,
                description: quizData.description,
                coverImage: quizData.coverImage,
                questions: quizData.questions,
                isPublic: quizData.isPublic,
                userId: user?.id
            };

            socket.emit("saveQuiz", payload, (response: { success: boolean, message: string }) => {
                socket.disconnect();
                setIsImporting(false);
                if (response.success) {
                    alert("Kvíz byl úspěšně importován!");
                    fetchMyQuizzes();
                } else {
                    alert("Chyba při importu: " + response.message);
                }
            });

        } catch (err) {
            console.error("Import failed:", err);
            alert("Nepodařilo se importovat soubor. Ujistěte se, že má správný formát.");
            setIsImporting(false);
        }

        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    if (isLoading || !user) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="animate-spin text-primary" size={48} />
            </div>
        );
    }

    return (
        <main className="min-h-screen p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Vítej, {user.nickname}! 👋</h1>
                        <p className="text-gray-400">Tady jsou tvoje kvízy.</p>
                    </div>
                    <div className="flex gap-4">
                        <a href="/otamat/" className="btn btn-secondary">
                            Zpět domů
                        </a>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".xlsx, .xls"
                            className="hidden"
                        />
                        <button onClick={downloadTemplate} className="btn btn-secondary flex items-center gap-2" title="Stáhnout šablonu pro import">
                            <FileSpreadsheet size={20} /> Šablona
                        </button>
                        <button onClick={handleImportClick} disabled={isImporting} className="btn btn-secondary flex items-center gap-2">
                            {isImporting ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
                            Importovat
                        </button>
                        <a href="/otamat/admin/create" className="btn btn-primary flex items-center gap-2">
                            <Plus size={20} /> Vytvořit nový kvíz
                        </a>
                    </div>
                </div>

                {/* Quizzes Grid */}
                {loadingQuizzes ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="animate-spin text-gray-500" size={32} />
                    </div>
                ) : quizzes.length === 0 ? (
                    <div className="glass-card p-12 text-center">
                        <div className="text-6xl mb-4">📝</div>
                        <h2 className="text-2xl font-bold text-white mb-2">Zatím žádné kvízy</h2>
                        <p className="text-gray-400 mb-6">Vytvoř svůj první kvíz a začni se bavit!</p>
                        <a href="/otamat/admin/create" className="btn btn-primary inline-flex items-center gap-2">
                            <Plus size={20} /> Vytvořit první kvíz
                        </a>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {quizzes.map((quiz) => (
                            <div key={quiz.id} className="glass-card p-0 flex flex-col hover:border-primary/50 transition-colors group overflow-hidden">
                                {quiz.coverImage ? (
                                    <div className="w-full h-32 relative">
                                        <img src={quiz.coverImage} alt={quiz.title} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                                    </div>
                                ) : (
                                    <div className="w-full h-24 bg-gradient-to-br from-white/5 to-white/10 flex items-center justify-center">
                                        <span className="text-4xl opacity-20">📝</span>
                                    </div>
                                )}

                                <div className="p-6 flex flex-col flex-1">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-xl font-bold text-white line-clamp-2">{quiz.title}</h3>
                                        {quiz.isPublic && (
                                            <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full border border-green-500/30 shrink-0 ml-2">
                                                Veřejný
                                            </span>
                                        )}
                                    </div>

                                    <p className="text-gray-400 text-sm mb-4 line-clamp-2 flex-1">
                                        {quiz.description || "Bez popisu"}
                                    </p>

                                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/10">
                                        <div className="text-sm text-gray-500">
                                            {quiz._count?.questions || 0} otázek
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleExport(quiz.id)}
                                                className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                                                title="Exportovat do Excelu"
                                            >
                                                <Download size={20} />
                                            </button>
                                            <button
                                                onClick={() => handleStartGame(quiz.id)}
                                                disabled={startingGameId === quiz.id}
                                                className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-50"
                                                title="Spustit"
                                            >
                                                {startingGameId === quiz.id ? <Loader2 className="animate-spin" size={20} /> : <Play size={20} />}
                                            </button>
                                            <button
                                                onClick={() => handleEdit(quiz.id)}
                                                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                                title="Upravit"
                                            >
                                                <Edit size={20} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(quiz.id)}
                                                className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                title="Smazat"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
