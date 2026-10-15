// AI outfit render prompts: built only from known body types and outfit items.

const COLOR_EN = {
  블랙: 'black', 화이트: 'white', 그레이: 'gray', 차콜: 'charcoal', 네이비: 'navy', 베이지: 'beige', 카멜: 'camel',
  브라운: 'brown', 카키: 'khaki', 올리브: 'olive', 아이보리: 'ivory', 크림: 'cream', 스카이블루: 'sky blue',
  연청: 'light-wash', 중청: 'medium-wash', 진청: 'dark-wash', 버건디: 'burgundy', 레드: 'red', 라벤더: 'lavender',
  핑크: 'pink', 민트: 'mint', 버터: 'butter yellow',
};

const ITEM_EN = {
  '롱 패딩': 'long puffer down coat', '숏 패딩': 'short puffer down jacket', '울 발마칸 코트': 'wool balmacaan overcoat',
  '더블 코트': 'double-breasted wool overcoat', '무스탕': 'shearling jacket', '플리스 자켓': 'fleece jacket',
  '레더 자켓': 'leather jacket', '트렌치코트': 'trench coat', '피쉬테일 야상': 'fishtail military parka',
  '블루종': 'bomber blouson jacket', '데님 자켓': 'denim trucker jacket', '바람막이': 'nylon windbreaker jacket',
  '코치 자켓': 'coach jacket', '블레이저': 'blazer', '셔츠 자켓': 'shirt jacket', '니트 가디건': 'knit cardigan',
  '후드 집업': 'zip-up hoodie', '린넨 셔츠': 'linen shirt worn open', '핸드메이드 롱코트': 'long wool coat',
  '하프 울코트': 'mid-length wool coat', '에코퍼 자켓': 'faux fur jacket', '퀼팅 자켓': 'quilted jacket',
  '트위드 자켓': 'tweed jacket', '크롭 데님 자켓': 'cropped denim jacket', '볼레로 가디건': 'cropped bolero cardigan',

  '터틀넥 니트': 'turtleneck sweater', '케이블 니트': 'cable-knit sweater', '기모 후드티': 'fleece-lined hoodie',
  '기모 맨투맨': 'fleece-lined sweatshirt', '하프집업 플리스': 'half-zip fleece pullover', '크루넥 니트': 'crewneck sweater',
  '맨투맨': 'crewneck sweatshirt', '후드티': 'hoodie', '옥스포드 셔츠': 'oxford button-down shirt',
  '체크 플란넬 셔츠': 'plaid flannel shirt', '롱슬리브 티': 'long-sleeve t-shirt', '니트 폴로': 'knit polo shirt',
  '헨리넥 티': 'henley shirt', '반팔 티셔츠': 'short-sleeve t-shirt', '그래픽 반팔티': 'graphic t-shirt',
  '피케 셔츠': 'pique polo shirt', '반팔 니트 폴로': 'short-sleeve knit polo', '린넨 반팔 셔츠': 'short-sleeve linen shirt',
  '기능성 반팔': 'athletic t-shirt', '포켓 반팔티': 'pocket t-shirt', '민소매 티': 'sleeveless tank top',
  '앙고라 니트': 'fluffy angora sweater', '꽈배기 니트': 'cable-knit sweater', '셔츠': 'button-up shirt',
  '블라우스': 'blouse', '니트 베스트 레이어드': 'knit vest layered over a white shirt', '슬림 롱슬리브': 'slim long-sleeve top',
  '라운드 니트': 'round-neck knit sweater', '빈티지 그래픽 티': 'vintage graphic t-shirt', '반팔 니트': 'short-sleeve knit top',
  '반팔 티': 'short-sleeve t-shirt', '크롭 반팔': 'cropped t-shirt', '반팔 블라우스': 'short-sleeve blouse',
  '슬리브리스': 'sleeveless top', '프릴 슬리브리스': 'ruffled sleeveless top',

  '기모 슬랙스': 'wool slacks', '기모 생지 데님': 'raw denim jeans', '코듀로이 팬츠': 'corduroy trousers',
  '울 슬랙스': 'wool slacks', '와이드 데님': 'wide-leg jeans', '스트레이트 데님': 'straight-leg jeans',
  '치노 팬츠': 'chino pants', '카고 팬츠': 'cargo pants', '나일론 트랙팬츠': 'nylon track pants',
  '와이드 슬랙스': 'wide-leg slacks', '스웻팬츠': 'sweatpants', '퍼티그 팬츠': 'fatigue pants', '린넨 팬츠': 'linen trousers',
  '데님 버뮤다': 'denim bermuda shorts', '면 반바지': 'cotton shorts', '나일론 쇼츠': 'nylon shorts',
  '기모 와이드 슬랙스': 'wide-leg slacks', '니트 롱스커트': 'long knit skirt', '부츠컷 데님': 'bootcut jeans',
  '울 미니스커트': 'wool mini skirt', '플리츠 미디스커트': 'pleated midi skirt', '슬랙스': 'slacks',
  '롱 데님 스커트': 'long denim skirt', '조거 팬츠': 'jogger pants', '린넨 와이드 팬츠': 'wide linen pants',
  '데님 쇼츠': 'denim shorts', '버뮤다 팬츠': 'bermuda shorts', '플레어 롱스커트': 'flared maxi skirt', '미니 스커트': 'mini skirt',

  '니트 원피스': 'knit dress', '멜빵 원피스': 'pinafore dress', '셔츠 원피스': 'shirt dress', '플라워 원피스': 'floral dress',
  '슬리브리스 원피스': 'sleeveless dress', '반팔 미니 원피스': 'short-sleeve mini dress',

  '첼시 부츠': 'chelsea boots', '워커 부츠': 'lace-up combat boots', '고어텍스 트레일 러너': 'trail running shoes',
  '더비 슈즈': 'leather derby shoes', '페니 로퍼': 'penny loafers', '가죽 스니커즈': 'leather sneakers',
  '컨버스 하이': 'high-top canvas sneakers', '청키 스니커즈': 'chunky sneakers', '러닝화': 'running shoes',
  '보트 슈즈': 'boat shoes', '스포츠 샌들': 'sport sandals', '슬라이드': 'slide sandals', '롱부츠': 'knee-high boots',
  '어그 부츠': 'sheepskin boots', '앵클 부츠': 'ankle boots', '로퍼': 'loafers', '메리제인': 'mary jane shoes',
  '발레 플랫': 'ballet flats', '화이트 스니커즈': 'sneakers', '컨버스 로우': 'low-top canvas sneakers',
  '슬링백': 'slingback heels', '뮬': 'mules', '스트랩 샌들': 'strappy sandals', '플립플랍': 'flip-flops',

  '머플러': 'scarf', '비니': 'beanie', '가죽 장갑': 'leather gloves', '볼캡': 'baseball cap', '캔버스 토트백': 'canvas tote bag',
  '크로스백': 'crossbody bag', '버킷햇': 'bucket hat', '선글라스': 'sunglasses', '가죽 벨트': 'leather belt',
  '퍼 귀도리': 'fur earmuffs', '니트 비니': 'knit beanie', '레그워머': 'leg warmers', '숄더백': 'shoulder bag',
  '실크 스카프': 'silk scarf', '리본 헤어핀': 'ribbon hair clip', '라탄백': 'rattan bag', '진주 귀걸이': 'pearl earrings',
  '기모 스타킹': 'thick opaque tights', '스타킹': 'sheer tights',
};

const BODY_EN = {
  men: {
    slim: 'a very thin, skinny body with narrow shoulders and thin arms and legs',
    avg: 'an average, medium build',
    muscle: 'a muscular bodybuilder physique with very broad shoulders, big chest and thick arms',
    chubby: 'an overweight, chubby plus-size body with a round belly, wide waist and thick arms',
  },
  women: {
    avg: 'an average, medium build',
    rect: 'a slim, boyish straight figure with a flat chest and no waist curve',
    hour: 'a voluptuous, curvy hourglass figure with a tiny waist, wide hips and a full bust',
    pear: 'a plus-size pear-shaped body with narrow shoulders, very wide hips and thick heavy thighs',
    inv: 'a tall athletic body with very broad, square swimmer shoulders, wide upper back and slim hips',
    apple: 'an overweight, plump plus-size body with a thick waist, full round face and heavy arms',
  },
};
const HEIGHT_EN = { s: ', short and petite', m: '', t: ', tall' };
const PLACES = [
  'on a Seoul city sidewalk', 'on a quiet street lined with cafes', 'in front of a plain concrete wall',
  'on a park path', 'at a crosswalk in downtown Seoul', 'in front of a brick building',
];
const MODEL = '@cf/black-forest-labs/flux-1-schnell';
const STEPS = 4;

// items: ["화이트 옥스포드 셔츠", ...]; returns null if anything is outside the known vocabulary
export function buildPrompt(g, bodyId, h, items, seed) {
  const body = BODY_EN[g] && BODY_EN[g][bodyId];
  if (!body || !(h in HEIGHT_EN)) return null;
  const parts = [];
  for (const it of items) {
    const sp = it.indexOf(' ');
    const color = COLOR_EN[it.slice(0, sp)];
    const name = ITEM_EN[it.slice(sp + 1)];
    if (sp < 1 || !color || !name) return null;
    parts.push(`${color} ${name}`);
  }
  if (!parts.length) return null;
  const person = g === 'men' ? 'man' : 'woman';
  return `Full-body street style fashion photograph. Body type: ${body}${HEIGHT_EN[h]}. ` +
    `A Korean ${person} in their twenties with ${body} is standing ${PLACES[seed % PLACES.length]}, wearing ${parts.join(', ')}. ` +
    'The whole body is visible from head to shoes, centered in frame, facing the camera. ' +
    'Natural daylight, realistic photo, 35mm lens, sharp focus.';
}

// returns the generated JPEG as a base64 string
export async function renderBase64(env, prompt) {
  const out = await env.AI.run(MODEL, { prompt, steps: STEPS });
  if (!out || !out.image) throw new Error('render_failed');
  return out.image;
}

export const KNOWN_ITEMS = ITEM_EN;
