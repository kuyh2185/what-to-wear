// Adds the MUSINSA codishop looks (tools/musinsa-looks-men*.mjs / -women*.mjs) to <dir>/plan.json.
// usage: node tools/musinsa-looks.mjs <dir>              rebuild the plan
//        node tools/musinsa-looks.mjs <dir> --check <file>  only validate one look file, write nothing
// <dir>/musinsa/musinsa-codishop*.json are snap dumps collected from the MUSINSA SNAP pages
// (snap list -> snap detail -> goods names). A look names its snap by index into the first dump
// (number) or by snap id (string). Each piece names a substring of one of the snap's goods, which
// links the look to the real product (name, brand, link, photo). Ids are kept by signature, so
// re-running never orphans images that already exist.
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { COLORS } from '../outfits.js';
import { fixInners } from './inner-rule.mjs';

const dir = process.argv[2];
const checkIdx = process.argv.indexOf('--check');
const checkFile = checkIdx > 0 ? resolve(process.argv[checkIdx + 1]) : null;
const mdir = join(dir, 'musinsa');
// musinsa-codishop.json is the first dump (looks refer into it by index), later ones are -2, -3, ...
const dumps = readdirSync(mdir).filter(f => /^musinsa-codishop(-\d+)?\.json$/.test(f))
  .sort((a, b) => (Number(a.match(/-(\d+)\./)?.[1]) || 1) - (Number(b.match(/-(\d+)\./)?.[1]) || 1))
  .map(f => JSON.parse(readFileSync(join(mdir, f), 'utf8')));
const first = dumps[0];
const byId = new Map(dumps.flat().map(s => [s.id, s]));
const norm = s => s.toLowerCase().replace(/\s+/g, ' ');
const SHAPES = { outer: ['short', 'mid', 'long'], top: ['short', 'long', 'none'], bottom: ['pants', 'wide', 'shorts', 'skirt', 'longskirt'],
  shoes: ['low', 'boots', 'sandal'], acc: [''], dress: ['short-long', 'long-long', 'none-long', 'none-short', 'short-short', 'long-short'] };

// Snaps whose pieces were checked against the snap photo (the third batch, and these first-batch snaps
// re-checked on 2026-10-18): their colors are the photo's, so the inner rule only adds a missing top.
const PHOTO_CHECKED = new Set(['1491663101765996138', '1556284433575686903', '1559928995170270466', '1555508871705901247', '1494318125603110617', '1531212955544032761', '1560286842770403600', '1556630356889679268', '1501454613768981106', '1505881157400361207', '1501454618567262744', '1501454617204116359', '1501454610728108961', '1501454611491474572', '1554075078695322686', '1554075077848072527', '1471726110274596828', '1465269760526428796', '1557326090718422884', '1468834658796973583', '1551785084074702496', '1557649377205955852', '1557636203762567738', '1550111867222299331', '1559820980161131019', '1559820979838169762', '1559918136505401383', '1557649378879479871', '1559918138191515511', '1559928994536930563', '1559931592736291782', '1560205086994182588', '1557649378443272902', '1535157358077973965', '1468497352680546576', '1554388157205047292', '1465203240605619027', '1556630356151483810', '1557606915826929320', '1557606914455389714', '1559438311007301147']);
const toolDir = import.meta.dirname;
const files = checkFile ? [checkFile]
  : readdirSync(toolDir).filter(f => /^musinsa-looks-(men|women).*\.mjs$/.test(f)).sort().map(f => join(toolDir, f));

const problems = [];
const looks = [];
const used = new Set();
for (const file of files) {
  const g = /-women/.test(basename(file)) ? 'women' : 'men';
  const list = (await import(pathToFileURL(file).href)).default;
  for (const [ref, band, style, pal, raw] of list) {
    const snap = typeof ref === 'number' ? first[ref] : byId.get(String(ref));
    const at = `${basename(file)} ${ref}`;
    if (!snap) { problems.push(`${at}: no snap`); continue; }
    if (used.has(snap.id)) problems.push(`${at}: snap used twice`);
    used.add(snap.id);
    if ((snap.g === 'MEN') !== (g === 'men')) problems.push(`${at}: snap gender is ${snap.g}`);
    if (!(band >= 0 && band <= 7)) problems.push(`${at}: bad band ${band}`);
    const pieces = raw.map(s => {
      const parts = s.split('|');
      if (parts.length !== 6) problems.push(`${at}: piece needs 6 fields: ${s}`);
      const [cat, key, color, name, shape, en] = parts;
      if (!COLORS[color]) problems.push(`${at}: unknown color ${color}`);
      if (!SHAPES[cat]) problems.push(`${at}: unknown cat ${cat}`);
      else if (!SHAPES[cat].includes(shape)) problems.push(`${at}: bad shape "${shape}" for ${cat}`);
      if (!en) problems.push(`${at}: piece without english`);
      const p = { cat, name, color, shape, en };
      if (key) {
        const hit = snap.goods.find(x => norm(x.name).includes(norm(key)));
        if (!hit) problems.push(`${at}: no goods match "${key}"`);
        else Object.assign(p, { product: `${hit.brand}|${hit.name}`, link: hit.link, img: hit.img, price: hit.price });
      }
      return p;
    });
    if (!pieces.some(p => p.cat === 'shoes')) problems.push(`${at}: no shoes`);
    if (!pieces.some(p => p.cat === 'bottom' || p.cat === 'dress')) problems.push(`${at}: no bottom or dress`);
    looks.push({
      g, band, style, pal, sig: 'musinsa:' + snap.id, trend: true, bodies: ['avg'], pieces: fixInners(pieces, { seen: file.endsWith('-3.mjs') || PHOTO_CHECKED.has(snap.id) }).pieces,
      src: { name: '무신사 코디샵', url: `https://www.musinsa.com/snap/${snap.id}` },
    });
  }
}
const count = {};
for (const l of looks) count[`${l.g}:${l.band}`] = (count[`${l.g}:${l.band}`] || 0) + 1;
if (problems.length) { console.log(problems.join('\n')); process.exit(1); }
if (checkFile) { console.log('ok', looks.length, 'looks', count); process.exit(0); }

const file = join(dir, 'plan.json');
const old = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : [];
const idOf = new Map(old.map(l => [l.sig, l.id]));
for (const l of looks) l.id = idOf.get(l.sig) || Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const keep = old.filter(l => !l.sig.startsWith('musinsa:'));
writeFileSync(file, JSON.stringify(keep.concat(looks.map(({ id, ...l }) => ({ id, ...l }))), null, 1));
const all = {};
for (const l of keep.concat(looks)) all[`${l.g}:${l.band}`] = (all[`${l.g}:${l.band}`] || 0) + 1;
console.log(`plan: ${keep.length} trend + ${looks.length} musinsa looks`, all);
