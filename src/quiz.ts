/** Quiz questions and answer options. Pure data — no DOM. */
import type { FlavorId, FoodId, SweetnessPref, Unsure } from './types';

export interface Option<T extends string> {
  value: T;
  label: string;
  hint?: string;
  emoji: string;
}

export const FOOD_OPTIONS: Option<FoodId | Unsure>[] = [
  { value: 'spicy', label: 'Something spicy', hint: 'Thai, Indian, Sichuan, hot wings', emoji: '🌶️' },
  { value: 'seafood', label: 'Fish & shellfish', hint: 'White fish, shrimp, oysters, sushi', emoji: '🦐' },
  { value: 'poultry', label: 'Chicken or pork', hint: 'Roast chicken, turkey, pork chops', emoji: '🍗' },
  { value: 'red-meat', label: 'Steak or burgers', hint: 'Beef, lamb, barbecue', emoji: '🥩' },
  { value: 'tomato', label: 'Pizza or red-sauce pasta', hint: 'Anything tomato-y', emoji: '🍕' },
  { value: 'creamy', label: 'Creamy & buttery', hint: 'Alfredo, risotto, mac & cheese', emoji: '🧈' },
  { value: 'veggie', label: 'Salads & veggies', hint: 'Greens, grain bowls, goat cheese', emoji: '🥗' },
  { value: 'cheese', label: 'Cheese board', hint: 'Mixed cheeses & snacks', emoji: '🧀' },
  { value: 'dessert', label: 'Dessert', hint: 'Chocolate, fruit tarts, cake', emoji: '🍰' },
  { value: 'none', label: 'No food', hint: 'Just sipping', emoji: '🥂' },
  { value: 'unsure', label: 'I’m not sure', hint: 'Skip the food part', emoji: '🤷' },
];

export const SWEETNESS_OPTIONS: Option<SweetnessPref | Unsure>[] = [
  { value: 'dry', label: 'Dry', hint: 'Little to no sweetness', emoji: '🍋' },
  { value: 'off-dry', label: 'Off-dry', hint: 'Just a hint of sweetness', emoji: '🍑' },
  { value: 'sweet', label: 'Sweet', hint: 'Noticeably sweet, dessert-like', emoji: '🍯' },
  { value: 'unsure', label: 'I’m not sure', hint: 'No preference yet', emoji: '🤷' },
];

export const FLAVOR_OPTIONS: Option<FlavorId>[] = [
  { value: 'fruity', label: 'Juicy & fruity', hint: 'Berries, peach, tropical', emoji: '🍓' },
  { value: 'crisp', label: 'Crisp & zesty', hint: 'Citrus, green apple', emoji: '🍏' },
  { value: 'light', label: 'Light & refreshing', hint: 'Easy, breezy sipping', emoji: '🌿' },
  { value: 'bubbly', label: 'Bubbly', hint: 'Fizz and sparkle', emoji: '🫧' },
  { value: 'rich', label: 'Rich & smooth', hint: 'Round, creamy, velvety', emoji: '🍮' },
  { value: 'earthy', label: 'Earthy & savory', hint: 'Mushroom, herbs, pepper', emoji: '🍄' },
  { value: 'bold', label: 'Bold & grippy', hint: 'Big reds that dry your mouth', emoji: '🪵' },
];

/** Lower-case phrases used inside sentences, e.g. "a classic pairing for spicy dishes". */
export const FOOD_PHRASES: Record<FoodId, string> = {
  spicy: 'spicy dishes',
  seafood: 'fish and shellfish',
  poultry: 'chicken and pork',
  'red-meat': 'steak and burgers',
  tomato: 'pizza and tomato sauce',
  creamy: 'creamy, buttery dishes',
  veggie: 'salads and veggies',
  cheese: 'a cheese board',
  dessert: 'dessert',
  none: 'sipping on its own',
};

export const FLAVOR_PHRASES: Record<FlavorId, string> = {
  fruity: 'juicy and fruity',
  crisp: 'crisp and zesty',
  light: 'light and refreshing',
  bubbly: 'bubbly',
  rich: 'rich and smooth',
  earthy: 'earthy and savory',
  bold: 'bold and grippy',
};

export const SWEETNESS_WORDS = ['', 'bone dry', 'dry', 'off-dry', 'sweet', 'very sweet'] as const;

export const CATEGORY_LABELS = {
  sparkling: 'Sparkling',
  white: 'White',
  rose: 'Rosé',
  red: 'Red',
  dessert: 'Dessert',
  fortified: 'Fortified',
} as const;
