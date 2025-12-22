"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function DixitHome() {
    const router = useRouter();
    const [pin, setPin] = useState('');

    const handleJoin = () => {
        if (pin.length === 6) {
            router.push(`/dixit/play?pin=${pin}`);
        }
    };

    return (
        <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900 via-purple-900 to-black text-white relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/30 rounded-full blur-[100px] animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/30 rounded-full blur-[100px] animate-pulse delay-1000"></div>

                {/* Stars */}
                <div className="absolute top-10 left-10 text-yellow-200/40 text-4xl animate-bounce duration-[3000ms]">✨</div>
                <div className="absolute bottom-20 right-20 text-yellow-200/30 text-2xl animate-bounce duration-[4000ms]">⭐</div>
                <div className="absolute top-1/2 right-10 text-yellow-200/20 text-xl animate-bounce duration-[5000ms]">✨</div>
            </div>

            <div className="glass-card max-w-md w-full text-center p-8 relative z-10 transition-all hover:scale-[1.01] border border-white/10 shadow-[0_0_50px_rgba(139,92,246,0.3)] backdrop-blur-xl bg-black/40 rounded-3xl">
                <div className="mb-2 text-yellow-400 text-3xl animate-spin-slow inline-block">🎭</div>
                <h1 className="text-7xl font-black mb-2 drop-shadow-[0_0_15px_rgba(253,224,71,0.5)] font-serif tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-200">
                    DIXIT
                </h1>
                <p className="text-white/60 mb-8 font-serif italic tracking-wide">Svět plný fantazie</p>

                <div className="space-y-6">
                    <div className="relative group">
                        <label className="block text-xs uppercase font-bold tracking-[0.2em] mb-3 text-indigo-200 group-focus-within:text-yellow-400 transition-colors">Zadej PIN hry</label>
                        <input
                            type="text"
                            placeholder="000000"
                            maxLength={6}
                            className="w-full text-center text-5xl p-6 rounded-2xl bg-black/30 border-2 border-white/10 text-white font-mono font-bold tracking-[0.5em] focus:outline-none focus:border-yellow-500/50 focus:bg-black/50 focus:shadow-[0_0_30px_rgba(234,179,8,0.2)] transition-all placeholder-white/10"
                            value={pin}
                            onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        />
                    </div>

                    <button
                        onClick={handleJoin}
                        disabled={pin.length !== 6}
                        className="w-full bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 text-black font-black text-2xl py-5 rounded-2xl shadow-lg hover:shadow-yellow-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale disabled:pointer-events-none relative overflow-hidden group"
                    >
                        <span className="relative z-10 flex items-center justify-center gap-2">
                            VSTOUPIT DO HRY <span className="text-xl group-hover:translate-x-1 transition-transform">➜</span>
                        </span>
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    </button>

                    <div className="border-t border-white/10 pt-8 mt-8">
                        <p className="text-sm text-indigo-200/60 mb-4 font-medium">Chceš založit novou hru?</p>
                        <Link href="/dixit/play" className="block w-full bg-white/5 hover:bg-white/10 text-indigo-100 font-bold py-4 rounded-xl border border-white/10 hover:border-white/30 transition-all flex items-center justify-center gap-2 group">
                            <span>✨</span> Vytvořit novou hru
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    );
}
