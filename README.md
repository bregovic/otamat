# OtaMat

Moderní platforma pro živé soutěžní kvízy (Kahoot-style).

## Technologie

- **Frontend:** Next.js (React), Tailwind CSS, TypeScript
- **Backend:** NestJS, TypeScript, WebSockets (Socket.IO)
- **Databáze:** PostgreSQL (plánováno), Redis (plánováno)

## Struktura projektu

- `/frontend` - Klientská aplikace (hráči, organizátoři)
- `/backend` - Serverová část (API, herní logika)

## Jak spustit projekt

### 1. Instalace závislostí
```bash
cd frontend
npm install
cd ../backend
npm install
```

### 2. Spuštění (vývoj)
Je potřeba spustit frontend i backend v samostatných terminálech.

**Frontend:**
```bash
cd frontend
npm run dev
```
Běží na: http://localhost:3000

**Backend:**
```bash
cd backend
npm run start:dev
```
Běží na: http://localhost:3000 (pozor na konflikt portů!)

> **Poznámka:** NestJS defaultně běží na portu 3000, stejně jako Next.js. Budeme muset změnit port backendu na 3001 nebo 4000.
