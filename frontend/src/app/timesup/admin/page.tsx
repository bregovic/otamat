'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Trash2, Plus, Upload, Search, Download } from 'lucide-react';
import Link from 'next/link';

interface Card {
    id: number;
    value: string;
    category: string;
    level: number;
}

export default function TimesUpAdmin() {
    const [cards, setCards] = useState<Card[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // New Card State
    const [newCard, setNewCard] = useState({ value: '', category: 'General', level: 1 });

    // Stats
    const stats = {
        total: cards.length,
        kids: cards.filter(c => c.level === 0).length,
        classic: cards.filter(c => c.level >= 1).length
    };

    const fetchCards = async () => {
        setLoading(true);
        try {
            const res = await fetch('https://hollyhop.cz/otamat/backend/timesup/admin/cards'); // Use full URL if needed or relative depending on proxy
            // Assuming proxy or direct call. Since we are on same domain roughly:
            // But usually development is localhost:3000 and backend localhost:3001
            // In PROD it is usually /otamat/backend... let's try standard fetch

            // NOTE: Adjusting logic to use relative path if we setup proxy, but for now hardcode/env might be needed.
            // Let's assume the frontend knows where backend is. I will use relative '/api' if configured, but here I'll use direct URL logic used in other parts if any.
            // Wait, other parts use Socket.IO.
            // Let's assume standard fetch works if we point to correct port.
            // In dev: navigate to localhost:4000

            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://hollyhop.cz/otamat/backend';

            const data = await (await fetch(`${apiUrl}/timesup/admin/cards`)).json();
            if (Array.isArray(data)) {
                setCards(data);
            }
        } catch (e) {
            console.error(e);
            alert("Chyba při načítání dat");
        }
        setLoading(false);
    }

    useEffect(() => {
        fetchCards();
    }, []);

    const handleDelete = async (id: number) => {
        if (!confirm("Opravdu smazat?")) return;
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://hollyhop.cz/otamat/backend';
        await fetch(`${apiUrl}/timesup/admin/cards/${id}`, { method: 'DELETE' });
        setCards(cards.filter(c => c.id !== id));
    };

    const handleUpdate = async (id: number, field: keyof Card, value: any) => {
        // Optimistic update
        const oldCards = [...cards];
        setCards(cards.map(c => c.id === id ? { ...c, [field]: value } : c));

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://hollyhop.cz/otamat/backend';
        try {
            await fetch(`${apiUrl}/timesup/admin/cards/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [field]: value })
            });
        } catch (e) {
            setCards(oldCards); // Revert
            alert("Chyba ukládání");
        }
    };

    const handleCreate = async () => {
        if (!newCard.value) return;
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://hollyhop.cz/otamat/backend';

        const res = await fetch(`${apiUrl}/timesup/admin/cards`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newCard)
        });

        if (res.ok) {
            const created = await res.json();
            setCards([created, ...cards]);
            setNewCard({ value: '', category: 'General', level: 1 });
        }
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const text = await file.text();
        const lines = text.split('\n');
        // Simple CSV parse: value,category,level
        // Skip header if needed

        const importData = [];
        for (const line of lines) {
            if (!line.trim()) continue;
            // Detect header
            if (line.toLowerCase().includes('value') && line.toLowerCase().includes('level')) continue;

            const parts = line.split(','); // simple split, not respecting quotes
            if (parts.length >= 1) {
                const value = parts[0].trim();
                const category = parts[1]?.trim() || 'Imported';
                const level = parseInt(parts[2]?.trim()) || 1;

                if (value) {
                    importData.push({ value, category, level });
                }
            }
        }

        if (importData.length > 0 && confirm(`Importovat ${importData.length} karet?`)) {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://hollyhop.cz/otamat/backend';
            await fetch(`${apiUrl}/timesup/admin/cards/import`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cards: importData })
            });
            fetchCards();
        }
    };

    const filteredCards = cards.filter(c => c.value.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white p-8">
            <div className="fixed inset-0 bg-[url('/otamat/grid.svg')] opacity-10 pointer-events-none"></div>

            <div className="max-w-6xl mx-auto relative z-10">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Link href="/timesup/host" className="p-3 bg-slate-800 rounded-xl hover:bg-slate-700 transition"><ArrowLeft /></Link>
                        <h1 className="text-3xl font-black">Správa karet</h1>
                    </div>
                    <div className="flex gap-4 text-sm font-bold text-slate-400">
                        <span>Celkem: <span className="text-white">{stats.total}</span></span>
                        <span>Klasika: <span className="text-yellow-400">{stats.classic}</span></span>
                        <span>Děti: <span className="text-green-400">{stats.kids}</span></span>
                    </div>
                </div>

                {/* Actions */}
                <div className="bg-[#15151a] p-6 rounded-2xl border border-[#2a2a35] mb-8 flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 space-y-2 w-full">
                        <label className="text-xs uppercase font-bold text-slate-500">Nová karta</label>
                        <div className="flex gap-2">
                            <input
                                value={newCard.value}
                                onChange={e => setNewCard({ ...newCard, value: e.target.value })}
                                placeholder="Pojem / Obrázek"
                                className="bg-[#0a0a0f] border border-[#2a2a35] rounded-xl px-4 py-2 flex-1"
                            />
                            <select
                                value={newCard.level}
                                onChange={e => setNewCard({ ...newCard, level: parseInt(e.target.value) })}
                                className="bg-[#0a0a0f] border border-[#2a2a35] rounded-xl px-4 py-2 w-32"
                            >
                                <option value={1}>Klasika</option>
                                <option value={0}>Děti (0)</option>
                            </select>
                            <button onClick={handleCreate} className="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-xl font-bold flex items-center gap-2"><Plus size={18} /> Přidat</button>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <label className="cursor-pointer bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-xl font-bold flex items-center gap-2">
                            <Upload size={18} /> Import CSV
                            <input type="file" accept=".csv" className="hidden" onChange={handleImport} />
                        </label>
                    </div>
                </div>

                {/* Search */}
                <div className="relative mb-4">
                    <Search className="absolute left-4 top-3 text-slate-500" size={20} />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Hledat..."
                        className="w-full bg-[#15151a] border border-[#2a2a35] rounded-xl pl-12 pr-4 py-3 text-lg focus:outline-none focus:border-purple-500"
                    />
                </div>

                {/* Grid */}
                <div className="bg-[#15151a] border border-[#2a2a35] rounded-2xl overflow-hidden shadow-2xl">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#1e1e24] text-slate-400 text-sm uppercase">
                                <th className="p-4 border-b border-[#2a2a35]">ID</th>
                                <th className="p-4 border-b border-[#2a2a35]">Hodnota</th>
                                <th className="p-4 border-b border-[#2a2a35] w-32">Level</th>
                                <th className="p-4 border-b border-[#2a2a35] w-24">Akce</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={4} className="p-8 text-center text-slate-500">Načítám...</td></tr>
                            ) : filteredCards.map(card => (
                                <tr key={card.id} className="border-b border-[#2a2a35] hover:bg-white/5 transition-colors group">
                                    <td className="p-4 text-slate-500 font-mono text-xs">{card.id}</td>
                                    <td className="p-4">
                                        <input
                                            className="bg-transparent w-full focus:outline-none focus:text-purple-400 font-bold"
                                            value={card.value}
                                            onChange={e => handleUpdate(card.id, 'value', e.target.value)}
                                        />
                                    </td>
                                    <td className="p-4">
                                        <select
                                            value={card.level}
                                            onChange={e => handleUpdate(card.id, 'level', parseInt(e.target.value))}
                                            className={`bg-transparent p-1 rounded border border-transparent hover:border-slate-700 focus:border-purple-500 focus:bg-[#0a0a0f] outline-none ${card.level === 0 ? 'text-green-400' : 'text-yellow-400'}`}
                                        >
                                            <option value={1}>Klasika</option>
                                            <option value={0}>Děti</option>
                                        </select>
                                    </td>
                                    <td className="p-4">
                                        <button onClick={() => handleDelete(card.id)} className="text-slate-600 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-500/10">
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="p-4 text-center text-slate-500 text-sm">
                        Zobrazeno {filteredCards.length} z {cards.length}
                    </div>
                </div>
            </div>
        </div>
    );
}
