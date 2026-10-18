// Keeps inner layers plain. The shops tag outerwear, bottoms and shoes reliably, but the tee or tank
// worn underneath is often untagged or a multi-color basic ("[2PACK] 골지 나시_5컬러"), so its color
// was guessed, and an inner layer named without a color is filled by Gemini with any color it likes.
// Rules (user request, 2026-10-16):
//   - an outer with no top under it gets a plain white crew-neck tee
//   - layers named without a color ("over a ribbed tank") become plain white
//   - a plain tee-type top (tee, long sleeve, tank, sleeveless, camisole) worn under an outer becomes
//     white unless it is white, black, gray, charcoal, ivory or cream already
//   - in a shop coordination, a knit, shirt or hoodie under an outer whose product name states no color
//     keeps its item but gets a neutral (shirts white, the rest melange gray), since that color was a guess
// Kept as they are: knits, cardigans and shirts whose product name states the color (the coordination's
// point pieces), patterned pieces (check, stripe, graphic, jersey ...) whose pattern is the design, and the
// hand-picked trend looks, whose point colors are deliberate.
const COLOR_WORDS = /블랙|화이트|흰|그레이|회색|네이비|베이지|아이보리|크림|차콜|브라운|카키|올리브|민트|핑크|퍼플|보라|레드|블루|그린|옐로우|버건디|라벤더|오렌지|카멜|실버|멜란지|오트밀|스카이|인디고|소라|연청|중청|진청|흑청|와인|모카|토프|에크루|머스타드|코랄|black|white|gr[ae]y|navy|beige|ivory|cream|charcoal|brown|khaki|olive|mint|pink|purple|red|blue|green|yellow|burgundy|lavender|orange|camel|silver|melange|oatmeal|sky|indigo|ecru|taupe|mocha|wine|mustard|coral|lilac|lemon|butter|teal|sage|plum|stripe|check|camo/i;
const TEE = /t-shirt|\btee\b|long-sleeve|long sleeve|tank|sleeveless|camisole|ribbed top|baby tee/i;
const SHIRT = /shirt|blouse/i;
const PATTERN = /check|plaid|flannel|stripe|striped|graphic|print|logo|letter|jersey|ringer|camo|argyle|nordic|jacquard|\bdot|floral|tie-dye|gingham|houndstooth|paisley|motif|embroider/i;
const MULTI = /\d+\s*(?:colou?rs?|컬러|色)|colou?rs?\)|컬러\]|색상/i;
const DENIM = /denim|chambray/i;
const PLAIN = new Set(['화이트', '블랙', '그레이', '차콜', '아이보리', '크림', '네이비', '베이지']);
// point colors; a look keeps at most one (the site's "neutrals plus one point color" rule)
const LOUD = new Set(['민트', '퍼플', '라벤더', '핑크', '옐로우', '버터', '오렌지', '그린', '스카이블루', '블루', '레드', '버건디', '플럼']);
const SOFT = '(?:plain|soft|light|dark|deep|pale|pastel|muted|dusty|washed|faded|heather|bright|vivid|ash|warm|cool|mastic|ice|baby|powder|hot|neon|lemon|grass|ocean|sky|off)';
const HUE = '(?:sky blue|off-white|white|black|gr[ae]y|navy|beige|ivory|cream|charcoal|brown|khaki|olive|mint|pink|purple|red|blue|green|yellow|burgundy|lavender|orange|camel|silver|melange|oatmeal|indigo|ecru|taupe|mocha|wine|mustard|coral|lilac|lemon|butter|teal|sage|plum|magenta|maroon|pistachio|emerald|rose|peach|brick|tan|sand|stone|slate|lime|aqua|turquoise|grenadine)';
const COLOR_ANY = new RegExp(`\\b(?:${SOFT}[\\s-]+)*${HUE}\\b[\\s-]*`, 'gi');
const mainItem = en => en.split(/\s(?:over|under|underneath|layered|with)\s/)[0];
// drop the color words of the main item only ("mastic beige half-zip sweater layered under ..." -> "half-zip sweater layered under ...")
const stripColor = en => { const m = mainItem(en); return m.replace(COLOR_ANY, '').trim() + en.slice(m.length); };

// "pink soft hoodie zip-up over a ribbed tank" -> "... over a plain white ribbed tank"
function whitenLayers(en) {
  return en.replace(/\b(over|under|underneath|layered over|layered under|layered with|with)\s+an?\s+([^;,.]*?)(?=$|[;,.]| and )/gi, (m, prep, item) => {
    if (!TEE.test(item) || COLOR_WORDS.test(item)) return m;
    return `${prep} a ${PATTERN.test(item) ? 'white' : 'plain white'} ${item}`;
  });
}

// curated: hand-picked trend looks, whose colors are deliberate (the guessed-color rule does not apply)
// seen: every piece was copied from the outfit photo with the color it shows there (user request 2026-10-18:
//   only an inner with no evidence becomes a white tee), so nothing is recolored; only a missing top is added
export function fixInners(pieces, { curated = false, seen = false } = {}) {
  const has = c => pieces.some(p => p.cat === c);
  const changed = [];
  let out = seen ? pieces : pieces.map(p => {
    if (p.cat !== 'top' && p.cat !== 'outer') return p;
    let q = p;
    const layered = whitenLayers(q.en);
    if (layered !== q.en) { q = { ...q, en: layered }; changed.push('layer'); }
    if (p.cat !== 'top' || !has('outer')) return q;
    const main = mainItem(q.en);
    if (PATTERN.test(main) || DENIM.test(main)) return q;
    const isTee = TEE.test(main) && !SHIRT.test(main);
    const tagged = q.product ? q.product.split('|')[1] : '';
    // a guess: no product at all, or a multi-color product ('_5컬러', '(3color)') whose name says no color
    const guessed = !tagged || MULTI.test(tagged) && !COLOR_WORDS.test(tagged);
    if (isTee && !PLAIN.has(q.color)) {
      q = { ...q, color: '화이트', en: 'plain white ' + stripColor(q.en) };
      changed.push('tee');
    } else if (!isTee && LOUD.has(q.color) && pieces.some(o => o !== p && ['outer', 'bottom', 'dress', 'top'].includes(o.cat) && LOUD.has(o.color) && o.color !== q.color)) {
      // a second, different point color under the outer: the inner gives way (a same-color set is fine)
      const shirt = SHIRT.test(main);
      q = { ...q, color: shirt ? '화이트' : '그레이', en: (shirt ? 'white ' : 'melange gray ') + stripColor(q.en) };
      changed.push('clash');
    } else if (!curated && !isTee && guessed && !PLAIN.has(q.color)) {
      const shirt = SHIRT.test(main);
      q = { ...q, color: shirt ? '화이트' : '그레이', en: (shirt ? 'white ' : 'melange gray ') + stripColor(q.en) };
      changed.push('guess');
    }
    return q;
  });
  if (has('outer') && !has('top') && !has('dress')) {
    const at = out.findIndex(p => p.cat === 'outer') + 1;
    out = [...out.slice(0, at), { cat: 'top', name: '반팔 티', color: '화이트', shape: 'short', en: 'plain white crew-neck t-shirt underneath' }, ...out.slice(at)];
    changed.push('added');
  }
  return { pieces: out, changed };
}
