// Adds the MUSINSA codishop looks (tools/musinsa-looks-men.mjs / -women.mjs) to <dir>/plan.json.
// usage: node tools/musinsa-looks.mjs <dir>
// <dir>/musinsa/musinsa-codishop.json is the snap dump collected from the MUSINSA SNAP pages
// (snap list -> snap detail -> goods names). Each piece names a substring of one of the snap's goods,
// which links the look to the real product (name, brand, link, photo). Ids are kept by signature,
// so re-running never orphans images that already exist.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import men from './musinsa-looks-men.mjs';
import women from './musinsa-looks-women.mjs';
import { COLORS } from '../outfits.js';

const dir = process.argv[2];
const snaps = JSON.parse(readFileSync(join(dir, 'musinsa', 'musinsa-codishop.json'), 'utf8'));
const file = join(dir, 'plan.json');
const old = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : [];
const idOf = new Map(old.map(l => [l.sig, l.id]));
const norm = s => s.toLowerCase().replace(/\s+/g, ' ');

const problems = [];
const looks = [];
for (const [g, list] of [['men', men], ['women', women]]) {
  for (const [idx, band, style, pal, raw] of list) {
    const snap = snaps[idx];
    if (!snap) { problems.push(`${g} ${idx}: no snap`); continue; }
    if ((snap.g === 'MEN') !== (g === 'men')) problems.push(`${g} ${idx}: snap gender is ${snap.g}`);
    const pieces = raw.map(s => {
      const [cat, key, color, name, shape, en] = s.split('|');
      if (!COLORS[color]) problems.push(`${g} ${idx}: unknown color ${color}`);
      const p = { cat, name, color, shape, en };
      if (key) {
        const hit = snap.goods.find(x => norm(x.name).includes(norm(key)));
        if (!hit) problems.push(`${g} ${idx}: no goods match "${key}"`);
        else Object.assign(p, { product: `${hit.brand}|${hit.name}`, link: hit.link, img: hit.img, price: hit.price });
      }
      return p;
    });
    const sig = 'musinsa:' + snap.id;
    looks.push({
      id: idOf.get(sig) || Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      g, band, style, pal, sig, trend: true, bodies: ['avg'], pieces,
      src: { name: '무신사 코디샵', url: `https://www.musinsa.com/snap/${snap.id}` },
    });
  }
}
if (problems.length) { console.log(problems.join('\n')); process.exit(1); }

const keep = old.filter(l => !l.sig.startsWith('musinsa:'));
writeFileSync(file, JSON.stringify(keep.concat(looks), null, 1));
const count = {};
for (const l of keep.concat(looks)) count[`${l.g}:${l.band}`] = (count[`${l.g}:${l.band}`] || 0) + 1;
console.log(`plan: ${keep.length} trend + ${looks.length} musinsa looks`, count);
