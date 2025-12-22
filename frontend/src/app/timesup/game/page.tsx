"use client";

import { useTimesUpSocket } from "@/context/TimesUpSocketContext";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function GameControllerContent() {
    const searchParams = useSearchParams();
    const code = searchParams.get('code');
    const socket = useTimesUpSocket();
    const [status, setStatus] = useState('WAITING');

    useEffect(() => {
        if (!socket || !code) return;

        const playerId = localStorage.getItem('timesup_playerId');
        if (playerId) {
            socket.emit('timesup:rejoin', { playerId: parseInt(playerId) }, (response: any) => {
                if (response.success) {
                    console.log("Rejoined successfully");
                } else {
                    console.error("Rejoin failed:", response.error);
                }
            });
        }
    }, [socket, code]);

    if (!code) return <div className="text-white text-center p-8">Chybí kód hry!</div>;

    return (
        <div className="min-h-screen bg-slate-950 text-white p-4 flex flex-col items-center justify-center w-full">
            <h1 className="text-xl font-bold mb-8 opacity-40 font-mono tracking-widest border-b border-white/10 pb-2">MÍSTNOST {code}</h1>

            {status === 'WAITING' && (
                <div className="text-center space-y-4">
                    <div className="w-24 h-24 mx-auto bg-slate-800 rounded-full flex items-center justify-center animate-pulse">
                        <span className="text-4xl">⏳</span>
                    </div>
                    <p className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">Čekám na zahájení hry...</p>
                    <p className="text-sm text-slate-400">Sleduj TV obrazovku</p>
                </div>
            )}
        </div>
    )
}

export default function GameController() {
    return (
        <Suspense fallback={<div className="text-white">Načítám...</div>}>
            <GameControllerContent />
        </Suspense>
    );
}
