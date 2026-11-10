export const CATEGORIES = [
  "food",
  "groceries",
  "treats",
  "transport",
  "shopping",
  "beauty",
  "fun",
  "bills",
  "other",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABEL: Record<Category, string> = {
  food: "eating out",
  groceries: "groceries",
  treats: "treats",
  transport: "transport",
  shopping: "shopping",
  beauty: "beauty",
  fun: "fun",
  bills: "bills",
  other: "other",
};

export const CATEGORY_EMOJI: Record<Category, string> = {
  food: "🍜",
  groceries: "🛒",
  treats: "☕",
  transport: "🚕",
  shopping: "🛍️",
  beauty: "💄",
  fun: "🎟️",
  bills: "🧾",
  other: "💸",
};

/** Wants get a nudge threshold before Mira has learned one (PRD §6.3). */
export const WANTS: readonly Category[] = ["treats", "beauty", "shopping", "fun"];

const ALIASES: Record<string, Category> = {
  "eating out": "food",
  "eat out": "food",
  food: "food",
  restaurants: "food",
  restaurant: "food",
  dining: "food",
  takeout: "food",
  groceries: "groceries",
  grocery: "groceries",
  treats: "treats",
  treat: "treats",
  snacks: "treats",
  transport: "transport",
  transportation: "transport",
  rides: "transport",
  travel: "transport",
  commute: "transport",
  shopping: "shopping",
  clothes: "shopping",
  stuff: "shopping",
  beauty: "beauty",
  skincare: "beauty",
  makeup: "beauty",
  fun: "fun",
  entertainment: "fun",
  "going out": "fun",
  nightlife: "fun",
  bills: "bills",
  bill: "bills",
  subscriptions: "bills",
  subscription: "bills",
  utilities: "bills",
  other: "other",
  misc: "other",
};

/**
 * The only words that can reach a memory line (ADR-0003). One lowercase word each, never a name.
 */
export const KEYWORDS: Readonly<Record<string, Category>> = {
  ramen: "food", pho: "food", sushi: "food", pizza: "food", burger: "food", burgers: "food",
  dinner: "food", lunch: "food", brunch: "food", breakfast: "food", takeout: "food",
  delivery: "food", restaurant: "food", tacos: "food", noodles: "food", bbq: "food",
  kebab: "food", sandwich: "food", salad: "food", doordash: "food", ubereats: "food",
  curry: "food", dimsum: "food", banhmi: "food", food: "food",
  groceries: "groceries", grocery: "groceries", supermarket: "groceries", market: "groceries",
  costco: "groceries", walmart: "groceries", aldi: "groceries", wholefoods: "groceries",
  milk: "groceries", eggs: "groceries", bread: "groceries", fruit: "groceries", veggies: "groceries",
  coffee: "treats", latte: "treats", cappuccino: "treats", espresso: "treats", matcha: "treats",
  boba: "treats", tea: "treats", starbucks: "treats", dessert: "treats", icecream: "treats",
  cake: "treats", snack: "treats", snacks: "treats", cookie: "treats", donut: "treats",
  chocolate: "treats", smoothie: "treats", juice: "treats",
  uber: "transport", lyft: "transport", grab: "transport", taxi: "transport", cab: "transport",
  bus: "transport", metro: "transport", subway: "transport", train: "transport", gas: "transport",
  fuel: "transport", parking: "transport", toll: "transport", scooter: "transport",
  shoes: "shopping", sneakers: "shopping", hoodie: "shopping", jacket: "shopping",
  shirt: "shopping", jeans: "shopping", dress: "shopping", clothes: "shopping",
  amazon: "shopping", headphones: "shopping", earbuds: "shopping", book: "shopping",
  books: "shopping", bag: "shopping", socks: "shopping", zara: "shopping", uniqlo: "shopping",
  ikea: "shopping", candle: "shopping", gadget: "shopping",
  serum: "beauty", lipstick: "beauty", skincare: "beauty", makeup: "beauty",
  moisturizer: "beauty", sunscreen: "beauty", cleanser: "beauty", toner: "beauty",
  mascara: "beauty", foundation: "beauty", perfume: "beauty", haircut: "beauty",
  nails: "beauty", salon: "beauty", sephora: "beauty",
  movie: "fun", movies: "fun", cinema: "fun", concert: "fun", tickets: "fun", bar: "fun",
  drinks: "fun", beer: "fun", wine: "fun", cocktails: "fun", club: "fun", game: "fun",
  games: "fun", steam: "fun", bowling: "fun", karaoke: "fun", museum: "fun",
  rent: "bills", electricity: "bills", water: "bills", internet: "bills", wifi: "bills",
  netflix: "bills", spotify: "bills", youtube: "bills", icloud: "bills", gym: "bills",
  insurance: "bills", disney: "bills", hulu: "bills", phone: "bills",
  gift: "other", gifts: "other", charity: "other", laundry: "other",
};

export function isKeyword(word: string): boolean {
  return Object.hasOwn(KEYWORDS, word);
}

export function words(text: string): string[] {
  return text.toLowerCase().match(/[a-z]+/g) ?? [];
}

/** The first word of a label that is in the keyword list. */
export function keywordOf(label: string): string | null {
  for (const w of words(label)) {
    if (isKeyword(w)) return w;
  }
  return null;
}

/** "eating out", "treats", "subscriptions" → a category. Longest alias wins. */
export function categoryFromText(text: string): Category | null {
  const t = ` ${words(text).join(" ")} `;
  const hit = Object.keys(ALIASES)
    .filter((alias) => t.includes(` ${alias} `))
    .sort((a, b) => b.length - a.length)[0];
  return hit ? (ALIASES[hit] ?? null) : null;
}

export type CategorySource = "memory" | "keyword" | "default";

export interface Categorized {
  category: Category;
  keyword: string | null;
  source: CategorySource;
}

export function categorize(label: string, rules: Readonly<Partial<Record<string, Category>>>): Categorized {
  const keyword = keywordOf(label);
  if (keyword) {
    const learned = rules[keyword];
    if (learned) return { category: learned, keyword, source: "memory" };
    return { category: KEYWORDS[keyword] ?? "other", keyword, source: "keyword" };
  }
  return { category: "other", keyword: null, source: "default" };
}
