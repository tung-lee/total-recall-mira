import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { CATEGORY_EMOJI, CATEGORY_LABEL, type Fact, factKey, type Learned, usd } from '@mira/money'
import { Blob } from '../ui/Art'
import type { Health } from '../lib/api'
import type { Device, MemoryLine } from '../lib/device'
import { factEffect, factText, monthName, reasonText } from './describe'
import { EXAMPLES, useMira, type AdviceView, type BudgetView, type GoalView, type Modes, type MovedView, type Msg, type Overview, type SpendView, type Step } from './useMira'
import './chat.css'

export default function Chat() {
  const m = useMira()
  const [draft, setDraft] = useState('')
  const [sheet, setSheet] = useState(false)
  const [hood, setHood] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [m.msgs, m.typing, m.chips])

  const submit = () => {
    if (!draft.trim() || m.busy) return
    m.send(draft)
    setDraft('')
  }

  const sayIt = (text: string) => m.act({ type: 'say', text })

  const openHood = () => {
    setSheet(false)
    setHood(true)
    void m.refreshHealth()
  }

  const stamp = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

  return (
    <div className="chat-stage">
      <a className="chat-back-link" href="#/">← mira</a>

      <aside className="side left" aria-label="How Mira works">
        <HowItWorks />
        <TryPanel onSay={sayIt} busy={m.busy} />
      </aside>

      <div className="phone">
        <div className="phone-island" />
        <div className="screen">
          <div className="statusbar">
            <span>{stamp.replace(/\s?[AP]M/i, '')}</span>
            <span className="sb-icons">
              <svg width="18" height="11" viewBox="0 0 18 11"><rect x="0" y="7" width="3" height="4" rx="1" /><rect x="5" y="5" width="3" height="6" rx="1" /><rect x="10" y="2.5" width="3" height="8.5" rx="1" /><rect x="15" y="0" width="3" height="11" rx="1" /></svg>
              <svg width="25" height="12" viewBox="0 0 25 12"><rect x=".5" y=".5" width="21" height="11" rx="3.5" fill="none" stroke="currentColor" opacity=".4" /><rect x="2" y="2" width="16" height="8" rx="2" /><rect x="23" y="4" width="1.5" height="4" rx=".75" opacity=".4" /></svg>
            </span>
          </div>
          <header className="im-header">
            <a href="#/" className="im-back" aria-label="Back">
              <svg width="12" height="20" viewBox="0 0 12 20"><path d="M10 2 2 10l8 8" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </a>
            <div className="im-contact">
              <div className="im-avatar"><Blob size={44} mood="happy" color="#9BE15D" /></div>
              <div className="im-name">Mira <span>›</span></div>
              <div className="im-sub">money friend · learns as you text</div>
            </div>
            <ModeBadge modes={m.modes} onClick={openHood} />
          </header>
          <StatusStrip overview={m.overview} onClick={() => sayIt('how am i doing?')} busy={m.busy} />

          <div className="thread" ref={scroller} aria-live="polite" data-testid="thread">
            <div className="thread-stamp"><b>iMessage</b><br />Today {stamp}</div>
            {m.msgs.map((msg, i) => (
              <Row key={msg.id} msg={msg} last={i === m.msgs.length - 1 || m.msgs[i + 1]?.from !== msg.from} device={m.device} learned={m.learned} modes={m.modes} onSay={sayIt} busy={m.busy} />
            ))}
            {m.typing && (
              <div className="row mira last"><div className="bubble typing" aria-label="Mira is typing"><i /><i /><i /></div></div>
            )}
            {m.chips.length > 0 && (
              <div className="chips" aria-label="Suggestions">
                {m.chips.map((c) => (
                  <button key={c.label} className="chip" onClick={() => m.act(c.action)} disabled={m.busy}>{c.label}</button>
                ))}
              </div>
            )}
          </div>

          <div className="composer">
            <button className="plus" onClick={() => setSheet((s) => !s)} aria-label="More">
              <svg width="16" height="16" viewBox="0 0 16 16"><path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
            </button>
            <form className="field" onSubmit={(e) => { e.preventDefault(); submit() }}>
              <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={m.hint} aria-label="Message Mira" maxLength={300} />
              {draft.trim() ? (
                <button type="submit" className="send" aria-label="Send" disabled={m.busy}>
                  <svg width="14" height="14" viewBox="0 0 14 14"><path d="M7 12V2M2.5 6.5 7 2l4.5 4.5" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              ) : (
                <svg className="mic" width="14" height="20" viewBox="0 0 14 20"><rect x="3.5" y="1" width="7" height="12" rx="3.5" fill="currentColor" /><path d="M1 9.5a6 6 0 0 0 12 0M7 15.5V19" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" /></svg>
              )}
            </form>
          </div>

          {sheet && (
            <div className="sheet" role="dialog" aria-label="More">
              <button onClick={() => { setSheet(false); sayIt('help') }}><span>💡</span>What can I say?</button>
              <button onClick={() => { setSheet(false); sayIt('what do you know about me?') }}><span>🧠</span>What Mira knows</button>
              <button onClick={() => { setSheet(false); m.act({ type: 'handoff' }) }}><span>📱</span>Continue on my phone</button>
              <button onClick={openHood}><span>⚙️</span>Under the hood</button>
            </div>
          )}
          <div className="home-indicator" />

          {m.handoff && <Handoff code={m.device.user} onClose={() => m.setHandoff(false)} />}
          {hood && <Hood health={m.health} device={m.device} onClose={() => setHood(false)} onStartOver={m.startOver} />}
        </div>
      </div>

      <aside className="side right" aria-label="Mira's memory">
        <MemoryPanel lines={m.device.lines} learned={m.learned} modes={m.modes} overview={m.overview} onHood={openHood} />
      </aside>
    </div>
  )
}

function ModeBadge({ modes, onClick }: { modes: Modes; onClick: () => void }) {
  if (modes.memory === null) return null
  const live = modes.memory === 'walrus'
  return (
    <button
      className={`im-mode ${live ? 'live' : ''}`}
      onClick={onClick}
      aria-label="Under the hood"
      title={live ? 'Memory on Walrus mainnet, test money on Sui testnet' : 'Preview: no Walrus account or Sui keys on this server'}
      data-testid="mode-badge"
    >
      {live ? '🧠 Walrus' : 'preview'}{modes.cash === 'sui' ? ' · Sui' : ''}
    </button>
  )
}

function StatusStrip({ overview, onClick, busy }: { overview: Overview; onClick: () => void; busy: boolean }) {
  if (overview.budget === null && !overview.goal) return null
  return (
    <button className="status-strip" onClick={onClick} disabled={busy} aria-label="How am I doing?" data-testid="status-strip">
      {overview.budget !== null && overview.left !== null && (
        <span className="ss-item">
          <span className="ss-label">💰 {usd(Math.max(0, overview.left))} left</span>
          <Meter value={overview.spent} max={overview.budget} />
        </span>
      )}
      {overview.goal && (
        <span className="ss-item">
          <span className="ss-label">{overview.goal.emoji} {overview.goal.name} {usd(overview.goal.saved)} / {usd(overview.goal.target)}</span>
          <Meter value={overview.goal.saved} max={overview.goal.target} good />
        </span>
      )}
    </button>
  )
}

type RowProps = { msg: Msg; last: boolean; device: Device; learned: Learned; modes: Modes; onSay: (text: string) => void; busy: boolean }

function Row({ msg, last, device, learned, modes, onSay, busy }: RowProps) {
  const cls = `row ${msg.from} ${last ? 'last' : ''}`
  switch (msg.kind) {
    case 'text':
      return <div className={cls}><div className="bubble">{msg.text}</div></div>
    case 'trace':
      return <div className={cls}><TraceCard title={msg.title} steps={msg.steps} /></div>
    case 'spend':
      return <div className={cls}><SpendCard view={msg.view} /></div>
    case 'budget':
      return <div className={cls}><BudgetCard view={msg.view} /></div>
    case 'goal':
      return <div className={cls}><GoalCard view={msg.view} /></div>
    case 'advice':
      return <div className={cls}><AdviceCard view={msg.view} /></div>
    case 'moved':
      return <div className={cls}><MovedCard view={msg.view} /></div>
    case 'memory':
      return <div className={cls}><MemoryCard lines={device.lines} learned={learned} live={modes.memory === 'walrus'} /></div>
    case 'learned':
      return <div className="row center"><LearnedNote texts={msg.texts} lines={device.lines} live={modes.memory === 'walrus'} /></div>
    case 'howto':
      return <div className={cls}><div className="card howto-card"><HowItWorks compact /></div></div>
    case 'help':
      return <div className={cls}><HelpCard onSay={onSay} busy={busy} /></div>
  }
}

const STEPS: Array<[string, string, string]> = [
  ['💬', 'Text what you spend', '“coffee 5.5”: Mira files it and shows what’s left'],
  ['🎯', 'Set a budget and a goal', 'Your goal gets its own pocket of test money'],
  ['🤔', 'Ask before you buy', 'Mira checks prices, your caps and your goal'],
  ['🧠', 'She learns from you', 'Each lesson is a short line on Walrus Memory: no names, no exact amounts'],
]

function HowItWorks({ compact }: { compact?: boolean }) {
  return (
    <div className={`howto ${compact ? 'compact' : 'panel'}`} data-testid="howto">
      <div className="card-title">How Mira works</div>
      <ol>
        {STEPS.map(([emoji, title, sub]) => (
          <li key={title}>
            <span className="howto-emoji">{emoji}</span>
            <span><b>{title}</b><small>{sub}</small></span>
          </li>
        ))}
      </ol>
    </div>
  )
}

function TryPanel({ onSay, busy }: { onSay: (text: string) => void; busy: boolean }) {
  return (
    <div className="panel">
      <div className="card-title">Try saying</div>
      <div className="card-sub">Click a line to send it</div>
      {EXAMPLES.map((group) => (
        <div key={group.title} className="try-group">
          <div className="try-title">{group.emoji} {group.title}</div>
          {group.items.map((item) => (
            <button key={item} className="try-item" onClick={() => onSay(item)} disabled={busy}>“{item}”</button>
          ))}
        </div>
      ))}
    </div>
  )
}

function HelpCard({ onSay, busy }: { onSay: (text: string) => void; busy: boolean }) {
  return (
    <div className="card help" data-testid="help-card">
      {EXAMPLES.map((group) => (
        <div key={group.title} className="help-group">
          <div className="try-title">{group.emoji} {group.title}</div>
          <div className="help-items">
            {group.items.map((item) => (
              <button key={item} className="help-item" onClick={() => onSay(item)} disabled={busy}>{item}</button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

const isStored = (l: MemoryLine) => l.status === 'done' || l.status === 'stored'

function statusLabel(l: MemoryLine | undefined, live: boolean): { text: string; tone: 'ok' | 'wait' | 'bad' } {
  if (!l) return { text: 'saving…', tone: 'wait' }
  if (l.status === 'failed') return { text: "didn't save", tone: 'bad' }
  if (!isStored(l)) return { text: 'saving…', tone: 'wait' }
  return { text: live ? 'on Walrus ✓' : 'saved (preview)', tone: 'ok' }
}

function LearnedNote({ texts, lines, live }: { texts: string[]; lines: MemoryLine[]; live: boolean }) {
  const byText = new Map(lines.map((l) => [l.text, l]))
  return (
    <div className="learned" data-testid="learned-note">
      {texts.map((t) => {
        const line = byText.get(t)
        const status = statusLabel(line, live)
        return (
          <div key={t} className="learned-item">
            <span className="learned-head">🧠 Remembered</span>
            <span className="learned-text">{line ? factText(line.fact) : t}</span>
            <span className={`learned-status ${status.tone}`}>{status.text}</span>
          </div>
        )
      })}
    </div>
  )
}

function TraceCard({ title, steps }: { title: string; steps: Step[] }) {
  const done = steps.every((s) => s.state === 'done')
  return (
    <div className={`trace ${done ? 'done' : ''}`}>
      <div className="trace-title">{done ? '✓ ' : ''}{title}</div>
      <ol>
        {steps.map((s) => (
          <li key={s.label} className={s.state}>
            <span className="dot" />
            <span className="lbl">{s.label}</span>
            {s.detail && <span className="det">{s.detail}</span>}
          </li>
        ))}
      </ol>
    </div>
  )
}

function Meter({ value, max, good }: { value: number; max: number; good?: boolean }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  const tone = good ? 'ok' : value > max ? 'over' : pct >= 80 ? 'warn' : 'ok'
  return <span className={`meter ${tone}`}><i style={{ width: `${pct}%` }} /></span>
}

function SpendCard({ view }: { view: SpendView }) {
  const { spend } = view
  return (
    <div className="card receipt" data-testid="spend-card">
      <div className="receipt-top">
        <span className="receipt-emoji">{CATEGORY_EMOJI[spend.category]}</span>
        <span className="receipt-label">{spend.label}</span>
        <b>{usd(spend.cents)}</b>
      </div>
      <div className={`receipt-why ${spend.source === 'memory' ? 'mem' : ''}`} data-testid="spend-category">
        {spend.source === 'memory'
          ? `🧠 ${CATEGORY_LABEL[spend.category]}, from memory: ${spend.keyword} → ${CATEGORY_LABEL[spend.category]}`
          : spend.source === 'default'
            ? 'Filed under other. Tell me if it’s something else'
            : `Filed under ${CATEGORY_LABEL[spend.category]}`}
      </div>
      {spend.split > 1 && <div className="receipt-sub">your share of {usd(spend.totalCents)}, {spend.split} ways</div>}
      {view.left !== null && (
        <div className={`receipt-left ${view.left < 0 ? 'over' : ''}`}>{view.left < 0 ? `${usd(-view.left)} over budget this month` : `${usd(view.left)} left this month`}</div>
      )}
      {view.cap && (
        <div className="receipt-cap">
          <span>{CATEGORY_LABEL[view.cap.category]} this {view.cap.period}</span>
          <Meter value={view.cap.spent} max={view.cap.cap} />
          <span>{usd(view.cap.spent)} / {usd(view.cap.cap)}</span>
        </div>
      )}
    </div>
  )
}

function BudgetCard({ view }: { view: BudgetView }) {
  return (
    <div className="card budget" data-testid="budget-card">
      <div className="card-title">{view.month}</div>
      <div className="card-sub">{view.budget === null ? 'no budget yet' : `${usd(view.spent)} of ${usd(view.budget)} spent${view.carried ? ' · carried over from memory' : ''}`}</div>
      {view.budget !== null && (
        <>
          <Meter value={view.spent} max={view.budget} />
          <div className="big-left" data-testid="budget-left"><b>{usd(view.left ?? 0)}</b> left</div>
        </>
      )}
      {view.top.length > 0 && (
        <ul className="cats">
          {view.top.map(([c, cents]) => <li key={c}><span>{CATEGORY_EMOJI[c]} {CATEGORY_LABEL[c]}</span><span>{usd(cents)}</span></li>)}
        </ul>
      )}
      {view.caps.length > 0 && (
        <ul className="caps">
          {view.caps.map((c) => (
            <li key={c.category}>
              <span>{CATEGORY_LABEL[c.category]} cap / {c.period}</span>
              <Meter value={c.spent} max={c.cap} />
              <span>{usd(c.spent)} / {usd(c.cap)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Ring({ pct }: { pct: number }) {
  const C = 2 * Math.PI * 30
  return (
    <svg className="ring" viewBox="0 0 76 76" aria-hidden>
      <circle cx="38" cy="38" r="30" stroke="#eee" strokeWidth="8" fill="none" />
      <circle cx="38" cy="38" r="30" stroke="#34C759" strokeWidth="8" fill="none" strokeLinecap="round" strokeDasharray={`${(C * Math.min(100, pct)) / 100} ${C}`} transform="rotate(-90 38 38)" />
      <text x="38" y="43" textAnchor="middle" fontSize="16" fontWeight="700">{Math.round(pct)}%</text>
    </svg>
  )
}

function GoalCard({ view }: { view: GoalView }) {
  const saved = view.saved ?? 0
  return (
    <div className="card goal" data-testid="goal-card">
      <div className="goal-top">
        <Ring pct={(saved / view.target) * 100} />
        <div>
          <div className="card-title">{view.name}</div>
          <div className="card-sub">{usd(saved)} of {usd(view.target)}{view.by ? ` · by ${monthName(view.by)}` : ''}</div>
        </div>
      </div>
      <div className="pockets">
        <span>💳 Spending <b>{view.spending === null ? '…' : usd(view.spending)}</b></span>
        <span>🎯 {view.name} <b data-testid="goal-saved">{usd(saved)}</b></span>
      </div>
      <div className="fine">Two pockets of test money. Buys you skip move from Spending into {view.name}. {view.preview ? '(preview, not on chain)' : '(Sui testnet)'}</div>
    </div>
  )
}

const VERDICT: Record<AdviceView['advice']['verdict'], [string, string]> = {
  go: ['💚', 'Go for it'],
  think: ['🤔', 'Think twice'],
  skip: ['🙅', 'Skip it'],
}

function AdviceCard({ view }: { view: AdviceView }) {
  const { advice } = view
  const [emoji, label] = VERDICT[advice.verdict]
  return (
    <div className="card advice" data-testid="advice-card">
      <div className={`verdict-band ${advice.verdict}`}><span>{emoji}</span><span data-testid="verdict">{label}</span></div>
      <div className="advice-top">
        <span className="receipt-emoji">{view.emoji}</span>
        <div>
          <div className="card-title">{view.item}</div>
          <div className="card-sub">{usd(view.price)}{view.store ? ` at ${view.store}` : ''}{view.saving > 0 ? ` · ${usd(view.saving)} less than elsewhere` : ''}</div>
        </div>
      </div>
      <div className="why-title">Why</div>
      <ul className="reasons">
        {advice.reasons.map((r, i) => {
          const line = reasonText(r, view.goalName)
          return <li key={i} className={line.memory ? 'mem' : ''}>{line.memory ? '🧠 ' : '• '}{line.text}</li>
        })}
      </ul>
      <div className="fine">🧠 = from what Mira remembers about you</div>
    </div>
  )
}

function MovedCard({ view }: { view: MovedView }) {
  return (
    <div className="card moved" data-testid="moved-card">
      <div className="moved-top"><span className="check">✓</span><div><div className="card-title">Moved {usd(view.cents)} to {view.name}</div><div className="card-sub">from Spending</div></div></div>
      <div className="pockets">
        <span>💳 Spending <b>{view.spending === null ? '…' : usd(view.spending)}</b></span>
        <span>{view.emoji} {view.name} <b>{view.goal === null ? '…' : usd(view.goal)}</b></span>
      </div>
      <div className="fine">
        {view.receipt.url ? <a href={view.receipt.url} target="_blank" rel="noreferrer">Settled on Sui testnet · receipt ↗</a> : 'Preview, not on chain'}
      </div>
    </div>
  )
}

const GROUPS: Array<{ title: string; kinds: Array<Fact['kind']> }> = [
  { title: 'Your plan', kinds: ['budget', 'goal', 'cap', 'month'] },
  { title: 'Rules you taught me', kinds: ['rule'] },
  { title: 'What I learned from your choices', kinds: ['nudge'] },
  { title: 'Habits', kinds: ['habit'] },
]

/** The newest line per key, and how many older ones it replaced. */
function current(lines: MemoryLine[]): { shown: MemoryLine[]; replaced: number } {
  const winner = new Map<string, number>()
  lines.forEach((l, i) => {
    const key = factKey(l.fact)
    const known = winner.get(key)
    const knownAsOf = known === undefined ? undefined : lines[known]?.fact.asOf
    if (knownAsOf === undefined || l.fact.asOf >= knownAsOf) winner.set(key, i)
  })
  const shown = lines.filter((l, i) => winner.get(factKey(l.fact)) === i)
  return { shown, replaced: lines.length - shown.length }
}

function MemoryCard({ lines, learned, live }: { lines: MemoryLine[]; learned: Learned; live: boolean }) {
  const { shown, replaced } = current(lines)
  const saved = lines.filter(isStored).length
  return (
    <div className="card mem" data-testid="memory-card">
      <div className="card-title">What Mira knows</div>
      <div className="card-sub">{saved} of {lines.length} lines saved {live ? 'on Walrus Memory' : 'in memory preview'} · rounded, no names</div>
      {GROUPS.map((g) => {
        const items = shown.filter((l) => g.kinds.includes(l.fact.kind))
        if (!items.length) return null
        return (
          <div key={g.title} className="mem-group">
            <div className="mem-group-title">{g.title}</div>
            <ul className="memlist">
              {items.map((l) => {
                const status = statusLabel(l, live)
                return (
                  <li key={l.text}>
                    <div className="mem-head">
                      <span className="mem-text">{factText(l.fact)}</span>
                      {status.tone === 'ok' && live && l.blobId ? (
                        <a className="mem-status ok" href={`https://walruscan.com/mainnet/blob/${l.blobId}`} target="_blank" rel="noreferrer">on Walrus ↗</a>
                      ) : (
                        <span className={`mem-status ${status.tone}`}>{status.text}</span>
                      )}
                    </div>
                    <div className="mem-effect">→ {factEffect(l.fact, learned)}</div>
                    <details className="mem-raw"><summary>the line</summary><code>{l.text}</code></details>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
      {replaced > 0 && <div className="fine">+ {replaced} older line{replaced === 1 ? '' : 's'} replaced by newer ones</div>}
    </div>
  )
}

type PanelProps = { lines: MemoryLine[]; learned: Learned; modes: Modes; overview: Overview; onHood: () => void }

function MemoryPanel({ lines, learned, modes, overview, onHood }: PanelProps) {
  const live = modes.memory === 'walrus'
  const latest = [...current(lines).shown].reverse()
  return (
    <div className="panel" data-testid="memory-panel">
      <div className="card-title">Mira’s memory</div>
      <div className="card-sub">{live ? 'Saved on Walrus Memory (mainnet)' : 'Memory preview: this server has no Walrus account'}</div>
      <p className="panel-note">Your exact spends stay on this device. Mira keeps only what she learned, as short rounded lines.</p>
      {latest.length === 0 ? (
        <div className="panel-empty">Nothing yet. Set a budget or a goal and watch this fill up.</div>
      ) : (
        <ul className="panel-mem">
          {latest.map((l) => {
            const status = statusLabel(l, live)
            return (
              <li key={l.text}>
                <span className={`dot ${status.tone}`} title={status.text} />
                <span>
                  <b>{factText(l.fact)}</b>
                  <small>{factEffect(l.fact, learned)}</small>
                </span>
              </li>
            )
          })}
        </ul>
      )}
      {overview.goal && (
        <div className="panel-pockets">
          <div className="try-title">💳 Pockets {modes.cash === 'sui' ? '(Sui testnet)' : '(preview)'}</div>
          <div>{overview.goal.emoji} {overview.goal.name}: <b>{usd(overview.goal.saved)}</b> of {usd(overview.goal.target)}</div>
        </div>
      )}
      <button className="btn-ghost" onClick={onHood}>⚙️ Under the hood</button>
    </div>
  )
}

function Handoff({ code, onClose }: { code: string; onClose: () => void }) {
  const [qr, setQr] = useState<string | null>(null)
  const url = `${location.origin}/#/chat?me=${code}`
  useEffect(() => {
    QRCode.toDataURL(url, { margin: 1, width: 440, color: { dark: '#0c0c0d', light: '#ffffff' } }).then(setQr, () => setQr(null))
  }, [url])
  return (
    <div className="modal" role="dialog" aria-label="Continue on your phone" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="card-title">Continue on your phone</div>
        <div className="card-sub">Scan with your camera. Mira’s memory comes with you; this device’s spend list stays here.</div>
        {qr && <img className="qr" src={qr} alt="QR code that opens Mira with your code" />}
        <code className="code" data-testid="handoff-link">{url}</code>
        <button className="try" onClick={onClose}>Done</button>
      </div>
    </div>
  )
}

function Hood({ health, device, onClose, onStartOver }: { health: Health | null; device: Device; onClose: () => void; onStartOver: () => void }) {
  const calls = health?.tatum ? Object.entries(health.tatum.calls) : []
  return (
    <div className="modal" role="dialog" aria-label="Under the hood" onClick={onClose}>
      <div className="modal-card hood" onClick={(e) => e.stopPropagation()}>
        <div className="card-title">Under the hood</div>
        <dl>
          <div><dt>Where Mira’s memory lives</dt><dd>{health ? (health.memory.mode === 'walrus' ? 'Walrus Memory, mainnet' : 'Preview (no account)') : '…'}</dd></div>
          <div><dt>What gets saved</dt><dd>Short rounded lines. No names, no exact amounts</dd></div>
          <div><dt>Lines saved by this server</dt><dd>{health ? `${health.memory.lines.done} saved · ${health.memory.lines.queued + health.memory.lines.writing} saving` : '…'}</dd></div>
          <div><dt>Where the money moves</dt><dd>{health ? (health.cash.mode === 'sui' ? 'Test money on Sui testnet, through Tatum' : 'Preview, not on chain') : '…'}</dd></div>
          {health?.tatum && <div><dt>Tatum calls, last hour</dt><dd>{health.tatum.lastHour}{health.tatum.fallback ? ' · on fallback' : ''}</dd></div>}
          {calls.map(([method, n]) => <div key={method} className="sub"><dt>{method}</dt><dd>{n}</dd></div>)}
          <div><dt>Your Mira code</dt><dd className="mono">{device.user}</dd></div>
          <div><dt>On this device</dt><dd>{device.spends.length} spends · {device.lines.length} memory lines</dd></div>
        </dl>
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onStartOver}>Start over</button>
          <button className="try" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}
