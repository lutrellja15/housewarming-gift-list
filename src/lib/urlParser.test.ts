import { describe, expect, it } from 'vitest';
import { buildStoreSearchUrl, parseProductUrl } from './urlParser';

describe('parseProductUrl', () => {
  it('detects supported store and derives a readable title', () => {
    const result = parseProductUrl('https://www.wayfair.com/decor-pillows/pdp/warm-woven-throw-blanket.html');
    expect(result.store).toBe('Wayfair');
    expect(result.title).toBe('Decor Pillows');
    expect(result.storeUrl).toContain('wayfair.com');
  });

  it('supports custom product links', () => {
    const result = parseProductUrl('https://example-store.com/products/oak-entryway-bench');
    expect(result.store).toBe('example-store');
    expect(result.title).toBe('Oak Entryway Bench');
  });
});

describe('buildStoreSearchUrl', () => {
  it('builds official store search URLs', () => {
    expect(buildStoreSearchUrl('Amazon', 'mixing bowls')).toContain('amazon.com/s?k=mixing%20bowls');
    expect(buildStoreSearchUrl('Walmart', 'mixing bowls')).toContain('walmart.com/search?q=mixing%20bowls');
    expect(buildStoreSearchUrl('Wayfair', 'mixing bowls')).toContain('wayfair.com/keyword.php?keyword=mixing%20bowls');
  });
});
