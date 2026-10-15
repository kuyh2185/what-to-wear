// Prints the Gemini chat messages for one planned look as JSON: one image per body type.
// usage: node tools/gemini-messages.mjs <dir> <lookIndex>
// The average body is drawn first; every other body is asked for relative to it, which makes
// Gemini exaggerate the differences far more than describing each body on its own.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildPrompt, BODY_EN } from '../worker/src/render.js';

const RELATIVE = {
  men: {
    slim: 'much thinner and skinnier than the first image: narrow shoulders, thin arms, thin legs, clothes hanging loosely',
    muscle: 'a muscular bodybuilder: much broader shoulders, bigger chest and thicker arms than the first image, narrow waist',
    chubby: 'much heavier than the first image: overweight plus-size body, round belly, wide waist, thick arms and legs',
    belly: 'the same frame as the first image but with a clearly protruding beer belly pushing the top forward; arms and legs unchanged',
    thigh: 'the same upper body as the first image but with much thicker, heavier thighs and wider hips filling out the pants',
  },
  women: {
    slim: 'much thinner and skinnier than the first image: narrow shoulders, thin arms, thin legs, clothes hanging loosely',
    rect: 'a straight boyish figure: flat chest, waist as wide as the hips, no curves at all, compared with the first image',
    hour: 'a very curvy hourglass figure: much larger bust, small cinched waist and much wider round hips than the first image',
    pear: 'narrow shoulders but much wider hips and thicker, heavier thighs than the first image',
    inv: 'much broader, square swimmer shoulders and a wide back with narrow hips, compared with the first image',
    apple: 'a soft rounded belly and thicker waist than the first image, with arms and legs about the same',
    plus: 'much heavier than the first image: plus-size curvy body with full arms, soft belly, wide hips and thick thighs',
  },
};

const [dir, idx] = process.argv.slice(2);
const look = JSON.parse(readFileSync(join(dir, 'plan.json'), 'utf8'))[Number(idx)];
const items = look.pieces.slice(0, 7).map(p => `${p.color} ${p.name}`);
const order = ['avg', ...look.bodies.filter(b => b !== 'avg')];
const msgs = order.map((b, i) => i === 0
  ? 'Generate one image, portrait 3:4. ' + buildPrompt(look.g, b, 'm', items, 0)
  : 'Generate one new image, portrait 3:4, with exactly the same outfit, colors, mannequin style, studio backdrop, lighting and framing as the first image. ' +
    `Only change the mannequin body: ${RELATIVE[look.g][b] || BODY_EN[look.g][b]}. Make the difference obvious at a glance.`);
console.log(JSON.stringify({ id: look.id, bodies: order, msgs }));
