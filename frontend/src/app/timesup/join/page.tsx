"use client";

import { useTimesUpSocket } from "@/context/TimesUpSocketContext";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

export default function JoinPage() {
    const socket = useTimesUpSocket();
    const router = useRouter();
    const [code, setCode] = useState("");
    const [name, setName] = useState("");
    const [avatar, setAvatar] = useState("🐶");

    useEffect(() => {
        if (!socket) return;

        // We handle response via callback in socket.emit usually, or generic listeners
        // My previous code used separate listener 'joined'. 
        // But gateway now returns callback object { success: true ... }
        // Wait, did I change gateway to return callback?
        // Yes: return { success: true, playerId: player.id   ... } in handleJoinGame

        // But the previous frontend code listened to 'joined'.
        // Let's update frontend to use callback pattern if possible, or listen to event if my gateway implementation supports it differently.
        // Actually, my OtaMat TimesUpGateway implementation returns object.
        // So I should use the callback in emit.
    }, [socket]);

    const joinGame = () => {
        if (!socket) return;
        socket.emit('timesup:join', { code: code.toUpperCase(), name, avatar }, (response: any) => {
            if (response.success) {
                router.push(`/timesup/game?code=${response.gameCode}`);
            } else {
                alert(response.error || "Chyba při připojování");
            }
        });
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 w-full bg-[#0a0a0f]">
            <div className="w-full max-w-sm flex flex-col items-center gap-8">
                {/* Logo OtaMat - if you have the SVG component or image, use it. For now text/mockup */}
                <div className="text-center">
                    <h1 className="text-5xl font-black text-white tracking-tighter">
                        OT<span className="text-purple-500">Λ</span>M<span className="text-purple-500">Λ</span>T
                    </h1>
                    <p className="text-slate-400 text-lg tracking-widest uppercase font-bold mt-[-5px]">quizzes</p>
                </div>

                <div className="glass-card w-full p-6 space-y-4 !bg-[#15151a] border-[#2a2a35] shadow-2xl">
                    <input
                        type="tel" // numerical keyboard on mobile
                        maxLength={6}
                        className="w-full bg-[#0a0a0f] border-2 border-[#2a2a35] rounded-xl p-4 text-center text-2xl font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500 transition-colors tracking-widest"
                        placeholder="PIN hry"
                        value={code}
                        onChange={e => setCode(e.target.value)}
                    />

                    <input
                        type="text"
                        className="w-full bg-[#0a0a0f] border-2 border-[#2a2a35] rounded-xl p-4 text-center text-xl font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500 transition-colors"
                        placeholder="Přezdívka"
                        value={name}
                        onChange={e => setName(e.target.value)}
                    />

                    <div className="flex justify-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {['🐶', '🐱', '🐭', '🦊', '🐼', '🦁', '🐯', '🐮'].map(av => (
                            <button
                                key={av}
                                onClick={() => setAvatar(av)}
                                className={`text-2xl p-2 rounded-lg transition-transform ${avatar === av ? 'scale-125 bg-white/10' : 'opacity-50 hover:opacity-100'}`}
                            >
                                {av}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={joinGame}
                        disabled={!code || !name}
                        className="w-full bg-slate-200 hover:bg-white text-black font-black text-xl py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors uppercase tracking-wide mt-2"
                    >
                        Vstoupit do hry
                    </button>
                </div>

                <div className="text-slate-500 text-sm font-medium cursor-pointer hover:text-white transition-colors flex items-center gap-1">
                    Chceš vytvořit vlastní hru? <span className="text-white font-bold">Host</span>
                </div>
            </div>
        </div>
    );
}
