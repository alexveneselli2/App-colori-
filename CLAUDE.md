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
│                              # hasSession: boolean separato da profile (per email confirm flow)
├── index.css                  # CSS variables design system completo + animazioni
├── vite-env.d.ts              # Types per import.meta.env
├── lib/
│   ├── supabase.ts            # Client Supabase
│   ├── dateUtils.ts           # toISO, getWeekDays, getMonthCells, getYearColumns
│   └── demo.ts                # Modalità demo (localStorage, no Supabase)
├── store/
│   ├── useAuthStore.ts        # Profile + signOut, supporta demo mode
│   └── useMoodStore.ts        # Entries CRUD, supporta demo mode
├── constants/
│   └── moods.ts               # MOOD_PALETTE (20 colori), EMPTY_CELL_LIGHT/DARK
├── types/
│   └── index.ts               # Profile, MoodEntry, ExportRecord, ViewMode,
│                              # ExportTheme, ExportStyle, ExportFormat, ExportFont, ExportBg
├── components/
│   ├── Layout.tsx             # Shell con nav bottom tab + ambient mood bg
│   ├── Navigation.tsx         # Tab bar: Oggi / Memoria / Esporta
│   └── ExportCanvas.tsx       # Canvas export - solo stili inline (obbligatorio html-to-image)
└── pages/
    ├── Auth.tsx               # Login/signup + bottone "Prova il demo"
    │                          # Brand orbs arc, IRIDE wordmark con gradient text
    ├── Onboarding.tsx         # Nome + @username al primo accesso
    │                          # try/catch per "Load Failed" (Safari iOS senza Supabase)
    ├── Today.tsx              # Tre tab: Palette / Colore / Mix — nessuno scroll
    │                          # blendHex(), MixPicker, ConfirmSheet, ProfileSheet
    ├── History.tsx            # Viste settimanale/mensile/annuale
    └── Export.tsx             # Genera PNG, opzioni: Vista/Stile/Font/Sfondo/Formato
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
--color-surface:        #F2EDE5   /* warm parchment — sfondo principale */
--color-surface-raised: #FFFFFF   /* white cards */
--color-foreground:     #1C1917   /* testo principale */
--color-muted:          #79716B   /* testo secondario */
--color-subtle:         #E8E2D8   /* bordi, divisori, toggle bg */
--brand-gradient: linear-gradient(110deg, #FFD000 0%, #FF6B00 20%, #FF0A54 38%, #C77DFF 55%, #00B4D8 72%, #52B788 88%)
--shadow-xs / --shadow-sm / --shadow-md / --shadow-lg  /* scala shadow */
--nav-h:     74px
--nav-total: calc(var(--nav-h) + var(--sab))
--sat: env(safe-area-inset-top,    0px)
--sab: env(safe-area-inset-bottom, 0px)
```

**Classi utility importanti:**
- `.card` → white card con border + shadow-sm
- `.page-top` → padding-top: calc(var(--sat) + 52px)
- `.animate-pop-in` → spring 0.36s cubic-bezier(0.34,1.56,0.64,1)
- `.animate-float` → float 3s infinite
- `.tab-content-enter` → fadeUp 0.22s per switch di tab
- `.swatch-row-1` … `.swatch-row-4` → fadeUp staggered per palette grid

**Overlap fix definitivo**: Il container scroll in Layout.tsx ha `paddingBottom: calc(var(--nav-total) + 36px)`. Le pagine NON usano `minHeight: 100dvh`.

---

## Today.tsx — Architettura tab

```typescript
type Tab = 'palette' | 'custom' | 'mix'
const [tab, setTab] = useState<Tab>('palette')
const [tabKey, setTabKey] = useState(0) // incrementa per re-trigger animazione

const switchTab = (t: Tab) => { setTab(t); setTabKey(k => k + 1) }
```

- **Tab bar** sempre visibile in cima
- **Content** avvolto in `<div key={tabKey} className="tab-content-enter">` per animazione su switch
- **Palette**: griglia 5×4 con classi `swatch-row-N` per stagger animazione
- **Custom**: band colore 120px + input color + "Usa →"
- **Mix**: due `MixPicker` affiancati (4 col grid), gradient bar, slider 0–100
- `blendHex(hex1, hex2, t)` — interpolazione lineare RGB

**Brand orbs** (`ORB_COLORS = ['#FFD000','#FF6B00','#FF0A54','#C77DFF','#00B4D8','#52B788','#2D6A4F']`):
Usati in: Auth.tsx (arco decorativo), Today.tsx "entry saved" view, ProfileSheet.

---

## Export PNG

Il componente `ExportCanvas.tsx` renderizza con **stili inline** (obbligatorio per html-to-image).

| Formato | CSS px | Output |
|---------|--------|--------|
| Feed 1:1 | 360×360 | 1080×1080 (pixelRatio 3) |
| Story 9:16 | 360×640 | 1080×1920 (pixelRatio 3) |

**Props ExportCanvas**: `entriesMap, mode, bg, style, format, font, username, year, month`
- **`bg: ExportBg`** = `'warm' | 'white' | 'dark' | 'mood'`
  - `warm` → #F7F4EF, testi scuri
  - `white` → #FFFFFF, testi scuri
  - `dark` → #0E0D0C, testi chiari
  - `mood` → `linear-gradient` dalle 3 entry più recenti + base #F7F4EF
- **`font: ExportFont`** = `'sans' | 'serif'`
  - `sans` → Inter, system-ui
  - `serif` → Georgia, serif (titolo in corsivo)

**Layout per formato**:
- Weekly Feed: 2 righe di rettangoli verticali (4+3), giorno + data + mood in labeled mode
- Weekly Story: 7 barre orizzontali piene larghezza
- Monthly Feed: griglia calendario 7×N con celle quadrate
- Monthly Story: stessa griglia ma celle proporzionalmente più grandi
- Yearly Feed: griglia 4×3 di 12 mini-calendari mensili
- Yearly Story: griglia 3×4 di 12 mini-calendari con celle più grandi
- Header: IRIDE wordmark + display title ("I colori della mia settimana" ecc.) + linea
- Footer: @username + legenda colori (solo labeled mode)

Condivisione: Web Share API (Chrome Android/iOS Safari). Fallback: download PNG.

---

## Auth / Registrazione

**Flusso con conferma email** (Supabase default):
1. Signup → se `data.session` è null → mostra messaggio "controlla email"
2. Utente clicca link email → Supabase redirige su GitHub Pages con token in hash
3. `onAuthStateChange` riceve `SIGNED_IN` con sessione valida ma senza profilo
4. `App.tsx` tiene `hasSession: boolean` separato da `profile`
5. Con `hasSession=true` e `profile=null` → redirect automatico a `/onboarding`
6. Onboarding crea il profilo su Supabase → `fetchProfile` → app avviata

**Errore "Load Failed" su Safari iOS**: Supabase lancia network error quando URL è placeholder.
Fix: try/catch in Onboarding.tsx che rileva "failed"/"network"/"fetch"/"load" e mostra
messaggio italiano con suggerimento di usare la demo.

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
- Navigazione settimane/mesi precedenti nella vista Memoria
- Filtro per mood label nella vista storica
- Statistiche emotive (% per colore, streak)
- Sfondo dinamico anche in History ed Export (attualmente solo Today + Layout)
- Dark mode UI completa dell'app (la palette export dark esiste già)

---

## Nuove funzionalità (sessione 2026-04-05)

### Grace Period (periodo di modifica)
- Durata: **5 minuti** dalla conferma del colore
- Chiave localStorage: `iride_grace_entry` (struttura `GraceEntry`)
- Flusso: `beginGrace()` → countdown in UI → `commitGrace()` (auto o manuale)
- `cancelGrace()` elimina la voce senza salvarla
- Al riavvio dell'app: `initGrace()` in `fetchTodayEntry` ripristina il grace o fa commit se scaduto
- In demo mode: usa `upsertDemoEntry()` per sovrascrivere la voce del giorno
- In Supabase mode: usa `upsert` con `onConflict: 'user_id,date'`
- **File**: `src/lib/gracePeriod.ts`, `src/store/useMoodStore.ts`

### Tags su MoodEntry
- Campo `tags: string[] | null` in `MoodEntry` (types/index.ts) e `DemoEntry` (demo.ts)
- UI in `ConfirmSheet`: chip-style input, max 5 tag, max 20 caratteri ciascuno
- Aggiungi con Enter o virgola; rimuovi con × sul chip
- I tag vengono passati a `beginGrace()` → `SaveOptions.tags`

### Confetti alla conferma
- Libreria: `canvas-confetti ^1.9.3` (+ `@types/canvas-confetti`)
- Triggered in `handleConfirm` dopo `beginGrace()` con successo
- Colori: hex selezionato + versione più chiara (mix con bianco 45%) + più scura (mix con nero 35%)
- Vibrazione tattile: `navigator.vibrate(15)` al tap su ogni swatch della palette

### ArtGenerator (`src/components/ArtGenerator.tsx`)
Componente canvas con 3 modalità animate:

| Modalità | Tecnica | Animazione |
|----------|---------|-----------|
| **Fluido** | Orb radiali in percorso Lissajous | 60fps rAF |
| **Voronoi** | Tassellazione di Voronoi low-res (1/6) + upscale | seed si spostano ogni 2s |
| **Skyline** | Colonne con altezza = saturazione HSL, cielo stellato | 60fps rAF con onda sinusoidale |

- Sfondo Fluido/Voronoi: `#F2EDE5` (warm parchment)
- Sfondo Skyline: gradiente scuro `#0a0820 → #1a1040`
- Helper locali: `hexToRgb()`, `hexToHsl()`
- Fallback palette: `BRAND_COLORS` se nessuna entry
- Cleanup: `cancelAnimationFrame` / `clearInterval` su unmount
- Mostrato nella vista "colore salvato" e nella vista "grace period" di Today.tsx

### DeepHistory (`src/components/DeepHistory.tsx`)
Timeline orizzontale a scorrimento:
- Ogni giorno = striscia verticale da 44px di larghezza
- Auto-scroll a "oggi" al mount (`scrollIntoView`)
- "Oggi" evidenziato con ring bianco
- Frecce ← → per scroll manuale di 220px
- Etichette data (gg/mm) in basso su ogni striscia
- Hover: leggera scala verticale
- Mostra contatore "N giorni registrati"

### Timeline tab in History.tsx
- Aggiunta 5ª tab `{ key: 'timeline', label: 'Timeline' }` dopo "Diario"
- Renderizza `<DeepHistory entries={entries} />`
- `type Mode = ViewMode | 'diary' | 'timeline'`

### Struttura file aggiornata
```
src/
├── lib/
│   └── gracePeriod.ts         # NUOVO — gestione grace period 5 min
├── components/
│   ├── ArtGenerator.tsx       # NUOVO — canvas generativo (Fluido/Voronoi/Skyline)
│   └── DeepHistory.tsx        # NUOVO — timeline orizzontale scroll
└── pages/
    ├── Today.tsx              # AGGIORNATO — grace, confetti, tags, vibrazione
    └── History.tsx            # AGGIORNATO — tab Timeline aggiunta
```
