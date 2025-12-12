"use client";

import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Loader2 } from "lucide-react";

import { BACKEND_URL } from "../../utils/config";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            const res = await fetch(`${BACKEND_URL}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (res.ok) {
                login(data.access_token, data.user);
            } else {
                setError(data.message || "Přihlášení se nezdařilo.");
            }
        } catch (err) {
            setError("Chyba připojení k serveru.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-4">
            <div className="glass-card w-full max-w-md p-8">
                <h1 className="text-3xl font-bold mb-6 text-center">Přihlášení</h1>

                {error && (
                    <div className="bg-red-500/20 text-red-200 p-3 rounded-lg mb-4 text-center border border-red-500/30">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="input-wrapper">
                        <label className="block text-base font-medium text-gray-300 mb-2">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full p-4 text-lg bg-black/20 border border-white/10 rounded-xl text-white focus:border-primary focus:outline-none transition-colors placeholder-gray-500"
                            placeholder="vas@email.cz"
                        />
                    </div>

                    <div className="input-wrapper">
                        <label className="block text-base font-medium text-gray-300 mb-2">Heslo</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full p-4 text-lg bg-black/20 border border-white/10 rounded-xl text-white focus:border-primary focus:outline-none transition-colors placeholder-gray-500"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="btn btn-primary w-full py-3 text-lg"
                    >
                        {isSubmitting ? <Loader2 className="animate-spin mx-auto" /> : "Přihlásit se"}
                    </button>
                </form>

                <div className="mt-6 text-center text-gray-400">
                    Ještě nemáte účet?{" "}
                    <a href="/otamat/register" className="text-primary hover:underline">
                        Zaregistrujte se
                    </a>
                </div>

                <div className="mt-4 text-center">
                    <a href="/otamat/" className="text-sm text-gray-500 hover:text-white">
                        ← Zpět na hlavní stránku
                    </a>
                </div>
            </div>
        </main>
    );
}
