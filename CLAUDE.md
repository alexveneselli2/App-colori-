# CLAUDE.md — Memoria di sessione per Iride
> Ultima sessione: 2026-04-09

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
| Confetti | canvas-confetti ^1.9.3 |

---

## Repository

- **Repo**: `alexveneselli2/App-colori-`
- **Branch principale**: `main` (unico branch attivo)
- **URL GitHub Pages**: `https://alexveneselli2.github.io/App-colori-/`
- **Dev locale**: `http://localhost:5173/App-colori-/`

---

## Struttura file chiave

```
src/
├── App.tsx                    # Routing + auth init + demo mode + showSplash state
│                              # hasSession separato da profile (email confirm flow)
│                              # showSplash: true se !iride_intro_seen in localStorage
├── index.css                  # CSS variables design system + animazioni
├── vite-env.d.ts              # Types per import.meta.env
├── lib/
│   ├── supabase.ts            # Client Supabase (credenziali embedded, safe con RLS)
│   ├── dateUtils.ts           # toISO, getWeekDays, getMonthCells, getYearColumns
│   ├── demo.ts                # Modalità demo (localStorage, no Supabase)
│   └── gracePeriod.ts         # Grace period 5 min post-salvataggio
├── store/
│   ├── useAuthStore.ts        # Profile + signOut, supporta demo mode
│   └── useMoodStore.ts        # Entries CRUD + grace period, supporta demo mode
├── constants/
│   └── moods.ts               # MOOD_PALETTE (28 colori in 3 sezioni)
├── types/
│   └── index.ts               # Tutti i tipi (vedi sezione sotto)
├── components/
│   ├── Layout.tsx             # Shell con nav bottom tab + ambient mood bg
│   ├── Navigation.tsx         # Tab bar: Oggi / Memoria / Analisi / Esporta
│   ├── ExportCanvas.tsx       # Canvas export — solo stili inline
│   ├── ArtGenerator.tsx       # Canvas generativo animato (Fluido/Voronoi/Skyline)
│   └── DeepHistory.tsx        # Timeline orizzontale scroll
└── pages/
    ├── Splash.tsx             # Intro animata 4 slide (prima del login, una sola volta)
    ├── Auth.tsx               # Login/signup + demo + 3 feature bullet cards
    ├── Onboarding.tsx         # 3 step: nome → @username → città+GPS consent
    ├── Today.tsx              # Palette (sezioni collassabili) / Colore / Mix
    │                          # grace period, confetti, note, GPS, tags
    ├── History.tsx            # Sett/Mese/Anno/Diario/Timeline (5 tab)
    ├── Stats.tsx              # Statistiche emotive interattive
    └── Export.tsx             # Accordion con 5 sezioni di opzioni
```

---

## Database Supabase

Schema in `supabase/schema.sql`. Progetto: `hyjpdxojeildthahbxbi` (EU West).
`mailer_autoconfirm: true` → nessuna conferma email richiesta.

### `profiles`
| Campo | Tipo | Note |
|-------|------|------|
| id | UUID | PK, refs auth.users |
| username | TEXT UNIQUE | |
| display_name | TEXT | |
| avatar_url | TEXT | nullable |
| city | TEXT | nullable — città inserita in onboarding |
| location_consent | BOOLEAN | consenso GPS (default false) |
| created_at | TIMESTAMPTZ | |

### `mood_entries`
| Campo | Tipo | Note |
|-------|------|------|
| id | UUID | PK |
| user_id | UUID | FK → profiles |
| date | DATE | |
| color_hex | TEXT | es. `#3A86FF` |
| mood_label | TEXT | nullable (custom colors) |
| note | TEXT | nullable — frase libera (max 280 car.) |
| source | TEXT | `palette` \| `custom` |
| latitude | FLOAT | nullable |
| longitude | FLOAT | nullable |
| location_label | TEXT | nullable — città da reverse geocode Nominatim |
| locked | BOOLEAN | sempre true dopo creazione |
| UNIQUE | (user_id, date) | **regola core: una sola per giorno** |

**Sicurezza**: nessuna policy UPDATE/DELETE → le entry sono immutabili a livello DB.

---

## Palette colori — 28 colori in 3 sezioni (`moods.ts`)

### Emozioni primarie (20)
```
Gioia #FFD000        Euforia #FF6B00
Estasi #FF0A54       Passione #D62839
Tenerezza #FF8FAB    Nostalgia #C77DFF
Meraviglia #7B2FBE   Anticipazione #FB5607
Sorpresa #FFBE0B     Speranza #80ED99
Gratitudine #52B788  Fiducia #2D6A4F
Calma #00B4D8        Serenità #90E0EF
Solitudine #6B7A8D   Malinconia #3A5A8C
Tristezza #415A77    Rabbia #A30015
Paura #1B1B2F        Disgusto #6B6B3A
```

### Mente Attiva (4)
```
Concentrazione #0A7E8C   Curiosità #06D6A0
Ispirazione #FF006E      Coinvolgimento #4361EE
```

### Zone d'Ombra (4)
```
Noia #94A3B8       Imbarazzo #FFADAD
Esaurimento #7C5C45  Sollievo #22D3EE
```

---

## Tipi principali (`types/index.ts`)

```typescript
Profile { id, username, display_name, avatar_url, city, location_consent, created_at }
MoodEntry { id, user_id, date, color_hex, mood_label, note, source,
            latitude, longitude, location_label, created_at, locked }

ViewMode       = 'weekly' | 'monthly' | 'yearly'
ExportStyle    = 'art' | 'labeled'
ExportFormat   = 'feed' | 'story'
ExportFont     = 'sans' | 'serif' | 'mono'
ExportBg       = 'warm' | 'white' | 'dark' | 'mood'
ExportCellShape = 'rounded' | 'square' | 'circle'
ExportCellGlow  = 'none' | 'soft' | 'vivid'
```

---

## Design system (CSS variables in index.css)

```css
--color-surface:        #F2EDE5   /* warm parchment */
--color-surface-raised: #FFFFFF   /* white cards */
--color-foreground:     #1C1917
--color-muted:          #79716B
--color-subtle:         #E8E2D8
--brand-gradient: linear-gradient(110deg, #FFD000 0%, #FF6B00 20%, #FF0A54 38%, #C77DFF 55%, #00B4D8 72%, #52B788 88%)
--nav-h: 74px  --nav-total: calc(var(--nav-h) + var(--sab))
--sat: env(safe-area-inset-top, 0px)
--sab: env(safe-area-inset-bottom, 0px)
```

Classi: `.card`, `.page-top`, `.animate-pop-in`, `.animate-float`,
`.tab-content-enter`, `.swatch-row-1…4`

**Overlap fix**: Layout.tsx ha `paddingBottom: calc(var(--nav-total) + 36px)`.
Le pagine NON usano `minHeight: 100dvh`.

---

## Splash.tsx — Intro animata 4 slide

Mostrata una sola volta (flag `iride_intro_seen` in localStorage).
Non mostrata in demo mode.

| Slide | BG | Contenuto |
|-------|----|-----------|
| 1 | `#05050F` | IRIDE gradient shimmer, orbs flottanti, tagline |
| 2 | `#060610` | Cerchio colore che cicla su 6 emozioni ogni 1.4s, ambient glow |
| 3 | `#F2EDE5` | Calendario 35 celle che si riempie con animazione calCell |
| 4 | `#05050F` | CTA "Inizia ora →" con bottone gradient flottante |

- Tap ovunque → avanza; "SALTA" in alto a destra → skip
- Progress dots in basso (larghezza animata)

---

## Today.tsx — Architettura

```typescript
type Tab = 'palette' | 'custom' | 'mix'
```

**Palette tab**: `PaletteWithSections` — 3 sezioni collassabili con intestazione
(chevron ruota, dot colorato se selezione attiva in quella sezione).
Ogni swatch: 4 colonne, aspect-ratio ~110%, label dentro in basso a sinistra,
checkmark in alto a destra se selezionato.

**Custom tab**: `CustomColorTab` — color picker + campo sentimento con validazione
lessico italiano (150+ parole). Validazione on-blur con suggerimento palette.

**Mix tab**: 2 `MixPicker` affiancati + gradient bar + slider 0–100 + `blendHex()`.

**Grace period** (5 min post-conferma):
- `beginGrace()` → countdown MM:SS → `commitGrace()` auto o manuale
- `cancelGrace()` elimina entry
- `initGrace()` in `fetchTodayEntry` ripristina al riavvio

**Salvataggio**: note (280 car.) + GPS opzionale (se `location_consent`) +
reverse geocode Nominatim → `location_label`.

**Confetti**: canvas-confetti con colore selezionato + lighter + darker.
**Vibrazione**: `navigator.vibrate(15)` su ogni swatch tap.

**Vista "colore salvato"**: rettangolo 4:5 editoriale + ArtGenerator sotto.

---

## History.tsx — 5 tab

`type Mode = ViewMode | 'diary' | 'timeline'`

| Tab | Contenuto |
|-----|-----------|
| Sett. | WeeklyView |
| Mese | MonthlyView |
| Anno | YearlyView |
| Diario | DiaryView — entry raggruppate per mese, note + location |
| Timeline | DeepHistory — scroll orizzontale, auto-scroll a oggi |

---

## ArtGenerator (`components/ArtGenerator.tsx`)

Canvas animato con 3 modalità (props: `mode: 'fluid' | 'voronoi' | 'skyline'`):

| Modalità | Tecnica | BG |
|----------|---------|-----|
| Fluido | Orb Lissajous 60fps | `#F2EDE5` |
| Voronoi | Tassellazione low-res 1/6 + upscale, seed ogni 2s | `#F2EDE5` |
| Skyline | Colonne saturazione HSL + stelle + onda sin 60fps | `#0a0820→#1a1040` |

---

## Export.tsx — Accordion 5 sezioni

Ogni sezione è collassabile, mostra il valore corrente nell'header.
Una sola sezione aperta alla volta (default: "Vista & Formato").

| Sezione | Opzioni |
|---------|---------|
| Vista & Formato | weekly/monthly/yearly · feed/story |
| Stile & Font | art/labeled · sans/serif/mono |
| Celle & Effetti | rounded/square/circle · none/soft/vivid |
| Sfondo | warm/white/dark/mood (con dot colorati) |
| Firma | toggle show/hide @username |

**ExportCanvas props**: `entriesMap, mode, bg, style, format, font, cellShape, cellGlow, username, year, month`

---

## Auth.tsx — Pagina login redesignata

- Demo come CTA principale (pulsante nero in cima)
- 3 feature bullet cards colorate (Un colore al giorno / La tua storia / Condividi)
- Tab: "Crea account" (default) / "Ho già un account"
- Footer: "Gratuito · Nessuna pubblicità · I tuoi dati sono tuoi"

---

## Onboarding.tsx — 3 step animati

1. **Nome**: display name
2. **Username**: @handle
3. **Posizione**: città (testo libero) + toggle GPS consent
   - Toggle → richiede `navigator.geolocation.getCurrentPosition`
   - Salva `city` e `location_consent` in profiles

Progress: 3 dot animati (dot attivo si allarga con gradient).

---

## Modalità demo (localStorage)

- `localStorage.iride_demo = 'true'` → flag
- `localStorage.iride_demo_profile` → profilo JSON
- `localStorage.iride_demo_entries` → array DemoEntry JSON (45 giorni)
- `localStorage.iride_intro_seen` → flag splash già visto

`DemoEntry` ha tutti i campi di `MoodEntry` inclusi note/lat/lon/location_label/tags (nullable).

---

## Grace Period (`lib/gracePeriod.ts`)

- Durata: 5 minuti
- `localStorage.iride_grace_entry` → `GraceEntry { ...SaveOptions, savedAt: number }`
- `beginGrace(userId, hex, label, source, opts)` → salva in localStorage
- `commitGrace()` → persiste su Supabase/demo
- `cancelGrace()` → rimuove da localStorage
- `initGrace(userId)` → chiamato in `fetchTodayEntry`: ripristina o fa commit se scaduto

---

## Setup locale

```bash
npm install
npm run dev   # → http://localhost:5173/App-colori-/
# Le credenziali Supabase sono embedded in src/lib/supabase.ts
# Per demo: clicca "Prova subito" nella schermata Auth
```

---

## Deploy

Push su `main` → GitHub Actions → build → push su `gh-pages`.
Workflow: `.github/workflows/deploy.yml` (trigger: `push: branches: [main]`).

---

## Roadmap futura (non implementato)

- Navigazione settimane/mesi precedenti in History
- Statistiche avanzate (streak, % per colore, variabilità)
- Dark mode UI completa
- Notifiche push quotidiane
- Salvataggio export su Supabase Storage
- Instagram OAuth
- AI validation sentimenti via Supabase Edge Functions (ora: lessico locale)
