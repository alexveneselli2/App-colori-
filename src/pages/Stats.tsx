import { useEffect, useMemo, useState } from 'react'
import { useMoodStore } from '../store/useMoodStore'
import { useAuthStore } from '../store/useAuthStore'
import { MOOD_PALETTE } from '../constants/moods'
import { toISO } from '../lib/dateUtils'

// ── helpers ────────────────────────────────────────────────────────────────────

function needsLight(hex: string) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return (0.299*r + 0.587*g + 0.114*b)/255 < 0.55
}

function hexAlpha(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return `rgba(${r},${g},${b},${alpha})`
}

const MONTHS_IT = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic']
const DAYS_IT   = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab']

// Valence map: how positive/negative each mood is (-1 to +1)
const VALENCE: Record<string, number> = {
  '#FFD000': 0.9,  // Gioia
  '#FF6B00': 0.7,  // Euforia
  '#FF0A54': 0.5,  // Estasi
  '#D62839': 0.3,  // Passione
  '#FF8FAB': 0.6,  // Tenerezza
  '#C77DFF': 0.2,  // Nostalgia
  '#7B2FBE': 0.1,  // Meraviglia
  '#FB5607': 0.5,  // Anticipazione
  '#FFBE0B': 0.8,  // Sorpresa
  '#80ED99': 0.85, // Speranza
  '#52B788': 0.8,  // Gratitudine
  '#2D6A4F': 0.7,  // Fiducia
  '#00B4D8': 0.6,  // Calma
  '#90E0EF': 0.65, // Serenità
  '#6B7A8D': -0.1, // Solitudine
  '#3A5A8C': -0.2, // Malinconia
  '#415A77': -0.4, // Tristezza
  '#A30015': -0.7, // Rabbia
  '#1B1B2F': -0.8, // Paura
  '#6B6B3A': -0.5, // Disgusto
}

// AI-like insights generator based on real patterns
function generateInsights(entries: {date: string; color_hex: string}[]): string[] {
  if (entries.length < 3) return ['Registra almeno 3 giorni per ricevere suggerimenti personalizzati.']

  const insights: string[] = []
  const sorted = [...entries].sort((a,b) => b.date.localeCompare(a.date))
  const recent = sorted.slice(0, 7)
  const older  = sorted.slice(7, 14)

  // Average valence recent vs older
  const avg = (arr: typeof entries) => {
    const vals = arr.map(e => VALENCE[e.color_hex] ?? 0)
    return vals.reduce((a,b) => a+b, 0) / (vals.length || 1)
  }
  const recentAvg = avg(recent)
  const olderAvg  = avg(older)
  const diff = recentAvg - olderAvg

  if (diff > 0.2)  insights.push('Il tuo umore è migliorato significativamente rispetto alla settimana scorsa. Qualcosa di positivo sta succedendo! ✦')
  if (diff < -0.2) insights.push('Questa settimana sembra più pesante delle ultime. Potresti concederti un momento di cura di te stesso.')

  // Streak of positive days
  let posStreak = 0
  for (const e of sorted) {
    if ((VALENCE[e.color_hex] ?? 0) >= 0.5) posStreak++
    else break
  }
  if (posStreak >= 3) insights.push(`Stai vivendo ${posStreak} giorni consecutivi di emozioni positive. Alimenta questo slancio!`)

  // Weekend vs weekday pattern
  const weekdayAvg = avg(entries.filter(e => {
    const d = new Date(e.date).getDay(); return d >= 1 && d <= 5
  }))
  const weekendAvg = avg(entries.filter(e => {
    const d = new Date(e.date).getDay(); return d === 0 || d === 6
  }))
  if (entries.filter(e => [0,6].includes(new Date(e.date).getDay())).length >= 2) {
    if (weekendAvg - weekdayAvg > 0.25) insights.push('Ti senti molto meglio nel weekend. Potresti portare qualcosa del weekend nella tua routine settimanale.')
    if (weekdayAvg - weekendAvg > 0.25) insights.push('I tuoi giorni lavorativi sembrano più positivi del weekend: sei una persona che ama ciò che fa.')
  }

  // Dominant mood
  const freq: Record<string, number> = {}
  entries.forEach(e => { freq[e.color_hex] = (freq[e.color_hex] || 0) + 1 })
  const dominant = Object.entries(freq).sort((a,b) => b[1]-a[1])[0]
  if (dominant) {
    const mood = MOOD_PALETTE.find(m => m.hex === dominant[0])
    if (mood) insights.push(`"${mood.label}" è la tua emozione più frequente (${dominant[1]} volte). È parte di chi sei.`)
  }

  // Variability
  const vals = entries.map(e => VALENCE[e.color_hex] ?? 0)
  const mean = vals.reduce((a,b) => a+b, 0) / vals.length
  const variance = vals.reduce((a,b) => a + (b-mean)**2, 0) / vals.length
  const stdDev = Math.sqrt(variance)
  if (stdDev > 0.45) insights.push('Il tuo spettro emotivo è molto ampio — sei una persona sensibile e vissuta.')
  if (stdDev < 0.15 && entries.length >= 7) insights.push('Hai una stabilità emotiva notevole. Questa costanza è una forza.')

  // Low mood streak alert
  let negStreak = 0
  for (const e of sorted) {
    if ((VALENCE[e.color_hex] ?? 0) <= -0.3) negStreak++
    else break
  }
  if (negStreak >= 3) insights.push(`Hai registrato ${negStreak} giorni difficili di fila. Considera di parlare con qualcuno di cui ti fidi.`)

  // Time of month (more negative mid-month?)
  // Morning affirmation based on today's trend
  if (recentAvg >= 0.6) insights.push('Il tuo stato emotivo recente è luminoso. Condividi questa energia con chi ti è vicino.')

  return insights.length > 0 ? insights : ['Continua a registrare i tuoi colori per ricevere insights sempre più precisi.']
}

// ── types ──────────────────────────────────────────────────────────────────────

type Period = 'month' | 'year' | 'all'

// ── component ──────────────────────────────────────────────────────────────────

export default function Stats() {
  const { profile } = useAuthStore()
  const { entries, fetchEntries } = useMoodStore()
  const [loaded, setLoaded] = useState(false)
  const [period, setPeriod] = useState<Period>('month')
  const [focusMood, setFocusMood] = useState<string | null>(null)
  const [insightIdx, setInsightIdx] = useState(0)

  useEffect(() => {
    if (profile && !loaded) {
      fetchEntries(profile.id)
        .then(() => setLoaded(true))
        .catch(() => setLoaded(true))
    }
  }, [profile, loaded, fetchEntries])

  // Filter entries by period
  const today = new Date()
  const filtered = useMemo(() => {
    const e = [...entries].sort((a,b) => b.date.localeCompare(a.date))
    if (period === 'month') {
      const cutoff = new Date(today.getFullYear(), today.getMonth(), 1)
      return e.filter(x => new Date(x.date) >= cutoff)
    }
    if (period === 'year') {
      return e.filter(x => x.date.startsWith(String(today.getFullYear())))
    }
    return e
  }, [entries, period])

  // Frequency map
  const freq = useMemo(() => {
    const map: Record<string, number> = {}
    filtered.forEach(e => { map[e.color_hex] = (map[e.color_hex] || 0) + 1 })
    return Object.entries(map).sort((a,b) => b[1]-a[1])
  }, [filtered])

  const maxFreq = freq[0]?.[1] ?? 1

  // Day-of-week patterns (most common mood per day)
  const dowPattern = useMemo(() => {
    const buckets: Record<number, Record<string, number>> = {0:{},1:{},2:{},3:{},4:{},5:{},6:{}}
    filtered.forEach(e => {
      const d = new Date(e.date).getDay()
      buckets[d][e.color_hex] = (buckets[d][e.color_hex] || 0) + 1
    })
    return Array.from({length:7}, (_,i) => {
      const b = buckets[i]
      const top = Object.entries(b).sort((a,b) => b[1]-a[1])[0]
      return top ? top[0] : null
    })
  }, [filtered])

  // Streak calculation
  const { currentStreak, bestStreak } = useMemo(() => {
    const dates = new Set(entries.map(e => e.date))
    let cur = 0, best = 0, d = new Date()
    while (dates.has(toISO(d))) { cur++; d.setDate(d.getDate()-1) }
    // best streak
    const sorted = [...dates].sort()
    let s = 1, b2 = 1
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i-1]), curr = new Date(sorted[i])
      const diff = (curr.getTime() - prev.getTime()) / 86400000
      if (diff === 1) { s++; if (s > b2) b2 = s } else s = 1
    }
    return { currentStreak: cur, bestStreak: Math.max(b2, cur) }
  }, [entries])

  // Last 30 days strip
  const last30 = useMemo(() => {
    const map = new Map(entries.map(e => [e.date, e.color_hex]))
    return Array.from({length:30}, (_,i) => {
      const d = new Date(); d.setDate(d.getDate() - (29 - i))
      return { date: toISO(d), color: map.get(toISO(d)) ?? null }
    })
  }, [entries])

  // Monthly valence sparkline (last 12 months)
  const monthlyValence = useMemo(() => {
    return Array.from({length:12}, (_,i) => {
      const m = (today.getMonth() - 11 + i + 12) % 12
      const y = today.getFullYear() + (today.getMonth() - 11 + i < 0 ? -1 : 0)
      const key = `${y}-${String(m+1).padStart(2,'0')}`
      const mes = entries.filter(e => e.date.startsWith(key))
      if (mes.length === 0) return { label: MONTHS_IT[m], val: null }
      const avg = mes.reduce((a,e) => a + (VALENCE[e.color_hex] ?? 0), 0) / mes.length
      return { label: MONTHS_IT[m], val: avg }
    })
  }, [entries])

  // AI insights
  const insights = useMemo(() => generateInsights(entries), [entries])

  if (!loaded) {
    return (
      <div className="page-top flex items-center justify-center" style={{ minHeight: 300 }}>
        <div style={{ width:8, height:8, borderRadius:'50%', backgroundColor:'#FFD000', animation:'ping 1s cubic-bezier(0,0,0.2,1) infinite' }} />
      </div>
    )
  }

  const PeriodBtn = ({ p, label }: { p: Period; label: string }) => (
    <button
      onClick={() => setPeriod(p)}
      className="flex-1 py-2 rounded-xl text-[12px] font-semibold transition-all active:scale-[0.97]"
      style={{
        background: period === p ? 'var(--color-surface-raised)' : 'transparent',
        color:      period === p ? 'var(--color-foreground)'     : 'var(--color-muted)',
        boxShadow:  period === p ? 'var(--shadow-xs)'            : undefined,
      }}
    >{label}</button>
  )

  return (
    <div className="page-top px-5 pb-4 space-y-6">

      {/* Header */}
      <div className="pb-1">
        <h1 className="text-[30px] font-extrabold leading-tight tracking-[-0.04em]" style={{ color: 'var(--color-foreground)' }}>
          Analisi
        </h1>
        <p className="text-[13px]" style={{ color: 'var(--color-muted)' }}>
          I pattern del tuo mondo interiore
        </p>
      </div>

      {/* Period filter */}
      <div className="flex p-1 gap-1 rounded-2xl" style={{ background: 'var(--color-subtle)' }}>
        <PeriodBtn p="month" label="Questo mese" />
        <PeriodBtn p="year"  label="Quest'anno" />
        <PeriodBtn p="all"   label="Tutto" />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { value: filtered.length, label: 'giorni', color: '#FFD000' },
          { value: currentStreak,   label: 'streak',  color: '#FF0A54' },
          { value: bestStreak,      label: 'record',  color: '#C77DFF' },
        ].map(({ value, label, color }) => (
          <div key={label} className="card p-4 flex flex-col items-center text-center gap-1">
            <span
              className="text-[28px] font-extrabold leading-none tracking-[-0.04em]"
              style={{ color }}
            >{value}</span>
            <span className="text-[10px] uppercase tracking-[0.1em]" style={{ color: 'var(--color-muted)' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* AI Insights */}
      {insights.length > 0 && (
        <div
          className="card p-5 cursor-pointer active:scale-[0.99] transition-transform"
          onClick={() => setInsightIdx(i => (i + 1) % insights.length)}
          style={{ borderColor: hexAlpha('#C77DFF', 0.35) }}
        >
          <div className="flex items-start gap-3">
            <div className="shrink-0 mt-0.5" style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'linear-gradient(135deg, #C77DFF, #FF0A54)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 12 }}>✦</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-1.5" style={{ color: '#C77DFF' }}>
                Insight personale {insights.length > 1 ? `(${insightIdx+1}/${insights.length})` : ''}
              </p>
              <p className="text-[13px] leading-relaxed" style={{ color: 'var(--color-foreground)' }}>
                {insights[insightIdx]}
              </p>
              {insights.length > 1 && (
                <p className="text-[10px] mt-2" style={{ color: 'var(--color-muted)' }}>
                  Tocca per il prossimo →
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Frequency chart */}
      {freq.length > 0 && (
        <div className="card p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.13em] mb-4" style={{ color: 'var(--color-muted)' }}>
            Emozioni più frequenti
          </p>
          <div className="space-y-2.5">
            {freq.slice(0, 8).map(([hex, count]) => {
              const mood  = MOOD_PALETTE.find(m => m.hex === hex)
              const pct   = (count / maxFreq) * 100
              const focus = focusMood === hex
              return (
                <div
                  key={hex}
                  className="cursor-pointer"
                  onClick={() => setFocusMood(focus ? null : hex)}
                  style={{ opacity: focusMood && !focus ? 0.35 : 1, transition: 'opacity 0.2s' }}
                >
                  <div className="flex items-center gap-2.5 mb-1">
                    <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: hex, flexShrink: 0 }} />
                    <span className="text-[12px] font-medium flex-1" style={{ color: 'var(--color-foreground)' }}>
                      {mood?.label ?? 'Personalizzato'}
                    </span>
                    <span className="text-[11px] tabular-nums" style={{ color: 'var(--color-muted)' }}>{count}×</span>
                  </div>
                  <div className="rounded-full overflow-hidden" style={{ height: 6, background: 'var(--color-subtle)' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${pct}%`,
                        backgroundColor: hex,
                        borderRadius: 9999,
                        transition: 'width 0.8s cubic-bezier(0.22,1,0.36,1)',
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Day-of-week pattern */}
      <div className="card p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.13em] mb-4" style={{ color: 'var(--color-muted)' }}>
          Ritmo settimanale
        </p>
        <div className="flex gap-2 justify-between">
          {dowPattern.map((hex, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
              <div style={{
                width: '100%', aspectRatio: '1',
                borderRadius: 10,
                backgroundColor: hex ?? 'var(--color-subtle)',
                boxShadow: hex ? `0 2px 12px ${hexAlpha(hex, 0.4)}` : undefined,
                transition: 'background 0.3s',
              }} />
              <span className="text-[9px] uppercase tracking-[0.06em]" style={{ color: 'var(--color-muted)' }}>
                {DAYS_IT[(i + 1) % 7]}
              </span>
            </div>
          ))}
        </div>
        <p className="text-[10px] mt-3" style={{ color: 'var(--color-muted)' }}>
          Il colore più comune per ogni giorno della settimana
        </p>
      </div>

      {/* Last 30 days strip */}
      <div className="card p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.13em] mb-4" style={{ color: 'var(--color-muted)' }}>
          Ultimi 30 giorni
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 4 }}>
          {last30.map(({ date, color }) => (
            <div
              key={date}
              title={date}
              style={{
                aspectRatio: '1',
                borderRadius: 6,
                backgroundColor: color ?? 'var(--color-subtle)',
                boxShadow: color ? `0 1px 6px ${hexAlpha(color, 0.35)}` : undefined,
                transition: 'transform 0.15s',
                cursor: color ? 'default' : undefined,
              }}
            />
          ))}
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-[9px]" style={{ color: 'var(--color-muted)' }}>30 giorni fa</span>
          <span className="text-[9px]" style={{ color: 'var(--color-muted)' }}>oggi</span>
        </div>
      </div>

      {/* Monthly valence sparkline */}
      {entries.length >= 10 && (
        <div className="card p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.13em] mb-4" style={{ color: 'var(--color-muted)' }}>
            Andamento mensile del benessere
          </p>
          <div className="flex items-end gap-1.5" style={{ height: 60 }}>
            {monthlyValence.map(({ label, val }, i) => {
              const h = val !== null ? Math.max(4, Math.round(((val + 1) / 2) * 60)) : 0
              const color = val === null ? 'var(--color-subtle)'
                : val >= 0.5 ? '#52B788'
                : val >= 0   ? '#FFD000'
                : val >= -0.3? '#FB5607'
                : '#A30015'
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div style={{
                    width: '100%',
                    height: val !== null ? h : 4,
                    backgroundColor: color,
                    borderRadius: 4,
                    transition: 'height 0.6s cubic-bezier(0.22,1,0.36,1)',
                    alignSelf: 'flex-end',
                  }} />
                  <span style={{ fontSize: 7, color: 'var(--color-muted)', letterSpacing: '0.03em' }}>{label}</span>
                </div>
              )
            })}
          </div>
          <div className="flex justify-between mt-2">
            <div className="flex items-center gap-1">
              <div style={{ width:7, height:7, borderRadius:'50%', backgroundColor:'#52B788' }} />
              <span className="text-[9px]" style={{ color: 'var(--color-muted)' }}>Positivo</span>
            </div>
            <div className="flex items-center gap-1">
              <div style={{ width:7, height:7, borderRadius:'50%', backgroundColor:'#A30015' }} />
              <span className="text-[9px]" style={{ color: 'var(--color-muted)' }}>Difficile</span>
            </div>
          </div>
        </div>
      )}

      {/* Emotional spectrum */}
      {filtered.length >= 3 && (
        <div className="card p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.13em] mb-4" style={{ color: 'var(--color-muted)' }}>
            Il tuo spettro emotivo
          </p>
          <div style={{ display: 'flex', height: 28, borderRadius: 14, overflow: 'hidden', gap: 1 }}>
            {freq.map(([hex, count]) => (
              <div
                key={hex}
                style={{
                  flex: count,
                  backgroundColor: hex,
                  transition: 'flex 0.8s cubic-bezier(0.22,1,0.36,1)',
                }}
                title={MOOD_PALETTE.find(m => m.hex === hex)?.label ?? hex}
              />
            ))}
          </div>
          <p className="text-[10px] mt-3" style={{ color: 'var(--color-muted)' }}>
            La larghezza di ogni colore rispecchia la sua frequenza nel periodo selezionato
          </p>
        </div>
      )}

      {/* Positive/negative ratio */}
      {filtered.length >= 5 && (() => {
        const pos = filtered.filter(e => (VALENCE[e.color_hex] ?? 0) >= 0.4).length
        const neu = filtered.filter(e => {
          const v = VALENCE[e.color_hex] ?? 0; return v > -0.4 && v < 0.4
        }).length
        const neg = filtered.filter(e => (VALENCE[e.color_hex] ?? 0) <= -0.4).length
        const total = pos + neu + neg || 1
        return (
          <div className="card p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.13em] mb-4" style={{ color: 'var(--color-muted)' }}>
              Equilibrio emotivo
            </p>
            <div className="flex gap-1 mb-3" style={{ height: 12, borderRadius: 99 }}>
              {pos > 0 && <div style={{ flex: pos, background: '#52B788', borderRadius: 99 }} />}
              {neu > 0 && <div style={{ flex: neu, background: '#FFD000', borderRadius: 99 }} />}
              {neg > 0 && <div style={{ flex: neg, background: '#FF0A54', borderRadius: 99 }} />}
            </div>
            <div className="flex justify-between text-[11px]">
              <span style={{ color: '#52B788' }}>✦ Positivo {Math.round((pos/total)*100)}%</span>
              <span style={{ color: '#B5A800' }}>● Neutro {Math.round((neu/total)*100)}%</span>
              <span style={{ color: '#FF0A54' }}>▼ Difficile {Math.round((neg/total)*100)}%</span>
            </div>
          </div>
        )
      })()}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="card p-8 text-center">
          <div className="text-[36px] mb-3">🎨</div>
          <p className="text-[15px] font-semibold mb-1" style={{ color: 'var(--color-foreground)' }}>
            Nessun dato per questo periodo
          </p>
          <p className="text-[13px]" style={{ color: 'var(--color-muted)' }}>
            Registra il tuo colore oggi per iniziare ad analizzare le tue emozioni.
          </p>
        </div>
      )}

    </div>
  )
}
