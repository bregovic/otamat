"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Play } from 'lucide-react';

export default function DixitEntryPage() {
    const router = useRouter();
    const [pin, setPin] = useState('');

    const handleJoin = () => {
        if (pin.length === 6) {
            router.push(`/dixit/play?pin=${pin}`);
        }
    };

    const handleCreate = () => {
        router.push(`/dixit/play?create=true`);
    };

    return (
        <main className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-[#09090b] to-black">
            {/* Ambient Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />

            <div className="w-full max-w-[420px] relative z-10 flex flex-col gap-6">

                {/* Logo Area */}
                <div className="text-center mb-4">
                    <h1 className="text-7xl font-black text-white tracking-tighter drop-shadow-2xl font-sans">DIXIT</h1>
                    <p className="text-slate-400 font-medium tracking-widest text-sm uppercase opacity-80">Vstup do světa fantazie</p>
                </div>

                {/* Main Card */}
                <div className="glass-card p-2 bg-slate-900/60 border border-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl">
                    <div className="p-6 md:p-8 flex flex-col gap-6">

                        {/* PIN Input */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center block mb-2">PIN Kód hry</label>
                            <input
                                type="text"
                                placeholder="000000"
                                className="w-full bg-black/40 text-white text-center text-4xl font-black py-4 rounded-xl border border-white/5 focus:border-indigo-500/50 outline-none tracking-[0.3em] placeholder-slate-700 transition-all focus:bg-black/60 shadow-inner"
                                value={pin}
                                maxLength={6}
                                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                            />
                        </div>

                        {/* Join Button - Premium White */}
                        <button
                            onClick={handleJoin}
                            disabled={pin.length !== 6}
                            className="w-full bg-white hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black py-4 rounded-xl text-lg transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 group"
                        >
                            <Play fill="currentColor" size={20} className="group-hover:translate-x-1 transition-transform" /> VSTOUPIT DO HRY
                        </button>
                    </div>
                </div>

                {/* Create Link - Clean */}
                <div className="text-center mt-2">
                    <p className="text-slate-600 text-xs font-bold mb-3 uppercase tracking-wider">Chceš založit novou hru?</p>
                    <button
                        onClick={handleCreate}
                        className="text-slate-300 font-bold hover:text-white transition-colors flex items-center justify-center gap-2 mx-auto uppercase tracking-wide text-sm py-3 px-6 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10"
                    >
                        <Plus size={18} /> Založit hru jako Vypravěč
                    </button>
                </div>

            </div>
        </main>
    );
}
