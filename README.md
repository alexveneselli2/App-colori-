# Iride

> Ogni giorno, un colore. La tua vita in palette.

Iride è un diario cromatico mobile-first. Ogni giorno scegli un colore che rappresenta il tuo stato d'animo. La scelta è irreversibile. Nel tempo, costruisci una memoria visiva della tua vita.

## Setup in 5 minuti

### 1. Crea il progetto Supabase (gratuito)

1. Vai su [supabase.com](https://supabase.com) e crea un account
2. Crea un nuovo progetto
3. Vai su **SQL Editor** → **New query**, incolla il contenuto di `supabase/schema.sql` ed esegui
4. Vai su **Project Settings → API** e copia:
   - `Project URL`
   - `anon public` key

### 2. Configura le variabili d'ambiente

```bash
cp .env.example .env.local
```

Modifica `.env.local`:
```
VITE_SUPABASE_URL=https://tuo-progetto.supabase.co
VITE_SUPABASE_ANON_KEY=tua-anon-key
```

### 3. Avvia in locale

```bash
npm install
npm run dev
```

Apri [http://localhost:5173/App-colori-/](http://localhost:5173/App-colori-/)

### 4. Deploy su GitHub Pages

1. Vai su **Settings → Secrets and variables → Actions** nel tuo repo
2. Aggiungi due secrets:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Vai su **Settings → Pages** → Source: **GitHub Actions**
4. Il deploy parte automaticamente ad ogni push sul branch

URL pubblico: `https://alexveneselli2.github.io/App-colori-/`

## Stack

- **React 18** + Vite + TypeScript
- **Tailwind CSS** — design system minimale
- **Zustand** — state management
- **Supabase** — auth + PostgreSQL (multi-utente, sessioni persistenti)
- **html-to-image** — export PNG ad alta risoluzione
- **GitHub Pages** — hosting gratuito

## Schermate

| Schermata | Descrizione |
|-----------|-------------|
| **Auth** | Login / registrazione email |
| **Onboarding** | Nome e username al primo accesso |
| **Oggi** | Selezione colore giornaliera (irreversibile) |
| **Memoria** | Viste settimanale, mensile, annuale |
| **Esporta** | Genera PNG 1080×1080 (feed) o 1080×1920 (story) |
