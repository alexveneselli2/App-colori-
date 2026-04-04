import { useEffect, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { useMoodStore } from '../store/useMoodStore'
import { useAuthStore } from '../store/useAuthStore'
import { toISO } from '../lib/dateUtils'
import ExportCanvas, { CANVAS_W, CANVAS_H_FEED, CANVAS_H_STORY } from '../components/ExportCanvas'
import type { ViewMode, ExportStyle, ExportFormat, ExportFont, ExportBg } from '../types'

const PIXEL_RATIO = 3

export default function Export() {
  const { profile } = useAuthStore()
  const { entries, fetchEntries } = useMoodStore()
  const canvasRef = useRef<HTMLDivElement>(null)

  const [loaded,    setLoaded]    = useState(false)
  const [mode,      setMode]      = useState<ViewMode>('monthly')
  const [bg,        setBg]        = useState<ExportBg>('warm')
  const [style,     setStyle]     = useState<ExportStyle>('art')
  const [format,    setFormat]    = useState<ExportFormat>('feed')
  const [font,      setFont]      = useState<ExportFont>('sans')
  const [exporting, setExporting] = useState(false)
  const [shared,    setShared]    = useState(false)

  const today = new Date()
  const year  = today.getFullYear()
  const month = today.getMonth()

  useEffect(() => {
    if (profile && !loaded) {
      fetchEntries(profile.id).then(() => setLoaded(true))
    }
  }, [profile])

  const entriesMap = new Map(entries.map(e => [e.date, e.color_hex]))
  const canvasH    = format === 'feed' ? CANVAS_H_FEED : CANVAS_H_STORY

  const captureImage = async (): Promise<string | null> => {
    if (!canvasRef.current) return null
    try {
      return await toPng(canvasRef.current, {
        pixelRatio: PIXEL_RATIO,
        cacheBust:  true,
        quality:    1,
      })
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

  const scale       = Math.min(1, 320 / CANVAS_W)
  const previewH    = canvasH * scale

  const ToggleGroup = ({
    label, options, value, onChange,
  }: {
    label: string
    options: { key: string; text: string }[]
    value: string
    onChange: (v: string) => void
  }) => (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.13em]" style={{ color: 'var(--color-muted)' }}>
        {label}
      </p>
      <div className="flex p-1 gap-1 rounded-2xl" style={{ background: 'var(--color-subtle)' }}>
        {options.map(opt => (
          <button
            key={opt.key}
            onClick={() => onChange(opt.key)}
            className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold transition-all active:scale-[0.97]"
            style={{
              background: value === opt.key ? 'var(--color-surface-raised)' : 'transparent',
              color:      value === opt.key ? 'var(--color-foreground)'     : 'var(--color-muted)',
              boxShadow:  value === opt.key ? 'var(--shadow-xs)'            : undefined,
            }}
          >
            {opt.text}
          </button>
        ))}
      </div>
    </div>
  )

  /* Bg swatch previews for the Sfondo option */
  const BgSwatch = ({ bgKey }: { bgKey: ExportBg }) => {
    const colors: Record<ExportBg, string> = {
      warm:  '#F7F4EF',
      white: '#FFFFFF',
      dark:  '#0E0D0C',
      mood:  'linear-gradient(135deg, #FFD000 0%, #FF0A54 50%, #00B4D8 100%)',
    }
    return (
      <div style={{
        width: 10, height: 10, borderRadius: '50%',
        background: colors[bgKey],
        border: '1.5px solid rgba(0,0,0,0.12)',
        flexShrink: 0,
      }} />
    )
  }

  return (
    <div className="page-top flex flex-col">

      {/* Header */}
      <div className="px-5 pb-4">
        <h1 className="text-[30px] font-extrabold leading-tight tracking-[-0.04em] mb-1" style={{ color: 'var(--color-foreground)' }}>
          Esporta
        </h1>
        <p className="text-[13px]" style={{ color: 'var(--color-muted)' }}>
          Genera un poster da condividere su Instagram
        </p>
      </div>

      {/* Controls */}
      <div className="px-5 space-y-4 mb-6">

        {/* Row 1: Vista */}
        <ToggleGroup
          label="Vista"
          value={mode}
          onChange={v => setMode(v as ViewMode)}
          options={[
            { key: 'weekly',  text: 'Settimana' },
            { key: 'monthly', text: 'Mese' },
            { key: 'yearly',  text: 'Anno' },
          ]}
        />

        {/* Row 2: Stile + Font side by side */}
        <div className="flex gap-3">
          <div className="flex-1">
            <ToggleGroup
              label="Stile"
              value={style}
              onChange={v => setStyle(v as ExportStyle)}
              options={[
                { key: 'art',     text: 'Arte' },
                { key: 'labeled', text: 'Testi' },
              ]}
            />
          </div>
          <div className="flex-1">
            <ToggleGroup
              label="Font"
              value={font}
              onChange={v => setFont(v as ExportFont)}
              options={[
                { key: 'sans',  text: 'Sans' },
                { key: 'serif', text: 'Serif' },
              ]}
            />
          </div>
        </div>

        {/* Row 3: Sfondo — with color swatches */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.13em]" style={{ color: 'var(--color-muted)' }}>
            Sfondo
          </p>
          <div className="flex p-1 gap-1 rounded-2xl" style={{ background: 'var(--color-subtle)' }}>
            {(['warm', 'white', 'dark', 'mood'] as ExportBg[]).map(k => {
              const labels: Record<ExportBg, string> = { warm: 'Caldo', white: 'Bianco', dark: 'Scuro', mood: 'Mood' }
              const active = bg === k
              return (
                <button
                  key={k}
                  onClick={() => setBg(k)}
                  className="flex-1 py-2.5 rounded-xl text-[11px] font-semibold transition-all active:scale-[0.97] flex items-center justify-center gap-1.5"
                  style={{
                    background: active ? 'var(--color-surface-raised)' : 'transparent',
                    color:      active ? 'var(--color-foreground)'     : 'var(--color-muted)',
                    boxShadow:  active ? 'var(--shadow-xs)'            : undefined,
                  }}
                >
                  <BgSwatch bgKey={k} />
                  {labels[k]}
                </button>
              )
            })}
          </div>
        </div>

        {/* Row 4: Formato */}
        <ToggleGroup
          label="Formato"
          value={format}
          onChange={v => setFormat(v as ExportFormat)}
          options={[
            { key: 'feed',  text: 'Feed 1×1' },
            { key: 'story', text: 'Story 9×16' },
          ]}
        />
      </div>

      {/* Canvas preview */}
      <div className="px-5 mb-8 flex justify-center">
        <div style={{
          width:        CANVAS_W * scale,
          height:       previewH,
          borderRadius: 16,
          overflow:     'hidden',
          boxShadow:    '0 8px 40px rgba(0,0,0,0.14)',
          flexShrink:   0,
        }}>
          <div style={{
            width:           CANVAS_W,
            height:          canvasH,
            transform:       `scale(${scale})`,
            transformOrigin: 'top left',
          }}>
            <ExportCanvas
              ref={canvasRef}
              entriesMap={entriesMap}
              mode={mode}
              bg={bg}
              style={style}
              format={format}
              font={font}
              username={profile?.username}
              year={year}
              month={month}
            />
          </div>
        </div>
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
            <path d="M11 1l4 4-4 4M15 5H5a4 4 0 000 8h1"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {shared ? 'Condiviso!' : exporting ? '···' : 'Condividi su Instagram'}
        </button>

        <button
          onClick={handleDownload}
          disabled={exporting}
          className="w-full py-4 rounded-2xl text-[15px] font-semibold transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          style={{
            background: 'transparent',
            border: '1.5px solid var(--color-subtle)',
            color: 'var(--color-foreground)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1v9M5 8l3 3 3-3M1 13h14"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {exporting ? '···' : 'Scarica PNG'}
        </button>
      </div>

    </div>
  )
}
