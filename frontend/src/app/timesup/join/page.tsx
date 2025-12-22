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
        <div className="min-h-screen flex items-center justify-center p-4 w-full">
            <div className="glass-card w-full max-w-sm">
                <h1 className="text-2xl font-bold mb-6 text-center text-white">Připojit se</h1>

                <div className="space-y-6">
                    <div>
                        <label className="block text-slate-400 text-sm mb-2 uppercase tracking-wide font-bold">Kód hry</label>
                        <input
                            type="text"
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-center text-2xl font-mono uppercase tracking-widest text-white focus:outline-none focus:border-purple-500 transition-colors placeholder:text-slate-700"
                            placeholder="ABCD"
                            maxLength={4}
                            value={code}
                            onChange={e => setCode(e.target.value.toUpperCase())}
                        />
                    </div>

                    <div>
                        <label className="block text-slate-400 text-sm mb-2 uppercase tracking-wide font-bold">Přezdívka</label>
                        <input
                            type="text"
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-center text-xl text-white focus:outline-none focus:border-pink-500 transition-colors placeholder:text-slate-700"
                            placeholder="Tvoje jméno"
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-slate-400 text-sm mb-3 text-center uppercase tracking-wide font-bold">Avatar</label>
                        <div className="flex justify-center gap-2 flex-wrap text-2xl">
                            {['🐶', '🐱', '🐭', '🦊', '🐼', '🦁', '🐯', '🐮'].map(av => (
                                <button
                                    key={av}
                                    onClick={() => setAvatar(av)}
                                    className={`p-3 rounded-xl transition-all ${avatar === av ? 'bg-white/10 scale-110 shadow-lg shadow-white/10 ring-1 ring-white/20' : 'hover:bg-white/5 grayscale hover:grayscale-0'}`}
                                >
                                    {av}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button onClick={joinGame} disabled={!code || !name} className="w-full btn-primary flex items-center justify-center gap-2 py-4 mt-2 disabled:opacity-50 disabled:grayscale transition-all">
                        Vstoupit <ArrowRight size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
}
