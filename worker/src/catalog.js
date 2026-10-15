// Pre-generated look catalog stored in KV (binding LOOKS).
// A cron run adds one look at a time: a random outfit for one gender/temperature band,
// rendered once for every body type of that gender. The site only reads from this catalog.
//
// KV keys
//   idx:<gender>:<band>   JSON array of looks in that cell
//   img:<lookId>:<body>   base64 JPEG
//   budget:<YYYY-MM-DD>   images rendered that day (UTC)
//   stats                 { images, looks }

import { makeCombo, BANDS, STYLES, BODY, rand } from '../../outfits.js';
import { buildPrompt, renderBase64 } from './render.js';

export const DAILY_IMAGE_BUDGET = 140; // stays inside the Workers AI free daily allocation
export const MAX_IMAGES = 880;         // ~1 GB KV free storage at ~1 MB per base64 image
export const TARGET = { men: 12, women: 10 };
const SEASON_BAND = [0, 1, 3, 4, 5, 6, 7, 7, 6, 4, 2, 1]; // typical band per month (Jan..Dec)

const kstNow = () => new Date(Date.now() + 9 * 3600e3);
// Workers AI's free allocation resets at 00:00 UTC, so the budget day is UTC too.
const budgetKey = () => 'budget:' + new Date().toISOString().slice(0, 10);
const repTemp = band => {
  const b = BANDS[band];
  return Math.round((Math.max(b.min, -6) + Math.min(b.max, 32)) / 2);
};

export async function readIndex(env, g, band) {
  return JSON.parse((await env.LOOKS.get(`idx:${g}:${band}`)) || '[]');
}

export async function readStats(env) {
  const stats = JSON.parse((await env.LOOKS.get('stats')) || '{"images":0,"looks":0}');
  stats.today = parseInt((await env.LOOKS.get(budgetKey())) || '0', 10);
  return stats;
}

export async function generateOne(env) {
  const bKey = budgetKey();
  const used = parseInt((await env.LOOKS.get(bKey)) || '0', 10);
  const stats = JSON.parse((await env.LOOKS.get('stats')) || '{"images":0,"looks":0}');
  const center = SEASON_BAND[kstNow().getUTCMonth()];

  const cells = [];
  let totalImages = 0; // counted from the indexes so it can't drift
  for (const g of ['men', 'women']) {
    for (let band = 0; band < BANDS.length; band++) {
      const idx = await readIndex(env, g, band);
      totalImages += idx.reduce((n, l) => n + l.bodies.length, 0);
      if (idx.length < TARGET[g]) cells.push({ g, band, idx, score: idx.length + 0.6 * Math.abs(band - center) + Math.random() * 0.1 });
    }
  }
  if (!cells.length) return { done: 'catalog_full' };
  cells.sort((a, b) => a.score - b.score);
  const { g, band, idx } = cells[0];
  const bodies = BODY[g].map(b => b.id);
  if (used + bodies.length > DAILY_IMAGE_BUDGET) return { done: 'daily_budget', used };
  if (totalImages + bodies.length > MAX_IMAGES) return { done: 'storage_cap', images: totalImages };

  const sigs = new Set(idx.map(l => l.sig));
  let combo;
  for (let k = 0; k < 30; k++) {
    combo = makeCombo(g, repTemp(band), false, rand(STYLES[g]), []);
    if (!sigs.has(combo.sig)) break;
  }
  const items = combo.pieces.slice(0, 7).map(p => `${p.color} ${p.name}`);
  const seed = Math.floor(Math.random() * 6);
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  // Reserve the budget before rendering so a failure can't overspend.
  await env.LOOKS.put(bKey, String(used + bodies.length), { expirationTtl: 3 * 86400 });

  const rendered = await Promise.all(bodies.map(async b => {
    const prompt = buildPrompt(g, b, 'm', items, seed);
    if (!prompt) return null;
    try {
      await env.LOOKS.put(`img:${id}:${b}`, await renderBase64(env, prompt));
      return b;
    } catch {
      return null;
    }
  }));
  const ok = rendered.filter(Boolean);
  if (ok.length < bodies.length) {
    await Promise.all(ok.map(b => env.LOOKS.delete(`img:${id}:${b}`)));
    return { failed: id, g, band, rendered: ok.length };
  }

  const look = {
    id, band, style: combo.style, pal: combo.pal, sig: combo.sig, bodies: ok, created: Date.now(),
    pieces: combo.pieces.map(({ cat, name, color, shape, product }) => ({ cat, name, color, shape, product })),
  };
  const fresh = await readIndex(env, g, band);
  fresh.push(look);
  await env.LOOKS.put(`idx:${g}:${band}`, JSON.stringify(fresh));
  await env.LOOKS.put('stats', JSON.stringify({ images: totalImages + ok.length, looks: stats.looks + 1 }));
  return { added: id, g, band, style: combo.style };
}

export async function serveImage(env, ctx, id, body) {
  const cache = caches.default;
  const key = new Request(`https://cache.what-to-wear/v1/img/${id}/${body}`);
  const hit = await cache.match(key);
  if (hit) return hit;
  const b64 = await env.LOOKS.get(`img:${id}:${body}`);
  if (!b64) return new Response('not found', { status: 404 });
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const res = new Response(bytes, {
    headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=31536000, immutable' },
  });
  ctx.waitUntil(cache.put(key, res.clone()));
  return res;
}
