"use client";

import { useState, useEffect } from "react";
import { User, Check, Loader2, AlertCircle } from "lucide-react";
import { io, Socket } from "socket.io-client";

// Production Backend URL
const BACKEND_URL = "https://otamat-production.up.railway.app";

export default function LobbyPage() {
    const [step, setStep] = useState<"nickname" | "avatar" | "waiting">("nickname");
    const [nickname, setNickname] = useState("");
    const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
    const [socket, setSocket] = useState<Socket | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    // Hardcoded PIN for now - in real app this would come from URL or user input
    const GAME_PIN = "123456";

    useEffect(() => {
        // Initialize socket connection
        const newSocket = io(BACKEND_URL);

        newSocket.on("connect", () => {
            console.log("Connected to backend", newSocket.id);
            setIsConnected(true);
            setError(null);
        });

        newSocket.on("connect_error", (err) => {
            console.error("Connection error:", err);
            setError("Nepodařilo se připojit k serveru. Zkus to znovu.");
            setIsConnected(false);
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, []);

    // Mock avatars
    const avatars = [
        "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "cow"
    ];

    const handleNicknameSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (nickname.trim()) setStep("avatar");
    };

    const handleJoinGame = () => {
        if (selectedAvatar && socket && isConnected) {
            setStep("waiting");

            // Emit join event to backend
            socket.emit("joinGame", {
                pin: GAME_PIN,
                nickname: nickname,
                avatar: selectedAvatar
            }, (response: { success: boolean, message: string }) => {
                if (response.success) {
                    console.log("Joined successfully");
                } else {
                    setError("Nepodařilo se připojit do hry: " + response.message);
                    setStep("avatar"); // Go back
                }
            });
        } else if (!isConnected) {
            setError("Nejsi připojen k serveru. Čekám na spojení...");
        }
    };

    return (
        <main>
            {/* Video Background */}
            <video autoPlay loop muted playsInline className="video-background">
                <source src="/otamat/logo.mp4" type="video/mp4" />
            </video>
            <div className="video-overlay" />

            <div style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>OtaMat</h1>
                    <div style={{ background: 'rgba(255,255,255,0.1)', padding: '0.5rem 1.5rem', borderRadius: '999px', display: 'inline-block', fontWeight: 'bold', border: '1px solid rgba(255,255,255,0.1)' }}>
                        PIN: {GAME_PIN}
                    </div>

                    {/* Connection Status Indicator */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem', fontSize: '0.875rem', color: isConnected ? '#10b981' : '#ef4444' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isConnected ? '#10b981' : '#ef4444' }} />
                        {isConnected ? 'Online' : 'Offline'}
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', width: '100%', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                        {error}
                    </div>
                )}

                {/* STEP 1: Nickname */}
                {step === "nickname" && (
                    <div className="glass-card">
                        <h2>Jak ti máme říkat?</h2>
                        <form onSubmit={handleNicknameSubmit}>
                            <div className="input-wrapper">
                                <input
                                    type="text"
                                    value={nickname}
                                    onChange={(e) => setNickname(e.target.value)}
                                    placeholder="Tvoje přezdívka"
                                    autoFocus
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={!nickname.trim()}
                                className="btn btn-primary"
                            >
                                Pokračovat
                            </button>
                        </form>
                    </div>
                )}

                {/* STEP 2: Avatar Selection */}
                {step === "avatar" && (
                    <div className="glass-card">
                        <h2>Vyber si avatara</h2>

                        <div className="avatar-grid">
                            {avatars.map((avatar, index) => (
                                <button
                                    key={index}
                                    onClick={() => setSelectedAvatar(avatar)}
                                    className={`avatar-option ${selectedAvatar === avatar ? 'selected' : ''}`}
                                >
                                    {avatar === "cow" ? "🐮" : avatar}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={handleJoinGame}
                            disabled={!selectedAvatar || !isConnected}
                            className="btn btn-primary"
                            style={{ background: isConnected ? 'var(--success)' : undefined }}
                        >
                            {isConnected ? (
                                <>Připojit se do hry <Check size={20} /></>
                            ) : (
                                <><Loader2 size={20} className="animate-spin" /> Připojování...</>
                            )}
                        </button>
                    </div>
                )}

                {/* STEP 3: Waiting Room */}
                {step === "waiting" && (
                    <div style={{ width: '100%' }}>
                        <div className="glass-card" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>

                            <div style={{
                                width: '120px',
                                height: '120px',
                                background: 'rgba(255,255,255,0.1)',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '4rem',
                                margin: '0 auto 1.5rem auto',
                                border: '4px solid var(--primary)',
                                boxShadow: '0 0 30px rgba(255, 255, 255, 0.2)'
                            }}>
                                {selectedAvatar === "cow" ? "🐮" : selectedAvatar}
                            </div>
                            <h2 style={{ marginBottom: '0.5rem', fontSize: '2.5rem' }}>{nickname}</h2>
                            <div style={{ color: '#10b981', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '1.2rem' }}>
                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }} />
                                Jsi ve hře!
                            </div>
                        </div>

                        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                            <Loader2 size={32} style={{ margin: '0 auto 1rem auto', animation: 'spin 1s linear infinite' }} />
                            <p style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>Čekáme na spuštění hry...</p>
                            <p style={{ fontSize: '0.9rem' }}>Vidíš své jméno na hlavní obrazovce?</p>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
