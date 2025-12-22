"use client";
import { TimesUpSocketProvider } from "@/context/TimesUpSocketContext";

export default function TimesUpLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <TimesUpSocketProvider>
            {children}
        </TimesUpSocketProvider>
    );
}
