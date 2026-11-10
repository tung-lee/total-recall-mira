import type { Cents, Fact, MemoryKind, Pocket } from '@mira/money'

export type MemoryMode = 'walrus' | 'preview'
export type CashMode = 'sui' | 'preview'
export type JobStatus = 'queued' | 'writing' | 'done' | 'failed'
export type Receipt = { digest: string; url: string | null }

export type RecalledLine = {
  key: string
  kind: MemoryKind
  line: string
  fact: Fact
  status: 'stored' | JobStatus
  blobId: string | null
  createdAt: string | null
}

export type Health = {
  ok: boolean
  memory: { mode: MemoryMode; lines: Record<JobStatus, number> }
  cash: { mode: CashMode }
  tatum: { calls: Record<string, number>; lastHour: number; fallback: { since: number; reason: string } | null } | null
}

export class ApiError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

async function call<T>(path: string, init?: { method: 'POST'; body: unknown }): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, init ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(init.body) } : undefined)
  } catch {
    throw new ApiError('offline', "I can't reach the server right now. Check your connection and try again.")
  }
  const json: unknown = await res.json().catch(() => ({}))
  if (!res.ok) {
    const body = (typeof json === 'object' && json !== null ? json : {}) as { error?: string; message?: string }
    throw new ApiError(body.error ?? 'failed', body.message ?? 'Something went wrong on my side. Try again?')
  }
  return json as T
}

const q = (params: Record<string, string>) => new URLSearchParams(params).toString()

export const api = {
  health: () => call<Health>('/api/health'),
  recall: (user: string) => call<{ mode: MemoryMode; lines: RecalledLine[] }>(`/api/memory?${q({ user })}`),
  remember: (user: string, facts: Fact[]) =>
    call<{ jobs: Array<{ key: string; line: string; kind: MemoryKind; status: JobStatus; blobId: string | null }> }>('/api/memory', { method: 'POST', body: { user, facts } }),
  jobs: (user: string, keys: string[]) =>
    call<{ jobs: Array<{ key: string; status: JobStatus | 'unknown'; blobId: string | null }> }>(`/api/memory/jobs?${q({ user, keys: keys.join(',') })}`),
  pockets: (user: string, pockets: Pocket[]) => call<{ mode: CashMode; balances: Partial<Record<Pocket, Cents>> }>(`/api/cash?${q({ user, pockets: pockets.join(',') })}`),
  open: (user: string) =>
    call<{ mode: CashMode; seeded: boolean; receipt: Receipt | null; balances: Partial<Record<Pocket, Cents>> }>('/api/cash/open', { method: 'POST', body: { user } }),
  move: (user: string, from: Pocket, to: Pocket, cents: Cents) =>
    call<{ mode: CashMode; receipt: Receipt; balances: Partial<Record<Pocket, Cents>> }>('/api/cash/move', { method: 'POST', body: { user, from, to, cents } }),
}
