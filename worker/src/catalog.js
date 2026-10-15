// Pre-generated look catalog stored in KV (binding LOOKS).
// Each cron run does one job: first it fills in body types missing from an existing look
// (e.g. after new body types are added), otherwise it adds one new look for the emptiest
// gender/temperature band, rendered once for every body type of that gender.
// The site only reads from this catalog.
//
// KV keys
//   idx:<gender>:<band>   JSON array of looks in that cell
//   img:<lookId>:<body>   JPEG bytes (older entries may be base64 text)
//   budget:<YYYY-MM-DD>   images rendered that day (UTC)
//   stats                 { images, looks }

import { makeCombo, BANDS, STYLES, BODY, rand } from '../../outfits.js';
import { buildPrompt, renderBase64 } from './render.js';

export const DAILY_IMAGE_BUDGET = 200; // upper bound; the real stop is Workers AI's free daily allocation (error 4006)
export const MAX_IMAGES = 1100;        // ~1 GB KV free storage at ~0.75 MB per JPEG
export const TARGET = { men: 10, women: 8 };
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

// Renders `bodies` for one outfit and stores them. Returns the bodies that succeeded and the last error.
async function renderBodies(env, g, id, items, seed, bodies) {
  let lastError = '';
  const rendered = await Promise.all(bodies.map(async b => {
    const prompt = buildPrompt(g, b, 'm', items, seed);
    if (!prompt) return null;
    try {
      const jpeg = Uint8Array.fromBase64(await renderBase64(env, prompt));
      await env.LOOKS.put(`img:${id}:${b}`, jpeg);
      return b;
    } catch (e) {
      lastError = String((e && e.message) || e).slice(0, 200);
      return null;
    }
  }));
  return { ok: rendered.filter(Boolean), lastError };
}

export async function generateOne(env) {
  const bKey = budgetKey();
  const used = parseInt((await env.LOOKS.get(bKey)) || '0', 10);
  const stats = JSON.parse((await env.LOOKS.get('stats')) || '{"images":0,"looks":0}');
  const center = SEASON_BAND[kstNow().getUTCMonth()];

  const cells = [];
  let totalImages = 0; // counted from the indexes so it can't drift
  let backfill = null;
  for (const g of ['men', 'women']) {
    const want = BODY[g].map(b => b.id);
    for (let band = 0; band < BANDS.length; band++) {
      const idx = await readIndex(env, g, band);
      totalImages += idx.reduce((n, l) => n + l.bodies.length, 0);
      for (const look of idx) {
        const missing = want.filter(b => !look.bodies.includes(b));
        if (missing.length && (!backfill || Math.abs(band - center) < Math.abs(backfill.band - center))) {
          backfill = { g, band, look, missing };
        }
      }
      if (idx.length < TARGET[g]) cells.push({ g, band, idx, score: idx.length + 0.6 * Math.abs(band - center) + Math.random() * 0.1 });
    }
  }

  // Job 1: complete an existing look for body types it doesn't have yet.
  if (backfill) {
    const { g, band, look, missing } = backfill;
    if (used + missing.length > DAILY_IMAGE_BUDGET) return { done: 'daily_budget', used };
    if (totalImages + missing.length > MAX_IMAGES) return { done: 'storage_cap', images: totalImages };
    await env.LOOKS.put(bKey, String(used + missing.length), { expirationTtl: 3 * 86400 });
    const items = look.pieces.slice(0, 7).map(p => `${p.color} ${p.name}`);
    const seed = look.seed ?? Math.floor(Math.random() * 6);
    const { ok, lastError } = await renderBodies(env, g, look.id, items, seed, missing);
    if (ok.length < missing.length) await refund(env, bKey, used + ok.length, lastError);
    if (ok.length) {
      const fresh = await readIndex(env, g, band);
      const target = fresh.find(l => l.id === look.id);
      if (target) {
        target.bodies = [...new Set([...target.bodies, ...ok])];
        await env.LOOKS.put(`idx:${g}:${band}`, JSON.stringify(fresh));
      }
    }
    return { backfilled: look.id, g, band, rendered: ok, error: lastError || undefined };
  }

  // Job 2: add a new look to the emptiest cell.
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
  const { ok, lastError } = await renderBodies(env, g, id, items, seed, bodies);
  if (ok.length < bodies.length) {
    await Promise.all(ok.map(b => env.LOOKS.delete(`img:${id}:${b}`)));
    await refund(env, bKey, used + ok.length, lastError);
    return { failed: id, g, band, rendered: ok.length, error: lastError };
  }

  const look = {
    id, band, seed, style: combo.style, pal: combo.pal, sig: combo.sig, bodies: ok, created: Date.now(),
    pieces: combo.pieces.map(({ cat, name, color, shape, product }) => ({ cat, name, color, shape, product })),
  };
  const fresh = await readIndex(env, g, band);
  fresh.push(look);
  await env.LOOKS.put(`idx:${g}:${band}`, JSON.stringify(fresh));
  await env.LOOKS.put('stats', JSON.stringify({ images: totalImages + ok.length, looks: stats.looks + 1 }));
  return { added: id, g, band, style: combo.style };
}

// Gives back unused budget after a failed run. When the free daily allocation is used up (4006),
// marks the day as spent so nothing runs until it resets at 00:00 UTC.
async function refund(env, bKey, spent, lastError) {
  const value = lastError.startsWith('4006') ? DAILY_IMAGE_BUDGET : spent;
  await env.LOOKS.put(bKey, String(value), { expirationTtl: 3 * 86400 });
}

export async function serveImage(env, ctx, id, body) {
  const cache = caches.default;
  const key = new Request(`https://cache.what-to-wear/v1/img/${id}/${body}`);
  const hit = await cache.match(key);
  if (hit) return hit;
  const buf = await env.LOOKS.get(`img:${id}:${body}`, 'arrayBuffer');
  if (!buf) return new Response('not found', { status: 404 });
  let bytes = new Uint8Array(buf);
  if (!(bytes[0] === 0xff && bytes[1] === 0xd8)) bytes = Uint8Array.fromBase64(new TextDecoder().decode(bytes)); // older base64 entries
  const res = new Response(bytes, {
    headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=31536000, immutable' },
  });
  ctx.waitUntil(cache.put(key, res.clone()));
  return res;
}
