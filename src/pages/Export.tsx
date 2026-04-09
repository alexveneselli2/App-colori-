import { useEffect, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { useMoodStore } from '../store/useMoodStore'
import { useAuthStore } from '../store/useAuthStore'
import { toISO } from '../lib/dateUtils'
import ExportCanvas, { CANVAS_W, CANVAS_H_FEED, CANVAS_H_STORY } from '../components/ExportCanvas'
import type { ViewMode, ExportStyle, ExportFormat, ExportFont, ExportBg, ExportCellShape, ExportCellGlow } from '../types'

const PIXEL_RATIO = 3

// ─── Accordion section ────────────────────────────────────────────────────────
function AccordionSection({
  id, label, summary, open, onToggle, children,
}: {
  id: string
  label: string
  summary: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden transition-all"
      style={{ border: '1.5px solid var(--color-subtle)', background: 'var(--color-surface-raised)' }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3.5 active:opacity-70 transition-opacity"
      >
        <span className="text-[13px] font-bold" style={{ color: 'var(--color-foreground)' }}>
          {label}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium" style={{ color: 'var(--color-muted)' }}>
            {summary}
          </span>
          <svg
            width="14" height="14" viewBox="0 0 14 14" fill="none"
            style={{
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
              color: 'var(--color-muted)',
            }}
          >
            <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 animate-fade-in">
          <div style={{ height: 1, background: 'var(--color-subtle)', marginBottom: 12 }} />
          {children}
        </div>
      )}
    </div>
  )
}

// ─── Toggle pill group ────────────────────────────────────────────────────────
function ToggleGroup({
  options, value, onChange,
}: {
  options: { key: string; text: string; dot?: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex p-1 gap-1 rounded-2xl" style={{ background: 'var(--color-subtle)' }}>
      {options.map(opt => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold transition-all active:scale-[0.97] flex items-center justify-center gap-1.5"
          style={{
            background: value === opt.key ? 'var(--color-surface-raised)' : 'transparent',
            color:      value === opt.key ? 'var(--color-foreground)'     : 'var(--color-muted)',
            boxShadow:  value === opt.key ? 'var(--shadow-xs)'            : undefined,
          }}
        >
          {opt.dot && (
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: opt.dot, border: '1px solid rgba(0,0,0,0.10)',
              flexShrink: 0,
            }} />
          )}
          {opt.text}
        </button>
      ))}
    </div>
  )
}

export default function Export() {
  const { profile } = useAuthStore()
  const { entries, fetchEntries } = useMoodStore()
  const canvasRef = useRef<HTMLDivElement>(null)

  const [loaded,       setLoaded]       = useState(false)
  const [mode,         setMode]         = useState<ViewMode>('monthly')
  const [bg,           setBg]           = useState<ExportBg>('warm')
  const [style,        setStyle]        = useState<ExportStyle>('art')
  const [format,       setFormat]       = useState<ExportFormat>('feed')
  const [font,         setFont]         = useState<ExportFont>('sans')
  const [cellShape,    setCellShape]    = useState<ExportCellShape>('rounded')
  const [cellGlow,     setCellGlow]     = useState<ExportCellGlow>('none')
  const [showUsername, setShowUsername] = useState(true)
  const [openSection,  setOpenSection]  = useState<string | null>('vista')
  const [exporting,    setExporting]    = useState(false)
  const [shared,       setShared]       = useState(false)

  const today = new Date()
  const year  = today.getFullYear()
  const month = today.getMonth()

  useEffect(() => {
    if (profile && !loaded) {
      fetchEntries(profile.id)
        .then(() => setLoaded(true))
        .catch(() => setLoaded(true))
    }
  }, [profile, loaded, fetchEntries])

  const entriesMap = new Map(entries.map(e => [e.date, e.color_hex]))
  const canvasH    = format === 'feed' ? CANVAS_H_FEED : CANVAS_H_STORY
  const scale      = Math.min(1, 320 / CANVAS_W)
  const previewH   = canvasH * scale

  const toggle = (id: string) => setOpenSection(v => v === id ? null : id)

  const captureImage = async (): Promise<string | null> => {
    if (!canvasRef.current) return null
    try {
      return await toPng(canvasRef.current, { pixelRatio: PIXEL_RATIO, cacheBust: true, quality: 1 })
    } catch (err) {
      console.error('[Iride] Export error:', err)
      return null
    }
  }

  const handleDownload = async () => {
    setExporting(true)
    const dataUrl = await captureImage()
    if (dataUrl) {
      const a = document.createElement('a')
      a.download = `iride-${mode}-${toISO(today)}.png`
      a.href = dataUrl
      a.click()
    }
    setExporting(false)
  }

  const handleShare = async () => {
    setExporting(true)
    const dataUrl = await captureImage()
    if (!dataUrl) { setExporting(false); return }
    try {
      const blob = await (await fetch(dataUrl)).blob()
      const file = new File([blob], `iride-${mode}.png`, { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Il mio diario cromatico — Iride' })
        setShared(true)
        setTimeout(() => setShared(false), 2500)
      } else {
        const a = document.createElement('a')
        a.download = `iride-${mode}.png`
        a.href = dataUrl
        a.click()
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') console.error(err)
    }
    setExporting(false)
  }

  // Summaries shown in collapsed accordion headers
  const modeLabelMap: Record<ViewMode, string> = { weekly: 'Settimana', monthly: 'Mese', yearly: 'Anno' }
  const bgLabelMap: Record<ExportBg, string>   = { warm: 'Caldo', white: 'Bianco', dark: 'Scuro', mood: 'Mood' }
  const shapeLabel: Record<ExportCellShape, string> = { rounded: 'Arrot.', square: 'Quadrate', circle: 'Cerchi' }
  const glowLabel:  Record<ExportCellGlow, string>  = { none: 'Nessuno', soft: 'Soft', vivid: 'Vivid' }

  return (
    <div className="page-top flex flex-col">

      {/* Header */}
      <div className="px-5 pb-3">
        <h1 className="text-[30px] font-extrabold leading-tight tracking-[-0.04em] mb-1" style={{ color: 'var(--color-foreground)' }}>
          Esporta
        </h1>
        <p className="text-[13px]" style={{ color: 'var(--color-muted)' }}>
          Crea un poster da condividere sui social
        </p>
      </div>

      {/* Canvas preview */}
      <div className="px-5 mb-5 flex justify-center">
        <div style={{
          width: CANVAS_W * scale, height: previewH,
          borderRadius: 16, overflow: 'hidden',
          boxShadow: '0 8px 40px rgba(0,0,0,0.14)', flexShrink: 0,
        }}>
          <div style={{ width: CANVAS_W, height: canvasH, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
            <ExportCanvas
              ref={canvasRef}
              entriesMap={entriesMap}
              mode={mode} bg={bg} style={style} format={format}
              font={font} cellShape={cellShape} cellGlow={cellGlow}
              username={showUsername ? profile?.username : undefined}
              year={year} month={month}
            />
          </div>
        </div>
      </div>

      {/* Accordion controls */}
      <div className="px-5 space-y-2 mb-5">

        {/* Vista + Formato */}
        <AccordionSection
          id="vista" label="Vista & Formato"
          summary={`${modeLabelMap[mode]} · ${format === 'feed' ? '1×1' : '9×16'}`}
          open={openSection === 'vista'} onToggle={() => toggle('vista')}
        >
          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-1.5" style={{ color: 'var(--color-muted)' }}>Vista</p>
              <ToggleGroup
                value={mode} onChange={v => setMode(v as ViewMode)}
                options={[
                  { key: 'weekly',  text: 'Settimana' },
                  { key: 'monthly', text: 'Mese' },
                  { key: 'yearly',  text: 'Anno' },
                ]}
              />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-1.5" style={{ color: 'var(--color-muted)' }}>Formato</p>
              <ToggleGroup
                value={format} onChange={v => setFormat(v as ExportFormat)}
                options={[
                  { key: 'feed',  text: 'Feed 1×1' },
                  { key: 'story', text: 'Story 9×16' },
                ]}
              />
            </div>
          </div>
        </AccordionSection>

        {/* Stile & Font */}
        <AccordionSection
          id="stile" label="Stile & Font"
          summary={`${style === 'art' ? 'Arte' : 'Testi'} · ${font === 'sans' ? 'Sans' : font === 'serif' ? 'Serif' : 'Mono'}`}
          open={openSection === 'stile'} onToggle={() => toggle('stile')}
        >
          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-1.5" style={{ color: 'var(--color-muted)' }}>Stile</p>
              <ToggleGroup
                value={style} onChange={v => setStyle(v as ExportStyle)}
                options={[
                  { key: 'art',     text: 'Arte — solo colori' },
                  { key: 'labeled', text: 'Testi — con etichette' },
                ]}
              />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-1.5" style={{ color: 'var(--color-muted)' }}>Font</p>
              <ToggleGroup
                value={font} onChange={v => setFont(v as ExportFont)}
                options={[
                  { key: 'sans',  text: 'Sans-serif' },
                  { key: 'serif', text: 'Serif' },
                  { key: 'mono',  text: 'Mono' },
                ]}
              />
            </div>
          </div>
        </AccordionSection>

        {/* Celle */}
        <AccordionSection
          id="celle" label="Celle & Effetti"
          summary={`${shapeLabel[cellShape]} · ${glowLabel[cellGlow]}`}
          open={openSection === 'celle'} onToggle={() => toggle('celle')}
        >
          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-1.5" style={{ color: 'var(--color-muted)' }}>Forma celle</p>
              <ToggleGroup
                value={cellShape} onChange={v => setCellShape(v as ExportCellShape)}
                options={[
                  { key: 'rounded', text: 'Arrotondate' },
                  { key: 'square',  text: 'Quadrate' },
                  { key: 'circle',  text: 'Cerchi' },
                ]}
              />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-1.5" style={{ color: 'var(--color-muted)' }}>Bagliore</p>
              <ToggleGroup
                value={cellGlow} onChange={v => setCellGlow(v as ExportCellGlow)}
                options={[
                  { key: 'none',  text: 'Nessuno' },
                  { key: 'soft',  text: 'Soft' },
                  { key: 'vivid', text: 'Vivid' },
                ]}
              />
            </div>
          </div>
        </AccordionSection>

        {/* Sfondo */}
        <AccordionSection
          id="sfondo" label="Sfondo"
          summary={bgLabelMap[bg]}
          open={openSection === 'sfondo'} onToggle={() => toggle('sfondo')}
        >
          <ToggleGroup
            value={bg} onChange={v => setBg(v as ExportBg)}
            options={[
              { key: 'warm',  text: 'Caldo',  dot: '#F7F4EF' },
              { key: 'white', text: 'Bianco', dot: '#FFFFFF' },
              { key: 'dark',  text: 'Scuro',  dot: '#0E0D0C' },
              { key: 'mood',  text: 'Mood',   dot: 'linear-gradient(135deg,#FFD000,#FF0A54,#00B4D8)' },
            ]}
          />
        </AccordionSection>

        {/* Username */}
        <AccordionSection
          id="firma" label="Firma"
          summary={showUsername ? `@${profile?.username ?? 'username'}` : 'Nascosta'}
          open={openSection === 'firma'} onToggle={() => toggle('firma')}
        >
          <div
            className="flex items-center justify-between py-1 cursor-pointer"
            onClick={() => setShowUsername(v => !v)}
          >
            <div>
              <p className="text-[13px] font-semibold" style={{ color: 'var(--color-foreground)' }}>
                Mostra @{profile?.username ?? 'username'}
              </p>
              <p className="text-[11px]" style={{ color: 'var(--color-muted)' }}>
                Il tuo nome appare nel footer del poster
              </p>
            </div>
            <div style={{
              width: 42, height: 26, borderRadius: 99, position: 'relative', flexShrink: 0,
              background: showUsername ? 'var(--color-foreground)' : '#CBD5E1',
              transition: 'background 0.2s',
            }}>
              <div style={{
                position: 'absolute', top: 4, width: 18, height: 18, borderRadius: '50%',
                background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                left: showUsername ? 20 : 4,
                transition: 'left 0.2s cubic-bezier(0.34,1.56,0.64,1)',
              }} />
            </div>
          </div>
        </AccordionSection>

      </div>

      {/* Action buttons */}
      <div className="px-5 space-y-3 mt-auto pb-2">
        <button
          onClick={handleShare}
          disabled={exporting}
          className="w-full py-4 rounded-2xl text-[15px] font-semibold transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: 'var(--color-foreground)', color: 'var(--color-surface)' }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M11 1l4 4-4 4M15 5H5a4 4 0 000 8h1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {shared ? 'Condiviso!' : exporting ? '···' : 'Condividi'}
        </button>

        <button
          onClick={handleDownload}
          disabled={exporting}
          className="w-full py-4 rounded-2xl text-[15px] font-semibold transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: 'transparent', border: '1.5px solid var(--color-subtle)', color: 'var(--color-foreground)' }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1v9M5 8l3 3 3-3M1 13h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {exporting ? '···' : 'Scarica PNG'}
        </button>
      </div>

    </div>
  )
}
