export type Cents = number;

export function toCents(dollars: number): Cents {
  return Math.round(dollars * 100);
}

const whole = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const exact = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function usd(cents: Cents): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}$${abs % 100 === 0 ? whole.format(abs / 100) : exact.format(abs / 100)}`;
}

function aboutStep(dollars: number): number {
  if (dollars < 20) return 1;
  if (dollars < 100) return 5;
  if (dollars < 1000) return 10;
  return 50;
}

/** The rounding every amount gets before it can be written to memory (PRD §8.1). */
export function roundAbout(cents: Cents): Cents {
  const dollars = Math.abs(cents) / 100;
  const step = aboutStep(dollars);
  return Math.sign(cents) * Math.max(step, Math.round(dollars / step) * step) * 100;
}

export function aboutUsd(cents: Cents): string {
  return `about ${usd(roundAbout(cents))}`;
}

export function floorDollars(cents: Cents, step: number): Cents {
  return Math.floor(cents / 100 / step) * step * 100;
}

export function ceilDollars(cents: Cents, step: number): Cents {
  return Math.ceil(cents / 100 / step) * step * 100;
}
