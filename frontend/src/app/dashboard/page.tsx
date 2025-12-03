"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { Plus, Play, Edit, Trash2, Loader2 } from "lucide-react";

// Production Backend URL
const BACKEND_URL = "https://otamat-production.up.railway.app";

export default function DashboardPage() {
    const { user, token, isLoading } = useAuth();
    const router = useRouter();
    const [quizzes, setQuizzes] = useState<any[]>([]);
    const [loadingQuizzes, setLoadingQuizzes] = useState(true);

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
            });
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
        alert("Spouštění uložených kvízů bude dostupné v příští aktualizaci! Zatím použijte 'Rychlá hra'.");
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
                            <div key={quiz.id} className="glass-card p-6 flex flex-col hover:border-primary/50 transition-colors group">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-xl font-bold text-white line-clamp-2">{quiz.title}</h3>
                                    {quiz.isPublic && (
                                        <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full border border-green-500/30">
                                            Veřejný
                                        </span>
                                    )}
                                </div>

                                <p className="text-gray-400 text-sm mb-6 line-clamp-3 flex-1">
                                    {quiz.description || "Bez popisu"}
                                </p>

                                <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/10">
                                    <div className="text-sm text-gray-500">
                                        {quiz._count?.questions || 0} otázek
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleStartGame(quiz.id)}
                                            className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                            title="Spustit"
                                        >
                                            <Play size={20} />
                                        </button>
                                        <button className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Upravit">
                                            <Edit size={20} />
                                        </button>
                                        <button className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Smazat">
                                            <Trash2 size={20} />
                                        </button>
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
