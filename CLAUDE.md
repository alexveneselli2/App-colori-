# CLAUDE.md — Memoria di sessione per Iride
> Ultima sessione: 2026-04-05 (aggiornato sessione 2)

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
| Native App | Capacitor v8 (Android + iOS wrapper) |

---

## Repository

- **Repo**: `alexveneselli2/App-colori-`
- **Branch sorgente storico**: `claude/mood-colors-mvp-3PsnT`
- **Branch di sviluppo attivo**: `claude/color-mood-generative-art-ZjOnF` ← usare questo
- **URL GitHub Pages**: `https://alexveneselli2.github.io/App-colori-/`
- **Dev locale**: `http://localhost:5173/App-colori-/` (con `npm run dev`)

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
│   ├── demo.ts                # Modalità demo (localStorage, no Supabase)
│   │                          # upsertDemoEntry() per grace period edit
│   └── gracePeriod.ts         # Grace period 5 min (localStorage iride_grace_entry)
├── store/
│   ├── useAuthStore.ts        # Profile + signOut, supporta demo mode
│   └── useMoodStore.ts        # Entries CRUD + grace period actions
│                              # beginGrace / commitGrace / cancelGrace / initGrace
├── constants/
│   └── moods.ts               # MOOD_PALETTE (20 colori), EMPTY_CELL_LIGHT/DARK
├── types/
│   └── index.ts               # Profile, MoodEntry (con tags), ExportRecord, ViewMode,
│                              # ExportTheme, ExportStyle, ExportFormat, ExportFont, ExportBg
├── components/
│   ├── Layout.tsx             # Shell con nav bottom tab + ambient mood bg
│   ├── Navigation.tsx         # Tab bar: Oggi / Memoria / Analisi / Esporta
│   ├── ExportCanvas.tsx       # Canvas export - solo stili inline (obbligatorio html-to-image)
│   ├── ArtGenerator.tsx       # Canvas generativo: Fluido / Voronoi / Skyline
│   └── DeepHistory.tsx        # Timeline orizzontale a scroll infinito
└── pages/
    ├── Auth.tsx               # Login/signup + bottone "Prova il demo"
    ├── Onboarding.tsx         # Nome + @username al primo accesso
    ├── Today.tsx              # Palette/Colore/Mix + grace period + confetti + ArtGenerator
    ├── History.tsx            # Sett./Mese/Anno/Diario/Timeline (5 tab)
    ├── Stats.tsx              # Analytics: streak, insights AI, grafici
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
| city | TEXT | nullable |
| location_consent | BOOLEAN | per GPS capture |
| created_at | TIMESTAMPTZ | |

### `mood_entries`
| Campo | Tipo | Note |
|-------|------|------|
| id | UUID | PK |
| user_id | UUID | FK → profiles |
| date | DATE | |
| color_hex | TEXT | es. `#3A86FF` |
| mood_label | TEXT | nullable (custom colors) |
| note | TEXT | nullable, max 280 char |
| tags | TEXT[] | nullable, array di tag |
| source | TEXT | `palette` \| `custom` |
| latitude / longitude | FLOAT | nullable |
| location_label | TEXT | nullable (città via Nominatim) |
| locked | BOOLEAN | sempre true dopo creazione |
| UNIQUE | (user_id, date) | **regola core: una sola per giorno** |

**Sicurezza**: nessuna policy UPDATE/DELETE → le entry sono immutabili a livello DB.
**Nota**: `tags` e `location_*` sono nel codice TS ma potrebbero non essere ancora nel DDL SQL.
Per aggiungerli al DB Supabase: `ALTER TABLE mood_entries ADD COLUMN IF NOT EXISTS tags text[];`

### `exports`
Data model pronto ma non ancora usato come storage server-side.

---

## Modalità demo (localStorage)

Attivata dal bottone "Prova il demo" nella schermata Auth.

- `localStorage.iride_demo = 'true'` → flag
- `localStorage.iride_demo_profile` → profilo JSON
- `localStorage.iride_demo_entries` → array di MoodEntry in JSON

Pre-popola 45 giorni di dati random. Gli store rilevano `isDemoMode()` e bypassano Supabase.
`upsertDemoEntry()` in demo.ts permette di sovrascrivere la voce del giorno (usato dal grace period).

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
--shadow-xs / --shadow-sm / --shadow-md / --shadow-lg
--nav-h: 74px
--nav-total: calc(var(--nav-h) + var(--sab))
--sat: env(safe-area-inset-top, 0px)
--sab: env(safe-area-inset-bottom, 0px)
```

**Classi utility:**
- `.card` → white card con border + shadow-sm
- `.page-top` → padding-top: calc(var(--sat) + 52px)
- `.brand-text` → gradient text con brand-gradient
- `.animate-pop-in` → spring 0.36s cubic-bezier(0.34,1.56,0.64,1)
- `.animate-float` → float 3s infinite
- `.tab-content-enter` → fadeUp 0.22s per switch di tab
- `.swatch-row-1` … `.swatch-row-4` → fadeUp staggered per palette grid

**Overlap fix**: `paddingBottom: calc(var(--nav-total) + 36px)` nel container scroll di Layout.tsx.

---

## Today.tsx — Architettura tab

```typescript
type Tab = 'palette' | 'custom' | 'mix'
const [tab, setTab] = useState<Tab>('palette')
const [tabKey, setTabKey] = useState(0)
const switchTab = (t: Tab) => { setTab(t); setTabKey(k => k + 1) }
```

- **Palette**: griglia 4×5, `swatch-row-N` stagger, vibrazione su tap
- **Custom**: band colore + input hex + sentiment validation
- **Mix**: due MixPicker + gradient bar + slider → `blendHex()`
- **ConfirmSheet**: note (280 char) + tags chip input (max 5, Enter/virgola)
- **handleConfirm**: chiama `beginGrace()` (non `saveTodayEntry`), poi confetti burst

**Vista "colore custodito"** (quando entry esiste o è in grace):
- Hero card con colore, hex, label, note
- Grace period countdown (MM:SS) + bottoni "Annulla" / "Conferma ora"
- `<ArtGenerator entries={entries} />` sotto l'hero

---

## Grace Period — flusso completo

1. Utente conferma colore → `handleConfirm` → `beginGrace(userId, hex, label, source, opts)`
2. `beginGrace()` salva in `localStorage.iride_grace_entry` con `confirmedAt: Date.now()`
3. Imposta `store.pendingGrace` (Zustand), schedula timer 5 min → `commitGrace()`
4. UI mostra countdown MM:SS + pulsante "Annulla" (cancella grace) / "Conferma ora" (commit immediato)
5. `commitGrace()`: INSERT su Supabase (o `upsertDemoEntry` in demo), pulisce grace, setta `todayEntry`
6. Se app riaperta durante grace: `initGrace()` (chiamato in `fetchTodayEntry`) ripristina il timer
7. Se app riaperta dopo scadenza: `initGrace()` fa `commitGrace()` automaticamente

**File chiave**: `src/lib/gracePeriod.ts` + `src/store/useMoodStore.ts`

---

## ArtGenerator — 3 modalità

File: `src/components/ArtGenerator.tsx`

| Modalità | Tecnica | FPS |
|----------|---------|-----|
| **Fluido** | N orb radiali su percorsi Lissajous, canvas overlay | 60fps rAF |
| **Voronoi** | Nearest-neighbor 1/6 res → upscale, seed drift ogni 2s | ~0.5fps |
| **Skyline** | Colonne altezza=saturazione HSL, stelle, riflesso | 60fps rAF |

- Sfondo Fluido/Voronoi: `#F2EDE5`; Skyline: `#0a0820 → #1a1040`
- Helper: `hexToRgb(hex)`, `hexToHsl(hex)`
- Fallback colors se entries vuote: `BRAND_COLORS`
- Cleanup: `cancelAnimationFrame` + `clearInterval` su unmount
- Dimensione canvas: `canvas.width = canvas.offsetWidth * devicePixelRatio`

---

## DeepHistory — timeline orizzontale

File: `src/components/DeepHistory.tsx`

- Ogni entry = striscia verticale 44px larghezza, altezza 100%
- Entries ordinate per data, newest a destra
- Auto-scroll a "oggi" al mount
- Ring bianco su "oggi"
- Frecce ← → (scroll di 220px)
- Etichette gg/mm in basso
- Contatore "N giorni registrati"
- Usata in History.tsx tab "Timeline" (5ª tab)

---

## Export PNG

`ExportCanvas.tsx` — **solo stili inline** (requisito html-to-image).

| Formato | CSS px | Output |
|---------|--------|--------|
| Feed 1:1 | 360×360 | 1080×1080 (pixelRatio 3) |
| Story 9:16 | 360×640 | 1080×1920 (pixelRatio 3) |

Opzioni: Vista / Stile (art\|labeled) / Font / Celle (rounded\|square\|circle) / Bagliore / Sfondo / Username.
Condivisione: Web Share API → fallback download PNG.

---

## Capacitor — build nativa Android/iOS

File: `capacitor.config.ts`

```typescript
{ appId: 'com.iride.app', appName: 'Iride', webDir: 'dist',
  server: { androidScheme: 'https' } }
```

**Script npm:**
```bash
npm run build:cap        # build con base './' (per file:// su device)
npm run cap:add:android  # prima volta — crea cartella android/
npm run cap:add:ios      # prima volta — crea cartella ios/
npm run cap:android      # build + sync + apre Android Studio
npm run cap:ios          # build + sync + apre Xcode (solo macOS)
npm run cap:sync         # solo build + sync senza aprire IDE
```

**Vite config**: `CAPACITOR=true` env var → `base: './'` invece di `'/App-colori-/'`.
Le cartelle `android/` e `ios/` sono in `.gitignore` (si rigenerano con `cap:add:`).

**Requisiti:**
- Android: Android Studio + JDK 17
- iOS: macOS + Xcode + account Apple Developer ($99/anno per store)

---

## Auth / Registrazione

**Flusso con conferma email** (Supabase default):
1. Signup → `data.session` null → mostra "controlla email"
2. Click link email → Supabase redirige su GitHub Pages con token in hash
3. `onAuthStateChange` riceve `SIGNED_IN` con sessione valida ma senza profilo
4. `App.tsx`: `hasSession: boolean` separato da `profile`
5. `hasSession=true` + `profile=null` → redirect a `/onboarding`
6. Onboarding crea profilo → `fetchProfile` → app avviata

**Errore "Load Failed" su Safari iOS**: try/catch in Onboarding.tsx rileva "failed"/"network"/"fetch"/"load".

---

## Deploy GitHub Pages

Workflow: `.github/workflows/deploy.yml`
Trigger: push su `claude/mood-colors-mvp-3PsnT` O `claude/color-mood-generative-art-ZjOnF`

Setup una tantum:
1. Creare progetto Supabase → eseguire `supabase/schema.sql`
2. GitHub Secrets: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
3. Settings → Pages → Source → GitHub Actions

---

## Roadmap futura

- Aggiungere colonna `tags text[]` al DB Supabase: `ALTER TABLE mood_entries ADD COLUMN IF NOT EXISTS tags text[];`
- Policy DELETE grace period in Supabase: `DELETE WHERE auth.uid()=user_id AND created_at > NOW()-INTERVAL '5 minutes'`
- Instagram OAuth (`source` in profiles già pronto)
- Notifiche push quotidiane (promemoria rituale)
- Salvataggio export su Supabase Storage
- Navigazione settimane/mesi precedenti in History
- Filtro per mood label nella vista storica
- Sfondo dinamico anche in History ed Export
- Dark mode UI completa
- PWA (manifest.json + service worker) per installazione da browser senza store
