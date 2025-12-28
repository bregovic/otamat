"use client";

import Link from "next/link";
import { Tv, Smartphone, ArrowLeft } from "lucide-react";

export default function TimesUpHome() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center overflow-hidden relative w-full">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
            </div>

            <div className="z-10 flex flex-col items-center gap-8 max-w-2xl w-full">
                <div className="space-y-2">
                    <h1 className="text-6xl md:text-8xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 drop-shadow-lg p-2">
                        TimesUp
                    </h1>
                    <p className="text-xl md:text-2xl text-slate-300 font-medium tracking-wide">
                        Pochopíš to, až když ti dojde čas!
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-lg mt-8">
                    <Link href="/timesup/host" className="group" prefetch={false}>
                        <div className="h-full glass-card !p-8 flex flex-col items-center justify-center gap-4 hover:bg-white/5 transition-all cursor-pointer border border-white/5 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/20">
                            <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 group-hover:scale-110 transition-transform shadow-lg shadow-indigo-500/30">
                                <Tv size={32} className="text-white" />
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-2xl font-bold text-white !mb-0">Nová Hra</h2>
                                <p className="text-sm text-slate-400">Založit hru na TV (Host)</p>
                            </div>
                        </div>
                    </Link>

                    <Link href="/timesup/join" className="group" prefetch={false}>
                        <div className="h-full glass-card !p-8 flex flex-col items-center justify-center gap-4 hover:bg-white/5 transition-all cursor-pointer border border-white/5 hover:border-pink-500/50 hover:shadow-lg hover:shadow-pink-500/20">
                            <div className="p-4 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 group-hover:scale-110 transition-transform shadow-lg shadow-rose-500/30">
                                <Smartphone size={32} className="text-white" />
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-2xl font-bold text-white !mb-0">Připojit se</h2>
                                <p className="text-sm text-slate-400">Jsem hráč s mobilem</p>
                            </div>
                        </div>
                    </Link>
                </div>

                <div className="flex gap-4 mt-4">
                    <Link href="/timesup/admin" className="text-slate-400 hover:text-purple-400 font-bold uppercase tracking-wider text-sm transition-colors border-b border-transparent hover:border-purple-400 pb-1">
                        Správa karet (Admin)
                    </Link>
                </div>

                <Link href="/" className="mt-8 text-slate-500 hover:text-white flex items-center gap-2 transition-colors">
                    <ArrowLeft size={16} /> Zpět na OtaMat
                </Link>
            </div>
        </div>
    );
}
