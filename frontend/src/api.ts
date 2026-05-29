import type { Counter } from './types'

export type ServerCounter = Counter

const JSON_HEADERS = { 'Content-Type': 'application/json' }

const getCookie = (name: string): string | null => {
  const cookie = document.cookie
    .split('; ')
    .find((chunk) => chunk.startsWith(`${name}=`))
  return cookie?.split('=').slice(1).join('=') ?? null
}

const csrfHeaders = (): Record<string, string> => {
  const token = getCookie('csrftoken')
  return token ? { 'X-CSRFToken': token } : {}
}

const fetchJson = async <T>(input: RequestInfo, init?: RequestInit): Promise<T> => {
  const response = await fetch(input, {
    credentials: 'include',
    ...init,
  })

  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`)
  }
  return (await response.json()) as T
}

export const sessionStatus = async (): Promise<{ isAuthenticated: boolean; username?: string }> =>
  await fetchJson('/api/session')

export const login = async (username: string, password: string): Promise<{ username: string; counters: ServerCounter[] }> =>
  await fetchJson('/api/auth/login', {
    method: 'POST',
    headers: { ...JSON_HEADERS, ...csrfHeaders() },
    body: JSON.stringify({ username, password }),
  })

export const logout = async (): Promise<void> => {
  await fetchJson('/api/auth/logout', {
    method: 'POST',
    headers: csrfHeaders(),
  })
}

export const fetchCounters = async (): Promise<{ counters: ServerCounter[] }> =>
  await fetchJson('/api/counters')

export const syncCounters = async (
  upserts: Counter[],
  deletedIds: string[],
): Promise<{ counters: ServerCounter[] }> =>
  await fetchJson('/api/counters/sync', {
    method: 'POST',
    headers: { ...JSON_HEADERS, ...csrfHeaders() },
    body: JSON.stringify({ upserts, deletedIds }),
  })
