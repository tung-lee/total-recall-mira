// Words for what Mira knows: a fact as a sentence, what it changes in the product, and a "should I buy"
// reason. Pure, so the thread and the memory card say the same thing.
import { aboutUsd, CATEGORY_LABEL, GOAL_LABEL, type Fact, type GoalKind, type Learned, type Reason, thresholdFor, usd } from '@mira/money'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function monthName(yearMonth: string): string {
  const [y, m] = yearMonth.split('-')
  return `${MONTHS[Number(m) - 1] ?? m} ${y}`
}

export function goalName(goal: GoalKind, labels: Partial<Record<GoalKind, string>>): string {
  return labels[goal] ?? GOAL_LABEL[goal]
}

export function factText(f: Fact): string {
  switch (f.kind) {
    case 'budget':
      return `Budget: ${aboutUsd(f.cents)} a month`
    case 'cap':
      return `Cap on ${CATEGORY_LABEL[f.category]}: ${aboutUsd(f.cents)} a ${f.period}`
    case 'goal':
      return `Goal: ${GOAL_LABEL[f.goal]}, ${aboutUsd(f.cents)}${f.by ? ` by ${monthName(f.by)}` : ''}`
    case 'month':
      return `${monthName(f.month)}: ${aboutUsd(f.cents)} spent`
    case 'rule':
      return `${f.keyword} → ${CATEGORY_LABEL[f.category]}`
    case 'nudge':
      return f.outcome === 'skipped'
        ? `Skipped a ${CATEGORY_LABEL[f.category]} buy, ${aboutUsd(f.cents)}`
        : `Bought past a nudge: ${CATEGORY_LABEL[f.category]}, ${aboutUsd(f.cents)}`
    case 'habit':
      return `${CATEGORY_LABEL[f.category]}: ${aboutUsd(f.cents)} a week${f.days.length ? `, mostly ${f.days.join(' & ')}` : ''}`
  }
}

/** What a memory line changes in the product (PRD §8.1). */
export function factEffect(f: Fact, learned: Learned): string {
  switch (f.kind) {
    case 'budget':
      return 'sets “left” on every receipt'
    case 'cap':
      return `checked before every ${CATEGORY_LABEL[f.category]} buy`
    case 'goal':
      return 'where skip-and-save money goes'
    case 'month':
      return 'carries the month to a new device'
    case 'rule':
      return `files ${f.keyword} under ${CATEGORY_LABEL[f.category]}`
    case 'nudge': {
      const t = thresholdFor(learned, f.category)
      return t ? `I flag ${CATEGORY_LABEL[f.category]} from ${usd(t.cents)}` : 'tunes my nudges'
    }
    case 'habit':
      return 'shapes my check-ins'
  }
}

export type ReasonLine = { text: string; memory: boolean }

export function reasonText(r: Reason, goalLabel: string | null): ReasonLine {
  switch (r.kind) {
    case 'budget_over':
      return { text: `It's ${usd(r.overBy)} more than the ${usd(Math.max(0, r.left))} left this month`, memory: true }
    case 'budget_share':
      return { text: `It's over a quarter of the ${usd(r.left)} left this month`, memory: true }
    case 'cap_over':
      return { text: `Your ${CATEGORY_LABEL[r.category]} cap is ${usd(r.cap)} a ${r.period}: you'd be ${usd(r.overBy)} over`, memory: true }
    case 'threshold': {
      const label = CATEGORY_LABEL[r.category]
      const why = r.threshold.learned
      if (!why) return { text: `${usd(r.threshold.cents)} and up is where ${label} buys turn impulsive`, memory: false }
      return why.outcome === 'skipped'
        ? { text: `You skipped a ${label} buy of ${aboutUsd(why.cents)}, so I flag ${label} from ${usd(r.threshold.cents)}`, memory: true }
        : { text: `You bought past my nudge twice, so I only flag ${label} from ${usd(r.threshold.cents)}`, memory: true }
    }
    case 'goal_share':
      return { text: `That's ${r.percent}% of your ${goalLabel ?? GOAL_LABEL[r.goal]} goal`, memory: true }
    case 'fits':
      return r.left === null ? { text: 'It fits. Set a budget and I’ll check that too', memory: false } : { text: `It fits: ${usd(r.left)} left this month`, memory: true }
  }
}
