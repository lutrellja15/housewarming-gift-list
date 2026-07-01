type ParsedProduct = {
  title: string;
  store: string;
  storeUrl: string;
  imageUrl: string;
  price: number | null;
  description?: string;
};

const storeMatchers = [
  { host: 'amazon.', store: 'Amazon' },
  { host: 'walmart.', store: 'Walmart' },
  { host: 'wayfair.', store: 'Wayfair' }
];

export function parseProductUrl(input: string): ParsedProduct {
  const url = new URL(input.trim());
  const hostname = url.hostname.replace(/^www\./, '').toLowerCase();
  const store = storeMatchers.find((matcher) => hostname.includes(matcher.host))?.store ?? hostname.split('.')[0];
  const pathParts = url.pathname
    .split('/')
    .filter(Boolean)
    .filter((part) => !/^(dp|ip|p|product|products|gp|keyword|collections|shop)$/i.test(part));
  const slug = decodeURIComponent(pathParts[0] ?? store);
  const title = slug
    .replace(/[-_+]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .slice(0, 90);

  return {
    title,
    store,
    storeUrl: url.toString(),
    imageUrl: '',
    price: null
  };
}

export function normalizeMetadataUrl(input: string, baseUrl: string): string {
  if (!input.trim()) return '';
  return new URL(input.trim(), baseUrl).toString();
}

export function applyProductMetadata(product: ParsedProduct, metadata: Partial<ParsedProduct>): ParsedProduct {
  return {
    ...product,
    title: metadata.title?.trim() || product.title,
    imageUrl: metadata.imageUrl?.trim() || product.imageUrl,
    price: typeof metadata.price === 'number' && Number.isFinite(metadata.price) ? metadata.price : product.price,
    description: metadata.description?.trim() || product.description,
    store: metadata.store?.trim() || product.store,
    storeUrl: metadata.storeUrl?.trim() || product.storeUrl
  };
}

export function buildStoreSearchUrl(store: 'Amazon' | 'Walmart' | 'Wayfair', query: string): string {
  const encoded = encodeURIComponent(query.trim() || 'housewarming gifts');
  if (store === 'Amazon') return `https://www.amazon.com/s?k=${encoded}`;
  if (store === 'Walmart') return `https://www.walmart.com/search?q=${encoded}`;
  return `https://www.wayfair.com/keyword.php?keyword=${encoded}`;
}
