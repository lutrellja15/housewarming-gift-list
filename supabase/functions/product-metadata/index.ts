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

    const payload: MetadataResponse = {
      title,
      store: storeName(productUrl),
      storeUrl: productUrl.toString(),
      imageUrl: absoluteUrl(image, productUrl.toString()),
      description
    };

    return json(payload);
  } catch {
    return json({ error: 'Unable to read product metadata.' }, 502);
  }
});
