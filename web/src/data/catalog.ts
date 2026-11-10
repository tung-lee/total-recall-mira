// A small fictional catalog for the "should I buy" price check: three made-up stores per item, so the
// demo carries no third-party trademarks. A real build would plug a price feed in here.
import type { Category, Cents } from '@mira/money'

export type Offer = { store: string; cents: Cents }
export type Item = { id: string; name: string; words: string[]; category: Category; emoji: string; offers: Offer[] }

const offers = (shelf: number, glow: number, basket: number): Offer[] => [
  { store: 'Shelf', cents: shelf * 100 },
  { store: 'Glow & Co', cents: glow * 100 },
  { store: 'Basket', cents: basket * 100 },
]

export const ITEMS: Item[] = [
  { id: 'serum', name: 'Vitamin C serum', words: ['serum', 'vitamin'], category: 'beauty', emoji: '🧴', offers: offers(41, 48, 45) },
  { id: 'lipstick', name: 'Matte lipstick', words: ['lipstick', 'lip'], category: 'beauty', emoji: '💄', offers: offers(35, 38, 32) },
  { id: 'perfume', name: 'Eau de parfum', words: ['perfume', 'parfum', 'fragrance'], category: 'beauty', emoji: '🌸', offers: offers(88, 95, 82) },
  { id: 'sneakers', name: 'Court sneakers', words: ['sneakers', 'shoes', 'trainers'], category: 'shopping', emoji: '👟', offers: offers(110, 120, 96) },
  { id: 'headphones', name: 'Noise-cancelling headphones', words: ['headphones', 'earbuds', 'airpods'], category: 'shopping', emoji: '🎧', offers: offers(179, 199, 169) },
  { id: 'hoodie', name: 'Heavyweight hoodie', words: ['hoodie', 'sweater', 'sweatshirt'], category: 'shopping', emoji: '🧥', offers: offers(58, 64, 52) },
  { id: 'jacket', name: 'Cropped jacket', words: ['jacket', 'coat'], category: 'shopping', emoji: '🧥', offers: offers(79, 89, 74) },
  { id: 'candle', name: 'Fig candle', words: ['candle'], category: 'shopping', emoji: '🕯️', offers: offers(26, 28, 22) },
  { id: 'tickets', name: 'Concert tickets', words: ['concert', 'tickets', 'gig'], category: 'fun', emoji: '🎟️', offers: offers(85, 85, 92) },
]

export function findItem(text: string): Item | null {
  const words: string[] = text.toLowerCase().match(/[a-z]+/g) ?? []
  return ITEMS.find((item) => item.words.some((w) => words.includes(w))) ?? null
}

export function bestOffer(item: Item): Offer {
  return item.offers.reduce((a, b) => (b.cents < a.cents ? b : a))
}

export function priciest(item: Item): Offer {
  return item.offers.reduce((a, b) => (b.cents > a.cents ? b : a))
}
