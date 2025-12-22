"use client";
import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { BACKEND_URL } from '@/utils/config';

const TimesUpSocketContext = createContext<Socket | null>(null);

export const useTimesUpSocket = () => {
    return useContext(TimesUpSocketContext);
};

export const TimesUpSocketProvider = ({ children }: { children: React.ReactNode }) => {
    const [socket, setSocket] = useState<Socket | null>(null);

    useEffect(() => {
        // Connect to BACKEND_URL/timesup namespace
        const newSocket = io(`${BACKEND_URL}/timesup`, {
            transports: ['websocket', 'polling'],
            reconnectionAttempts: 5,
        });

        newSocket.on('connect', () => {
            console.log('Connected to TimesUp Gateway');
        });

        setSocket(newSocket);

        return () => {
            newSocket.close();
        };
    }, []);

    return (
        <TimesUpSocketContext.Provider value={socket}>
            {children}
        </TimesUpSocketContext.Provider>
    );
};
