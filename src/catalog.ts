import raw from './data/wines.json';
import type { WineStyle } from './types';

/** The local wine catalog. Edit src/data/wines.json to add or tweak styles. */
export const WINES: readonly WineStyle[] = raw as WineStyle[];
