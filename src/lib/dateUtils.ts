/** Converts a Date to ISO date string YYYY-MM-DD (local time, no UTC shift). */
export function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayISO(): string {
  return toISO(new Date())
}

/**
 * Returns 7 Date objects for the ISO week (Mon-Sun) containing anchorDate.
 */
export function getWeekDays(anchorDate: Date): Date[] {
  const d = new Date(anchorDate)
  const dow = d.getDay()
  const offset = dow === 0 ? -6 : 1 - dow // shift to Monday
  d.setDate(d.getDate() + offset)
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(d)
    day.setDate(d.getDate() + i)
    return day
  })
}

/**
 * Returns cells for a calendar month grid (Monday-first).
 * null values represent empty leading/trailing cells.
 */
export function getMonthCells(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1)
  const lastDay  = new Date(year, month + 1, 0)
  const startDow = firstDay.getDay()
  const offset   = startDow === 0 ? 6 : startDow - 1 // Monday = 0
  const cells: (Date | null)[] = []
  for (let i = 0; i < offset; i++) cells.push(null)
  for (let i = 1; i <= lastDay.getDate(); i++) cells.push(new Date(year, month, i))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

/**
 * Returns columns (weeks) for a contribution-graph yearly view.
 * Each column has 7 slots (Mon-Sun), null = day outside the year.
 */
export function getYearColumns(year: number): (Date | null)[][] {
  const jan1 = new Date(year, 0, 1)
  const dow   = jan1.getDay()
  const offset = dow === 0 ? -6 : 1 - dow
  const firstMon = new Date(jan1)
  firstMon.setDate(jan1.getDate() + offset)

  const cols: (Date | null)[][] = []
  const curr  = new Date(firstMon)
  const dec31 = new Date(year, 11, 31)

  while (curr <= dec31) {
    const col: (Date | null)[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(curr)
      d.setDate(curr.getDate() + i)
      col.push(d.getFullYear() === year ? d : null)
    }
    cols.push(col)
    curr.setDate(curr.getDate() + 7)
  }
  return cols
}

export const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const MONTH_FULL  = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
export const DAY_INITIAL = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
export const DAY_SHORT   = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
