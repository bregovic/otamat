"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { io, Socket } from "socket.io-client";
import { Loader2 } from "lucide-react";

// Production Backend URL
const BACKEND_URL = "https://otamat-production.up.railway.app";

export default function CreateQuizPage() {
    const [title, setTitle] = useState("");
    const [questions, setQuestions] = useState([{ text: "", options: ["", "", "", ""], correct: 0 }]);
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [gamePin, setGamePin] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const newSocket = io(BACKEND_URL);
        setSocket(newSocket);
        return () => {
            newSocket.disconnect();
        };
    }, []);

    const handleAddQuestion = () => {
        setQuestions([...questions, { text: "", options: ["", "", "", ""], correct: 0 }]);
    };

    const handleSaveAndStart = () => {
        if (!socket) {
            setError("Nepodařilo se připojit k serveru.");
            return;
        }
        if (!title.trim()) {
            setError("Vyplňte název kvízu.");
            return;
        }

        setIsSaving(true);
        setError(null);

        socket.emit("createGame", { title, questions }, (response: { success: boolean, pin: string }) => {
            setIsSaving(false);
            if (response.success) {
                setGamePin(response.pin);
            } else {
                setError("Chyba při vytváření hry.");
            }
        });
    };

    if (gamePin) {
        return (
            <main>
                <div style={{ width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>Hra vytvořena!</h1>
                    <p style={{ fontSize: '1.5rem', marginBottom: '2rem', color: '#a1a1aa' }}>Připojte se pomocí PINu:</p>

                    <div style={{
                        fontSize: '6rem',
                        fontWeight: 'bold',
                        color: 'var(--primary)',
                        background: 'rgba(255,255,255,0.1)',
                        padding: '2rem 4rem',
                        borderRadius: '24px',
                        border: '2px solid var(--primary)',
                        marginBottom: '3rem',
                        textShadow: '0 0 30px rgba(255,255,255,0.3)'
                    }}>
                        {gamePin}
                    </div>

                    <div className="glass-card">
                        <h2 style={{ marginBottom: '1rem' }}>Čekání na hráče...</h2>
                        <p>Zatím se nikdo nepřipojil (TODO: Seznam hráčů)</p>
                    </div>

                    <Link href="/" className="btn btn-secondary" style={{ marginTop: '2rem', display: 'inline-flex', width: 'auto' }}>
                        Ukončit hru
                    </Link>
                </div>
            </main>
        );
    }

    return (
        <main>
            <div style={{ width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

                {/* Consistent Logo Header */}
                <div style={{
                    width: '100%',
                    maxWidth: '350px',
                    marginBottom: '2rem',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <Image
                        src="/otamat/logo.png"
                        alt="OtaMat Logo"
                        width={350}
                        height={150}
                        style={{
                            width: '100%',
                            height: 'auto',
                            objectFit: 'contain',
                        }}
                        priority
                    />
                </div>

                {error && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', width: '100%', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                        {error}
                    </div>
                )}

                <div className="glass-card" style={{ maxWidth: '100%', marginBottom: '2rem' }}>
                    <div className="input-wrapper">
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#a1a1aa', fontWeight: '500', textAlign: 'left' }}>Název kvízu</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Např. Hlavní města Evropy"
                            style={{ textAlign: 'left' }}
                        />
                    </div>
                </div>

                {questions.map((q, qIndex) => (
                    <div key={qIndex} className="glass-card" style={{ maxWidth: '100%', marginBottom: '2rem', position: 'relative' }}>
                        <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: 'bold' }}>Otázka {qIndex + 1}</h3>

                        <div className="input-wrapper">
                            <input
                                type="text"
                                placeholder="Zadejte otázku..."
                                value={q.text}
                                onChange={(e) => {
                                    const newQuestions = [...questions];
                                    newQuestions[qIndex].text = e.target.value;
                                    setQuestions(newQuestions);
                                }}
                                style={{ textAlign: 'left', background: 'rgba(255,255,255,0.05)' }}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            {q.options.map((opt, oIndex) => (
                                <div key={oIndex} style={{ position: 'relative' }}>
                                    <input
                                        type="text"
                                        placeholder={`Možnost ${oIndex + 1}`}
                                        value={opt}
                                        onChange={(e) => {
                                            const newQuestions = [...questions];
                                            newQuestions[qIndex].options[oIndex] = e.target.value;
                                            setQuestions(newQuestions);
                                        }}
                                        style={{
                                            textAlign: 'left',
                                            fontSize: '1rem',
                                            padding: '1rem',
                                            borderColor: q.correct === oIndex ? 'var(--success)' : 'var(--border-light)'
                                        }}
                                    />
                                    <div
                                        onClick={() => {
                                            const newQuestions = [...questions];
                                            newQuestions[qIndex].correct = oIndex;
                                            setQuestions(newQuestions);
                                        }}
                                        style={{
                                            position: 'absolute',
                                            right: '10px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            width: '24px',
                                            height: '24px',
                                            borderRadius: '50%',
                                            border: '2px solid ' + (q.correct === oIndex ? 'var(--success)' : '#666'),
                                            background: q.correct === oIndex ? 'var(--success)' : 'transparent',
                                            cursor: 'pointer'
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                <div style={{ display: 'flex', gap: '1rem', marginBottom: '4rem' }}>
                    <button onClick={handleAddQuestion} className="btn btn-secondary">
                        + Přidat otázku
                    </button>
                    <button onClick={handleSaveAndStart} className="btn btn-primary" disabled={isSaving}>
                        {isSaving ? <Loader2 className="animate-spin" /> : "Uložit a spustit"}
                    </button>
                </div>

                <div style={{ textAlign: 'center' }}>
                    <Link href="/" className="link-text" prefetch={false}>← Zpět na hlavní stránku</Link>
                </div>
            </div>
        </main>
    );
}
