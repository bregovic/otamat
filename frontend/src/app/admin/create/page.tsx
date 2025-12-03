"use client";

import { useState } from "react";
import Link from "next/link";

export default function CreateQuizPage() {
    const [title, setTitle] = useState("");
    const [questions, setQuestions] = useState([{ text: "", options: ["", "", "", ""], correct: 0 }]);

    const handleAddQuestion = () => {
        setQuestions([...questions, { text: "", options: ["", "", "", ""], correct: 0 }]);
    };

    return (
        <main>
            <div style={{ width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

                {/* Consistent Logo Header */}
                <div style={{
                    width: '100%',
                    maxWidth: '400px',
                    height: '150px',
                    marginBottom: '2rem',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden'
                }}>
                    <video
                        autoPlay
                        loop
                        muted
                        playsInline
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            mixBlendMode: 'screen',
                            filter: 'brightness(1.2) contrast(1.2)'
                        }}
                    >
                        <source src="/otamat/logo.mp4" type="video/mp4" />
                    </video>
                </div>

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
                    <button className="btn btn-primary">
                        Uložit a spustit
                    </button>
                </div>

                <div style={{ textAlign: 'center' }}>
                    <Link href="/" className="link-text" prefetch={false}>← Zpět na hlavní stránku</Link>
                </div>
            </div>
        </main>
    );
}
