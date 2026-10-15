// Prints the Gemini messages for the next planned looks that have no image yet, as JSON.
// usage: node tools/gemini-batch.mjs <dir> <count> [avg|body]
// One message per look, drawn on the body the look was planned for. "avg" / "body" limits the
// batch to average-body looks / body-type looks. Files are saved as <id>_<body>.png into <dir>/raw.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { buildPrompt } from '../worker/src/render.js';

const [dir, countArg, only] = process.argv.slice(2);
const plan = JSON.parse(readFileSync(join(dir, 'plan.json'), 'utf8'));
const todo = plan
  .map(l => ({ ...l, body: l.bodies[0] }))
  .filter(l => !only || (only === 'avg') === (l.body === 'avg'))
  .filter(l => !existsSync(join(dir, 'raw', `${l.id}_${l.body}.png`)))
  .slice(0, Number(countArg) || 10);
console.log(JSON.stringify(todo.map(l => ({
  name: `${l.id}_${l.body}`,
  msg: 'Generate one new image, portrait 3:4. ' +
    buildPrompt(l.g, l.body, 'm', l.pieces.slice(0, 7).map(p => `${p.color} ${p.name}`), 0) +
    // Gemini tones body shapes down toward average unless told otherwise
    (l.body === 'avg' ? '' : ' The mannequin body shape must be clearly visible and obvious at a glance, not an average body.'),
}))));
