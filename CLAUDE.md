# CLAUDE.md — Memoria di sessione per Iride
> Ultima sessione: 2026-04-04

---

## Cos'è questo progetto

**Iride** è una mobile web app di mood tracking cromatico.
L'utente sceglie ogni giorno un colore che rappresenta il suo stato d'animo.
La scelta è irreversibile (una sola per giorno, bloccata a DB).
Il cuore del prodotto è la generazione di immagini belle e condivisibili su Instagram.

---

## Stack tecnico

| Layer | Tecnologia |
|-------|-----------|
| Frontend | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS con CSS variables custom |
| State | Zustand (2 store: auth + mood) |
| Backend | Supabase (PostgreSQL + Auth) |
| Export PNG | html-to-image (client-side, 1080px output) |
| Deploy | GitHub Pages via GitHub Actions |
| Routing | React Router v6 con HashRouter (per GitHub Pages) |

---

## Repository

- **Repo**: `alexveneselli2/App-colori-`
- **Branch di sviluppo**: `claude/mood-colors-mvp-3PsnT`
- **URL GitHub Pages** (dopo setup): `https://alexveneselli2.github.io/App-colori-/`
- **Dev locale**: `http://localhost:5173/App-colori-/`

---

## Struttura file chiave

```
src/
├── App.tsx                    # Routing principale + auth init + demo mode check
├── index.css                  # CSS variables design system (surface, foreground, muted...)
├── vite-env.d.ts              # Types per import.meta.env
├── lib/
│   ├── supabase.ts            # Client Supabase
│   ├── dateUtils.ts           # toISO, getWeekDays, getMonthCells, getYearColumns
│   └── demo.ts                # Modalità demo (localStorage, no Supabase)
├── store/
│   ├── useAuthStore.ts        # Profile + signOut, supporta demo mode
│   └── useMoodStore.ts        # Entries CRUD, supporta demo mode
├── constants/
│   └── moods.ts               # MOOD_PALETTE (12 colori), EMPTY_CELL_LIGHT/DARK
├── types/
│   └── index.ts               # Profile, MoodEntry, ExportRecord, ViewMode, ecc.
├── components/
│   ├── Layout.tsx             # Shell con nav bottom tab
│   ├── Navigation.tsx         # Tab bar: Oggi / Memoria / Esporta
│   └── ExportCanvas.tsx       # Canvas export (360×360 feed, 360×640 story)
└── pages/
    ├── Auth.tsx               # Login/signup + bottone "Prova il demo"
    ├── Onboarding.tsx         # Nome + @username al primo accesso
    ├── Today.tsx              # Selezione colore giornaliera con conferma irreversibile
    ├── History.tsx            # Viste settimanale/mensile/annuale
    └── Export.tsx             # Genera PNG 1080×1080 o 1080×1920, share Instagram
```

---

## Database Supabase

Schema in `supabase/schema.sql`. Tabelle:

### `profiles`
| Campo | Tipo | Note |
|-------|------|------|
| id | UUID | PK, refs auth.users |
| username | TEXT UNIQUE | |
| display_name | TEXT | |
| avatar_url | TEXT | nullable |
| created_at | TIMESTAMPTZ | |

### `mood_entries`
| Campo | Tipo | Note |
|-------|------|------|
| id | UUID | PK |
| user_id | UUID | FK → profiles |
| date | DATE | |
| color_hex | TEXT | es. `#3A86FF` |
| mood_label | TEXT | nullable (custom colors) |
| source | TEXT | `palette` \| `custom` |
| locked | BOOLEAN | sempre true dopo creazione |
| UNIQUE | (user_id, date) | **regola core: una sola per giorno** |

**Sicurezza**: nessuna policy UPDATE/DELETE → le entry sono immutabili a livello DB.

### `exports`
Data model pronto ma non ancora usato come storage server-side (le immagini vengono generate client-side).

---

## Modalità demo (localStorage)

Attivata dal bottone "Prova il demo" nella schermata Auth.

- `localStorage.iride_demo = 'true'` → flag
- `localStorage.iride_demo_profile` → profilo JSON
- `localStorage.iride_demo_entries` → array di MoodEntry in JSON

Pre-popola 45 giorni di dati random per mostrare le griglie storiche piene.
Gli store (useAuthStore, useMoodStore) rilevano `isDemoMode()` e bypassano Supabase.
Per uscire dal demo: `exitDemo()` in `src/lib/demo.ts`.

---

## Palette colori di default

```
Sereno      #3A86FF    Felice      #FFD166
Grato       #2A9D8F    Energico    #FF006E
Motivato    #8338EC    Calmo       #06D6A0
Nostalgico  #8D99AE    Ansioso     #F4A261
Triste      #457B9D    Arrabbiato  #D00000
Vuoto       #2B2D42    Confuso     #BDB2FF
```

---

## Design system (CSS variables in index.css)

```css
--color-surface:        #FAFAF8   /* sfondo principale */
--color-surface-raised: #F0EDE8   /* card/input */
--color-foreground:     #1A1A1A   /* testo principale */
--color-muted:          #9A958F   /* testo secondario */
--color-subtle:         #E8E4DF   /* bordi, divisori */
```

Celle vuote nel calendario: `#F0EDE8` (light) / `#1F1F1F` (dark)

---

## Export PNG

Il componente `ExportCanvas.tsx` renderizza con stili inline (obbligatorio per html-to-image).

| Formato | CSS px | Output |
|---------|--------|--------|
| Feed 1:1 | 360×360 | 1080×1080 (pixelRatio 3) |
| Story 9:16 | 360×640 | 1080×1920 (pixelRatio 3) |

Opzioni: sfondo chiaro/scuro × stile Arte (solo colori) / Etichette (con date e @username).

Vista annuale feed → contribution graph stile GitHub (53 col × 7 righe).
Vista annuale story → 12 mesi impilati verticalmente.

Condivisione: Web Share API (funziona su Chrome Android/iOS Safari). Fallback: download PNG.

---

## Setup locale (da fare una volta)

```bash
cp .env.example .env.local
# Inserire credenziali Supabase in .env.local
npm install
npm run dev
# → http://localhost:5173/App-colori-/
```

Per demo senza Supabase: cliccare "Prova il demo" sulla schermata di login.

---

## Setup deploy GitHub Pages (da fare una volta)

1. Creare progetto Supabase gratuito su supabase.com
2. Eseguire `supabase/schema.sql` nel SQL Editor di Supabase
3. Aggiungere GitHub Secrets: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
4. Settings → Pages → Source → GitHub Actions
5. Il workflow `.github/workflows/deploy.yml` parte automaticamente ad ogni push sul branch

---

## Roadmap futura (non implementato)

- Instagram OAuth (struttura dati già pronta, `source` in profiles)
- Notifiche push quotidiane (promemoria rituale)
- Salvataggio export su Supabase Storage
- Dark mode UI completa (la palette export dark esiste già)
- Navigazione settimane/mesi precedenti nella vista Memoria
- Filtro per mood label nella vista storica
- Statistiche emotive (% per colore, streak)
