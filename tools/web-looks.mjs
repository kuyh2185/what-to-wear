// Adds looks copied from outfit photos on other sites (tools/web-looks-<source>.mjs) to <dir>/plan.json.
// usage: node tools/web-looks.mjs <dir>                 rebuild the web looks in the plan
//        node tools/web-looks.mjs <dir> --check <file>  only validate one look file, write nothing
// Each file exports an array of looks, one per real outfit photo:
//   { g: 'men'|'women', band: 0-7, style, pal, src: { name, url }, seen: 'what the photo shows (Korean, one line)',
//     pieces: ['cat|color|name|shape|english for the image', ...] }
// Only garments visible in the photo go in; an inner layer that cannot be seen is a plain white tee
// (user request 2026-10-18). Ids are kept by source url, so re-running never orphans existing images.
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { COLORS } from '../outfits.js';
import { fixInners } from './inner-rule.mjs';

const dir = process.argv[2];
const checkIdx = process.argv.indexOf('--check');
const checkFile = checkIdx > 0 ? resolve(process.argv[checkIdx + 1]) : null;
const SHAPES = { outer: ['short', 'mid', 'long'], top: ['short', 'long', 'none'], bottom: ['pants', 'wide', 'shorts', 'skirt', 'longskirt'],
  shoes: ['low', 'boots', 'sandal'], acc: [''], dress: ['short-long', 'long-long', 'none-long', 'none-short', 'short-short', 'long-short'] };

const toolDir = import.meta.dirname;
const files = checkFile ? [checkFile]
  : readdirSync(toolDir).filter(f => /^web-looks-.+\.mjs$/.test(f)).sort().map(f => join(toolDir, f));

const problems = [];
const looks = [];
const used = new Set();
for (const file of files) {
  const list = (await import(pathToFileURL(file).href)).default;
  list.forEach((l, i) => {
    const at = `${basename(file)} #${i}`;
    if (!['men', 'women'].includes(l.g)) problems.push(`${at}: bad g ${l.g}`);
    if (!(l.band >= 0 && l.band <= 7)) problems.push(`${at}: bad band ${l.band}`);
    if (!l.style || !l.pal) problems.push(`${at}: style and pal are required`);
    if (!l.src?.name || !/^https?:\/\//.test(l.src?.url || '')) problems.push(`${at}: src needs name and url`);
    if (!l.seen) problems.push(`${at}: seen is required`);
    if (used.has(l.src?.url)) problems.push(`${at}: url used twice`);
    used.add(l.src?.url);
    const pieces = (l.pieces || []).map(s => {
      const parts = s.split('|');
      if (parts.length !== 5) problems.push(`${at}: piece needs 5 fields: ${s}`);
      const [cat, color, name, shape, en] = parts;
      if (!COLORS[color]) problems.push(`${at}: unknown color ${color}`);
      if (!SHAPES[cat]) problems.push(`${at}: unknown cat ${cat}`);
      else if (!SHAPES[cat].includes(shape)) problems.push(`${at}: bad shape "${shape}" for ${cat}`);
      if (!en) problems.push(`${at}: piece without english`);
      return { cat, name, color, shape, en };
    });
    if (!pieces.some(p => p.cat === 'shoes')) problems.push(`${at}: no shoes`);
    if (!pieces.some(p => p.cat === 'bottom' || p.cat === 'dress')) problems.push(`${at}: no bottom or dress`);
    looks.push({ g: l.g, band: l.band, style: l.style, pal: l.pal, sig: 'web:' + l.src?.url, trend: true, bodies: ['avg'],
      pieces: fixInners(pieces, { curated: true }).pieces, src: { name: l.src?.name, url: l.src?.url } });
  });
}
const count = {};
for (const l of looks) count[`${l.g}:${l.band}`] = (count[`${l.g}:${l.band}`] || 0) + 1;
if (problems.length) { console.log(problems.join('\n')); process.exit(1); }
if (checkFile) { console.log('ok', looks.length, 'looks', count); process.exit(0); }

const file = join(dir, 'plan.json');
const old = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : [];
const idOf = new Map(old.map(l => [l.sig, l.id]));
for (const l of looks) l.id = idOf.get(l.sig) || Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const keep = old.filter(l => !l.sig.startsWith('web:'));
writeFileSync(file, JSON.stringify(keep.concat(looks.map(({ id, ...l }) => ({ id, ...l }))), null, 1));
const bySrc = {};
for (const l of looks) bySrc[l.src.name] = (bySrc[l.src.name] || 0) + 1;
console.log(`plan: ${keep.length} other + ${looks.length} web looks`, bySrc, count);
