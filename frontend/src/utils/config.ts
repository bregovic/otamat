export const BACKEND_URL =
    process.env.NODE_ENV === "development"
        ? "http://localhost:4000"
        : "https://otamat-production.up.railway.app";
