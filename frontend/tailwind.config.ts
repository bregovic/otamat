import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "var(--background)",
                foreground: "var(--foreground)",
                primary: "var(--primary)",
                "primary-hover": "var(--primary-hover)",
                secondary: "var(--secondary)",
                accent: "var(--accent)",
                success: "var(--success)",
                warning: "var(--warning)",
                error: "var(--error)",
                "surface-100": "var(--surface-100)",
                "surface-200": "var(--surface-200)",
                "surface-300": "var(--surface-300)",
            },
            animation: {
                float: "float 6s ease-in-out infinite",
            },
            keyframes: {
                float: {
                    "0%, 100%": { transform: "translateY(0)" },
                    "50%": { transform: "translateY(-20px)" },
                },
            },
        },
    },
    plugins: [],
};
export default config;
