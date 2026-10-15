// API for 내일 뭐 입지?
// GET /search?q=...&q=...    Daum (Kakao) image search, up to 8 queries -> { results: [{ q, items }] }
// GET /looks?g=men&band=3    pre-generated looks for a gender/temperature band
// GET /img/<lookId>/<body>   a look's AI image (JPEG)
// GET /admin/stats|generate  catalog status / add looks now (Authorization: Bearer ADMIN_TOKEN)
// cron                       adds one look per run until the daily budget is used
// Secrets: KAKAO_REST_API_KEY, ADMIN_TOKEN. Bindings: AI, LOOKS (KV)

import { generateOne, readIndex, readStats, serveImage, TARGET } from './catalog.js';
import { BANDS } from '../../outfits.js';

const ALLOWED_ORIGINS = [
  'https://kuyh2185.github.io',
  'http://localhost:8000',
  'http://127.0.0.1:8000',
];
const MAX_QUERIES = 8;
const MAX_QUERY_LEN = 60;
const CACHE_SECONDS = 6 * 60 * 60;

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(generateOne(env));
  },

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
    if (url.pathname === '/looks') return looks(url, env, cors);
    const img = url.pathname.match(/^\/img\/([a-z0-9]{6,20})\/([a-z]{2,8})$/);
    if (img) return serveImage(env, ctx, img[1], img[2]);
    if (url.pathname.startsWith('/admin/')) return admin(request, url, env, cors);
    if (url.pathname !== '/search') return json({ error: 'not_found' }, 404, cors);
    if (!env.KAKAO_REST_API_KEY) return json({ error: 'missing_api_key' }, 503, cors);

    const queries = [...new Set(url.searchParams.getAll('q').map(q => q.trim()).filter(Boolean))].slice(0, MAX_QUERIES);
    if (!queries.length || queries.some(q => q.length > MAX_QUERY_LEN)) return json({ error: 'bad_query' }, 400, cors);

    const results = await Promise.all(queries.map(q => search(q, env, ctx)));
    return json({ results }, 200, { ...cors, 'Cache-Control': 'public, max-age=3600' });
  },
};

async function search(q, env, ctx) {
  const cache = caches.default;
  const key = new Request('https://cache.what-to-wear/v2/image?q=' + encodeURIComponent(q));
  const hit = await cache.match(key);
  if (hit) return hit.json();

  const api = 'https://dapi.kakao.com/v2/search/image?sort=accuracy&size=10&query=' + encodeURIComponent(q);
  let res;
  try {
    res = await fetch(api, { headers: { Authorization: 'KakaoAK ' + env.KAKAO_REST_API_KEY } });
  } catch {
    return { q, items: [], error: 'upstream_unreachable' };
  }
  if (!res.ok) return { q, items: [], error: 'upstream_' + res.status };

  const data = await res.json();
  const out = {
    q,
    items: (data.documents || []).map(d => ({
      title: q,
      image: d.thumbnail_url,
      full: d.image_url,
      w: d.width || 0,
      h: d.height || 0,
      site: d.display_sitename || '',
      link: d.doc_url,
    })),
  };
  ctx.waitUntil(cache.put(key, new Response(JSON.stringify(out), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'max-age=' + CACHE_SECONDS },
  })));
  return out;
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  });
}

async function looks(url, env, cors) {
  const g = url.searchParams.get('g');
  const band = parseInt(url.searchParams.get('band'), 10);
  if (!(g in TARGET) || !(band >= 0 && band < BANDS.length)) return json({ error: 'bad_request' }, 400, cors);
  const list = (await readIndex(env, g, band)).map(({ sig, created, ...l }) => l);
  return json({ looks: list }, 200, { ...cors, 'Cache-Control': 'public, max-age=300' });
}

async function admin(request, url, env, cors) {
  const auth = request.headers.get('Authorization') || '';
  if (!env.ADMIN_TOKEN || auth !== 'Bearer ' + env.ADMIN_TOKEN) return json({ error: 'unauthorized' }, 401, cors);
  if (url.pathname === '/admin/stats') {
    const cells = {};
    for (const g of Object.keys(TARGET)) cells[g] = await Promise.all(BANDS.map(async (_, b) => (await readIndex(env, g, b)).length));
    return json({ ...(await readStats(env)), cells }, 200, cors);
  }
  if (url.pathname === '/admin/generate') {
    const n = Math.min(10, Math.max(1, parseInt(url.searchParams.get('n') || '1', 10)));
    const results = [];
    for (let i = 0; i < n; i++) {
      const r = await generateOne(env);
      results.push(r);
      if (r.done) break;
    }
    return json({ results }, 200, cors);
  }
  return json({ error: 'not_found' }, 404, cors);
}
