import { describe, expect, it } from 'vitest';
import { WINES } from '../src/catalog';
import { EMPTY_ANSWERS, explain, rankWines, topMatches } from '../src/ranking';
import type { QuizAnswers } from '../src/types';

const ids = (answers: QuizAnswers) => rankWines(WINES, answers).map((r) => r.wine.id);
const topIds = (answers: QuizAnswers) => topMatches(WINES, answers).map((r) => r.wine.id);

describe('catalog', () => {
  it('has about 20 uniquely-identified styles with sane 1–5 scales', () => {
    expect(WINES.length).toBe(20);
    expect(new Set(WINES.map((w) => w.id)).size).toBe(WINES.length);
    for (const w of WINES) {
      for (const v of [w.sweetness, w.acidity, w.body, w.versatility]) {
        expect(v).toBeGreaterThanOrEqual(1);
        expect(v).toBeLessThanOrEqual(5);
      }
      expect(w.lookFor.length).toBeGreaterThan(0);
    }
  });

  it('treats dry and off-dry Riesling as distinct entries', () => {
    const dry = WINES.find((w) => w.id === 'dry-riesling')!;
    const offDry = WINES.find((w) => w.id === 'off-dry-riesling')!;
    expect(dry.sweetness).toBeLessThan(offDry.sweetness);
  });
});

describe('spicy food + off-dry preference', () => {
  const answers: QuizAnswers = { food: 'spicy', sweetness: 'off-dry', flavors: [] };
  const top = topMatches(WINES, answers);

  it('puts off-dry Riesling first', () => {
    expect(top[0].wine.id).toBe('off-dry-riesling');
  });

  it('returns one top match and two alternatives, none of them tannic', () => {
    expect(top).toHaveLength(3);
    for (const r of top) {
      expect(r.wine.tannin ?? 0).toBeLessThan(3);
      expect(r.wine.sweetness).toBeGreaterThanOrEqual(3);
    }
  });

  it('explains the factors that actually helped, food and taste', () => {
    const reasons = explain(top[0], answers);
    expect(reasons).toContain('Its touch of sweetness cools chili heat.');
    expect(reasons.some((r) => r.includes('off-dry'))).toBe(true);
    // Every explained reason maps to a positive factor.
    const positive = top[0].factors.filter((f) => f.points > 0).map((f) => f.reason);
    expect(reasons.every((r) => positive.includes(r))).toBe(true);
    expect(top[0].foodScore).toBeGreaterThan(0);
    expect(top[0].tasteScore).toBeGreaterThan(0);
  });

  it('ranks tannic reds near the bottom', () => {
    const order = ids(answers);
    expect(order.indexOf('cabernet-sauvignon')).toBeGreaterThan(order.length - 5);
  });
});

describe('changing the sweetness preference', () => {
  it('re-ranks results without changing the food answer', () => {
    const offDry = topIds({ food: 'spicy', sweetness: 'off-dry', flavors: [] });
    const dry = topIds({ food: 'spicy', sweetness: 'dry', flavors: [] });
    expect(dry).not.toEqual(offDry);
    // A dry-lover gets a dry wine on top; off-dry Riesling stays as a strong alternative.
    const dryTop = topMatches(WINES, { food: 'spicy', sweetness: 'dry', flavors: [] });
    expect(dryTop[0].wine.sweetness).toBeLessThanOrEqual(2);
    expect(dry).toContain('off-dry-riesling');
  });

  it('flips the top pick between a dry and a sweet wine', () => {
    const base = { food: 'cheese', flavors: [] } as const;
    const dryTop = topMatches(WINES, { ...base, sweetness: 'dry' })[0].wine;
    const sweetTop = topMatches(WINES, { ...base, sweetness: 'sweet' })[0].wine;
    expect(dryTop.sweetness).toBeLessThanOrEqual(2);
    expect(sweetTop.sweetness).toBeGreaterThanOrEqual(4);
  });
});

describe('skipped answers', () => {
  it('scores everything as neutral when every question is skipped', () => {
    const ranked = rankWines(WINES, EMPTY_ANSWERS);
    for (const r of ranked) {
      expect(r.total).toBe(0);
      expect(r.factors).toEqual([]);
    }
    // Fallback tie-break: most versatile first, then alphabetical.
    expect(ranked.slice(0, 3).map((r) => r.wine.name)).toEqual([
      'Brut Champagne & Cava',
      'Dry Provence Rosé',
      'Pinot Noir',
    ]);
    expect(explain(ranked[0], EMPTY_ANSWERS)[0]).toMatch(/versatile/);
  });

  it('treats “I’m not sure” exactly like a skip', () => {
    expect(ids({ food: 'unsure', sweetness: 'unsure', flavors: [] })).toEqual(ids(EMPTY_ANSWERS));
  });

  it('a skipped question adds zero to every wine’s score for that part', () => {
    const foodOnly = rankWines(WINES, { food: 'seafood', sweetness: null, flavors: [] });
    expect(foodOnly.every((r) => r.tasteScore === 0)).toBe(true);
    const tasteOnly = rankWines(WINES, { food: null, sweetness: 'sweet', flavors: ['bubbly'] });
    expect(tasteOnly.every((r) => r.foodScore === 0)).toBe(true);
    expect(tasteOnly[0].wine.id).toBe('moscato-dasti');
  });

  it('is deterministic regardless of catalog order', () => {
    const answers: QuizAnswers = { food: 'poultry', sweetness: null, flavors: ['fruity'] };
    const reversed = [...WINES].reverse();
    expect(rankWines(reversed, answers).map((r) => r.wine.id)).toEqual(ids(answers));
  });
});
