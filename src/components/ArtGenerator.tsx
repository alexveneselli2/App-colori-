import { useEffect, useRef, type RefObject } from 'react'
import type { MoodEntry } from '../types'

interface Props {
  entries: MoodEntry[]
  height?: number
}

// ─── Color helpers ────────────────────────────────────────────────────────────

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const { r, g, b } = hexToRgb(hex)
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6
  else if (max === gn) h = ((bn - rn) / d + 2) / 6
  else h = ((rn - gn) / d + 4) / 6
  return { h: h * 360, s, l }
}

// ─── Brand fallback colors ───────────────────────────────────────────────────
const BRAND_COLORS = ['#FFD000', '#FF6B00', '#FF0A54', '#C77DFF', '#00B4D8', '#52B788', '#2D6A4F']

// ─── Fluid Mode ──────────────────────────────────────────────────────────────

function FluidMode({ entries, canvasRef }: { entries: MoodEntry[]; canvasRef: RefObject<HTMLCanvasElement | null> }) {
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const setSize = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width  = canvas.offsetWidth  * dpr
      canvas.height = canvas.offsetHeight * dpr
      ctx.scale(dpr, dpr)
    }
    setSize()

    const colors = entries.slice(-7).map(e => e.color_hex)
    const palette = colors.length > 0 ? colors : BRAND_COLORS.slice(0, 7)

    interface Orb {
      cx: number; cy: number
      rx: number; ry: number
      freq: number; phase: number
      radius: number
      color: string
    }

    const W = canvas.offsetWidth
    const H = canvas.offsetHeight
    const orbs: Orb[] = palette.map((color, i) => ({
      cx:     W / 2,
      cy:     H / 2,
      rx:     W * (0.22 + 0.08 * (i % 3)),
      ry:     H * (0.18 + 0.07 * (i % 4)),
      freq:   0.4 + i * 0.13,
      phase:  (i / palette.length) * Math.PI * 2,
      radius: Math.min(W, H) * (0.18 + 0.06 * (i % 3)),
      color,
    }))

    let t = 0
    const animate = () => {
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight

      ctx.fillStyle = '#F2EDE5'
      ctx.fillRect(0, 0, w, h)

      for (const orb of orbs) {
        const x = orb.cx + orb.rx * Math.sin(orb.freq * t + orb.phase)
        const y = orb.cy + orb.ry * Math.sin(orb.freq * t * 1.31 + orb.phase + 1.2)

        const grad = ctx.createRadialGradient(x, y, 0, x, y, orb.radius)
        const { r, g, b } = hexToRgb(orb.color)
        grad.addColorStop(0,   `rgba(${r},${g},${b},0.55)`)
        grad.addColorStop(0.5, `rgba(${r},${g},${b},0.20)`)
        grad.addColorStop(1,   `rgba(${r},${g},${b},0)`)

        ctx.globalCompositeOperation = 'source-over'
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(x, y, orb.radius, 0, Math.PI * 2)
        ctx.fill()
      }

      t += 0.012
      rafRef.current = requestAnimationFrame(animate)
    }

    animate()
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [entries, canvasRef])

  return null
}

// ─── Voronoi (Geometric) Mode ─────────────────────────────────────────────────

function GeometricMode({ entries, canvasRef }: { entries: MoodEntry[]; canvasRef: RefObject<HTMLCanvasElement | null> }) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width  = canvas.offsetWidth  * dpr
    canvas.height = canvas.offsetHeight * dpr
    ctx.scale(dpr, dpr)

    const W = canvas.offsetWidth
    const H = canvas.offsetHeight

    // Compute color frequencies
    const freq: Record<string, number> = {}
    const palette = entries.length > 0
      ? entries.slice(-30).map(e => e.color_hex)
      : BRAND_COLORS
    for (const c of palette) freq[c] = (freq[c] ?? 0) + 1

    const uniqueColors = Object.keys(freq)

    // Generate weighted seeds
    interface Seed { x: number; y: number; color: string; vx: number; vy: number }
    const seeds: Seed[] = []
    const totalCount = Object.values(freq).reduce((a, b) => a + b, 0)
    for (const color of uniqueColors) {
      const weight = freq[color] / totalCount
      const n = Math.max(1, Math.min(5, Math.round(weight * 20)))
      for (let i = 0; i < n; i++) {
        seeds.push({
          x:  Math.random() * W,
          y:  Math.random() * H,
          color,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
        })
      }
    }

    const SCALE = 6 // render at 1/6 resolution then scale up
    const sw = Math.ceil(W / SCALE)
    const sh = Math.ceil(H / SCALE)

    const renderVoronoi = () => {
      // Off-screen low-res
      const offCanvas = document.createElement('canvas')
      offCanvas.width  = sw
      offCanvas.height = sh
      const offCtx = offCanvas.getContext('2d')
      if (!offCtx) return

      const imgData = offCtx.createImageData(sw, sh)
      const data    = imgData.data

      for (let py = 0; py < sh; py++) {
        for (let px = 0; px < sw; px++) {
          const wx = px * SCALE
          const wy = py * SCALE
          let minDist = Infinity
          let nearest = seeds[0]
          for (const s of seeds) {
            const dx = s.x - wx, dy = s.y - wy
            const d  = dx * dx + dy * dy
            if (d < minDist) { minDist = d; nearest = s }
          }
          const { r, g, b } = hexToRgb(nearest.color)
          const idx = (py * sw + px) * 4
          data[idx]     = r
          data[idx + 1] = g
          data[idx + 2] = b
          data[idx + 3] = 255
        }
      }
      offCtx.putImageData(imgData, 0, 0)

      // Scale up to full canvas without smoothing
      ctx.imageSmoothingEnabled = false
      ctx.fillStyle = '#F2EDE5'
      ctx.fillRect(0, 0, W, H)
      ctx.drawImage(offCanvas, 0, 0, W, H)

      // Draw Voronoi edge lines (find color-change boundaries)
      ctx.strokeStyle = 'rgba(0,0,0,0.08)'
      ctx.lineWidth   = 1
      for (let py = 0; py < sh - 1; py++) {
        for (let px = 0; px < sw - 1; px++) {
          const wx = px * SCALE, wy = py * SCALE
          const wx1 = (px + 1) * SCALE, wy1 = (py + 1) * SCALE
          let c0 = seeds[0], c1 = seeds[0], c2 = seeds[0]
          let d0 = Infinity, d1 = Infinity, d2 = Infinity
          for (const s of seeds) {
            const dx0 = s.x - wx,  dy0 = s.y - wy
            const dx1 = s.x - wx1, dy1 = s.y - wy
            const dx2 = s.x - wx,  dy2 = s.y - wy1
            const dd0 = dx0*dx0 + dy0*dy0
            const dd1 = dx1*dx1 + dy1*dy1
            const dd2 = dx2*dx2 + dy2*dy2
            if (dd0 < d0) { d0 = dd0; c0 = s }
            if (dd1 < d1) { d1 = dd1; c1 = s }
            if (dd2 < d2) { d2 = dd2; c2 = s }
          }
          if (c0.color !== c1.color) {
            ctx.beginPath()
            ctx.moveTo(px * SCALE, py * SCALE)
            ctx.lineTo((px + 1) * SCALE, py * SCALE)
            ctx.stroke()
          }
          if (c0.color !== c2.color) {
            ctx.beginPath()
            ctx.moveTo(px * SCALE, py * SCALE)
            ctx.lineTo(px * SCALE, (py + 1) * SCALE)
            ctx.stroke()
          }
        }
      }
    }

    // Initial render
    renderVoronoi()

    // Move seeds every 2s
    timerRef.current = setInterval(() => {
      for (const s of seeds) {
        s.x = Math.max(0, Math.min(W, s.x + s.vx * SCALE * 2))
        s.y = Math.max(0, Math.min(H, s.y + s.vy * SCALE * 2))
        if (s.x <= 0 || s.x >= W) s.vx *= -1
        if (s.y <= 0 || s.y >= H) s.vy *= -1
      }
      renderVoronoi()
    }, 2000)

    return () => {
      if (timerRef.current !== null) clearInterval(timerRef.current)
    }
  }, [entries, canvasRef])

  return null
}

// ─── Skyline Mode ─────────────────────────────────────────────────────────────

function SkylineMode({ entries, canvasRef }: { entries: MoodEntry[]; canvasRef: RefObject<HTMLCanvasElement | null> }) {
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width  = canvas.offsetWidth  * dpr
    canvas.height = canvas.offsetHeight * dpr
    ctx.scale(dpr, dpr)

    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date)).slice(-60)
    const cols   = sorted.length > 0 ? sorted : Array.from({ length: 20 }, (_, i) => ({
      color_hex: BRAND_COLORS[i % BRAND_COLORS.length],
      date: '',
    })) as MoodEntry[]

    // Generate star positions once
    const stars: { x: number; y: number; r: number }[] = Array.from({ length: 40 }, () => ({
      x: Math.random(),
      y: Math.random() * 0.4,
      r: Math.random() * 1.2 + 0.3,
    }))

    let t = 0
    const animate = () => {
      const W = canvas.offsetWidth
      const H = canvas.offsetHeight

      // Dark sky background
      const skyGrad = ctx.createLinearGradient(0, 0, 0, H)
      skyGrad.addColorStop(0,   '#0a0820')
      skyGrad.addColorStop(0.6, '#1a1040')
      skyGrad.addColorStop(1,   '#2a1060')
      ctx.fillStyle = skyGrad
      ctx.fillRect(0, 0, W, H)

      // Stars
      for (const star of stars) {
        const opacity = 0.3 + 0.3 * Math.sin(t * 0.8 + star.x * 10)
        ctx.fillStyle = `rgba(255,255,255,${opacity})`
        ctx.beginPath()
        ctx.arc(star.x * W, star.y * H, star.r, 0, Math.PI * 2)
        ctx.fill()
      }

      const n         = cols.length
      const colW      = W / n
      const horizon   = H * 0.6
      const maxHeight = horizon * 0.8

      // Columns
      for (let i = 0; i < n; i++) {
        const entry = cols[i]
        const { s } = hexToHsl(entry.color_hex)
        const baseH = maxHeight * (0.2 + s * 0.6)
        const pulse = Math.sin(t + i * 0.4) * baseH * 0.04
        const colH  = baseH + pulse
        const x     = i * colW
        const y     = horizon - colH
        const { r, g, b } = hexToRgb(entry.color_hex)

        // Column gradient
        const colGrad = ctx.createLinearGradient(x, y, x, horizon)
        colGrad.addColorStop(0,   `rgba(${r},${g},${b},0.95)`)
        colGrad.addColorStop(0.5, `rgba(${r},${g},${b},0.75)`)
        colGrad.addColorStop(1,   `rgba(${r},${g},${b},0.5)`)
        ctx.fillStyle = colGrad
        ctx.fillRect(x, y, colW - 1, colH)
      }

      // Reflection below horizon
      ctx.save()
      ctx.translate(0, horizon * 2)
      ctx.scale(1, -1)
      for (let i = 0; i < n; i++) {
        const entry = cols[i]
        const { s } = hexToHsl(entry.color_hex)
        const baseH = maxHeight * (0.2 + s * 0.6)
        const pulse = Math.sin(t + i * 0.4) * baseH * 0.04
        const colH  = (baseH + pulse) * 0.4
        const x     = i * colW
        const y     = horizon - (baseH + pulse) * 0.4
        const { r, g, b } = hexToRgb(entry.color_hex)

        const refGrad = ctx.createLinearGradient(x, y, x, horizon)
        refGrad.addColorStop(0, `rgba(${r},${g},${b},0.25)`)
        refGrad.addColorStop(1, `rgba(${r},${g},${b},0)`)
        ctx.fillStyle = refGrad
        ctx.fillRect(x, y, colW - 1, colH)
      }
      ctx.restore()

      // Horizon line
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'
      ctx.lineWidth   = 1
      ctx.beginPath()
      ctx.moveTo(0, horizon)
      ctx.lineTo(W, horizon)
      ctx.stroke()

      t += 0.015
      rafRef.current = requestAnimationFrame(animate)
    }

    animate()
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [entries, canvasRef])

  return null
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ArtGenerator({ entries, height = 300 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  return (
    <div style={{ width: '100%', height, borderRadius: 20, overflow: 'hidden', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
      <FluidMode entries={entries} canvasRef={canvasRef} />
    </div>
  )
}
