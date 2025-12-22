"use client";

import { useTimesUpSocket } from "@/context/TimesUpSocketContext";
import { useState, useEffect } from "react";
import { Play, Plus, Minus } from "lucide-react";

export default function HostPage() {
    const socket = useTimesUpSocket();
    const [teamCount, setTeamCount] = useState(2);
    const [timeLimit, setTimeLimit] = useState(60);
    const [createdGame, setCreatedGame] = useState<any>(null);
    const [players, setPlayers] = useState<any[]>([]);

    useEffect(() => {
        if (!socket) return;

        // Listen for events from TimesUpGateway
        socket.on('timesup:created', (game) => {
            console.log("Game Created:", game);
            setCreatedGame(game);
            setPlayers(game.players || []);
        });

        socket.on('timesup:playerJoined', (player) => {
            console.log("Player Joined:", player);
            setPlayers(prev => [...prev, player]);
        });

        return () => {
            socket.off('timesup:created');
            socket.off('timesup:playerJoined');
        };
    }, [socket]);

    const createGame = () => {
        if (!socket) return;
        socket.emit('timesup:create', { teamCount, timeLimit });
    };

    if (createdGame) {
        return (
            <div className="min-h-screen bg-slate-900 text-white p-8 flex flex-col items-center w-full">
                <h1 className="text-4xl font-bold mb-4">Lobby</h1>
                <div className="bg-slate-800 p-6 rounded-2xl mb-8 flex flex-col items-center gap-2 border border-slate-700 shadow-xl">
                    <p className="text-slate-400 uppercase tracking-widest text-sm">Kód pro připojení</p>
                    <p className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 tracking-wider font-mono">{createdGame.gameCode}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-6xl">
                    {Array.from({ length: teamCount }).map((_, i) => (
                        <div key={i} className="glass-card !p-4 rounded-xl min-h-[200px]">
                            <h3 className="text-xl font-bold mb-4 text-purple-300 border-b border-white/10 pb-2">Tým {i + 1}</h3>
                            <div className="space-y-2">
                                {players.map((p, pIdx) => (
                                    <div key={p.id} className="flex items-center gap-2 bg-white/5 p-2 rounded-lg animate-in fade-in slide-in-from-bottom-2">
                                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-sm font-bold">{p.avatar || '👤'}</div>
                                        <span>{p.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden w-full">
            <div className="absolute inset-0 bg-[url('/otamat/grid.svg')] opacity-20 pointer-events-none"></div>

            <div className="glass-card w-full max-w-lg relative z-10">
                <h1 className="text-3xl font-bold mb-8 text-center text-white">Nastavení hry</h1>

                <div className="space-y-8">
                    <div className="space-y-3">
                        <label className="block text-slate-400 text-sm font-medium uppercase tracking-wide">Počet týmů</label>
                        <div className="flex items-center justify-between bg-black/40 rounded-xl p-2 border border-white/5">
                            <button onClick={() => setTeamCount(Math.max(2, teamCount - 1))} className="p-4 hover:bg-white/10 rounded-lg transition text-slate-300 hover:text-white"><Minus size={24} /></button>
                            <span className="text-4xl font-bold font-mono text-purple-400 w-16 text-center">{teamCount}</span>
                            <button onClick={() => setTeamCount(Math.min(8, teamCount + 1))} className="p-4 hover:bg-white/10 rounded-lg transition text-slate-300 hover:text-white"><Plus size={24} /></button>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="block text-slate-400 text-sm font-medium uppercase tracking-wide">Časový limit</label>
                        <div className="flex items-center justify-between bg-black/40 rounded-xl p-2 border border-white/5">
                            <button onClick={() => setTimeLimit(Math.max(30, timeLimit - 10))} className="p-4 hover:bg-white/10 rounded-lg transition text-slate-300 hover:text-white"><Minus size={24} /></button>
                            <span className="text-4xl font-bold font-mono text-pink-400 w-24 text-center">{timeLimit}s</span>
                            <button onClick={() => setTimeLimit(Math.min(120, timeLimit + 10))} className="p-4 hover:bg-white/10 rounded-lg transition text-slate-300 hover:text-white"><Plus size={24} /></button>
                        </div>
                    </div>

                    <button onClick={createGame} className="w-full btn-primary flex items-center justify-center gap-3 py-4 text-xl mt-4 group">
                        <Play size={28} className="fill-current group-hover:scale-110 transition-transform" />
                        Vytvořit hru
                    </button>
                </div>
            </div>
        </div>
    );
}
