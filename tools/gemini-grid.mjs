// Prints Gemini messages that draw four planned looks at once as a 2x2 grid, as JSON [[name, text], ...].
// usage: node tools/gemini-grid.mjs <dir> [maxGrids]
// Only average-body looks without an image are used, four of the same gender per grid.
// The grid is saved as <dir>/grid/gr_<id1>-<id2>-<id3>-<id4>.png and cut apart by tools/split-grid.py.
// One 1792x2400 grid gives four 896x1200 panels, the size the catalog JPEGs use anyway.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const [dir, maxArg] = process.argv.slice(2);
const plan = JSON.parse(readFileSync(join(dir, 'plan.json'), 'utf8'));
const todo = plan.filter(l => l.bodies[0] === 'avg' && !existsSync(join(dir, 'raw', `${l.id}_avg.png`)));
const SLOT = ['Top-left', 'Top-right', 'Bottom-left', 'Bottom-right'];

const grids = [];
for (const g of ['men', 'women']) {
  const list = todo.filter(l => l.g === g).sort((a, b) => a.band - b.band);
  for (let i = 0; i < list.length; i += 4) {
    const four = list.slice(i, i + 4);
    const text =
      'Generate one new image, portrait 3:4, laid out as a clean 2x2 grid of four equal panels separated by thin white gaps. ' +
      `Each panel is a separate full-body fashion catalog photo of a matte black faceless ${g === 'men' ? 'male' : 'female'} mannequin ` +
      'with an average, medium build, wearing a different Korean street-style outfit. The clothes fit naturally like on a real person, ' +
      'with realistic fabric drape and texture. The mannequin has a smooth featureless black head with no face and no hair, and black hands. ' +
      'In every panel: standing straight, front view, the entire figure visible from head to shoes with space above the head and below the feet, ' +
      'plain light gray seamless studio backdrop, soft even studio lighting, sharp focus. No text or labels.\n' +
      four.map((l, k) => `${SLOT[k]} panel: ${l.pieces.map(p => p.en).join('; ')}.`).join('\n') +
      (four.length < 4 ? `\n${SLOT.slice(four.length).join(' and ')} panel${four.length === 3 ? '' : 's'}: the same mannequin in a plain white t-shirt and black pants.` : '');
    grids.push(['gr_' + four.map(l => l.id).join('-'), text]);
  }
}
console.log(JSON.stringify(grids.slice(0, Number(maxArg) || grids.length)));
