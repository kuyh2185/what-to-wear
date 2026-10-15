// Plans new looks for Gemini image generation and appends them to <dir>/plan.json.
// usage: node tools/plan-looks.mjs <dir> <band,band,...> <looksPerCell> [body,body,...|others]
// Without bodies, looks are for the average body. With bodies ("others" = every non-average body),
// each look is styled for that body: items its rules advise against are left out, only combos the
// site rates "잘 어울려요" are kept, and the look is drawn on that body's mannequin only.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { makeCombo, evaluate, BANDS, BODY, STYLES, shuffle } from '../outfits.js';

const [dir, bandArg, perArg, bodyArg = 'avg'] = process.argv.slice(2);
const bands = bandArg.split(',').map(Number);
const per = Number(perArg);
const file = join(dir, 'plan.json');
const plan = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : [];
const sigs = new Set(plan.map(l => l.sig));
const repTemp = b => Math.round((Math.max(BANDS[b].min, -6) + Math.min(BANDS[b].max, 32)) / 2);
const bodiesOf = g => bodyArg === 'others' ? BODY[g].filter(b => b.id !== 'avg')
  : BODY[g].filter(b => bodyArg.split(',').includes(b.id));

let n = 0;
for (const band of bands) {
  for (const g of ['men', 'women']) {
    for (const body of bodiesOf(g)) {
      const styles = shuffle(STYLES[g]);
      for (let k = 0; k < per; k++) {
        let combo, best = null;
        for (let t = 0; t < 60; t++) {
          combo = makeCombo(g, repTemp(band), false, styles[(k + Math.floor(t / 10)) % styles.length], body.rules, true);
          if (sigs.has(combo.sig)) continue;
          const score = evaluate(combo, body.rules).score;
          if (!best || score > best.score) best = { combo, score };
          if (body.id === 'avg' || score >= 1.5) break;
        }
        combo = (best || { combo }).combo;
        sigs.add(combo.sig);
        const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        plan.push({
          id, g, band, style: combo.style, pal: combo.pal, sig: combo.sig,
          bodies: [body.id],
          pieces: combo.pieces.map(({ cat, name, color, shape, product }) => ({ cat, name, color, shape, product })),
          status: 'todo',
        });
        n++;
      }
    }
  }
}
writeFileSync(file, JSON.stringify(plan, null, 1));
console.log(`added ${n} looks, plan has ${plan.length}`);
