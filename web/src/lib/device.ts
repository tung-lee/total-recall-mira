// What this device keeps (ADR-0003): the user's Mira code, the ledger with exact amounts and labels, goal
// labels, and every memory line it sent or recalled. Only typed facts ever leave it.
import { factLine, type Cents, type Fact, type GoalKind, type MemoryKind, type Pocket, type Spend } from '@mira/money'

export type LineStatus = 'pending' | 'queued' | 'writing' | 'done' | 'failed' | 'stored'

export type MemoryLine = {
  fact: Fact
  text: string
  kind: MemoryKind | null
  key: string | null
  status: LineStatus
  blobId: string | null
}

export type Device = {
  version: 1
  user: string
  spends: Spend[]
  labels: Partial<Record<GoalKind, string>>
  lines: MemoryLine[]
  pockets: Partial<Record<Pocket, Cents>>
}

const STORE = 'mira.device.v1'
const CODE = /^[a-z0-9]{16,40}$/

export function isCode(value: string): boolean {
  return CODE.test(value)
}

/** A random 128-bit Mira code in lowercase base32. */
export function newCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  const alphabet = 'abcdefghijklmnopqrstuvwxyz234567'
  let bits = 0
  let value = 0
  let out = ''
  for (const b of bytes) {
    value = (value << 8) | b
    bits += 8
    while (bits >= 5) {
      out += alphabet[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += alphabet[(value << (5 - bits)) & 31]
  return out
}

export function freshDevice(user: string = newCode()): Device {
  return { version: 1, user, spends: [], labels: {}, lines: [], pockets: {} }
}

export function loadDevice(): Device {
  try {
    const raw = localStorage.getItem(STORE)
    if (!raw) return freshDevice()
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed === 'object' && parsed !== null && 'version' in parsed && parsed.version === 1 && 'user' in parsed && typeof parsed.user === 'string' && isCode(parsed.user)) {
      return { ...freshDevice(parsed.user), ...(parsed as Partial<Device>) }
    }
  } catch {
    // unreadable storage: start fresh rather than fail the chat
  }
  return freshDevice()
}

export function saveDevice(d: Device): void {
  try {
    localStorage.setItem(STORE, JSON.stringify(d))
  } catch {
    // storage blocked (private mode): the device state lasts for this page only
  }
}

export function clearDevice(): void {
  try {
    localStorage.removeItem(STORE)
  } catch {
    // storage blocked: nothing to clear
  }
}

/** Adds facts the device hasn't sent yet, as pending lines. A line already known keeps its state. */
export function addFacts(d: Device, facts: readonly Fact[]): Device {
  const known = new Set(d.lines.map((l) => l.text))
  const added: MemoryLine[] = facts
    .map((fact) => ({ fact, text: factLine(fact), kind: null, key: null, status: 'pending' as const, blobId: null }))
    .filter((l) => !known.has(l.text))
  return added.length ? { ...d, lines: [...d.lines, ...added] } : d
}
