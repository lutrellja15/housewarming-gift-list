import { applyProductMetadata, parseProductUrl } from './urlParser';
import { supabase } from './store';

export type ProductMetadata = {
  title: string;
  store: string;
  storeUrl: string;
  imageUrl: string;
  description?: string;
  source: 'metadata' | 'fallback';
};

export async function fetchProductMetadata(url: string): Promise<ProductMetadata> {
  const fallback = parseProductUrl(url);

  if (!supabase) {
    return { ...fallback, source: 'fallback' };
  }

  const { data, error } = await supabase.functions.invoke('product-metadata', {
    body: { url: fallback.storeUrl }
  });

  if (error || !data || typeof data !== 'object') {
    return { ...fallback, source: 'fallback' };
  }

  const metadata = data as Partial<ProductMetadata>;
  const merged = applyProductMetadata(fallback, metadata);

  return {
    ...merged,
    source: merged.imageUrl || metadata.title ? 'metadata' : 'fallback'
  };
}
