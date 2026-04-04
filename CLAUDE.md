# CLAUDE.md — Memoria di sessione per Iride
> Ultima sessione: 2026-04-05

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

## Palette colori (20 colori scientifici, da moods.ts)

Basata su Plutchik, Russell's Circumplex, Geneva Emotion Wheel, Jonauskaite et al. 2020.

```
Gioia        #FFD000    Euforia      #FF6B00
Estasi       #FF0A54    Passione     #D62839
Tenerezza    #FF8FAB    Nostalgia    #C77DFF
Meraviglia   #7B2FBE    Anticipazione #FB5607
Sorpresa     #FFBE0B    Speranza     #80ED99
Gratitudine  #52B788    Fiducia      #2D6A4F
Calma        #00B4D8    Serenità     #90E0EF
Solitudine   #6B7A8D    Malinconia   #3A5A8C
Tristezza    #415A77    Rabbia       #A30015
Paura        #1B1B2F    Disgusto     #6B6B3A
```

---

## Design system (CSS variables in index.css)

```css
--color-surface:        #F7F4EF   /* sfondo principale */
--color-surface-raised: #EDEAE3   /* card/input */
--color-foreground:     #181714   /* testo principale */
--color-muted:          #8A8680   /* testo secondario */
--color-subtle:         #DED9D1   /* bordi, divisori */
--nav-h:                74px      /* altezza nav pill */
--nav-total:            calc(74px + var(--sab))
```

Celle vuote nel calendario: `#E8E4DC` (light) / `#1E1D1B` (dark)

**Sfondo dinamico**: Layout.tsx applica un `radial-gradient` dall'ultimo colore di umore registrato, molto trasparente (opacity ~10%). In Today.tsx il gradiente si aggiorna in tempo reale mentre l'utente seleziona un colore.

---

## Mix di emozioni (`blendHex` in Today.tsx)

L'utente può creare un colore ibrido interpolando linearmente due palette:
- Seleziona emozione A e B dalla palette (griglia 10×2)
- Uno slider 0–100% controlla il peso del mix
- `blendHex(hex1, hex2, ratio)` calcola il RGB interpolato
- Il colore risultante è salvato come entry normale (source: 'palette')

---

## Export PNG

Il componente `ExportCanvas.tsx` renderizza con stili inline (obbligatorio per html-to-image).

| Formato | CSS px | Output |
|---------|--------|--------|
| Feed 1:1 | 360×360 | 1080×1080 (pixelRatio 3) |
| Story 9:16 | 360×640 | 1080×1920 (pixelRatio 3) |

Opzioni: sfondo chiaro/scuro × stile Arte (solo colori) / Etichette (con date, mood labels, @username, legenda).

**Layout per formato**:
- Weekly Feed: 2 righe di rettangoli verticali (4+3), giorno + data + mood in labeled mode
- Weekly Story: 7 barre orizzontali piene larghezza, giorno a sx, data a dx
- Monthly Feed: griglia calendario 7×N con celle quadrate + numerazione date
- Monthly Story: stessa griglia ma celle proporzionalmente più grandi (usa tutta l'altezza)
- Yearly Feed: griglia 4×3 di 12 mini-calendari mensili (rimpiazza il contribution graph)
- Yearly Story: griglia 3×4 di 12 mini-calendari con celle più grandi
- Header sempre visibile: IRIDE wordmark (bold) + subtitolo periodo + linea separatrice
- Footer sempre: @username + legenda colori (solo labeled mode)

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

## Auth / Registrazione

**Flusso con conferma email** (Supabase default):
1. Signup → se `data.session` è null → mostra messaggio "controlla email"
2. Utente clicca link email → Supabase redirige su GitHub Pages con token in hash
3. `onAuthStateChange` riceve `SIGNED_IN` con sessione valida ma senza profilo
4. `App.tsx` tiene `hasSession: boolean` separato da `profile`
5. Con `hasSession=true` e `profile=null` → redirect automatico a `/onboarding`
6. Onboarding crea il profilo su Supabase → `fetchProfile` → app avviata

**Senza conferma email** (disabilitata in Supabase):
- `data.session` è non-null dopo signup → redirect diretto a `/onboarding`

---

## Roadmap futura (non implementato)

- Instagram OAuth (struttura dati già pronta, `source` in profiles)
- Notifiche push quotidiane (promemoria rituale)
- Salvataggio export su Supabase Storage
- Dark mode UI completa (la palette export dark esiste già)
- Navigazione settimane/mesi precedenti nella vista Memoria
- Filtro per mood label nella vista storica
- Statistiche emotive (% per colore, streak)
- Sfondo dinamico anche in History ed Export (attualmente solo Today + Layout)
