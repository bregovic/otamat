'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Trash2, Plus, Upload, Search, Download, ArrowUpDown, CheckSquare, Square, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';

interface Card {
    id: number;
    value: string;
    category: string;
    level: number;
    description?: string;
    imageUrl?: string;
}

export default function TimesUpAdmin() {
    const [cards, setCards] = useState<Card[]>([]);
    const [loading, setLoading] = useState(true);

    // Filtering & Sorting
    const [search, setSearch] = useState('');
    const [filterLevel, setFilterLevel] = useState<string>('all');
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [sortConfig, setSortConfig] = useState<{ key: keyof Card | '', direction: 'asc' | 'desc' }>({ key: 'id', direction: 'desc' });

    // Selection
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    // New Card State
    const [newCard, setNewCard] = useState({ value: '', category: '', level: 1, description: '', imageUrl: '' });

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

    // --- Actions ---

    const handleDelete = async (id: number) => {
        if (!confirm("Opravdu smazat?")) return;
        const apiUrl = getApiUrl();
        await fetch(`${apiUrl}/timesup/admin/cards/${id}`, { method: 'DELETE' });
        setCards(cards.filter(c => c.id !== id));
        setSelectedIds(selectedIds.filter(sid => sid !== id));
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
            setNewCard({ value: '', category: 'General', level: 1, description: '', imageUrl: '' });
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
                let value = parts[0];
                let level = 1;
                let categories: string[] = [];
                let description = '';
                let imageUrl = '';

                let levelIndex = -1;
                for (let i = 1; i < parts.length; i++) {
                    const p = parts[i];
                    if (/^[0-3]$/.test(p)) {
                        level = parseInt(p);
                        levelIndex = i;
                        break;
                    }
                }

                for (let i = 1; i < parts.length; i++) {
                    if (i === levelIndex) continue;
                    const p = parts[i];
                    if (p.startsWith('http')) {
                        imageUrl = p;
                    } else if (p) {
                        categories.push(p);
                    }
                }

                const catString = categories.join(';');

                if (value) {
                    importData.push({ value, category: catString, level, description, imageUrl });
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

    // --- Bulk Actions ---

    const toggleSelection = (id: number) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(sid => sid !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredCards.length && filteredCards.length > 0) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredCards.map(c => c.id));
        }
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Opravdu smazat ${selectedIds.length} položek?`)) return;
        const apiUrl = getApiUrl();
        await fetch(`${apiUrl}/timesup/admin/cards/bulk-delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: selectedIds })
        });
        setCards(cards.filter(c => !selectedIds.includes(c.id)));
        setSelectedIds([]);
    };

    const handleBulkLevel = async (newLevel: number) => {
        if (!confirm(`Nastavit obtížnost ${newLevel} pro ${selectedIds.length} položek?`)) return;
        const apiUrl = getApiUrl();
        await fetch(`${apiUrl}/timesup/admin/cards/bulk-update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: selectedIds, level: newLevel })
        });
        setCards(cards.map(c => selectedIds.includes(c.id) ? { ...c, level: newLevel } : c));
        setCards(cards.map(c => selectedIds.includes(c.id) ? { ...c, level: newLevel } : c));
        setSelectedIds([]);
    };

    const handleBulkCategory = async () => {
        const newCat = prompt("Nová kategorie pro vybrané položky:", "");
        if (newCat === null) return; // Cancelled

        if (!confirm(`Nastavit kategorii '${newCat}' pro ${selectedIds.length} položek?`)) return;

        const apiUrl = getApiUrl();
        await fetch(`${apiUrl}/timesup/admin/cards/bulk-update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: selectedIds, category: newCat })
        });

        setCards(cards.map(c => selectedIds.includes(c.id) ? { ...c, category: newCat } : c));
        setSelectedIds([]);
    };


    // --- Image Import ---

    const readFile = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const handleImageImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;

        // Ask for category once
        const cat = prompt("Zadejte kategorii pro importované obrázky (nebo nechte prázdné pro 'Obrázky'):", "Obrázky");
        const category = cat || "Obrázky";

        setLoading(true);

        try {
            const files = Array.from(e.target.files);
            // Process in batches if too many? For now all at once.
            // Limit to avoiding payload too large error (NextJS limit is 50MB in main.ts, should be fine for ~20-50 images).

            const cardsToImport = await Promise.all(
                files.map(async f => ({
                    value: f.name.replace(/\.[^/.]+$/, ""), // remove extension
                    category: category,
                    level: 1, // Default Level 1
                    imageUrl: await readFile(f)
                }))
            );

            if (confirm(`Importovat ${cardsToImport.length} obrázků jako karty do kategorie '${category}'?`)) {
                const apiUrl = getApiUrl();
                await fetch(`${apiUrl}/timesup/admin/cards/import`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cards: cardsToImport })
                });
                fetchCards();
            }
        } catch (err) {
            console.error(err);
            alert("Upload selhal. Možná jsou soubory příliš velké.");
        }
        setLoading(false);
        // Reset input
        e.target.value = '';
    };

    const requestSort = (key: keyof Card) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const uniqueCategories = Array.from(new Set(cards.flatMap(c => c.category ? c.category.split(';').map(s => s.trim()) : []))).sort();

    const filteredCards = cards.filter(c => {
        const matchesSearch = c.value.toLowerCase().includes(search.toLowerCase()) || c.category.toLowerCase().includes(search.toLowerCase());
        const matchesLevel = filterLevel === 'all' ? true : c.level === parseInt(filterLevel);
        const matchesCategory = filterCategory === 'all' ? true : c.category.includes(filterCategory);
        return matchesSearch && matchesLevel && matchesCategory;
    }).sort((a, b) => {
        if (!sortConfig.key) return 0;
        const valA = a[sortConfig.key] || '';
        const valB = b[sortConfig.key] || '';

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white p-8">
            <div className="fixed inset-0 bg-[url('/otamat/grid.svg')] opacity-10 pointer-events-none"></div>

            <div className="max-w-7xl mx-auto relative z-10 w-full">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Link href="/timesup/host" className="p-3 bg-slate-800 rounded-xl hover:bg-slate-700 transition"><ArrowLeft /></Link>
                        <h1 className="text-3xl font-black">Správa karet</h1>
                    </div>
                    <div className="flex gap-4 text-sm font-bold text-slate-400">
                        <span>L1: <span className="text-yellow-400">{stats.l1}</span></span>
                        <span>L2: <span className="text-orange-400">{stats.l2}</span></span>
                        <span>L3: <span className="text-red-400">{stats.l3}</span></span>
                        <span>Děti: <span className="text-green-400">{stats.kids}</span></span>
                    </div>
                </div>

                {/* Bulk Actions Bar */}
                {selectedIds.length > 0 && (
                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-purple-900 border border-purple-500 rounded-full px-8 py-4 shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-10 fade-in duration-300">
                        <span className="font-bold text-lg">{selectedIds.length} vybráno</span>
                        <div className="h-8 w-px bg-purple-500/50"></div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider opacity-70">Nastavit obtížnost:</span>
                            <button onClick={() => handleBulkLevel(1)} className="w-8 h-8 rounded bg-yellow-400 text-black font-bold hover:scale-110 transition">1</button>
                            <button onClick={() => handleBulkLevel(2)} className="w-8 h-8 rounded bg-orange-400 text-black font-bold hover:scale-110 transition">2</button>
                            <button onClick={() => handleBulkLevel(3)} className="w-8 h-8 rounded bg-red-500 text-white font-bold hover:scale-110 transition">3</button>
                            <button onClick={() => handleBulkLevel(0)} className="w-8 h-8 rounded bg-green-400 text-black font-bold text-xs hover:scale-110 transition">Děti</button>
                        </div>
                        <div className="h-8 w-px bg-purple-500/50"></div>
                        <button onClick={handleBulkCategory} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold hover:scale-105 transition">
                            Změnit kategorii
                        </button>
                        <div className="h-8 w-px bg-purple-500/50"></div>
                        <button onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2">
                            <Trash2 size={18} /> Smazat
                        </button>
                        <button onClick={() => setSelectedIds([])} className="ml-4 text-sm underline opacity-70 hover:opacity-100">Zrušit</button>
                    </div>
                )}

                {/* Create & Filters */}
                <div className="bg-[#15151a] p-6 rounded-2xl border border-[#2a2a35] mb-8 space-y-6">
                    {/* Create Form */}
                    <div className="flex flex-col gap-2 border-b border-[#2a2a35] pb-6">
                        <label className="text-xs uppercase font-bold text-slate-500">Nová karta</label>
                        <div className="flex gap-2">
                            <input value={newCard.value} onChange={e => setNewCard({ ...newCard, value: e.target.value })} placeholder="Pojem" className="bg-[#0a0a0f] border border-[#2a2a35] rounded-xl px-4 py-2 flex-1" />
                            <select value={newCard.level} onChange={e => setNewCard({ ...newCard, level: parseInt(e.target.value) })} className="bg-[#0a0a0f] border border-[#2a2a35] rounded-xl px-4 py-2 w-32">
                                <option value={1}>Lvl 1</option><option value={2}>Lvl 2</option><option value={3}>Lvl 3</option><option value={0}>Děti</option>
                            </select>
                        </div>
                        <div className="flex gap-2">
                            <input value={newCard.category} onChange={e => setNewCard({ ...newCard, category: e.target.value })} placeholder="Kategorie" className="bg-[#0a0a0f] border border-[#2a2a35] rounded-xl px-4 py-2 flex-1" />
                            <input value={newCard.description} onChange={e => setNewCard({ ...newCard, description: e.target.value })} placeholder="Popis" className="bg-[#0a0a0f] border border-[#2a2a35] rounded-xl px-4 py-2 flex-1" />
                            <div className="relative flex-1">
                                <ImageIcon className="absolute left-3 top-2.5 text-slate-500" size={16} />
                                <input value={newCard.imageUrl} onChange={e => setNewCard({ ...newCard, imageUrl: e.target.value })} placeholder="URL Obrázku" className="bg-[#0a0a0f] border border-[#2a2a35] rounded-xl pl-10 pr-4 py-2 w-full" />
                            </div>
                            <button onClick={handleCreate} className="bg-purple-600 hover:bg-purple-500 px-6 py-2 rounded-xl font-bold flex items-center gap-2"><Plus size={18} /> Přidat</button>
                        </div>
                    </div>

                    {/* Filters & Actions */}
                    <div className="flex flex-wrap gap-4 items-center justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-[300px]">
                            <Search className="text-slate-500" size={20} />
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Hledat..." className="bg-transparent border-b border-[#2a2a35] focus:border-purple-500 outline-none px-2 py-1 w-full text-lg" />
                        </div>

                        <div className="flex gap-2">
                            <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)} className="bg-[#0a0a0f] border border-[#2a2a35] rounded-lg px-3 py-2 text-sm">
                                <option value="all">Všechny úrovně</option>
                                <option value="1">Level 1</option>
                                <option value="2">Level 2</option>
                                <option value="3">Level 3</option>
                                <option value="0">Děti</option>
                            </select>
                            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="bg-[#0a0a0f] border border-[#2a2a35] rounded-lg px-3 py-2 text-sm max-w-[150px]">
                                <option value="all">Všechny kategorie</option>
                                {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <label className="cursor-pointer bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg font-bold flex items-center gap-2 text-sm ml-4">
                                <Upload size={16} /> Import CSV
                                <input type="file" accept=".csv" className="hidden" onChange={handleImport} />
                            </label>

                            <label className="cursor-pointer bg-pink-600 hover:bg-pink-500 px-4 py-2 rounded-lg font-bold flex items-center gap-2 text-sm ml-4">
                                <ImageIcon size={16} /> Import Obrázků
                                <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageImport} />
                            </label>
                        </div>
                    </div>
                </div>

                {/* Grid */}
                <div className="bg-[#15151a] border border-[#2a2a35] rounded-2xl overflow-hidden shadow-2xl mb-24">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#1e1e24] text-slate-400 text-sm uppercase">
                                <th className="p-4 border-b border-[#2a2a35] w-12 text-center">
                                    <button onClick={toggleSelectAll} className="hover:text-white">
                                        {selectedIds.length > 0 && selectedIds.length === filteredCards.length ? <CheckSquare size={20} className="text-purple-500" /> : <Square size={20} />}
                                    </button>
                                </th>
                                <th onClick={() => requestSort('id')} className="p-4 border-b border-[#2a2a35] w-16 cursor-pointer hover:text-white group">
                                    <div className="flex items-center gap-1">ID <ArrowUpDown size={14} className={`opacity-0 group-hover:opacity-50 ${sortConfig.key === 'id' ? 'opacity-100 text-purple-500' : ''}`} /></div>
                                </th>
                                <th onClick={() => requestSort('value')} className="p-4 border-b border-[#2a2a35] cursor-pointer hover:text-white group">
                                    <div className="flex items-center gap-1">Hodnota <ArrowUpDown size={14} className={`opacity-0 group-hover:opacity-50 ${sortConfig.key === 'value' ? 'opacity-100 text-purple-500' : ''}`} /></div>
                                </th>
                                <th onClick={() => requestSort('category')} className="p-4 border-b border-[#2a2a35] cursor-pointer hover:text-white group">
                                    <div className="flex items-center gap-1">Kategorie <ArrowUpDown size={14} className={`opacity-0 group-hover:opacity-50 ${sortConfig.key === 'category' ? 'opacity-100 text-purple-500' : ''}`} /></div>
                                </th>
                                <th className="p-4 border-b border-[#2a2a35] w-40">Nápověda / Obrázek</th>
                                <th onClick={() => requestSort('level')} className="p-4 border-b border-[#2a2a35] w-32 cursor-pointer hover:text-white group">
                                    <div className="flex items-center gap-1">Level <ArrowUpDown size={14} className={`opacity-0 group-hover:opacity-50 ${sortConfig.key === 'level' ? 'opacity-100 text-purple-500' : ''}`} /></div>
                                </th>
                                <th className="p-4 border-b border-[#2a2a35] w-16"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} className="p-8 text-center text-slate-500">Načítám...</td></tr>
                            ) : filteredCards.map(card => (
                                <tr key={card.id} className={`border-b border-[#2a2a35] transition-colors group ${selectedIds.includes(card.id) ? 'bg-purple-900/20' : 'hover:bg-white/5'}`}>
                                    <td className="p-4 text-center">
                                        <button onClick={() => toggleSelection(card.id)} className="text-slate-500 hover:text-white">
                                            {selectedIds.includes(card.id) ? <CheckSquare size={20} className="text-purple-500" /> : <Square size={20} />}
                                        </button>
                                    </td>
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
                                            onChange={e => handleUpdate(card.id, 'category', e.target.value)}
                                        />
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col gap-1">
                                            <input
                                                className="bg-transparent w-full focus:outline-none focus:text-green-400 text-sm italic placeholder:text-slate-700"
                                                value={card.description || ''}
                                                placeholder="Popis..."
                                                onChange={e => handleUpdate(card.id, 'description', e.target.value)}
                                            />
                                            <div className="flex items-center gap-2">
                                                <ImageIcon size={12} className={card.imageUrl ? "text-purple-400" : "text-slate-700"} />
                                                <input
                                                    className="bg-transparent w-full focus:outline-none text-xs text-slate-500 focus:text-white placeholder:text-slate-800"
                                                    value={card.imageUrl || ''}
                                                    placeholder="URL obrázku..."
                                                    onChange={e => handleUpdate(card.id, 'imageUrl', e.target.value)}
                                                />
                                            </div>
                                        </div>
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
                                    <td className="p-4 text-right">
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
