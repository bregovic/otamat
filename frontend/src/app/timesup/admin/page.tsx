'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Trash2, Plus, Upload, Search, Download } from 'lucide-react';
import Link from 'next/link';

interface Card {
    id: number;
    value: string;
    category: string;
    level: number;
    description?: string;
}

export default function TimesUpAdmin() {
    const [cards, setCards] = useState<Card[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // New Card State
    const [newCard, setNewCard] = useState({ value: '', category: '', level: 1, description: '' });

    // Stats
    const stats = {
        total: cards.length,
        kids: cards.filter(c => c.level === 0).length,
        l1: cards.filter(c => c.level === 1).length,
        l2: cards.filter(c => c.level === 2).length,
        l3: cards.filter(c => c.level === 3).length
    };

    const getApiUrl = () => {
        if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
            return 'http://localhost:4000';
        }
        return 'https://otamat-production.up.railway.app';
    };

    const fetchCards = async () => {
        setLoading(true);
        try {
            const apiUrl = getApiUrl();
            const res = await fetch(`${apiUrl}/timesup/admin/cards`);

            if (!res.ok) throw new Error("Failed to fetch");

            const data = await res.json();
            if (Array.isArray(data)) {
                setCards(data);
            }
        } catch (e) {
            console.error(e);
            alert("Chyba při načítání dat. Zkontrolujte konzoli.");
        }
        setLoading(false);
    }

    useEffect(() => {
        fetchCards();
    }, []);

    const handleDelete = async (id: number) => {
        if (!confirm("Opravdu smazat?")) return;
        const apiUrl = getApiUrl();
        await fetch(`${apiUrl}/timesup/admin/cards/${id}`, { method: 'DELETE' });
        setCards(cards.filter(c => c.id !== id));
    };

    const handleUpdate = async (id: number, field: keyof Card, value: any) => {
        // Optimistic update
        const oldCards = [...cards];
        setCards(cards.map(c => c.id === id ? { ...c, [field]: value } : c));

        const apiUrl = getApiUrl();
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
        const apiUrl = getApiUrl();

        const res = await fetch(`${apiUrl}/timesup/admin/cards`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newCard)
        });

        if (res.ok) {
            const created = await res.json();
            setCards([created, ...cards]);
            setNewCard({ value: '', category: 'General', level: 1, description: '' });
        }
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const text = await file.text();
        const lines = text.split('\n');

        const importData = [];
        for (const line of lines) {
            if (!line.trim()) continue;
            // Headers skip
            if (line.toLowerCase().includes('value') && line.toLowerCase().includes('level')) continue;

            // Try comma or semicolon
            const delimiter = line.includes(';') ? ';' : ',';
            const parts = line.split(delimiter).map(p => p.trim().replace(/^"|"$/g, '')); // basic quote removal

            if (parts.length >= 2) {
                // Determine structure: Value usually first. Level usually numeric 0-3. Rest are categories/desc.
                let value = parts[0];
                let level = 1;
                let categories: string[] = [];
                let description = '';

                let levelIndex = -1;
                for (let i = 1; i < parts.length; i++) {
                    const p = parts[i];
                    if (/^[0-3]$/.test(p)) {
                        level = parseInt(p);
                        levelIndex = i;
                        break;
                    }
                }

                // Collect categories (everything except value and level)
                for (let i = 1; i < parts.length; i++) {
                    if (i === levelIndex) continue;
                    if (parts[i]) categories.push(parts[i]);
                }

                const catString = categories.join(';');

                if (value) {
                    importData.push({ value, category: catString, level, description });
                }
            }
        }

        if (importData.length > 0 && confirm(`Importovat ${importData.length} karet?`)) {
            const apiUrl = getApiUrl();
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
                        <span>L1: <span className="text-yellow-400">{stats.l1}</span></span>
                        <span>L2: <span className="text-orange-400">{stats.l2}</span></span>
                        <span>L3: <span className="text-red-400">{stats.l3}</span></span>
                        <span>Děti: <span className="text-green-400">{stats.kids}</span></span>
                    </div>
                </div>

                {/* Actions */}
                <div className="bg-[#15151a] p-6 rounded-2xl border border-[#2a2a35] mb-8 flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 space-y-2 w-full">
                        <label className="text-xs uppercase font-bold text-slate-500">Nová karta</label>
                        <div className="flex flex-col gap-2">
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
                                    <option value={1}>Obtížnost 1</option>
                                    <option value={2}>Obtížnost 2</option>
                                    <option value={3}>Obtížnost 3</option>
                                    <option value={0}>Děti (0)</option>
                                </select>
                            </div>
                            <div className="flex gap-2">
                                <input
                                    value={newCard.category}
                                    onChange={e => setNewCard({ ...newCard, category: e.target.value })}
                                    placeholder="Kategorie (středníkem)"
                                    className="bg-[#0a0a0f] border border-[#2a2a35] rounded-xl px-4 py-2 flex-1"
                                />
                                <input
                                    value={newCard.description}
                                    onChange={e => setNewCard({ ...newCard, description: e.target.value })}
                                    placeholder="Nápověda"
                                    className="bg-[#0a0a0f] border border-[#2a2a35] rounded-xl px-4 py-2 flex-1"
                                />
                                <button onClick={handleCreate} className="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-xl font-bold flex items-center gap-2 w-32 justify-center"><Plus size={18} /> Přidat</button>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2 h-full items-end pb-1">
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
                                <th className="p-4 border-b border-[#2a2a35] w-16">ID</th>
                                <th className="p-4 border-b border-[#2a2a35]">Hodnota</th>
                                <th className="p-4 border-b border-[#2a2a35]">Kategorie</th>
                                <th className="p-4 border-b border-[#2a2a35] w-48">Nápověda</th>
                                <th className="p-4 border-b border-[#2a2a35] w-32">Level</th>
                                <th className="p-4 border-b border-[#2a2a35] w-24">Akce</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} className="p-8 text-center text-slate-500">Načítám...</td></tr>
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
                                        <input
                                            className="bg-transparent w-full focus:outline-none focus:text-blue-400 text-sm"
                                            value={card.category}
                                            placeholder="Kategorie..."
                                            onChange={e => handleUpdate(card.id, 'category', e.target.value)}
                                        />
                                    </td>
                                    <td className="p-4">
                                        <input
                                            className="bg-transparent w-full focus:outline-none focus:text-green-400 text-sm italic"
                                            value={card.description || ''}
                                            placeholder="Nápověda..."
                                            onChange={e => handleUpdate(card.id, 'description', e.target.value)}
                                        />
                                    </td>
                                    <td className="p-4">
                                        <select
                                            value={card.level}
                                            onChange={e => handleUpdate(card.id, 'level', parseInt(e.target.value))}
                                            className={`bg-transparent p-1 rounded border border-transparent hover:border-slate-700 focus:border-purple-500 focus:bg-[#0a0a0f] outline-none ${card.level === 0 ? 'text-green-400' : 'text-yellow-400'}`}
                                        >
                                            <option value={1}>1</option>
                                            <option value={2}>2</option>
                                            <option value={3}>3</option>
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
