/**
 * Retry helper con backoff esponenziale.
 * Usato dalle chiamate Supabase per resistere a errori di rete temporanei.
 */

interface RetryOptions {
  retries?: number
  baseDelay?: number
  maxDelay?: number
  /** Se ritorna false l'errore non viene ritentato (es. errori 4xx). */
  shouldRetry?: (error: unknown) => boolean
}

export async function retry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const {
    retries = 2,
    baseDelay = 400,
    maxDelay = 3000,
    shouldRetry = defaultShouldRetry,
  } = opts

  let lastErr: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      if (attempt === retries || !shouldRetry(err)) throw err
      const delay = Math.min(maxDelay, baseDelay * 2 ** attempt)
      await new Promise(r => setTimeout(r, delay))
    }
  }
  throw lastErr
}

function defaultShouldRetry(err: unknown): boolean {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase()
  // Ritenta solo errori di rete / timeout — mai errori di validazione/auth
  return /timeout|network|fetch|load failed|failed to fetch|econn|enotfound/i.test(msg)
}
