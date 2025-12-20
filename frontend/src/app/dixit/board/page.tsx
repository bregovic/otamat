"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DixitBoardRedirect() {
    const router = useRouter();

    useEffect(() => {
        // Redirect to the main play page
        router.replace('/dixit/play');
    }, [router]);

    return (
        <div className="h-screen w-full bg-black text-white flex items-center justify-center">
            <div className="text-center animate-pulse">
                <div className="text-4xl mb-4">🎴</div>
                <div className="text-xl">Přesměrovávám na hru...</div>
            </div>
        </div>
    );
}
