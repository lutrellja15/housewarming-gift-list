const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

type MetadataResponse = {
  title: string;
  store: string;
  storeUrl: string;
  imageUrl: string;
  price: number | null;
  description: string;
};

const blockedHosts = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}

function isAllowedUrl(url: URL): boolean {
  if (!['https:', 'http:'].includes(url.protocol)) return false;
  if (blockedHosts.has(url.hostname)) return false;
  if (/\.local$|\.internal$|\.test$/i.test(url.hostname)) return false;
  return true;
}

function textBetween(html: string, pattern: RegExp): string {
  return html.match(pattern)?.[1]?.trim() ?? '';
}

function decodeHtml(value: string): string {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal: string) => String.fromCharCode(parseInt(decimal, 10)))
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function metaContent(html: string, names: string[]): string {
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const propertyFirst = new RegExp(
      `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      'i'
    );
    const contentFirst = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`,
      'i'
    );
    const value = textBetween(html, propertyFirst) || textBetween(html, contentFirst);
    if (value) return decodeHtml(value);
  }
  return '';
}

function storeName(url: URL): string {
  const hostname = url.hostname.replace(/^www\./, '').toLowerCase();
  if (hostname.includes('amazon.')) return 'Amazon';
  if (hostname.includes('walmart.')) return 'Walmart';
  if (hostname.includes('wayfair.')) return 'Wayfair';
  return hostname.split('.')[0] ?? hostname;
}

function absoluteUrl(value: string, baseUrl: string): string {
  if (!value) return '';
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return '';
  }
}

function stripTags(value: string): string {
  return decodeHtml(value.replace(/<[^>]+>/g, ' '));
}

function parsePrice(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;

  const normalized = value
    .replace(/&nbsp;/gi, ' ')
    .replace(/,/g, '')
    .match(/\d+(?:\.\d{1,2})?/);

  if (!normalized) return null;

  const price = Number(normalized[0]);
  return Number.isFinite(price) ? price : null;
}

function visibleProductPrice(html: string): number | null {
  const heroPatterns = [
    /data-seo-id=["']hero-price["'][^>]*>([\s\S]{0,800})<\/(?:div|span|section)>/i,
    /data-testid=["'][^"']*(?:price|Price)[^"']*["'][^>]*>([\s\S]{0,800})<\/(?:div|span|section)>/i,
    /class=["'][^"']*(?:price|Price)[^"']*["'][^>]*>([\s\S]{0,500})<\/(?:div|span|section)>/i
  ];

  for (const pattern of heroPatterns) {
    const text = stripTags(textBetween(html, pattern));
    const price = parsePrice(text);
    if (price !== null && price > 0) return price;
  }

  return null;
}

function findOfferPrice(value: unknown): number | null {
  if (!value || typeof value !== 'object') return null;

  if (Array.isArray(value)) {
    for (const item of value) {
      const price = findOfferPrice(item);
      if (price !== null) return price;
    }
    return null;
  }

  const record = value as Record<string, unknown>;
  const directPrice = parsePrice(record.price ?? record.lowPrice ?? record.highPrice);
  if (directPrice !== null) return directPrice;

  const offerPrice = findOfferPrice(record.offers);
  if (offerPrice !== null) return offerPrice;

  return findOfferPrice(record.aggregateOffer);
}

function jsonLdPrice(html: string): number | null {
  const scripts = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) ?? [];

  for (const script of scripts) {
    const rawJson = textBetween(script, /<script[^>]*>([\s\S]*?)<\/script>/i);
    if (!rawJson) continue;

    try {
      const parsed = JSON.parse(decodeHtml(rawJson));
      const price = findOfferPrice(parsed);
      if (price !== null) return price;
    } catch {
      continue;
    }
  }

  return null;
}

function productPrice(html: string): number | null {
  const visiblePrice = visibleProductPrice(html);
  if (visiblePrice !== null) return visiblePrice;

  const metadataPrice = parsePrice(
    metaContent(html, [
      'product:price:amount',
      'og:price:amount',
      'twitter:data1',
      'price',
      'parsely-price'
    ])
  );
  if (metadataPrice !== null) return metadataPrice;

  const itempropPrice =
    textBetween(html, /<meta[^>]+itemprop=["']price["'][^>]+content=["']([^"']+)["'][^>]*>/i) ||
    textBetween(html, /<meta[^>]+content=["']([^"']+)["'][^>]+itemprop=["']price["'][^>]*>/i);
  const itempropParsed = parsePrice(itempropPrice);
  if (itempropParsed !== null) return itempropParsed;

  const structuredPrice = jsonLdPrice(html);
  if (structuredPrice !== null && structuredPrice > 0) return structuredPrice;

  const statePatterns = [
    /"currentPrice"\s*:\s*\{[^{}]{0,400}?"price"\s*:\s*([0-9]+(?:\.[0-9]{1,2})?)/i,
    /"salePrice"\s*:\s*\{[^{}]{0,400}?"price"\s*:\s*([0-9]+(?:\.[0-9]{1,2})?)/i,
    /"priceInfo"\s*:\s*\{[\s\S]{0,1200}?"price"\s*:\s*([0-9]+(?:\.[0-9]{1,2})?)/i,
    /"priceString"\s*:\s*"\$([0-9][0-9,]*(?:\.[0-9]{1,2})?)"/i
  ];

  for (const pattern of statePatterns) {
    const price = parsePrice(textBetween(html, pattern));
    if (price !== null && price > 0) return price;
  }

  return null;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  let productUrl: URL;
  try {
    const body = await request.json();
    productUrl = new URL(String(body.url ?? '').trim());
  } catch {
    return json({ error: 'A valid product URL is required.' }, 400);
  }

  if (!isAllowedUrl(productUrl)) {
    return json({ error: 'Unsupported product URL.' }, 400);
  }

  try {
    const response = await fetch(productUrl, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent':
          'Mozilla/5.0 (compatible; HousewarmingGiftList/1.0; +https://github.com/lutrellja15/housewarming-gift-list)'
      },
      redirect: 'follow'
    });

    if (!response.ok) {
      return json({ error: `Product page returned ${response.status}.` }, 502);
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html')) {
      return json({ error: 'Product page did not return HTML.' }, 415);
    }

    const html = (await response.text()).slice(0, 1_000_000);
    const title =
      metaContent(html, ['og:title', 'twitter:title', 'title']) ||
      decodeHtml(textBetween(html, /<title[^>]*>([^<]+)<\/title>/i));
    const image = metaContent(html, ['og:image:secure_url', 'og:image', 'twitter:image', 'twitter:image:src']);
    const description = metaContent(html, ['og:description', 'twitter:description', 'description']);
    const price = productPrice(html);

    const payload: MetadataResponse = {
      title,
      store: storeName(productUrl),
      storeUrl: productUrl.toString(),
      imageUrl: absoluteUrl(image, productUrl.toString()),
      price,
      description
    };

    return json(payload);
  } catch {
    return json({ error: 'Unable to read product metadata.' }, 502);
  }
});
