import { describe, expect, it } from 'vitest';
import { seedGifts } from './seed';
import { filterGifts, formatPrice, uniqueStores } from './filter';
import type { Filters } from './types';

const baseFilters: Filters = {
  query: '',
  category: 'All',
  store: 'All',
  status: 'All',
  minPrice: '',
  maxPrice: ''
};

describe('filterGifts', () => {
  it('filters by search query and status', () => {
    const result = filterGifts(seedGifts, { ...baseFilters, query: 'lamp', status: 'Reserved' });
    expect(result).toHaveLength(1);
    expect(result[0].title).toContain('Lamp');
  });

  it('filters by category and price ceiling', () => {
    const result = filterGifts(seedGifts, { ...baseFilters, category: 'Bathroom', maxPrice: '50' });
    expect(result.map((gift) => gift.title)).toEqual(['Hotel Cotton Towel Bundle']);
  });

  it('keeps flexible-price gifts in price filtered results', () => {
    const result = filterGifts(seedGifts, { ...baseFilters, maxPrice: '20' });
    expect(result.some((gift) => gift.price === null)).toBe(true);
  });
});

describe('formatPrice', () => {
  it('formats dollars and flexible prices', () => {
    expect(formatPrice(42)).toBe('$42.00');
    expect(formatPrice(null)).toBe('Flexible');
  });
});

describe('uniqueStores', () => {
  it('returns sorted unique stores', () => {
    expect(uniqueStores(seedGifts)).toEqual(['Amazon', 'Any Store', 'Walmart', 'Wayfair']);
  });
});
