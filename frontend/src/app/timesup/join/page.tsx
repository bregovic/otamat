"use client";

import { useTimesUpSocket } from "@/context/TimesUpSocketContext";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Play } from "lucide-react";
import { avatarCategories } from "@/utils/avatars";
import Link from 'next/link';

export default function JoinPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] text-white">Načítání...</div>}>
            <JoinContent />
        </Suspense>
    );
}

function JoinContent() {
    const socket = useTimesUpSocket();
    const router = useRouter();
    const searchParams = useSearchParams();

    // State
    const [code, setCode] = useState(searchParams.get('code') || "");
    const [name, setName] = useState("");
    const [avatar, setAvatar] = useState("cow"); // Default key matches OtaMat/Dixit utils
    const [selectedCategory, setSelectedCategory] = useState<keyof typeof avatarCategories>("Zvířátka");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const joinGame = () => {
        if (!socket) return;
        setLoading(true);
        setError(null);

        socket.emit('timesup:join', { code: code.toUpperCase(), name, avatar }, (response: any) => {
            if (response.success) {
                localStorage.setItem('timesup_playerId', response.playerId);
                router.push(`/timesup/game?code=${response.gameCode}`);
            } else {
                setError(response.error || "Chyba při připojování");
                setLoading(false);
            }
        });
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background Effects matching Dixit */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-500/10 blur-[120px] rounded-full pointer-events-none" />

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { height: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); borderRadius: 4px; }
                .avatar-option { 
                    font-size: 2.5rem; 
                    padding: 0.5rem; 
                    cursor: pointer; 
                    transition: transform 0.2s; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center;
                    border-radius: 12px;
                }
                .avatar-option:hover { transform: scale(1.1); background: rgba(255,255,255,0.1); }
                .avatar-option.selected { background: rgba(255,255,255,0.2); transform: scale(1.1); border: 2px solid rgba(255,255,255,0.5); }
                .avatar-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(60px, 1fr)); gap: 0.5rem; }
            `}</style>

            <div className="w-full max-w-[420px] relative z-10 flex flex-col gap-6">
                {/* Logo Area */}
                <div className="text-center mb-2">
                    <h1 className="text-5xl font-black text-white tracking-tighter">
                        OT<span className="text-purple-500">Λ</span>M<span className="text-purple-500">Λ</span>T
                    </h1>
                    <p className="text-slate-400 font-bold tracking-widest text-sm uppercase opacity-80 mt-[-5px]">QUIZZES</p>
                </div>

                <div className="glass-card bg-slate-900/60 p-6 rounded-[2rem] border border-white/10 shadow-2xl backdrop-blur-xl">
                    {/* PIN Input */}
                    <div className="mb-6">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center block mb-2">PIN Kód hry</label>
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder="000000"
                            className="w-full bg-black/40 text-white text-center text-4xl font-black py-4 rounded-xl border border-white/5 focus:border-purple-500/50 outline-none tracking-[0.2em] placeholder-slate-700 transition-all focus:bg-black/60 shadow-inner uppercase"
                            maxLength={6}
                        />
                    </div>

                    {/* Nickname Input */}
                    <div className="mb-6">
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Tvá přezdívka"
                            className="w-full bg-slate-800 text-white p-4 rounded-xl text-xl font-bold border border-slate-700 focus:border-purple-500 outline-none placeholder-slate-600 text-center"
                        />
                    </div>

                    {/* Avatar Selection */}
                    <div className="mb-6">
                        {/* Category Tabs */}
                        <div className="flex gap-2 overflow-x-auto pb-4 mb-2 custom-scrollbar no-scrollbar">
                            {Object.keys(avatarCategories).map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat as keyof typeof avatarCategories)}
                                    className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors border border-white/10 text-xs font-bold uppercase tracking-wide ${selectedCategory === cat
                                        ? 'bg-white text-black'
                                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        <div className="avatar-grid h-[160px] overflow-y-auto custom-scrollbar p-2 bg-black/20 rounded-xl border border-white/5">
                            {Object.entries(avatarCategories[selectedCategory]).map(([key, emoji]) => (
                                <div key={key} className={`avatar-option ${avatar === key ? 'selected' : ''}`} onClick={() => setAvatar(key)}>
                                    {emoji}
                                </div>
                            ))}
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-500/20 text-red-400 p-3 rounded-lg text-center font-bold text-sm mb-4 border border-red-500/20">
                            {error}
                        </div>
                    )}

                    <button
                        onClick={joinGame}
                        disabled={!code || !name || loading}
                        className="w-full bg-white hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black py-4 rounded-xl text-lg transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 group"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <>VSTOUPIT DO HRY <Play fill="currentColor" size={16} /></>}
                    </button>
                </div>

                {/* Host Link */}
                <div className="text-center mt-2">
                    <p className="text-slate-500 text-sm">
                        Chceš vytvořit vlastní hru? <Link href="/timesup/admin/host" className="text-white font-bold hover:underline">Host</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
