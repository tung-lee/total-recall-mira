// Mira's agent. Each message becomes one typed intent (`parseMessage`), then a small plan: device ledger
// math, the "should I buy" rules, pocket moves through the server, and typed facts for Walrus Memory.
// Nothing here calls a model; recalled memory only ever becomes typed facts (ADR-0002, ADR-0003).
import { useEffect, useMemo, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react'
import {
  aboutUsd,
  type Advice,
  adviseBuy,
  byCategory,
  CATEGORY_EMOJI,
  CATEGORY_LABEL,
  type CapStatus,
  capStatus,
  type Category,
  type Cents,
  categorize,
  deriveHabit,
  type Fact,
  factLine,
  GOAL_EMOJI,
  type GoalKind,
  goalPocket,
  habitChanged,
  type Intent,
  isKeyword,
  keywordOf,
  type Learned,
  learn,
  monthKey,
  monthSpent,
  parseMessage,
  type Pocket,
  roundAbout,
  roundFact,
  type Spend,
  stamp,
  startOfMonth,
  sumSpends,
  thresholdFor,
  usd,
  type Verdict,
  WEEKDAYS,
  words,
} from '@mira/money'
import { bestOffer, findItem, priciest } from '../data/catalog'
import { api, ApiError, type CashMode, type Health, type MemoryMode, type Receipt } from '../lib/api'
import { addFacts, clearDevice, type Device, freshDevice, isCode, loadDevice, type MemoryLine, saveDevice } from '../lib/device'
import { goalName, monthName } from './describe'

export type Step = { label: string; detail?: string; state: 'todo' | 'run' | 'done' | 'fail' }

export type SpendView = { spend: Spend; left: Cents | null; cap: CapStatus | null }
export type BudgetView = { month: string; budget: Cents | null; spent: Cents; left: Cents | null; top: Array<[Category, Cents]>; caps: CapStatus[]; carried: boolean }
export type GoalView = { goal: GoalKind; name: string; target: Cents; saved: Cents | null; by: string | null; spending: Cents | null; preview: boolean }
export type AdviceView = { item: string; emoji: string; price: Cents; store: string | null; saving: Cents; advice: Advice; goalName: string | null }
export type MovedView = { cents: Cents; name: string; emoji: string; spending: Cents | null; goal: Cents | null; receipt: Receipt; preview: boolean }

export type Msg =
  | { id: string; from: 'me'; kind: 'text'; text: string }
  | { id: string; from: 'mira'; kind: 'text'; text: string }
  | { id: string; from: 'mira'; kind: 'trace'; title: string; steps: Step[] }
  | { id: string; from: 'mira'; kind: 'spend'; view: SpendView }
  | { id: string; from: 'mira'; kind: 'budget'; view: BudgetView }
  | { id: string; from: 'mira'; kind: 'goal'; view: GoalView }
  | { id: string; from: 'mira'; kind: 'advice'; view: AdviceView }
  | { id: string; from: 'mira'; kind: 'moved'; view: MovedView }
  | { id: string; from: 'mira'; kind: 'memory' }
  | { id: string; from: 'mira'; kind: 'learned'; texts: string[] }
  | { id: string; from: 'mira'; kind: 'howto' }
  | { id: string; from: 'mira'; kind: 'help' }

type NewMsg = Msg extends infer M ? (M extends Msg ? Omit<M, 'id'> : never) : never

export type Action = { type: 'say'; text: string } | { type: 'skip'; label: string } | { type: 'buy'; label: string } | { type: 'handoff' }
export type Chip = { label: string; action: Action }

export type Modes = { memory: MemoryMode | null; cash: CashMode | null }

export type Overview = {
  budget: Cents | null
  spent: Cents
  left: Cents | null
  goal: { name: string; emoji: string; target: Cents; saved: Cents } | null
}

const say = (text: string): Chip => ({ label: text, action: { type: 'say', text } })
const START_CHIPS: Chip[] = [say('budget 400 a month'), say('saving 1200 for tokyo by march'), say('coffee 5.5')]
const BACK_CHIPS: Chip[] = [say('how am i doing?'), say('should i buy the $48 serum?'), say('what do you know about me?')]

/** What Mira understands, grouped, for the help card and the desktop side panel. */
export const EXAMPLES: Array<{ title: string; emoji: string; items: string[] }> = [
  { title: 'Log a spend', emoji: '💬', items: ['coffee 5.5', 'uber 18', 'dinner 84 split 3 ways'] },
  { title: 'Set your plan', emoji: '🎯', items: ['budget 400 a month', 'saving 1200 for tokyo by march', 'cap eating out at 60 a week'] },
  { title: 'Ask before you buy', emoji: '🤔', items: ['should i buy the $48 serum?', 'thinking about $120 sneakers'] },
  { title: 'Teach Mira', emoji: '🧠', items: ['coffee counts as eating out', 'that was groceries'] },
  { title: 'Check in', emoji: '📊', items: ['how am i doing?', 'move 20 to tokyo', 'what do you know about me?'] },
]

const uid = () => crypto.randomUUID().slice(0, 8)
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

type Setters = {
  setMsgs: Dispatch<SetStateAction<Msg[]>>
  setTyping: Dispatch<SetStateAction<boolean>>
  setBusy: Dispatch<SetStateAction<boolean>>
  setChips: Dispatch<SetStateAction<Chip[]>>
  setDevice: Dispatch<SetStateAction<Device>>
  setModes: Dispatch<SetStateAction<Modes>>
  setHealth: Dispatch<SetStateAction<Health | null>>
  setHandoff: Dispatch<SetStateAction<boolean>>
  dev: MutableRefObject<Device>
}

type PendingAsk = { cents: Cents; category: Category; label: string; verdict: Verdict }

function createAgent(s: Setters) {
  let started = false
  let busy = false
  let flushing = false
  let pendingAsk: PendingAsk | null = null
  let cashMode: CashMode | null = null
  let memoryMode: MemoryMode | null = null
  let notes: string[] = []
  let chipsSet = false

  const chips = (list: Chip[]) => {
    chipsSet = true
    s.setChips(list)
  }

  const update = (fn: (d: Device) => Device) => {
    const next = fn(s.dev.current)
    if (next === s.dev.current) return
    s.dev.current = next
    saveDevice(next)
    s.setDevice(next)
  }

  const push = (m: NewMsg) => {
    const id = uid()
    s.setMsgs((prev) => [...prev, { ...m, id } as Msg])
    return id
  }

  const reply = async (text: string) => {
    s.setTyping(true)
    await sleep(Math.min(1000, 300 + text.length * 8))
    s.setTyping(false)
    push({ from: 'mira', kind: 'text', text })
  }

  const trace = (title: string, labels: Array<[string, string?]>) => {
    const id = push({ from: 'mira', kind: 'trace', title, steps: labels.map(([label, detail]) => ({ label, detail, state: 'todo' as const })) })
    const set = (i: number, state: Step['state'], detail?: string) =>
      s.setMsgs((prev) =>
        prev.map((m) => (m.id === id && m.kind === 'trace' ? { ...m, steps: m.steps.map((st, j) => (j === i ? { ...st, state, detail: detail ?? st.detail } : st)) } : m)),
      )
    return { set }
  }

  const learned = (): Learned => learn(s.dev.current.lines.map((l) => l.fact))
  const name = (goal: GoalKind) => goalName(goal, s.dev.current.labels)

  // ---------- memory: the outbox and recall ----------

  /** Queues facts for Walrus Memory and notes them for the thread's "remembered" line. */
  const remember = (facts: Fact[]) => {
    const rounded = facts.map(roundFact)
    update((d) => addFacts(d, rounded))
    notes.push(...rounded.filter((f) => f.kind !== 'month').map(factLine))
    void flush()
  }

  const suggestions = (): Chip[] => {
    const l = learned()
    if (l.budget === null) return [say('budget 400 a month'), say('coffee 5.5'), say('help')]
    if (!l.goal) return [say('saving 1200 for tokyo by march'), say('coffee 5.5'), say('help')]
    return [say('coffee 5.5'), say('should i buy the $48 serum?'), say('how am i doing?')]
  }

  /** Sends pending facts and follows queued lines until they report a blob (PRD §8.4). */
  const flush = async () => {
    if (flushing) return
    flushing = true
    try {
      const user = s.dev.current.user
      const pending = s.dev.current.lines.filter((l) => l.status === 'pending').slice(0, 20)
      if (pending.length) {
        const { jobs } = await api.remember(user, pending.map((l) => l.fact))
        const sent = new Map(pending.map((l, i) => [l.text, jobs[i]]))
        update((d) => ({
          ...d,
          lines: d.lines.map((l) => {
            const j = sent.get(l.text)
            return j ? { ...l, key: j.key, kind: j.kind, status: j.status, blobId: j.blobId } : l
          }),
        }))
      }
      const waiting = s.dev.current.lines.filter((l) => (l.status === 'queued' || l.status === 'writing') && l.key)
      if (waiting.length) {
        const { jobs } = await api.jobs(user, waiting.flatMap((l) => (l.key ? [l.key] : [])))
        const byKey = new Map(jobs.map((j) => [j.key, j]))
        update((d) => ({
          ...d,
          lines: d.lines.map((l): MemoryLine => {
            const j = l.key ? byKey.get(l.key) : undefined
            if (!j) return l
            if (j.status === 'unknown') return { ...l, status: 'pending', key: null }
            return { ...l, status: j.status, blobId: j.blobId }
          }),
        }))
      }
    } catch {
      // offline or the server restarted: the lines stay pending and go on the next tick
    } finally {
      flushing = false
    }
  }

  /** Merges every recalled line into the device; returns how many were new to it. */
  const sync = async (): Promise<number> => {
    const res = await api.recall(s.dev.current.user)
    memoryMode = res.mode
    s.setModes((m) => ({ ...m, memory: res.mode }))
    let added = 0
    update((d) => {
      const byText = new Map(d.lines.map((l) => [l.text, l]))
      for (const r of res.lines) {
        const known = byText.get(r.line)
        if (!known) added++
        byText.set(r.line, { fact: r.fact, text: r.line, kind: r.kind, key: r.key, status: r.status, blobId: r.blobId ?? known?.blobId ?? null })
      }
      const lines = [...byText.values()].map((l): MemoryLine => (l.status === 'failed' ? { ...l, status: 'pending', key: null } : l))
      return { ...d, lines }
    })
    void flush()
    return added
  }

  const refreshPockets = async () => {
    const l = learned()
    const pockets: Pocket[] = ['spending', ...(l.goal ? [goalPocket(l.goal)] : [])]
    const res = await api.pockets(s.dev.current.user, pockets)
    cashMode = res.mode
    s.setModes((m) => ({ ...m, cash: res.mode }))
    update((d) => ({ ...d, pockets: { ...d.pockets, ...res.balances } }))
  }

  // ---------- views ----------

  const budgetView = (): BudgetView => {
    const l = learned()
    const now = new Date()
    const spends = s.dev.current.spends
    const spent = monthSpent(spends, now, l.month)
    const caps = (Object.entries(l.caps) as Array<[Category, { cents: Cents; period: 'week' | 'month' }]>).map(([c, cap]) => capStatus(spends, c, cap, now))
    return {
      month: now.toLocaleString('en-US', { month: 'long' }),
      budget: l.budget,
      spent,
      left: l.budget === null ? null : l.budget - spent,
      top: byCategory(spends, startOfMonth(now), now).slice(0, 4),
      caps,
      carried: spent !== sumSpends(spends, startOfMonth(now), now),
    }
  }

  const goalView = (goal: GoalKind): GoalView | null => {
    const g = learned().goals[goal]
    if (!g) return null
    const pockets = s.dev.current.pockets
    return { goal, name: name(goal), target: g.cents, saved: pockets[goalPocket(goal)] ?? null, by: g.by, spending: pockets.spending ?? null, preview: cashMode !== 'sui' }
  }

  // ---------- money moves ----------

  const moveTo = async (goal: GoalKind, cents: Cents): Promise<boolean> => {
    const n = name(goal)
    const t = trace(`Moving ${usd(cents)} to ${n}`, [[`Spending → ${n}`, usd(cents)], ['Settle', cashMode === 'sui' ? 'Sui testnet, through Tatum' : 'preview, not on chain']])
    t.set(0, 'run')
    try {
      const res = await api.move(s.dev.current.user, 'spending', goalPocket(goal), cents)
      cashMode = res.mode
      t.set(0, 'done')
      t.set(1, 'done', res.mode === 'sui' ? `confirmed · ${res.receipt.digest.slice(0, 8)}…` : 'preview, not on chain')
      update((d) => ({ ...d, pockets: { ...d.pockets, ...res.balances } }))
      const saved = res.balances[goalPocket(goal)] ?? null
      push({
        from: 'mira',
        kind: 'moved',
        view: { cents, name: n, emoji: GOAL_EMOJI[goal], spending: res.balances.spending ?? null, goal: saved, receipt: res.receipt, preview: res.mode !== 'sui' },
      })
      const target = learned().goals[goal]?.cents
      await reply(`done ✅ ${usd(cents)} is in ${n} now${target && saved !== null ? `: ${usd(saved)} of ${usd(target)} (${Math.round((saved / target) * 100)}%)` : ''}`)
      return true
    } catch (err) {
      t.set(0, 'fail')
      await reply(err instanceof ApiError ? err.message : "that move didn't go through. try again?")
      return false
    }
  }

  const logSpend = (cents: Cents, totalCents: Cents, split: number, label: string, category?: Category): Spend => {
    const l = learned()
    const sorted = category ? { category, keyword: keywordOf(label), source: 'keyword' as const } : categorize(label, l.rules)
    const now = new Date()
    const spend: Spend = { id: uid(), at: now.toISOString(), cents, totalCents, split, label, ...sorted }
    update((d) => ({ ...d, spends: [...d.spends, spend] }))
    const spends = s.dev.current.spends
    const left = l.budget === null ? null : l.budget - monthSpent(spends, now, l.month)
    const cap = l.caps[spend.category]
    push({ from: 'mira', kind: 'spend', view: { spend, left, cap: cap ? capStatus(spends, spend.category, cap, now) : null } })

    const facts: Fact[] = []
    const spent = monthSpent(spends, now, l.month)
    const snapshot = l.month?.month === monthKey(now) ? l.month.cents : null
    if (snapshot === null || Math.abs(roundAbout(spent) - snapshot) >= 2500) facts.push({ kind: 'month', month: monthKey(now), cents: spent, asOf: stamp(now) })
    const habit = deriveHabit(spends, spend.category, now)
    if (habit && habitChanged(l, habit)) facts.push(habit)
    if (facts.length) remember(facts)
    return spend
  }

  // ---------- intents ----------

  const handle = async (intent: Intent) => {
    const now = new Date()
    const asOf = stamp(now)
    switch (intent.kind) {
      case 'spend': {
        const spend = logSpend(intent.cents, intent.totalCents, intent.split, intent.label)
        const l = learned()
        const cap = l.caps[spend.category]
        if (intent.split > 1) await reply(`logged your share: ${usd(intent.cents)} of ${usd(intent.totalCents)}, ${intent.split} ways. who was there stays on this phone 🤫`)
        if (cap) {
          const st = capStatus(s.dev.current.spends, spend.category, cap, now)
          if (st.left < 0) await reply(`heads up: that's ${usd(-st.left)} over your ${CATEGORY_LABEL[spend.category]} cap this ${cap.period} 😬`)
          else if (st.left < cap.cents * 0.2) await reply(`${usd(st.left)} left for ${CATEGORY_LABEL[spend.category]} this ${cap.period}`)
        }
        if (spend.source === 'default') await reply(`filed it under other. if it's something else, tell me like “${spend.label.split(' ')[0] ?? 'it'} is treats”`)
        return
      }
      case 'budget': {
        remember([{ kind: 'budget', cents: intent.cents, asOf }])
        push({ from: 'mira', kind: 'budget', view: budgetView() })
        await reply(`done ✅ ${aboutUsd(intent.cents)} a month. every spend you text me shows what's left`)
        chips(learned().goal ? [say('coffee 5.5'), say('cap eating out at 60 a week')] : [say('saving 1200 for tokyo by march'), say('cap eating out at 60 a week')])
        return
      }
      case 'cap': {
        remember([{ kind: 'cap', category: intent.category, cents: intent.cents, period: intent.period, asOf }])
        const st = capStatus(s.dev.current.spends, intent.category, { cents: intent.cents, period: intent.period }, now)
        await reply(`got it 🧠 ${CATEGORY_LABEL[intent.category]} capped at ${aboutUsd(intent.cents)} a ${intent.period}. ${usd(st.spent)} so far this ${intent.period}. i'll check it before every buy`)
        return
      }
      case 'goal': {
        remember([{ kind: 'goal', goal: intent.goal, cents: intent.cents, by: intent.by, asOf }])
        update((d) => ({ ...d, labels: { ...d.labels, [intent.goal]: intent.label } }))
        const n = name(intent.goal)
        const t = trace(`Opening your ${n} pocket`, [['Save the goal', 'Walrus Memory'], ['Open pockets', `Spending + ${n}`], ['Add test cash', 'Sui testnet']])
        t.set(0, 'done', 'saving in the background')
        t.set(1, 'run')
        let seeded = false
        try {
          const opened = await api.open(s.dev.current.user)
          cashMode = opened.mode
          seeded = opened.seeded
          t.set(1, 'done')
          t.set(2, 'done', opened.seeded ? `${usd(opened.balances.spending ?? 0)} added${opened.mode === 'sui' ? '' : ' (preview)'}` : 'already has cash')
          await refreshPockets()
        } catch (err) {
          t.set(1, 'fail')
          t.set(2, 'fail')
          await reply(err instanceof ApiError ? err.message : "couldn't open your pockets just now")
        }
        const view = goalView(intent.goal)
        if (view) push({ from: 'mira', kind: 'goal', view })
        await reply(
          `${GOAL_EMOJI[intent.goal]} ${n}: ${usd(intent.cents)}${intent.by ? ` by ${monthName(intent.by)}` : ''}. ${seeded ? `i put ${usd(s.dev.current.pockets.spending ?? 0)} of test money in Spending. ` : ''}when i talk you out of a buy, that money can go straight into ${n}`,
        )
        chips([say('coffee 5.5'), say('should i buy the $48 serum?')])
        return
      }
      case 'correct': {
        const spends = s.dev.current.spends
        const target = intent.target
        const spend = target ? [...spends].reverse().find((sp) => sp.keyword === target || words(sp.label).includes(target)) : spends.at(-1)
        const keyword = target && isKeyword(target) ? target : (spend?.keyword ?? null)
        if (spend) update((d) => ({ ...d, spends: d.spends.map((sp) => (sp.id === spend.id ? { ...sp, category: intent.category, source: 'corrected' } : sp)) }))
        if (keyword) {
          remember([{ kind: 'rule', keyword, category: intent.category, asOf }])
          await reply(`${spend ? 'fixed ✅ ' : ''}${keyword} goes under ${CATEGORY_LABEL[intent.category]} from now on. i'll remember that 🧠`)
        } else if (spend) {
          await reply(`fixed ✅ “${spend.label}” is ${CATEGORY_LABEL[intent.category]} now. i only learn words i know, so tell me again next time`)
        } else {
          await reply('nothing to fix yet. text me a spend first, like “coffee 5.5”')
        }
        return
      }
      case 'ask':
        return ask(intent.item, intent.cents)
      case 'move': {
        const l = learned()
        const goal = intent.goal && l.goals[intent.goal] ? intent.goal : l.goal
        if (!goal) {
          await reply('start a goal first, like “saving 1200 for tokyo by march”')
          chips([say('saving 1200 for tokyo by march')])
          return
        }
        await moveTo(goal, intent.cents)
        return
      }
      case 'memory':
        return showMemory()
      case 'help':
        await reply("here's what you can text me. tap any of these to try it 👇")
        push({ from: 'mira', kind: 'help' })
        chips([])
        return
      case 'summary': {
        const l = learned()
        await refreshPockets().catch(() => undefined)
        push({ from: 'mira', kind: 'budget', view: budgetView() })
        const view = l.goal ? goalView(l.goal) : null
        if (view) push({ from: 'mira', kind: 'goal', view })
        await reply(l.budget === null ? "set a budget and i'll keep score, like “budget 400 a month”" : "here's where you are 👆")
        return
      }
      case 'greet':
        await reply('hey 👋 what did you spend today?')
        chips(s.dev.current.spends.length ? BACK_CHIPS : START_CHIPS)
        return
      case 'thanks':
        await reply('anytime 🫶')
        return
      case 'unknown':
        await reply("hmm, i didn't catch that 🙈 i understand messages like these, tap one to try:")
        push({ from: 'mira', kind: 'help' })
        chips([])
        return
    }
  }

  const ask = async (itemText: string, listed: Cents | null) => {
    const l = learned()
    const item = findItem(itemText)
    const best = item ? bestOffer(item) : null
    const price = best && (listed === null || best.cents < listed) ? best.cents : listed
    if (price === null) {
      await reply(`how much is it? try “should i buy the $60 ${itemText === 'it' ? 'sneakers' : itemText}?”`)
      return
    }
    const store = best && price === best.cents ? best.store : null
    const category = item?.category ?? categorize(itemText, l.rules).category
    const label = item?.name ?? itemText
    const goal = l.goal
    const t = trace('Should you buy it?', [
      ['Price check', item ? `${item.offers.length} stores` : 'your price'],
      ['Budget and caps', l.budget === null ? 'no budget yet' : undefined],
      ['What I learned about you', `${l.facts} memories`],
      [goal ? `Your ${name(goal)} goal` : 'Your goals'],
    ])
    for (let i = 0; i < 4; i++) {
      t.set(i, 'run')
      await sleep(180)
      t.set(i, 'done')
    }
    const advice = adviseBuy({ cents: price, category }, { learned: l, spends: s.dev.current.spends, now: new Date() })
    push({
      from: 'mira',
      kind: 'advice',
      view: { item: label, emoji: item?.emoji ?? CATEGORY_EMOJI[category], price, store, saving: item && store ? priciest(item).cents - price : 0, advice, goalName: goal ? name(goal) : null },
    })
    pendingAsk = { cents: price, category, label: item?.id ?? (itemText.split(' ').at(-1) || 'something'), verdict: advice.verdict }
    const where = store ? ` at ${store} for ${usd(price)}` : ''
    const learnedWhy = advice.reasons.find((r) => r.kind === 'threshold' && r.threshold.learned)
    if (advice.verdict === 'go') await reply(`go for it 💚 it fits${where ? `. grab it${where}` : ''}`)
    else if (advice.verdict === 'think') await reply(learnedWhy ? `hmm 🤔 last time you skipped one like this. think twice?` : `hmm 🤔 think twice?${where ? ` if you do get it, it's cheapest${where}` : ''}`)
    else await reply(`i'd skip this one 🙅${where ? ` (even at ${usd(price)})` : ''}`)
    const skipLabel = goal ? `skip it, move ${usd(price)} to ${name(goal)}` : 'skip it'
    const chip = (label: string, type: 'skip' | 'buy'): Chip => ({ label, action: { type, label } })
    chips(advice.verdict === 'go' ? [chip('buy it', 'buy'), chip(skipLabel, 'skip')] : [chip(skipLabel, 'skip'), chip('buy anyway', 'buy')])
  }

  const nudged = (ask: PendingAsk, outcome: 'skipped' | 'bought'): { before: number | null; after: number | null } => {
    const before = thresholdFor(learned(), ask.category)?.cents ?? null
    if (ask.verdict !== 'go') remember([{ kind: 'nudge', category: ask.category, cents: ask.cents, outcome, asOf: stamp(new Date()) }])
    const after = thresholdFor(learned(), ask.category)?.cents ?? null
    return { before, after }
  }

  const skip = async (label: string) => {
    const ask = pendingAsk
    pendingAsk = null
    if (!ask) return
    push({ from: 'me', kind: 'text', text: label })
    const goal = learned().goal
    const change = nudged(ask, 'skipped')
    if (goal) await moveTo(goal, ask.cents)
    else await reply("skipped ✓ that's money you didn't spend")
    if (change.after !== null && (change.before === null || change.after < change.before)) {
      await reply(`🧠 noted: you skipped a ${CATEGORY_LABEL[ask.category]} buy of ${aboutUsd(ask.cents)}, so i'll flag ${CATEGORY_LABEL[ask.category]} from ${usd(change.after)} now`)
    }
    chips(BACK_CHIPS)
  }

  const buy = async (label: string) => {
    const ask = pendingAsk
    pendingAsk = null
    if (!ask) return
    push({ from: 'me', kind: 'text', text: label })
    const change = nudged(ask, 'bought')
    logSpend(ask.cents, ask.cents, 1, ask.label, ask.category)
    await reply('logged it 💳 enjoy!')
    if (change.after !== null && change.before !== null && change.after > change.before) {
      await reply(`🧠 you've bought past my nudge twice, so i'll only flag ${CATEGORY_LABEL[ask.category]} from ${usd(change.after)} now`)
    }
    chips(BACK_CHIPS)
  }

  const showMemory = async () => {
    const lines = s.dev.current.lines
    if (!lines.length) {
      await reply("nothing yet! set a budget or a goal and i'll start learning")
      chips(START_CHIPS)
      return
    }
    await reply(
      `${lines.length} thing${lines.length === 1 ? '' : 's'} i've learned. each one is a short line in ${memoryMode === 'walrus' ? 'Walrus Memory' : 'memory preview (this server has no Walrus account)'}: no names, no exact amounts`,
    )
    push({ from: 'mira', kind: 'memory' })
  }

  // ---------- greetings ----------

  const welcomeBack = async () => {
    const l = learned()
    const now = new Date()
    const parts: string[] = []
    if (l.goal) {
      const saved = s.dev.current.pockets[goalPocket(l.goal)]
      const target = l.goals[l.goal]?.cents
      parts.push(`still saving for ${name(l.goal)}? ${saved !== undefined && target ? `${usd(saved)} of ${usd(target)} so far` : ''}`.trim())
    }
    if (l.budget !== null) parts.push(`${usd(l.budget - monthSpent(s.dev.current.spends, now, l.month))} left this month`)
    const today = WEEKDAYS[(now.getDay() + 6) % 7]
    const habit = (Object.entries(l.habits) as Array<[Category, { cents: Cents; days: string[] }]>).find(([, h]) => today && h.days.includes(today))
    if (habit) parts.push(`it's ${today}, and ${CATEGORY_LABEL[habit[0]]} usually runs you ${aboutUsd(habit[1].cents)} a week`)
    await reply(`welcome back 👋 ${parts.join(' · ') || 'what did you spend today?'}`)
    chips(BACK_CHIPS)
  }

  const restored = async (added: number) => {
    const l = learned()
    const items: string[] = []
    if (l.budget !== null) items.push(`• budget ${aboutUsd(l.budget)} a month`)
    if (l.goal) {
      const g = l.goals[l.goal]
      if (g) items.push(`• ${name(l.goal)} goal, ${aboutUsd(g.cents)}${g.by ? ` by ${monthName(g.by)}` : ''}`)
    }
    const caps = Object.keys(l.caps).length
    if (caps) items.push(`• ${caps} cap${caps === 1 ? '' : 's'}`)
    const rules = Object.entries(l.rules)
    if (rules.length) items.push(`• ${rules.map(([k, c]) => `${k} → ${c ? CATEGORY_LABEL[c] : ''}`).join(', ')}`)
    for (const [c, t] of Object.entries(l.thresholds) as Array<[Category, { cents: Cents }]>) items.push(`• i flag ${CATEGORY_LABEL[c]} from ${usd(t.cents)}`)
    if (l.month?.month === monthKey(new Date())) items.push(`• ${aboutUsd(l.month.cents)} spent this month`)
    await reply(`i remember you 🧠 pulled ${added} lines from ${memoryMode === 'walrus' ? 'Walrus Memory' : 'memory'}:\n${items.join('\n')}`)
    push({ from: 'mira', kind: 'budget', view: budgetView() })
    const view = l.goal ? goalView(l.goal) : null
    if (view) push({ from: 'mira', kind: 'goal', view })
    chips(BACK_CHIPS)
  }

  const refreshHealth = async () => {
    try {
      const h = await api.health()
      memoryMode = h.memory.mode
      cashMode = h.cash.mode
      s.setHealth(h)
      s.setModes({ memory: h.memory.mode, cash: h.cash.mode })
    } catch {
      s.setModes({ memory: null, cash: null })
    }
  }

  const boot = async () => {
    if (started) return
    started = true
    const handoff = /[?&]me=([a-z0-9]+)/.exec(location.hash)?.[1]
    let adopted = false
    if (handoff) {
      history.replaceState(null, '', '#/chat')
      if (isCode(handoff) && handoff !== s.dev.current.user) {
        update(() => freshDevice(handoff))
        adopted = true
      }
    }
    await refreshHealth()
    const d = s.dev.current
    if (d.lines.length || d.spends.length) {
      await welcomeBack()
      void sync()
        .then(() => refreshPockets())
        .catch(() => undefined)
      return
    }
    busy = true
    s.setBusy(true)
    const t = adopted ? trace('Remembering you', [['Recall', memoryMode === 'walrus' ? 'Walrus Memory, 4 namespaces' : 'memory preview'], ['Read your pockets', cashMode === 'sui' ? 'Sui testnet, through Tatum' : 'preview']]) : null
    let added = 0
    try {
      t?.set(0, 'run')
      if (!t) s.setTyping(true)
      added = await sync()
      t?.set(0, 'done', `${added} line${added === 1 ? '' : 's'}`)
      t?.set(1, 'run')
      if (added) await refreshPockets()
      t?.set(1, 'done')
    } catch {
      t?.set(0, 'fail')
    } finally {
      s.setTyping(false)
      busy = false
      s.setBusy(false)
    }
    if (added) return restored(added)
    await reply("hey, i'm Mira 💸 the money friend you text. tell me what you spend, ask me before you buy, and i'll learn what works for you")
    push({ from: 'mira', kind: 'howto' })
    await reply('start with a budget or a goal 👇 or type “help” any time')
    chips(START_CHIPS)
  }

  /** Runs one turn. Afterwards the thread shows what Mira just learned, and there are always next steps. */
  const run = async (fn: () => Promise<void>) => {
    if (busy) return
    busy = true
    s.setBusy(true)
    s.setChips([])
    chipsSet = false
    notes = []
    try {
      await fn()
    } finally {
      if (notes.length) push({ from: 'mira', kind: 'learned', texts: [...new Set(notes)] })
      notes = []
      if (!chipsSet) chips(suggestions())
      busy = false
      s.setBusy(false)
    }
  }

  return {
    boot,
    flush,
    refreshHealth,
    sendText: (raw: string) => {
      const text = raw.trim()
      if (!text || busy) return
      void run(async () => {
        push({ from: 'me', kind: 'text', text })
        pendingAsk = null
        await handle(parseMessage(text, new Date()))
      })
    },
    act: (a: Action) => {
      if (a.type === 'handoff') {
        s.setHandoff(true)
        return
      }
      if (a.type === 'say') {
        if (busy) return
        void run(async () => {
          push({ from: 'me', kind: 'text', text: a.text })
          pendingAsk = null
          await handle(parseMessage(a.text, new Date()))
        })
        return
      }
      const label = a.label
      void run(() => (a.type === 'skip' ? skip(label) : buy(label)))
    },
    startOver: () => {
      clearDevice()
      location.hash = '#/chat'
      location.reload()
    },
  }
}

export function useMira() {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [typing, setTyping] = useState(false)
  const [busy, setBusy] = useState(false)
  const [chips, setChips] = useState<Chip[]>([])
  const [device, setDevice] = useState<Device>(loadDevice)
  const [modes, setModes] = useState<Modes>({ memory: null, cash: null })
  const [health, setHealth] = useState<Health | null>(null)
  const [handoff, setHandoff] = useState(false)
  const dev = useRef(device)
  const agentRef = useRef<ReturnType<typeof createAgent> | null>(null)
  agentRef.current ??= createAgent({ setMsgs, setTyping, setBusy, setChips, setDevice, setModes, setHealth, setHandoff, dev })
  const agent = agentRef.current

  useEffect(() => {
    void agent.boot()
    const timer = setInterval(() => void agent.flush(), 3000)
    return () => clearInterval(timer)
  }, [agent])

  const learned = useMemo(() => learn(device.lines.map((l) => l.fact)), [device.lines])
  const overview = useMemo((): Overview => {
    const spent = monthSpent(device.spends, new Date(), learned.month)
    const g = learned.goal
    const target = g ? learned.goals[g]?.cents : undefined
    return {
      budget: learned.budget,
      spent,
      left: learned.budget === null ? null : learned.budget - spent,
      goal: g && target ? { name: goalName(g, device.labels), emoji: GOAL_EMOJI[g], target, saved: device.pockets[goalPocket(g)] ?? 0 } : null,
    }
  }, [device, learned])
  const hint = learned.budget === null ? 'Try “budget 400 a month”' : 'Text a spend, or ask before you buy'

  return {
    msgs,
    typing,
    busy,
    chips,
    device,
    learned,
    overview,
    hint,
    modes,
    health,
    handoff,
    setHandoff,
    send: agent.sendText,
    act: agent.act,
    refreshHealth: agent.refreshHealth,
    startOver: agent.startOver,
  }
}
