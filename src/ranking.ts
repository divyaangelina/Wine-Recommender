/**
 * Wine ranking — pure functions, no DOM.
 *
 * Every wine gets two independent scores:
 *   - foodScore:  how well its structure (sweetness, acidity, body, tannin) suits the dish,
 *                 plus a bonus if it's a classic pairing for that dish.
 *   - tasteScore: how well it matches the sweetness and flavors the user said they like.
 *
 * total = foodScore + tasteScore. Skipped or "I'm not sure" answers contribute 0 to every
 * wine, so they never push one wine ahead of another.
 *
 * Ties are broken in a fixed order: total → foodScore → tasteScore → versatility → name.
 */
import { FLAVOR_PHRASES, FOOD_PHRASES, SWEETNESS_WORDS } from './quiz';
import type {
  FoodId,
  QuizAnswers,
  RankedWine,
  ScoreFactor,
  SweetnessPref,
  WineStyle,
} from './types';

interface FoodRule {
  /** Points for this wine (0 = rule doesn't apply). Negative values are penalties. */
  points: (w: WineStyle) => number;
  reason: string;
}

const tannin = (w: WineStyle) => w.tannin ?? 0;
const when = (cond: (w: WineStyle) => boolean, pts: number) => (w: WineStyle) => (cond(w) ? pts : 0);

export const FOOD_RULES: Record<FoodId, FoodRule[]> = {
  spicy: [
    { points: when((w) => w.sweetness >= 3 && w.sweetness <= 4, 2), reason: 'Its touch of sweetness cools chili heat.' },
    { points: when((w) => w.sweetness === 5, 1), reason: 'Its sweetness can tame chili heat.' },
    { points: when((w) => w.acidity >= 4, 1), reason: 'Bright acidity refreshes your mouth between spicy bites.' },
    { points: when((w) => w.body <= 2, 1), reason: 'Light body keeps it refreshing next to bold, spicy flavors.' },
    { points: when((w) => w.tannin !== null && w.tannin <= 1, 1), reason: 'Very low tannin, so it won’t make the spice feel hotter.' },
    { points: when((w) => tannin(w) >= 3, -3), reason: 'Firm tannin makes chili heat feel hotter.' },
    { points: when((w) => w.body >= 5, -1), reason: 'Big, heavy wines can amplify the burn.' },
  ],
  seafood: [
    { points: when((w) => w.acidity >= 4, 2), reason: 'Zesty acidity works like a squeeze of lemon on seafood.' },
    { points: when((w) => w.body <= 2, 1), reason: 'Light body won’t overwhelm delicate fish and shellfish.' },
    { points: when((w) => tannin(w) >= 3, -3), reason: 'Tannin can make fish taste metallic.' },
    { points: when((w) => w.sweetness >= 4, -2), reason: 'Too sweet for savory seafood.' },
    { points: when((w) => w.body >= 5, -1), reason: 'Too heavy for delicate seafood.' },
  ],
  poultry: [
    { points: when((w) => w.body >= 2 && w.body <= 4, 2), reason: 'Medium weight matches chicken and pork without overpowering them.' },
    { points: when((w) => w.acidity >= 4, 1), reason: 'Fresh acidity keeps each bite lively.' },
    { points: when((w) => tannin(w) >= 5, -2), reason: 'Heavy tannin overpowers lighter meats.' },
    { points: when((w) => w.sweetness >= 4, -2), reason: 'Too sweet for a savory main course.' },
  ],
  'red-meat': [
    { points: when((w) => tannin(w) >= 4, 3), reason: 'Firm tannin softens against the protein and fat in red meat.' },
    { points: when((w) => w.body >= 4, 2), reason: 'Full body stands up to rich, hearty flavors.' },
    { points: when((w) => w.body <= 2, -2), reason: 'Too light — the meat would overpower it.' },
    { points: when((w) => w.tannin === null, -1), reason: 'Without tannin, it has little grip against red meat.' },
    { points: when((w) => w.sweetness >= 4, -2), reason: 'Too sweet for a savory main course.' },
  ],
  tomato: [
    {
      points: (w) => (w.acidity >= 5 ? 3 : w.acidity === 4 ? 2 : 0),
      reason: 'High acidity keeps up with tangy tomato sauce.',
    },
    {
      points: when((w) => w.category === 'red' && w.body >= 2 && w.body <= 4 && tannin(w) <= 4, 1),
      reason: 'A medium-bodied red has enough flavor for herbs and melted cheese.',
    },
    { points: when((w) => w.sweetness >= 4, -2), reason: 'Too sweet for a savory dish.' },
  ],
  creamy: [
    { points: when((w) => w.body >= 4, 2), reason: 'Its rich, round texture mirrors creamy, buttery sauces.' },
    { points: when((w) => w.acidity >= 4, 1), reason: 'Acidity cuts through the richness so each bite stays fresh.' },
    { points: when((w) => tannin(w) >= 4, -2), reason: 'Strong tannin clashes with cream.' },
    { points: when((w) => w.sweetness >= 4, -2), reason: 'Too sweet for a savory dish.' },
  ],
  veggie: [
    { points: when((w) => w.acidity >= 4 && w.body <= 3, 3), reason: 'Zippy acidity stands up to vinaigrettes and fresh greens.' },
    { points: when((w) => tannin(w) >= 4, -2), reason: 'Big tannin overwhelms light, leafy dishes.' },
    { points: when((w) => w.body >= 5, -1), reason: 'Too heavy for a light dish.' },
    { points: when((w) => w.sweetness >= 4, -2), reason: 'Too sweet for a savory dish.' },
  ],
  cheese: [
    { points: when((w) => w.sweetness >= 4, 2), reason: 'Sweet wine loves salty, funky cheeses like blue.' },
    { points: when((w) => w.acidity >= 4, 1), reason: 'Acidity cuts through creamy cheese.' },
    { points: when((w) => tannin(w) >= 3 && tannin(w) <= 4, 1), reason: 'Moderate tannin pairs well with aged, hard cheeses.' },
  ],
  dessert: [
    {
      points: (w) => (w.sweetness >= 5 ? 4 : w.sweetness === 4 ? 3 : 0),
      reason: 'It’s at least as sweet as dessert, so it won’t taste sour next to it.',
    },
    { points: when((w) => w.sweetness <= 2, -3), reason: 'Dry wines taste thin and sour next to sweets.' },
  ],
  none: [
    {
      points: when((w) => w.body <= 3 && tannin(w) <= 2, 1),
      reason: 'Easygoing enough to enjoy on its own, no food needed.',
    },
  ],
};

export const CLASSIC_PAIRING_POINTS = 2;

/** Target sweetness range on the 1–5 scale for each preference. */
export const SWEETNESS_TARGETS: Record<SweetnessPref, [number, number]> = {
  dry: [1, 2],
  'off-dry': [3, 3],
  sweet: [4, 5],
};

export const SWEETNESS_MATCH_POINTS = 4;
export const FLAVOR_MATCH_POINTS = 2;

const SWEETNESS_PREF_LABELS: Record<SweetnessPref, string> = {
  dry: 'dry',
  'off-dry': 'off-dry',
  sweet: 'sweet',
};

function isFood(food: QuizAnswers['food']): food is FoodId {
  return food !== null && food !== 'unsure';
}

function isSweetnessPref(s: QuizAnswers['sweetness']): s is SweetnessPref {
  return s !== null && s !== 'unsure';
}

/** Food-pairing factors for one wine. Returns [] when food was skipped or "not sure". */
export function scoreFood(wine: WineStyle, food: QuizAnswers['food']): ScoreFactor[] {
  if (!isFood(food)) return [];
  const factors: ScoreFactor[] = [];
  for (const rule of FOOD_RULES[food]) {
    const points = rule.points(wine);
    if (points !== 0) factors.push({ kind: 'food', points, reason: rule.reason });
  }
  if (wine.classicPairings.includes(food)) {
    const reason =
      food === 'none'
        ? 'A classic aperitif — made for sipping on its own.'
        : `A classic pairing for ${FOOD_PHRASES[food]}.`;
    factors.push({ kind: 'food', points: CLASSIC_PAIRING_POINTS, reason });
  }
  return factors;
}

/** Taste-preference factors for one wine. Skipped / "not sure" answers add nothing. */
export function scoreTaste(wine: WineStyle, answers: Pick<QuizAnswers, 'sweetness' | 'flavors'>): ScoreFactor[] {
  const factors: ScoreFactor[] = [];

  if (isSweetnessPref(answers.sweetness)) {
    const pref = answers.sweetness;
    const [lo, hi] = SWEETNESS_TARGETS[pref];
    const distance = wine.sweetness < lo ? lo - wine.sweetness : wine.sweetness > hi ? wine.sweetness - hi : 0;
    const word = SWEETNESS_WORDS[wine.sweetness];
    const label = SWEETNESS_PREF_LABELS[pref];
    // Exact match is a strong boost; one step away is neutral; further away is a growing penalty.
    if (distance === 0) {
      factors.push({ kind: 'taste', points: SWEETNESS_MATCH_POINTS, reason: `It’s ${word}, right where you like it (${label}).` });
    } else if (distance >= 2) {
      const points = distance === 2 ? -SWEETNESS_MATCH_POINTS / 2 : -SWEETNESS_MATCH_POINTS;
      factors.push({ kind: 'taste', points, reason: `It’s ${word}, away from your “${label}” preference.` });
    }
  }

  const matched = answers.flavors.filter((f) => wine.traits.includes(f));
  if (matched.length > 0) {
    const phrases = matched.map((f) => FLAVOR_PHRASES[f]);
    const list =
      phrases.length === 1
        ? phrases[0]
        : `${phrases.slice(0, -1).join(', ')} and ${phrases[phrases.length - 1]}`;
    factors.push({
      kind: 'taste',
      points: FLAVOR_MATCH_POINTS * matched.length,
      reason: `It’s ${list} — ${matched.length === 1 ? 'a style' : 'styles'} you picked.`,
    });
  }

  return factors;
}

const sum = (factors: ScoreFactor[]) => factors.reduce((acc, f) => acc + f.points, 0);

export function scoreWine(wine: WineStyle, answers: QuizAnswers): RankedWine {
  const food = scoreFood(wine, answers.food);
  const taste = scoreTaste(wine, answers);
  const factors = [...food, ...taste];
  const helped = factors
    .filter((f) => f.points > 0)
    // Strongest first; food before taste on equal points (stable sort keeps original order).
    .sort((a, b) => b.points - a.points)
    .map((f) => f.reason);
  const foodScore = sum(food);
  const tasteScore = sum(taste);
  return { wine, total: foodScore + tasteScore, foodScore, tasteScore, factors, helped };
}

/** Deterministic ordering: total → food → taste → versatility → name → id. */
export function compareRanked(a: RankedWine, b: RankedWine): number {
  return (
    b.total - a.total ||
    b.foodScore - a.foodScore ||
    b.tasteScore - a.tasteScore ||
    b.wine.versatility - a.wine.versatility ||
    a.wine.name.localeCompare(b.wine.name, 'en') ||
    a.wine.id.localeCompare(b.wine.id, 'en')
  );
}

/** Score and sort the entire catalog. */
export function rankWines(catalog: readonly WineStyle[], answers: QuizAnswers): RankedWine[] {
  return catalog.map((w) => scoreWine(w, answers)).sort(compareRanked);
}

/** One top match plus two alternatives. */
export function topMatches(catalog: readonly WineStyle[], answers: QuizAnswers, count = 3): RankedWine[] {
  return rankWines(catalog, answers).slice(0, count);
}

export function hasAnyAnswer(answers: QuizAnswers): boolean {
  return isFood(answers.food) || isSweetnessPref(answers.sweetness) || answers.flavors.length > 0;
}

/** Plain-English explanation lines for a result card. Never empty. */
export function explain(result: RankedWine, answers: QuizAnswers): string[] {
  if (result.helped.length > 0) return result.helped;
  if (!hasAnyAnswer(answers)) {
    return ['You haven’t picked any preferences yet, so this is one of the most versatile, beginner-friendly styles.'];
  }
  return ['None of your answers gave this one a specific boost — it’s here as a versatile, easy-to-find fallback.'];
}

export const EMPTY_ANSWERS: QuizAnswers = { food: null, sweetness: null, flavors: [] };
