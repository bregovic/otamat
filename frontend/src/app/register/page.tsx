"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { BACKEND_URL } from "../../utils/config";

export default function RegisterPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [nickname, setNickname] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            const res = await fetch(`${BACKEND_URL}/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, nickname }),
            });

            const data = await res.json();

            if (res.ok) {
                // Redirect to login after successful registration
                router.push("/login");
            } else {
                setError(data.message || "Registrace se nezdařila.");
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
                <h1 className="text-3xl font-bold mb-6 text-center">Registrace</h1>

                {error && (
                    <div className="bg-red-500/20 text-red-200 p-3 rounded-lg mb-4 text-center border border-red-500/30">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="input-wrapper">
                        <label className="block text-sm font-medium text-gray-400 mb-1">Přezdívka</label>
                        <input
                            type="text"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            required
                            className="w-full"
                            placeholder="Jak ti máme říkat?"
                        />
                    </div>

                    <div className="input-wrapper">
                        <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full"
                            placeholder="vas@email.cz"
                        />
                    </div>

                    <div className="input-wrapper">
                        <label className="block text-sm font-medium text-gray-400 mb-1">Heslo</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="btn btn-primary w-full py-3 text-lg"
                    >
                        {isSubmitting ? <Loader2 className="animate-spin mx-auto" /> : "Vytvořit účet"}
                    </button>
                </form>

                <div className="mt-6 text-center text-gray-400">
                    Již máte účet?{" "}
                    <a href="/otamat/login" className="text-primary hover:underline">
                        Přihlaste se
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
