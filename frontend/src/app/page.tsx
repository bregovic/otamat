"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function Home() {
  const [pin, setPin] = useState("");
  const router = useRouter();

  const handleJoin = () => {
    if (pin.trim().length > 0) {
      router.push(`/play?pin=${pin}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleJoin();
    }
  };

  return (
    <main>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        maxWidth: '480px'
      }}>

        {/* 1. Static PNG Logo */}
        <div style={{
          width: '100%',
          maxWidth: '350px',
          marginBottom: '2rem',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '10px' // Add padding to prevent cropping
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
              maxHeight: '150px' // Ensure it doesn't get too tall
            }}
            priority
          />
        </div>

        {/* 2. Input Box (Card) */}
        <div className="glass-card" style={{ margin: '0 auto', textAlign: 'center' }}>
          <div className="input-wrapper">
            <input
              type="text"
              placeholder="Zadej PIN hry"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={6}
            />
          </div>
          <button onClick={handleJoin} className="btn btn-primary">
            Vstoupit do hry
          </button>
        </div>

        {/* 3. Host Actions */}
        <div className="link-wrapper">
          <Link href="/admin/create" className="link-text" prefetch={false}>
            Chceš vytvořit vlastní kvíz? <span style={{ color: '#fff', fontWeight: 'bold' }}>Klikni zde</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
