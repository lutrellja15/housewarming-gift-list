import type { Filters, GiftItem } from './types';

export function formatPrice(price: number | null): string {
  return price === null ? 'Flexible' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
}

export function filterGifts(gifts: GiftItem[], filters: Filters): GiftItem[] {
  const query = filters.query.trim().toLowerCase();
  const min = Number.parseFloat(filters.minPrice);
  const max = Number.parseFloat(filters.maxPrice);

  return gifts.filter((gift) => {
    const matchesQuery =
      query.length === 0 ||
      [gift.title, gift.description, gift.store, gift.category, gift.priority].some((value) =>
        value.toLowerCase().includes(query)
      );
    const matchesCategory = filters.category === 'All' || gift.category === filters.category;
    const matchesStore = filters.store === 'All' || gift.store === filters.store;
    const matchesStatus = filters.status === 'All' || gift.status === filters.status;
    const matchesMin = Number.isNaN(min) || gift.price === null || gift.price >= min;
    const matchesMax = Number.isNaN(max) || gift.price === null || gift.price <= max;

    return matchesQuery && matchesCategory && matchesStore && matchesStatus && matchesMin && matchesMax;
  });
}

export function uniqueStores(gifts: GiftItem[]): string[] {
  return [...new Set(gifts.map((gift) => gift.store))].sort((a, b) => a.localeCompare(b));
}
