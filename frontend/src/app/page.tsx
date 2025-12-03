"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play, User as UserIcon, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Home() {
  const [pin, setPin] = useState("");
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length === 6) {
      router.push(`/play?pin=${pin}`);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 relative">

      {/* Auth Buttons (Top Right) */}
      <div className="absolute top-4 right-4 flex gap-4 z-10 items-center">
        {user ? (
          <div className="flex items-center gap-4 bg-black/20 backdrop-blur-md p-2 rounded-full border border-white/10">
            <div className="flex items-center gap-2 px-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold">
                {user.avatar === 'cow' ? '🐮' : user.avatar?.charAt(0).toUpperCase() || user.nickname.charAt(0).toUpperCase()}
              </div>
              <span className="text-white font-bold">{user.nickname}</span>
            </div>
            <button onClick={logout} className="text-gray-400 hover:text-white p-2 transition-colors" title="Odhlásit se">
              <LogOut size={20} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <a href="/otamat/login" className="text-gray-300 hover:text-white font-semibold py-2 px-4 transition-colors text-sm uppercase tracking-wider">
              Přihlásit
            </a>
            <a href="/otamat/register" className="btn btn-primary py-2 px-6 text-sm !w-auto shadow-lg hover:shadow-primary/20">
              Registrovat
            </a>
          </div>
        )}
      </div>

      <div className="w-full max-w-md flex flex-col items-center z-0">
        {/* Logo */}
        <div className="w-full max-w-[300px] mb-8 relative flex items-center justify-center">
          <img
            src="/otamat/logo.png"
            alt="OtaMat Logo"
            style={{
              width: '100%',
              height: 'auto',
              objectFit: 'contain',
            }}
          />
        </div>

        {/* PIN Input Card */}
        <div className="glass-card w-full p-6 mb-8">
          <form onSubmit={handleJoin} className="flex flex-col gap-4">
            <input
              type="text"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="PIN hry"
              className="text-center text-4xl tracking-widest font-bold py-4 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors w-full"
              maxLength={6}
            />
            <button
              type="submit"
              className="btn btn-primary w-full py-4 text-xl font-bold uppercase tracking-wide"
              disabled={pin.length !== 6}
            >
              Vstoupit do hry
            </button>
          </form>
        </div>

        {/* Admin Link */}
        <div className="text-center">
          <p className="text-gray-400 mb-2">Chceš vytvořit vlastní kvíz?</p>
          <a href={user ? "/otamat/dashboard" : "/otamat/login"} className="text-primary hover:text-primary-hover font-bold flex items-center justify-center gap-2 text-lg transition-colors">
            {user ? "Přejít na Dashboard" : "Přihlásit se jako organizátor"} <Play size={20} />
          </a>

          {!user && (
            <div className="mt-4 text-sm text-gray-600">
              <a href="/otamat/admin/create" className="hover:text-gray-400 transition-colors">Rychlá hra bez registrace</a>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
