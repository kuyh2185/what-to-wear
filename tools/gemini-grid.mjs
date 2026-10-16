// Prints the Gemini jobs for planned looks without an image, as compact JSON [[name, g, [panel, ...]], ...].
// usage: node tools/gemini-grid.mjs <dir> [maxJobs]
// Four looks of the same gender go into one 2x2 grid job (name gr_<id1>-<id2>-<id3>-<id4>, saved to
// <dir>/grid and cut apart by tools/split-grid.py). One 1792x2400 grid gives four 896x1200 panels, the
// size the catalog JPEGs use anyway. Leftovers that do not fill a grid become single-image jobs
// (name <id>_avg, saved to <dir>/raw): Gemini refuses grids padded with filler panels.
// The runner in the Gemini tab turns a job into the message text (see gridText below).
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const [dir, maxArg] = process.argv.slice(2);
const plan = JSON.parse(readFileSync(join(dir, 'plan.json'), 'utf8'));
const todo = plan.filter(l => l.bodies[0] === 'avg' && !existsSync(join(dir, 'raw', `${l.id}_avg.png`)));
const panel = l => l.pieces.map(p => p.en).join('; ') + '.';

const jobs = [];
for (const g of ['men', 'women']) {
  const list = todo.filter(l => l.g === g).sort((a, b) => a.band - b.band);
  const full = list.length - list.length % 4;
  for (let i = 0; i < full; i += 4) {
    const four = list.slice(i, i + 4);
    jobs.push(['gr_' + four.map(l => l.id).join('-'), g[0], four.map(panel)]);
  }
  for (const l of list.slice(full)) jobs.push([`${l.id}_avg`, g[0], [panel(l)]]);
}
console.log(JSON.stringify(jobs.slice(0, Number(maxArg) || jobs.length)));

// The message text the runner builds (kept here so the prompt is versioned with the tools):
export const gridText = (g, panels) => {
  const who = `a matte black faceless ${g === 'm' ? 'male' : 'female'} mannequin with an average, medium build`;
  const look = 'The clothes fit naturally like on a real person, with realistic fabric drape and texture. ' +
    'The mannequin has a smooth featureless black head with no face and no hair, and black hands.';
  if (panels.length === 1) {
    return `Generate one new image, portrait 3:4. Full-body fashion catalog photo of ${who}, styled as a Korean street-style outfit. ` +
      `The mannequin is wearing: ${panels[0]} ${look} Standing straight, front view, the entire figure visible from head to shoes, ` +
      'centered with space around it. Plain light gray seamless studio backdrop, soft even studio lighting, sharp focus.';
  }
  const SLOT = ['Top-left', 'Top-right', 'Bottom-left', 'Bottom-right'];
  return 'Generate one new image, portrait 3:4, laid out as a clean 2x2 grid of four equal panels separated by thin white gaps. ' +
    `Each panel is a separate full-body fashion catalog photo of ${who}, wearing a different Korean street-style outfit. ${look} ` +
    'In every panel: standing straight, front view, the entire figure visible from head to shoes with space above the head and below the feet, ' +
    'plain light gray seamless studio backdrop, soft even studio lighting, sharp focus. No text or labels.\n' +
    panels.map((p, k) => `${SLOT[k]} panel: ${p}`).join('\n');
};
