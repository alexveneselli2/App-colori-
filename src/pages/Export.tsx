import { useEffect, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { useMoodStore } from '../store/useMoodStore'
import { useAuthStore } from '../store/useAuthStore'
import { toISO } from '../lib/dateUtils'
import ExportCanvas, { CANVAS_W, CANVAS_H_FEED, CANVAS_H_STORY } from '../components/ExportCanvas'
import type { ViewMode, ExportTheme, ExportStyle, ExportFormat } from '../types'

const PIXEL_RATIO = 3 // 360px × 3 = 1080px output

export default function Export() {
  const { profile } = useAuthStore()
  const { entries, fetchEntries } = useMoodStore()
  const canvasRef = useRef<HTMLDivElement>(null)

  const [loaded,    setLoaded]    = useState(false)
  const [mode,      setMode]      = useState<ViewMode>('monthly')
  const [theme,     setTheme]     = useState<ExportTheme>('light')
  const [style,     setStyle]     = useState<ExportStyle>('art')
  const [format,    setFormat]    = useState<ExportFormat>('feed')
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
        // Fallback to download if Web Share API not supported
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

  // Scale the preview canvas to fit the screen width
  const previewMaxW = 320
  const scale = Math.min(1, previewMaxW / CANVAS_W)
  const previewH = canvasH * scale

  const ToggleGroup = ({
    label, options, value, onChange,
  }: {
    label: string
    options: { key: string; text: string }[]
    value: string
    onChange: (v: string) => void
  }) => (
    <div className="space-y-2">
      <p className="text-[10px] text-muted uppercase tracking-widest">{label}</p>
      <div className="flex bg-surface-raised rounded-xl p-1 gap-1">
        {options.map(opt => (
          <button
            key={opt.key}
            onClick={() => onChange(opt.key)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
              value === opt.key ? 'bg-foreground text-surface' : 'text-muted'
            }`}
          >
            {opt.text}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div className="flex flex-col min-h-screen pb-8">

      {/* Header */}
      <div className="px-6 pt-14 pb-5">
        <h2 className="text-2xl font-light text-foreground mb-1">Esporta</h2>
        <p className="text-xs text-muted">Genera un'immagine da condividere</p>
      </div>

      {/* Controls */}
      <div className="px-6 space-y-4 mb-6">
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
        <div className="flex gap-4">
          <div className="flex-1">
            <ToggleGroup
              label="Sfondo"
              value={theme}
              onChange={v => setTheme(v as ExportTheme)}
              options={[
                { key: 'light', text: 'Chiaro' },
                { key: 'dark',  text: 'Scuro' },
              ]}
            />
          </div>
          <div className="flex-1">
            <ToggleGroup
              label="Stile"
              value={style}
              onChange={v => setStyle(v as ExportStyle)}
              options={[
                { key: 'art',     text: 'Arte' },
                { key: 'labeled', text: 'Etichette' },
              ]}
            />
          </div>
        </div>
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
      <div className="px-6 mb-8 flex justify-center overflow-hidden">
        <div style={{
          width:          CANVAS_W * scale,
          height:         previewH,
          borderRadius:   12,
          overflow:       'hidden',
          boxShadow:      '0 4px 24px rgba(0,0,0,0.10)',
          transform:      `scale(${scale})`,
          transformOrigin: 'top left',
          // Correct the visual offset introduced by scale
          marginRight:    `${CANVAS_W * scale - CANVAS_W}px`,
          marginBottom:   `${previewH - canvasH}px`,
        }}>
          <ExportCanvas
            ref={canvasRef}
            entriesMap={entriesMap}
            mode={mode}
            theme={theme}
            style={style}
            format={format}
            username={profile?.username}
            year={year}
            month={month}
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="px-6 space-y-3 mt-auto">
        <button
          onClick={handleShare}
          disabled={exporting}
          className="w-full py-4 bg-foreground text-surface rounded-2xl text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
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
          className="w-full py-4 border border-subtle text-foreground rounded-2xl text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
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
