"use client";
import React, { useState, useEffect } from 'react';
import { Loader2, Trash2, RotateCw, Upload, X, AlertTriangle, Images } from 'lucide-react';
import { BACKEND_URL } from '@/utils/config';

export default function ImageManager({ onClose }: { onClose: () => void }) {
    const [cards, setCards] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    const fetchCards = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${BACKEND_URL}/dixit/cards`);
            const data = await res.json();
            setCards(data);
        } catch (e) { console.error(e); }
        setLoading(false);
    }

    useEffect(() => { fetchCards(); }, []);

    const handleUpload = async (e: any) => {
        if (!e.target.files.length) return;
        setUploading(true);
        const formData = new FormData();
        Array.from(e.target.files).forEach((f: any) => formData.append('files', f));

        try {
            await fetch(`${BACKEND_URL}/dixit/upload`, { method: 'POST', body: formData });
        } catch (err) { console.error('Upload failed', err); }
        setUploading(false);
        fetchCards();
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Opravdu smazat definivitně tento obrázek?')) return;
        try {
            await fetch(`${BACKEND_URL}/dixit/cards/${id}`, { method: 'DELETE' });
            setCards(prev => prev.filter(c => c.id !== id));
        } catch (err) { console.error('Delete failed', err); }
    }

    const handleRotate = async (id: string) => {
        try {
            await fetch(`${BACKEND_URL}/dixit/cards/${id}/rotate`, { method: 'POST' });
            // Force reload image by updating key or timestamp locally
            setCards(prev => prev.map(c => c.id === id ? { ...c, _ts: Date.now() } : c));
        } catch (err) { console.error('Rotate failed', err); }
    }

    // Check duplicates
    const filenameCounts = cards.reduce((acc: any, c: any) => {
        if (c.fileName) acc[c.fileName] = (acc[c.fileName] || 0) + 1;
        return acc;
    }, {});

    return (
        <div className="fixed inset-0 bg-slate-950 z-[100] flex flex-col p-4 md:p-8 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3"><Images className="text-indigo-400" /> Správa obrázků ({cards.length})</h2>
                <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"><X className="text-white w-8 h-8" /></button>
            </div>

            <div className="flex gap-4 mb-6 flex-wrap">
                <label className={`btn bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl cursor-pointer flex items-center gap-2 font-bold shadow-lg transition-transform active:scale-95 ${uploading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}>
                    {uploading ? <Loader2 className="animate-spin" /> : <Upload />}
                    {uploading ? 'Nahrávání...' : 'Nahrát obrázky'}
                    <input type="file" multiple accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
                </label>

                <div className="bg-slate-800 px-4 py-2 rounded-xl flex items-center gap-2 text-slate-400 text-sm border border-slate-700">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span>Duplicity jsou označeny červeně</span>
                </div>
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center text-white"><Loader2 className="animate-spin w-12 h-12" /></div>
            ) : (
                <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20 custom-scrollbar content-start p-2">
                    {cards.map(c => {
                        const isDup = c.fileName && filenameCounts[c.fileName] > 1;
                        const url = `${BACKEND_URL}/dixit/image/${c.id}?t=${c._ts || ''}`;
                        return (
                            <div key={c.id} className={`relative group rounded-xl bg-slate-800 border-2 w-full shadow-md hover:shadow-xl transition-all ${isDup ? 'border-red-500 ring-4 ring-red-500/30' : 'border-slate-700 hover:border-slate-500'}`}>
                                <div className="relative w-full pb-[150%] overflow-hidden rounded-xl">
                                    <img src={url} className="absolute inset-0 w-full h-full object-cover" loading="lazy" alt={c.fileName} />

                                    {/* Always Visible Controls */}
                                    <div className="absolute top-2 left-2 right-2 flex justify-between z-10">
                                        <button
                                            onClick={() => handleRotate(c.id)}
                                            className="p-3 bg-black/60 hover:bg-blue-600/90 text-white rounded-full backdrop-blur-md transition-all shadow-lg border border-white/10 hover:scale-110"
                                            title="Otočit o 90°"
                                        >
                                            <RotateCw size={24} />
                                        </button>

                                        <button
                                            onClick={() => handleDelete(c.id)}
                                            className="p-3 bg-black/60 hover:bg-red-600/90 text-white rounded-full backdrop-blur-md transition-all shadow-lg border border-white/10 hover:scale-110"
                                            title="Smazat"
                                        >
                                            <Trash2 size={24} />
                                        </button>
                                    </div>

                                    {isDup && <div className="absolute bottom-20 left-0 right-0 text-center pointer-events-none"><span className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg animate-pulse">DUPLICITA</span></div>}

                                    <div className="absolute bottom-0 inset-x-0 bg-black/80 p-3 text-xs text-slate-300 truncate text-center font-mono border-t border-white/5">
                                        {c.fileName || 'Bez názvu'}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    );
}
