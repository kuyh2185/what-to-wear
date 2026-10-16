// Uploads the Gemini looks in <dir>/raw to the catalog KV and rebuilds the indexes from <dir>/plan.json.
// usage (from the repo root): node tools/import-looks.mjs <dir> [--apply]
// Without --apply it only prints what would change. Looks in KV that are not in the plan
// (the old Workers AI catalog) are removed together with their images.
// Only images and indexes that changed since the last upload are written (<dir>/uploaded.json keeps a hash of
// each key): the free KV plan allows 1,000 writes a day, and the whole catalog is about as many.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { BANDS } from '../outfits.js';

const dir = resolve(process.argv[2]);
const apply = process.argv.includes('--apply');
const workerDir = resolve(import.meta.dirname, '../worker');
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const kv = (...args) => execFileSync(npx, ['wrangler', 'kv', ...args, '--binding', 'LOOKS', '--remote'],
  { cwd: workerDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], maxBuffer: 64e6, shell: process.platform === 'win32' });

const plan = JSON.parse(readFileSync(join(dir, 'plan.json'), 'utf8'));
const ready = plan.map(l => ({ ...l, bodies: l.bodies.filter(b => existsSync(join(dir, 'raw', `${l.id}_${b}.png`))) }))
  .filter(l => l.bodies.length);

// old catalog entries that are not part of the plan
const keep = new Set(ready.map(l => l.id));
const del = [];
const oldIdx = JSON.parse(kv('key', 'list', '--prefix', 'idx:')).map(k => k.name);
for (const k of oldIdx) {
  for (const l of JSON.parse(kv('key', 'get', k, '--text'))) {
    if (!keep.has(l.id)) for (const b of l.bodies) del.push(`img:${l.id}:${b}`);
  }
}

const tmp = mkdtempSync(join(tmpdir(), 'looks-'));
const sha = buf => createHash('sha1').update(buf).digest('hex');
const manifestFile = join(dir, 'uploaded.json');
const manifest = existsSync(manifestFile) ? JSON.parse(readFileSync(manifestFile, 'utf8')) : {};
const pngHash = new Map();
const pairs = ready.flatMap(l => l.bodies.map(b => [join(dir, 'raw', `${l.id}_${b}.png`), join(tmp, `${l.id}_${b}.jpg`)]))
  .filter(([png]) => { const key = 'img:' + basename(png, '.png').replace(/_([^_]+)$/, ':$1'); const h = sha(readFileSync(png)); pngHash.set(key, h); return manifest[key] !== h; });
const put = [];
const idx = {};
for (const l of ready) {
  const key = `idx:${l.g}:${l.band}`;
  (idx[key] ||= []).push({
    id: l.id, band: l.band, seed: 0, style: l.style, pal: l.pal, sig: l.sig, bodies: l.bodies, note: l.note, src: l.src,
    created: l.created || Date.now(), pieces: l.pieces,
  });
}
for (const g of ['men', 'women']) for (let b = 0; b < BANDS.length; b++) idx[`idx:${g}:${b}`] ||= [];
const images = ready.reduce((n, l) => n + l.bodies.length, 0);

const idxPut = Object.entries(idx).filter(([k, v]) => manifest[k] !== sha(JSON.stringify(v)));
console.log(`looks ${ready.length}, images ${images} (${pairs.length} changed), indexes changed ${idxPut.length}, old images to delete ${del.length}`);
for (const [k, v] of Object.entries(idx)) if (v.length) console.log(`  ${k}: ${v.length}`);
if (!apply) { rmSync(tmp, { recursive: true }); process.exit(0); }

// in batches: Windows caps a command line at 32K characters
for (let i = 0; i < pairs.length; i += 40) {
  execFileSync('python', ['-I', resolve(import.meta.dirname, 'to-jpeg.py'), ...pairs.slice(i, i + 40).flat()], { stdio: ['ignore', 'ignore', 'inherit'] });
}
for (const [png, jpg] of pairs) {
  const name = basename(png, '.png');
  const [id, body] = [name.slice(0, name.lastIndexOf('_')), name.slice(name.lastIndexOf('_') + 1)];
  put.push({ key: `img:${id}:${body}`, value: readFileSync(jpg).toString('base64'), base64: true });
}
for (const [k, v] of idxPut) put.push({ key: k, value: JSON.stringify(v) });
if (pairs.length || idxPut.length) put.push({ key: 'stats', value: JSON.stringify({ images, looks: ready.length }) });

// bulk put accepts up to 10,000 pairs / 100 MB per call; split to stay well under that
for (let i = 0; i < put.length; i += 40) {
  const f = join(tmp, `put-${i}.json`);
  writeFileSync(f, JSON.stringify(put.slice(i, i + 40)));
  kv('bulk', 'put', f);
  // remember what made it, so a run stopped by the daily limit resumes where it stopped
  for (const e of put.slice(i, i + 40)) {
    if (e.key.startsWith('img:')) manifest[e.key] = pngHash.get(e.key);
    else if (e.key.startsWith('idx:')) manifest[e.key] = sha(e.value);
  }
  writeFileSync(manifestFile, JSON.stringify(manifest));
}
if (del.length) {
  const f = join(tmp, 'del.json');
  writeFileSync(f, JSON.stringify(del));
  kv('bulk', 'delete', f, '--force');
}
rmSync(tmp, { recursive: true });
console.log('done');
