"use client";
import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { BACKEND_URL } from '@/utils/config';
import { User, Crown, Play, ArrowRight, Loader2, Users, Monitor, RotateCcw } from 'lucide-react';
import QRCode from "react-qr-code";
import Link from 'next/link';
import DixitGame from './DixitGame';

// --- OTA-MAT AVATARS ---
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

function DixitContent() {
    const searchParams = useSearchParams();

    // State
    const [socket, setSocket] = useState<Socket | null>(null);
    const [nickname, setNickname] = useState('');
    const [avatar, setAvatar] = useState('cow'); // Default match OtaMat
    const [selectedCategory, setSelectedCategory] = useState<keyof typeof avatarCategories>("Zvířátka");

    const [hasIdentity, setHasIdentity] = useState(false);

    const [connected, setConnected] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Game State
    const [playerId, setPlayerId] = useState<string | null>(null);
    const [gameState, setGameState] = useState<any>(null);
    const [pinCode, setPinCode] = useState<string | null>(null);

    // Refs for Event-based confirmation
    const nicknameRef = useRef('');
    const creationPendingRef = useRef(false);

    useEffect(() => { nicknameRef.current = nickname; }, [nickname]);

    // Initial Setup
    useEffect(() => {
        const newSocket = io(`${BACKEND_URL}/dixit`, {
            transports: ['websocket', 'polling'],
            reconnectionAttempts: 5,
        });

        newSocket.on('connect', () => {
            console.log('Connected to Dixit Gateway');
            setConnected(true);
        });

        newSocket.on('disconnect', () => {
            console.log('Disconnected');
            setConnected(false);
        });

        newSocket.on('dixit:update', (game: any) => {
            console.log('Game Update:', game);
            setGameState(game);

            if (creationPendingRef.current) {
                const myName = nicknameRef.current;
                const me = game.players.find((p: any) => p.nickname === myName);
                if (me) {
                    setPlayerId(me.id);
                    setPinCode(game.pinCode);
                    setHasIdentity(true);
                    setLoading(false);
                    creationPendingRef.current = false;

                    const newUrl = `/dixit/play?pin=${game.pinCode}`;
                    if (window.location.pathname + window.location.search !== newUrl) {
                        window.history.replaceState({}, '', newUrl);
                    }
                }
            }
        });

        newSocket.on('dixit:debug_log', (msg: string) => {
            console.log('[SERVER LOG]:', msg);
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, []);

    const handleEnterGame = async () => {
        if (!socket || !nickname) return;
        setLoading(true);
        setError(null);
        creationPendingRef.current = true;

        const createMode = searchParams.get('create') === 'true';
        const targetPin = searchParams?.get('pin');

        // Map avatar key to emoji if needed? 
        // Backend stores string. We send key (e.g. 'cow'). 
        // Backend doesn't care. Frontend displays based on usage. 
        // OtaMat sends KEY. But Dixit Lobby expects Emoji?
        // Wait, in OtaMat `avatar` state stores KEY ('cow').
        // In previous Dixit code I used EMOJI directly.
        // If I use OtaMat logic, I store KEY.
        // Lobby needs to Render `avatarMap[p.avatar] || p.avatar`.
        // I checked Lobby code in previous step: `{avatarMap[player.avatar] || player.avatar}`
        // So it supports BOTH. Good.

        try {
            if (createMode) {
                socket.emit('dixit:create', { guestInfo: { nickname, avatar } }, (response: any) => {
                    if (response.success) {
                        setLoading(false);
                        setPlayerId(response.playerId);
                        setPinCode(response.pinCode);
                        setHasIdentity(true);
                        creationPendingRef.current = false;
                        window.history.replaceState({}, '', `/dixit/play?pin=${response.pinCode}`);
                        if (response.game) setGameState(response.game);
                    } else {
                        if (creationPendingRef.current) {
                            setError(response.error || 'Chyba při zakládání hry');
                            setLoading(false);
                            creationPendingRef.current = false;
                        }
                    }
                });
            } else if (targetPin) {
                socket.emit('dixit:join', { pin: targetPin, nickname, avatar }, (response: any) => {
                    if (response.success) {
                        setLoading(false);
                        setPlayerId(response.playerId);
                        setPinCode(targetPin);
                        setHasIdentity(true);
                        creationPendingRef.current = false;
                        if (response.game) setGameState(response.game);
                    } else {
                        if (creationPendingRef.current) {
                            setError(response.error || 'Chyba při připojování');
                            setLoading(false);
                            creationPendingRef.current = false;
                        }
                    }
                });
            } else {
                setError("Chybí PIN kód.");
                setLoading(false);
                creationPendingRef.current = false;
            }
        } catch (err) {
            console.error(err);
            setTimeout(() => {
                if (creationPendingRef.current) {
                    setLoading(false);
                    setError("Kritická chyba komunikace.");
                    creationPendingRef.current = false;
                }
            }, 3000);
        }
    };

    const handleStartGame = () => {
        if (socket && pinCode) {
            socket.emit('dixit:start', { pin: pinCode });
        }
    };

    // --- RENDERERS ---

    // 1. Loading
    if (!socket) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white"><Loader2 className="animate-spin w-10 h-10" /></div>;

    // 2. Identity Screen (OtaMat Style)
    if (!hasIdentity) {
        const isCreate = searchParams?.get('create') === 'true';
        return (
            <div className="min-h-screen bg-slate-950/90 text-white flex flex-col items-center justify-center p-4 relative bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-[#09090b] to-black">
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

                <div className="glass-card w-full max-w-2xl bg-slate-900/50 p-6 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-md">
                    <h1 className="text-4xl font-bold mb-4 text-center text-white">Tvoje postava</h1>

                    {/* Category Tabs */}
                    <div className="flex gap-2 overflow-x-auto pb-4 mb-2 custom-scrollbar no-scrollbar">
                        {Object.keys(avatarCategories).map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat as keyof typeof avatarCategories)}
                                className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors border border-white/10 ${selectedCategory === cat
                                    ? 'bg-white text-black font-bold'
                                    : 'bg-white/5 text-gray-300 hover:bg-white/10'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    <div className="avatar-grid h-[250px] overflow-y-auto custom-scrollbar p-2 bg-black/20 rounded-xl mb-6 border border-white/5">
                        {Object.entries(avatarCategories[selectedCategory]).map(([key, emoji]) => (
                            <div key={key} className={`avatar-option ${avatar === key ? 'selected' : ''}`} onClick={() => setAvatar(key)}>
                                {emoji}
                            </div>
                        ))}
                    </div>

                    <div className="space-y-4">
                        <input
                            type="text"
                            placeholder="Tvá přezdívka"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            className="w-full bg-slate-800 text-white p-4 rounded-xl text-xl font-bold border border-slate-700 focus:border-indigo-500 outline-none placeholder-slate-600 text-center"
                        />

                        {error && (
                            <p className="text-center text-red-400 font-bold bg-red-900/20 p-2 rounded-lg border border-red-500/20">{error}</p>
                        )}

                        <button
                            onClick={handleEnterGame}
                            disabled={!nickname || loading}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl text-lg transition-all shadow-lg flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : (isCreate ? 'ZALOŽIT HRU' : 'VSTOUPIT DO HRY')}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // 3. Game Running
    if (gameState?.status === 'ACTIVE') {
        return (
            <div className="min-h-screen bg-slate-950 text-white relative bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-[#09090b] to-black">
                {/* Header / Top Bar */}
                <div className="flex justify-between items-center bg-slate-900/50 p-2 md:p-4 border-b border-white/5 backdrop-blur-md sticky top-0 z-40 h-16">
                    <div className="flex items-center gap-2">
                        <div className="text-xl font-black bg-white/10 w-10 h-10 flex items-center justify-center rounded-lg">{gameState.rounds?.length || 1}</div>
                        <span className="text-xs font-bold text-slate-400 uppercase">KOLO</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">TVOJE SKÓRE</span>
                        <span className="font-mono font-black text-2xl text-emerald-400 drop-shadow-lg">{gameState.players.find((p: any) => p.id === playerId)?.score || 0}</span>
                    </div>
                </div>

                <div className="h-[calc(100vh-64px)] overflow-y-auto custom-scrollbar">
                    <DixitGame
                        socket={socket}
                        gameState={gameState}
                        playerId={playerId || ''}
                        pinCode={pinCode || ''}
                    />
                </div>
            </div>
        );
    }

    // 4. LOBBY SCREEN (OtaMat Style)
    // NOTE: This is OtaMat Host Style adapted.
    const isHost = (gameState?.hostId && gameState.hostId === playerId) || (gameState?.players && gameState.players[0]?.id === playerId);
    const playerCount = gameState?.players?.length || 0;
    const canStart = playerCount >= 2;

    return (
        <main className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-[#09090b] to-black">
            <style jsx global>{`
                @keyframes float {
                    0% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                    100% { transform: translateY(0px); }
                }
                .avatar-float {
                    animation: float 3s ease-in-out infinite;
                }
            `}</style>

            <div className="w-full max-w-[95vw] flex flex-col items-center text-center z-10 relative">
                {/* QR Code */}
                <div className="absolute top-0 right-0 hidden md:flex flex-col items-center bg-white p-4 rounded-xl shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-300">
                    <QRCode
                        value={`https://hollyhop.cz/otamat/dixit/play?pin=${pinCode}`}
                        size={128}
                        fgColor="#000000"
                        bgColor="#ffffff"
                    />
                    <span className="text-black font-bold mt-2 text-sm">Naskenuj a hraj!</span>
                </div>

                <h1 className="text-6xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                    Lobby
                </h1>
                <p className="text-2xl text-gray-400 mb-8">Připojte se na <span className="text-white font-bold">hollyhop.cz/otamat/dixit</span> pomocí PINu:</p>

                <div className="text-8xl md:text-9xl font-black text-white bg-white/10 px-12 py-8 rounded-3xl border-4 border-white/20 mb-12 backdrop-blur-lg shadow-[0_0_50px_rgba(255,255,255,0.1)] animate-pulse font-mono tracking-widest">
                    {pinCode}
                </div>

                <div className="glass-card w-full !max-w-[1200px] p-8 min-h-[400px] flex flex-col bg-white/5 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-md">
                    <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-4">
                        <h2 className="text-3xl font-bold flex items-center gap-3 text-white">
                            <Users size={32} /> Hráči ({playerCount})
                        </h2>
                        {playerCount > 0 && (
                            <div className="text-emerald-400 font-bold text-xl animate-pulse">Připraveni ke hře</div>
                        )}
                    </div>

                    {playerCount === 0 ? (
                        <div className="flex-1 flex items-center justify-center text-gray-500 text-3xl">
                            Čekání na hráče...
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8">
                            {gameState?.players?.map((p: any, i: number) => (
                                <div key={p.id} className="flex flex-col items-center gap-4 avatar-float" style={{ animationDelay: `${i * 0.1}s` }}>
                                    <div className="text-6xl bg-white/10 w-24 h-24 rounded-full flex items-center justify-center border-4 border-white/20 shadow-lg relative">
                                        {avatarMap[p.avatar] || p.avatar}
                                        {/* Matches OtaMat rendering */}
                                        {/* Crown logic: host */}
                                        {((gameState?.hostId === p.id) || (!gameState?.hostId && gameState.players[0].id === p.id)) && (
                                            <div className="absolute -top-2 -right-2 bg-amber-500 p-1 rounded-full shadow-lg border-2 border-slate-900">
                                                <Crown size={16} className="text-black" />
                                            </div>
                                        )}
                                        {p.id === playerId && (
                                            <div className="absolute inset-x-0 -bottom-2 text-center">
                                                <span className="bg-emerald-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">TY</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="font-bold text-xl text-white w-full break-words leading-tight drop-shadow-md">{p.nickname}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {isHost && (
                    <div className="flex gap-6 mt-12 flex-col md:flex-row items-center w-full justify-center">
                        <button
                            onClick={handleStartGame}
                            disabled={!canStart}
                            className={`btn btn-primary bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-2xl px-16 py-5 rounded-xl flex items-center justify-center gap-4 transform transition-all shadow-xl w-full md:w-auto
                                ${!canStart ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:scale-105'}
                            `}
                        >
                            <Play size={32} /> Spustit hru
                            {!canStart && <span className="text-sm ml-2">(Min. 2)</span>}
                        </button>
                    </div>
                )}
                {!isHost && (
                    <div className="mt-8 text-gray-400 animate-pulse">
                        Čekáme až zakladatel spustí hru...
                    </div>
                )}
            </div>
        </main>
    );
}

export default function DixitPlayPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-white"><Loader2 className="animate-spin w-10 h-10" /></div>}>
            <DixitContent />
        </Suspense>
    );
}
