// Naver Shopping search proxy for 내일 뭐 입지?
// GET /search?q=...&q=...  (up to 8 queries) -> { results: [{ q, items: [...] }] }
// Secrets: NAVER_CLIENT_ID, NAVER_CLIENT_SECRET (wrangler secret)

const ALLOWED_ORIGINS = [
  'https://kuyh2185.github.io',
  'http://localhost:8000',
  'http://127.0.0.1:8000',
];
const MAX_QUERIES = 8;
const MAX_QUERY_LEN = 60;
const CACHE_SECONDS = 6 * 60 * 60;

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Vary': 'Origin',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'GET') return json({ error: 'method_not_allowed' }, 405, cors);

    const url = new URL(request.url);
    if (url.pathname !== '/search') return json({ error: 'not_found' }, 404, cors);
    if (!env.NAVER_CLIENT_ID || !env.NAVER_CLIENT_SECRET) return json({ error: 'missing_api_key' }, 503, cors);

    const queries = [...new Set(url.searchParams.getAll('q').map(q => q.trim()).filter(Boolean))].slice(0, MAX_QUERIES);
    if (!queries.length || queries.some(q => q.length > MAX_QUERY_LEN)) return json({ error: 'bad_query' }, 400, cors);

    const results = await Promise.all(queries.map(q => search(q, env, ctx)));
    return json({ results }, 200, { ...cors, 'Cache-Control': 'public, max-age=3600' });
  },
};

async function search(q, env, ctx) {
  const cache = caches.default;
  const key = new Request('https://cache.what-to-wear/shop?q=' + encodeURIComponent(q));
  const hit = await cache.match(key);
  if (hit) return hit.json();

  const api = 'https://openapi.naver.com/v1/search/shop.json?display=5&sort=sim&query=' + encodeURIComponent(q);
  let res;
  try {
    res = await fetch(api, {
      headers: { 'X-Naver-Client-Id': env.NAVER_CLIENT_ID, 'X-Naver-Client-Secret': env.NAVER_CLIENT_SECRET },
    });
  } catch {
    return { q, items: [], error: 'upstream_unreachable' };
  }
  if (!res.ok) return { q, items: [], error: 'upstream_' + res.status };

  const data = await res.json();
  const out = {
    q,
    items: (data.items || []).map(i => ({
      title: stripTags(i.title),
      image: i.image,
      price: Number(i.lprice) || null,
      mall: i.mallName || '',
      brand: i.brand || '',
      link: i.link,
    })),
  };
  ctx.waitUntil(cache.put(key, new Response(JSON.stringify(out), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'max-age=' + CACHE_SECONDS },
  })));
  return out;
}

function stripTags(s) {
  return String(s || '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  });
}
