"use client";

import { useTimesUpSocket } from "@/context/TimesUpSocketContext";
import { useState, useEffect } from "react";
import { Play, Plus, Minus, Settings } from "lucide-react";
import QRCode from "react-qr-code";

export default function HostPage() {
    const socket = useTimesUpSocket();
    const [step, setStep] = useState<'SETUP' | 'LOBBY' | 'GAME'>('SETUP');

    // Setup Form State
    const [hostName, setHostName] = useState('');
    const [hostAvatar, setHostAvatar] = useState('🐶');
    const [gameMode, setGameMode] = useState<'LOBBY' | 'SINGLE_DEVICE'>('LOBBY');
    const [manualPlayersText, setManualPlayersText] = useState('');

    // Game Settings
    const [teamCount, setTeamCount] = useState(2);
    const [timeLimit, setTimeLimit] = useState(60);

    // Live Game State
    const [createdGame, setCreatedGame] = useState<any>(null);
    const [players, setPlayers] = useState<any[]>([]);

    useEffect(() => {
        if (!socket) return;

        // Check for existing session
        const storedHostId = localStorage.getItem('timesup_hostId');
        if (storedHostId) {
            console.log("Restoring session for host:", storedHostId);
            socket.emit('timesup:getHostGame', { hostId: storedHostId });
        }

        // Listen for events from TimesUpGateway
        socket.on('timesup:created', (game) => {
            console.log("Game Created:", game);
            localStorage.setItem('timesup_hostId', game.hostId);
            setCreatedGame(game);
            setPlayers(game.players || []);
            setStep('LOBBY');
        });

        socket.on('timesup:gameData', (game) => {
            console.log("Game Restored:", game);
            setCreatedGame(game);
            setPlayers(game.players || []);
            if (game.status === 'PLAYING' || game.status === 'ROUND_1') {
                setStep('GAME');
            } else {
                setStep('LOBBY');
            }
        });

        socket.on('timesup:gameStarted', (game) => {
            console.log("Game Started:", game);
            setCreatedGame(game);
            setPlayers(game.players || []);
            setStep('GAME');
        });

        socket.on('timesup:playerJoined', (player) => {
            console.log("Player Joined:", player);
            setPlayers(prev => [...prev, player]);
        });

        return () => {
            socket.off('timesup:created');
            socket.off('timesup:gameData');
            socket.off('timesup:gameStarted');
            socket.off('timesup:playerJoined');
        };
    }, [socket]);

    const createGame = () => {
        if (!socket) return;
        if (!hostName) return alert("Zadej jméno organizátora!");

        const manualPlayers = gameMode === 'SINGLE_DEVICE'
            ? manualPlayersText.split('\n').map(s => s.trim()).filter(s => s.length > 0)
            : [];

        if (gameMode === 'SINGLE_DEVICE' && manualPlayers.length < 3) return alert("Zadej alespoň 3 další hráče!");

        socket.emit('timesup:create', {
            hostName,
            hostAvatar,
            mode: gameMode,
            players: manualPlayers,
            teamCount: gameMode === 'SINGLE_DEVICE' ? Math.ceil((manualPlayers.length + 1) / 2) : teamCount, // Auto-calc teams for single device based on count? Or explicit
            timeLimit
        });
    };

    const startGame = () => {
        if (!socket || !createdGame) return;
        socket.emit('timesup:startGame', { gameCode: createdGame.gameCode });
    }

    // === RENDER: GAME BOARD (GAME) ===
    if (step === 'GAME' && createdGame) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] text-white p-8 flex flex-col items-center w-full relative overflow-hidden">
                {/* Grid Background */}
                <div className="absolute inset-0 bg-[url('/otamat/grid.svg')] opacity-10 pointer-events-none"></div>

                <div className="text-center z-10 mt-12 mb-8 space-y-2">
                    <h2 className="text-purple-500 font-bold tracking-widest uppercase">KOLO {createdGame.round || 1}</h2>
                    <h1 className="text-6xl font-black text-white tracking-tighter">
                        {createdGame.round === 1 && "POPIS SLOVY"}
                        {createdGame.round === 2 && "JEDNO SLOVO"}
                        {createdGame.round === 3 && "PANTOMIMA"}
                    </h1>
                </div>

                {/* Scoreboard */}
                <div className="flex gap-8 z-10 w-full max-w-4xl justify-center mb-12">
                    {createdGame.teams?.map((team: any, idx: number) => (
                        <div key={team.id} className={`glass-card p-6 flex-1 rounded-2xl border-t-4 transition-all ${createdGame.currentTeamId === team.id ? 'border-yellow-400 bg-white/10 scale-105 shadow-yellow-500/20 shadow-2xl' : 'border-slate-700 opacity-70'}`}>
                            <div className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Tým {idx + 1}</div>
                            <div className="text-2xl font-bold truncate mb-2">{team.name}</div>
                            <div className="text-5xl font-black font-mono">{team.score || 0}</div>
                        </div>
                    ))}
                </div>

                {/* Active Player Info */}
                <div className="z-10 bg-[#1e1e24] p-12 rounded-3xl border border-[#2a2a35] shadow-2xl flex flex-col items-center gap-6">
                    {createdGame.currentTeamId ? (
                        <>
                            <p className="text-2xl text-slate-300">Na řadě je:</p>
                            <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                                {/* Find current team name, player logic to be added */}
                                {createdGame.teams.find((t: any) => t.id === createdGame.currentTeamId)?.name}
                            </h2>
                        </>
                    ) : (
                        <h2 className="text-4xl font-bold">Připravte se!</h2>
                    )}
                </div>
            </div>
        )
    }

    // === RENDER: LOBBY (LOBBY) ===
    if (step === 'LOBBY' && createdGame) {
        const joinUrl = `https://hollyhop.cz/otamat/timesup/join?code=${createdGame.gameCode}`;

        return (
            <div className="min-h-screen bg-[#0a0a0f] text-white p-8 flex flex-col items-center justify-between w-full relative overflow-hidden">
                {/* Grid Background */}
                <div className="absolute inset-0 bg-[url('/otamat/grid.svg')] opacity-10 pointer-events-none"></div>

                {/* Header section with PIN */}
                <div className="flex flex-col items-center gap-2 mt-10 z-10 w-full relative">
                    <h1 className="text-4xl font-black mb-2 tracking-tighter">Lobby</h1>
                    <p className="text-slate-400 text-lg">Připojte se na <span className="font-bold text-white">hollyhop.cz</span> pomocí PINu:</p>

                    <div className="bg-[#1e1e24] border-2 border-[#2a2a35] rounded-3xl px-12 py-4 shadow-2xl mt-2">
                        <span className="text-8xl font-black text-white tracking-widest tabular-nums leading-none">
                            {createdGame.gameCode}
                        </span>
                    </div>

                    {/* QR Code */}
                    <div className="absolute right-0 top-0 hidden xl:flex flex-col items-center gap-2 bg-white p-3 rounded-xl shadow-xl transform rotate-3 hover:rotate-0 transition-transform duration-300">
                        <QRCode value={joinUrl} size={150} />
                        <p className="text-black font-bold text-sm uppercase tracking-wider">Naskenuj a hraj!</p>
                    </div>
                </div>

                {/* Player list section */}
                <div className="w-full max-w-4xl flex-1 mt-12 mb-8 z-10">
                    <div className="bg-[#15151a] border border-[#2a2a35] rounded-3xl p-8 h-full min-h-[400px] flex flex-col shadow-2xl">
                        <div className="flex items-center gap-4 border-b border-[#2a2a35] pb-6 mb-6">
                            <div className="flex items-center gap-2 text-2xl font-bold text-white">
                                <span className="text-purple-500">👥</span>
                                Hráči ({players.length})
                            </div>
                        </div>

                        {players.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-4">
                                <div className="animate-pulse text-6xl">⏳</div>
                                <p className="text-2xl font-medium">Čekání na hráče...</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto pr-2">
                                {players.map((p) => (
                                    <div key={p.id} className="bg-[#1e1e24] p-4 rounded-xl flex items-center gap-3 border border-[#2a2a35] animate-in zoom-in duration-300">
                                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-xl shadow-lg">
                                            {p.avatar || '👤'}
                                        </div>
                                        <span className="font-bold text-lg truncate flex items-center gap-2">
                                            {p.name}
                                            {p.isHost && <span className="text-xs bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-full border border-yellow-500/50">HOST</span>}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center gap-6 z-10 mb-8">
                    <button onClick={startGame} className="bg-white hover:bg-slate-200 text-black px-12 py-5 rounded-2xl font-black text-xl flex items-center gap-3 shadow-lg shadow-white/10 hover:scale-105 transition-all active:scale-95 group">
                        <Play size={24} className="fill-black group-hover:scale-110 transition-transform" />
                        SPUSTIT HRU
                    </button>
                </div>
            </div>
        )
    }

    // === RENDER: SETUP WIZARD (SETUP) ===
    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden w-full bg-[#0a0a0f]">
            <div className="absolute inset-0 bg-[url('/otamat/grid.svg')] opacity-10 pointer-events-none"></div>

            <div className="glass-card w-full max-w-4xl relative z-10 bg-[#15151a] border-[#2a2a35] p-8 shadow-2xl rounded-3xl flex flex-col md:flex-row gap-8">

                {/* Left Column: Identity & Mode */}
                <div className="flex-1 space-y-8 border-r border-[#2a2a35] pr-8">
                    <h1 className="text-3xl font-black text-white tracking-tight">Vytvořit hru</h1>

                    {/* 1. Host Identity */}
                    <div className="space-y-4">
                        <label className="text-slate-400 text-xs font-bold uppercase tracking-widest">Organizátor</label>
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <input
                                    type="text"
                                    placeholder="Tvoje jméno"
                                    className="w-full bg-[#0a0a0f] border border-[#2a2a35] rounded-xl p-4 text-white font-bold focus:border-purple-500 focus:outline-none transition-colors"
                                    value={hostName}
                                    onChange={e => setHostName(e.target.value)}
                                />
                            </div>
                            <button className="w-14 h-14 bg-[#0a0a0f] border border-[#2a2a35] rounded-xl text-2xl flex items-center justify-center hover:bg-[#1e1e24] transition-colors">
                                {hostAvatar}
                            </button>
                        </div>
                    </div>

                    {/* 2. Game Mode */}
                    <div className="space-y-4">
                        <label className="text-slate-400 text-xs font-bold uppercase tracking-widest">Režim hry</label>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setGameMode('LOBBY')}
                                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${gameMode === 'LOBBY' ? 'border-purple-500 bg-purple-500/10 text-white' : 'border-[#2a2a35] bg-[#0a0a0f] text-slate-500 hover:border-slate-600'}`}
                            >
                                <span className="text-2xl">📱</span>
                                <span className="font-bold text-sm">Lobby</span>
                            </button>
                            <button
                                onClick={() => setGameMode('SINGLE_DEVICE')}
                                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${gameMode === 'SINGLE_DEVICE' ? 'border-purple-500 bg-purple-500/10 text-white' : 'border-[#2a2a35] bg-[#0a0a0f] text-slate-500 hover:border-slate-600'}`}
                            >
                                <span className="text-2xl">📺</span>
                                <span className="font-bold text-sm">Jedno zařízení</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Column: Dynamic Settings */}
                <div className="flex-1 space-y-8 flex flex-col">

                    {gameMode === 'LOBBY' ? (
                        <>
                            <div className="space-y-3">
                                <label className="text-slate-400 text-xs font-bold uppercase tracking-widest">Počet týmů</label>
                                <div className="flex items-center justify-between bg-[#0a0a0f] rounded-xl p-2 border border-[#2a2a35]">
                                    <button onClick={() => setTeamCount(Math.max(2, teamCount - 1))} className="w-12 h-12 hover:bg-[#2a2a35] rounded-lg transition text-slate-300 hover:text-white flex items-center justify-center"><Minus size={20} /></button>
                                    <span className="text-3xl font-black text-purple-500 tabular-nums">{teamCount}</span>
                                    <button onClick={() => setTeamCount(Math.min(8, teamCount + 1))} className="w-12 h-12 hover:bg-[#2a2a35] rounded-lg transition text-slate-300 hover:text-white flex items-center justify-center"><Plus size={20} /></button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="space-y-3 flex-1 flex flex-col">
                                <label className="text-slate-400 text-xs font-bold uppercase tracking-widest">Hráči (každý na nový řádek)</label>
                                <textarea
                                    className="w-full flex-1 bg-[#0a0a0f] border border-[#2a2a35] rounded-xl p-4 text-white font-medium focus:border-purple-500 focus:outline-none transition-colors resize-none placeholder:text-slate-700"
                                    placeholder={`Jirka\nKarel\nAlena...`}
                                    value={manualPlayersText}
                                    onChange={e => setManualPlayersText(e.target.value)}
                                />
                            </div>
                        </>
                    )}

                    <div className="space-y-3">
                        <label className="text-slate-400 text-xs font-bold uppercase tracking-widest">Časový limit</label>
                        <div className="flex items-center justify-between bg-[#0a0a0f] rounded-xl p-2 border border-[#2a2a35]">
                            <button onClick={() => setTimeLimit(Math.max(30, timeLimit - 10))} className="w-12 h-12 hover:bg-[#2a2a35] rounded-lg transition text-slate-300 hover:text-white flex items-center justify-center"><Minus size={20} /></button>
                            <div className="text-center">
                                <span className="text-3xl font-black text-pink-500 tabular-nums">{timeLimit}</span>
                                <span className="text-xs font-bold text-slate-500 ml-1">s</span>
                            </div>
                            <button onClick={() => setTimeLimit(Math.min(120, timeLimit + 10))} className="w-12 h-12 hover:bg-[#2a2a35] rounded-lg transition text-slate-300 hover:text-white flex items-center justify-center"><Plus size={20} /></button>
                        </div>
                    </div>

                    <div className="pt-4 mt-auto">
                        <button onClick={createGame} className="w-full bg-white hover:bg-slate-200 text-black font-black text-lg py-4 rounded-xl flex items-center justify-center gap-3 group shadow-xl hover:scale-[1.02] transition-all">
                            <Play size={24} className="fill-black group-hover:scale-110 transition-transform" />
                            Vytvořit hru
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
