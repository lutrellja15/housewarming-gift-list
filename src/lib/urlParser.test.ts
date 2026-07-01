import { describe, expect, it } from 'vitest';
import { applyProductMetadata, buildStoreSearchUrl, normalizeMetadataUrl, parseProductUrl } from './urlParser';

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

describe('metadata helpers', () => {
  it('normalizes relative metadata image URLs', () => {
    expect(normalizeMetadataUrl('/photo.jpg', 'https://example.com/products/item')).toBe('https://example.com/photo.jpg');
  });

  it('applies metadata without losing fallback fields', () => {
    const fallback = parseProductUrl('https://example.com/products/oak-entryway-bench');
    const result = applyProductMetadata(fallback, {
      title: 'Oak Bench',
      imageUrl: 'https://example.com/bench.jpg'
    });

    expect(result.title).toBe('Oak Bench');
    expect(result.imageUrl).toBe('https://example.com/bench.jpg');
    expect(result.store).toBe('example');
  });
});
