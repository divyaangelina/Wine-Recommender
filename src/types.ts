/** Shared types for the wine catalog, quiz answers, and ranking results. */

export type Category = 'sparkling' | 'white' | 'rose' | 'red' | 'dessert' | 'fortified';

export type FoodId =
  | 'spicy'
  | 'seafood'
  | 'poultry'
  | 'red-meat'
  | 'tomato'
  | 'creamy'
  | 'veggie'
  | 'cheese'
  | 'dessert'
  | 'none';

export type SweetnessPref = 'dry' | 'off-dry' | 'sweet';

export type FlavorId = 'fruity' | 'crisp' | 'light' | 'bubbly' | 'rich' | 'earthy' | 'bold';

/** "I'm not sure" — treated exactly like a skipped question (neutral). */
export type Unsure = 'unsure';

export interface WineStyle {
  id: string;
  name: string;
  category: Category;
  /** 1 = bone dry, 3 = off-dry, 5 = very sweet */
  sweetness: number;
  /** 1–5 */
  acidity: number;
  /** 1–5 */
  body: number;
  /** 1–5, or null for styles where tannin isn't a meaningful factor (most whites, rosés, sparkling) */
  tannin: number | null;
  flavorNotes: string[];
  /** Flavor/texture tags that line up with the quiz's third question. */
  traits: FlavorId[];
  /** Foods this style is a textbook match for. */
  classicPairings: FoodId[];
  /** 1–5. How easy to find and enjoy this style is; used only as a tie-breaker. */
  versatility: number;
  /** A short phrase to look for on a label or wine-shop shelf. */
  lookFor: string;
  description: string;
}

export interface QuizAnswers {
  /** null = skipped */
  food: FoodId | Unsure | null;
  /** null = skipped */
  sweetness: SweetnessPref | Unsure | null;
  /** empty = skipped / not sure */
  flavors: readonly FlavorId[];
}

export interface ScoreFactor {
  kind: 'food' | 'taste';
  points: number;
  reason: string;
}

export interface RankedWine {
  wine: WineStyle;
  total: number;
  foodScore: number;
  tasteScore: number;
  /** Every factor that changed the score, positive or negative. */
  factors: ScoreFactor[];
  /** Plain-English reasons for the factors that actually helped, strongest first. */
  helped: string[];
}
