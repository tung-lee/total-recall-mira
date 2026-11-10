// Hand drawn SVG product art and the two spiky mascots, so no photo assets are needed.
import type { CSSProperties } from 'react'

type ArtProps = { color?: string; tint?: string; label?: string; className?: string; style?: CSSProperties }

export function Lipstick({ color = '#A24A57', className, style }: ArtProps) {
  return (
    <svg viewBox="0 0 80 200" className={className} style={style} aria-hidden>
      <defs>
        <linearGradient id={`lmetal${color}`} x1="0" x2="1">
          <stop offset="0" stopColor="#d9d9de" />
          <stop offset=".45" stopColor="#ffffff" />
          <stop offset="1" stopColor="#a9a9b2" />
        </linearGradient>
        <linearGradient id={`lbullet${color}`} x1="0" x2="1">
          <stop offset="0" stopColor={color} />
          <stop offset=".4" stopColor={color} stopOpacity=".75" />
          <stop offset="1" stopColor={color} />
        </linearGradient>
      </defs>
      <path d="M24 70 L24 30 Q24 14 40 8 L56 4 L56 70 Z" fill={`url(#lbullet${color})`} />
      <path d="M30 60 L30 30 Q31 20 40 15" stroke="#fff" strokeOpacity=".45" strokeWidth="3" fill="none" />
      <rect x="20" y="68" width="40" height="34" rx="3" fill={`url(#lmetal${color})`} />
      <rect x="16" y="100" width="48" height="96" rx="5" fill="#1d1d22" />
      <rect x="22" y="104" width="6" height="88" rx="3" fill="#fff" opacity=".18" />
    </svg>
  )
}

export function Bottle({ tint = '#E9F1FF', label = 'serum', className, style }: ArtProps) {
  return (
    <svg viewBox="0 0 110 200" className={className} style={style} aria-hidden>
      <rect x="42" y="6" width="26" height="22" rx="4" fill="#1d1d22" />
      <rect x="38" y="26" width="34" height="16" rx="3" fill="#2b2b31" />
      <rect x="14" y="40" width="82" height="154" rx="16" fill={tint} stroke="#00000010" />
      <rect x="22" y="48" width="10" height="138" rx="5" fill="#fff" opacity=".7" />
      <rect x="28" y="96" width="54" height="56" rx="6" fill="#fff" />
      <text x="55" y="122" textAnchor="middle" fontFamily="Inter Tight, sans-serif" fontWeight="700" fontSize="11" fill="#111">{label}</text>
      <line x1="38" x2="72" y1="134" y2="134" stroke="#111" strokeOpacity=".25" />
      <line x1="42" x2="68" y1="141" y2="141" stroke="#111" strokeOpacity=".15" />
    </svg>
  )
}

export function Jar({ tint = '#FFF6E5', label = 'cream', className, style }: ArtProps) {
  return (
    <svg viewBox="0 0 160 120" className={className} style={style} aria-hidden>
      <rect x="18" y="8" width="124" height="34" rx="8" fill="#1d1d22" />
      <rect x="26" y="14" width="40" height="5" rx="2.5" fill="#fff" opacity=".2" />
      <rect x="12" y="40" width="136" height="74" rx="14" fill={tint} stroke="#00000012" />
      <rect x="20" y="48" width="10" height="58" rx="5" fill="#fff" opacity=".8" />
      <text x="80" y="84" textAnchor="middle" fontFamily="Inter Tight, sans-serif" fontWeight="700" fontSize="14" fill="#111">{label}</text>
    </svg>
  )
}

export function Tube({ tint = '#E8F6EA', label = 'gel', className, style }: ArtProps) {
  return (
    <svg viewBox="0 0 90 200" className={className} style={style} aria-hidden>
      <path d="M10 6 H80 L74 160 Q72 172 60 172 H30 Q18 172 16 160 Z" fill={tint} stroke="#00000012" />
      <rect x="10" y="4" width="70" height="10" rx="2" fill="#e4e4e8" />
      <rect x="28" y="170" width="34" height="26" rx="5" fill="#1d1d22" />
      <rect x="20" y="20" width="8" height="130" rx="4" fill="#fff" opacity=".7" />
      <text x="47" y="96" textAnchor="middle" fontFamily="Inter Tight, sans-serif" fontWeight="700" fontSize="12" fill="#111" transform="rotate(-90 47 92)">{label}</text>
    </svg>
  )
}

export function ProductArt({ kind, tint, label, className }: { kind: string; tint: string; label: string; className?: string }) {
  if (kind === 'cream') return <Jar tint={tint} label={label} className={className} />
  if (kind === 'gel') return <Tube tint={tint} label={label} className={className} />
  return <Bottle tint={tint} label={label} className={className} />
}

// Spiky "sun" blob mascot with a face. mood: happy (^^) or squint (><).
export function Blob({ color = '#F59AC9', mood = 'happy', size = 120, className, style }: { color?: string; mood?: 'happy' | 'squint' | 'wink'; size?: number; className?: string; style?: CSSProperties }) {
  const spikes = 12
  const pts: string[] = []
  for (let i = 0; i < spikes * 2; i++) {
    const a = (Math.PI * i) / spikes
    const r = i % 2 === 0 ? 48 : 38
    pts.push(`${50 + r * Math.cos(a)},${50 + r * Math.sin(a)}`)
  }
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} style={style} aria-hidden>
      <defs>
        <radialGradient id={`bg${color}`} cx=".35" cy=".3" r=".8">
          <stop offset="0" stopColor="#fff" stopOpacity=".55" />
          <stop offset=".35" stopColor={color} />
          <stop offset="1" stopColor={color} stopOpacity=".85" />
        </radialGradient>
      </defs>
      <polygon points={pts.join(' ')} fill={`url(#bg${color})`} stroke={color} strokeWidth="6" strokeLinejoin="round" />
      {mood === 'happy' && (
        <g stroke="#1b1b1f" strokeWidth="4.5" fill="none" strokeLinecap="round">
          <path d="M33 52 Q38 44 43 52" />
          <path d="M57 52 Q62 44 67 52" />
        </g>
      )}
      {mood === 'squint' && (
        <g stroke="#1b1b1f" strokeWidth="4.5" fill="none" strokeLinecap="round">
          <path d="M32 45 L42 50 L32 55" />
          <path d="M68 45 L58 50 L68 55" />
        </g>
      )}
      {mood === 'wink' && (
        <g stroke="#1b1b1f" strokeWidth="4.5" fill="none" strokeLinecap="round">
          <path d="M33 52 Q38 44 43 52" />
          <circle cx="62" cy="49" r="2.5" fill="#1b1b1f" />
          <path d="M44 62 Q50 67 56 62" />
        </g>
      )}
    </svg>
  )
}

export function Heart({ color = '#F59AC9', size = 30, style }: { color?: string; size?: number; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 32 30" width={size} height={size} style={style} aria-hidden>
      <path d="M16 28 C6 20 1 15 1 9 A7.5 7.5 0 0 1 16 6 A7.5 7.5 0 0 1 31 9 C31 15 26 20 16 28 Z" fill={color} />
    </svg>
  )
}

export function Sparkle({ color = '#9BE15D', size = 30, style }: { color?: string; size?: number; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} style={style} aria-hidden>
      <path d="M16 1 C17.5 11 21 14.5 31 16 C21 17.5 17.5 21 16 31 C14.5 21 11 17.5 1 16 C11 14.5 14.5 11 16 1 Z" fill={color} />
    </svg>
  )
}
