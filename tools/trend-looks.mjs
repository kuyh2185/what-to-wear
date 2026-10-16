// Trend-based looks for the model-fit (average body) catalog, written into <dir>/plan.json.
// usage: node tools/trend-looks.mjs <dir>
// Replaces the plan with these looks; the previous plan is kept as plan.before-trend.json.
//
// "잘 입었다" criteria for fall/winter 2026, drawn from (2026-10-16):
//   GQ Korea 2026 가을 포인트 아이템 20 (스웨이드 재킷, 걸치는 체크 셔츠, 스트레이트 진, 청키 니트·집업 니트, 보트 슈즈)
//   Vogue Korea 2026 F/W 남성복 트렌드 12 (3세대 프레피 더플 코트, 핑크 니트, 실크 스카프, 버펄로 체크, 블랙 레더)
//   Harper's Bazaar·Marie Claire Korea F/W 키워드 (미니멀 미디 드레스, 스커트 수트, 컬러 레이어링, 퍼플, 오버 더 니 부츠)
//   무신사 9월 브랜드 랭킹·데님 주간 랭킹 (후디드 라이트 다운, 투톤 후드 집업, 숏 패딩, 브라운 스니커즈, 커브드·배럴 데님)
//   2026 가을 유튜브 코디 영상 (스웨이드 숄더백, 진청 스트레이트, 로퍼, 브라운 스웨이드 재킷, 블랙 롱부츠, 블랙 크롭 레더 재킷)
// 4° 이하: 무신사 패딩 거래액에서 숏 패딩 비중 증가, 12월 상의 랭킹 터틀넥 1위·스웨트셔츠·후드티,
//   레더 패딩, 무스탕·시어링 (삼성패션연구소 "코트·패딩·무스탕·시어링 공존"), 패딩·퍼 슈즈
// 20~22°: 엘르 코리아 2026.8 "두 계절 섞기"(청바지·재킷·셔츠), 셔츠를 소재·여밈으로 톱↔아우터로,
//   Who What Wear 2026 가을 셔츠 트렌드(실크 버튼다운, 래글런 티, 슬리브리스 터틀넥), SS26 스트리트의 럭비 셔츠
// 23° 이상: 2026 SS 씨스루(쉬어·레이스·크로셰), 젤리 슈즈·메리제인, 리본 디테일, 남성 오픈토 샌들·데님·워크웨어,
//   무신사 6월 신발 랭킹 상위 절반이 리커버리 샌들·블랙 슬리퍼, 반소매 티 검색 6배, 무신사 스탠다드 냉감 슬랙스
// Rules every look follows:
//   1. 볼륨은 한 곳만: 커브드·와이드 하의엔 정돈된 상의, 오버 니트·아우터엔 스트레이트 하의
//   2. 뉴트럴(그레이·브라운·블랙·아이보리·네이비) 2~3색 + 포인트 1색(레드·버건디·핑크·퍼플)은 니트나 소품 하나로
//   3. 시즌 키 아이템을 1~2개 넣기
//   4. 소재 섞기(스웨이드·레더 + 니트·데님), 신발·가방으로 톤 연결
import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { fixInners } from './inner-rule.mjs';

// [cat, name, color, shape, english for the image prompt]
const L = (g, band, style, pal, note, pieces) => ({ g, band, style, pal, note, pieces });
const LOOKS = [
  // ---------- men, 17~19° ----------
  L('men', 4, '스웨이드 재킷', '브라운 & 데님', '올가을 재킷 1순위인 스웨이드에 흰 티, 진청 스트레이트, 로퍼를 더한 90년대 공식이에요', [
    ['outer', '스웨이드 블루종', '브라운', 'short', 'brown suede blouson jacket, unzipped'],
    ['top', '반팔 티셔츠', '화이트', 'short', 'plain white crewneck t-shirt'],
    ['bottom', '스트레이트 데님', '진청', 'pants', 'dark indigo straight-leg jeans with the hem just touching the shoes'],
    ['shoes', '페니 로퍼', '블랙', 'low', 'black leather penny loafers'],
  ]),
  L('men', 4, '체크 셔츠 레이어드', '화이트 & 체크', '체크 셔츠는 잠그지 않고 걸쳐 입는 게 올해 방식이에요. 흰 카고 팬츠와 트레일 러너로 가볍게 마무리해요', [
    ['outer', '체크 셔츠', '네이비', 'short', 'navy and green plaid flannel shirt worn open like a light jacket'],
    ['top', '반팔 티셔츠', '화이트', 'short', 'plain white t-shirt'],
    ['bottom', '카고 팬츠', '아이보리', 'wide', 'ivory relaxed cargo pants'],
    ['shoes', '트레일 러너', '그레이', 'low', 'gray trail running sneakers'],
    ['acc', '볼캡', '네이비', '', 'navy baseball cap'],
  ]),
  L('men', 4, '집업 니트', '그레이 & 브라운', '어깨가 자연스럽게 떨어지는 그레이 집업 니트에 연청 스트레이트, 다크 브라운 스웨이드 보트 슈즈를 맞췄어요', [
    ['outer', '집업 니트 가디건', '그레이', 'short', 'gray chunky zip-up knit cardigan with dropped shoulders'],
    ['top', '반팔 티셔츠', '화이트', 'short', 'white t-shirt'],
    ['bottom', '스트레이트 데님', '연청', 'pants', 'light-wash straight-leg jeans'],
    ['shoes', '스웨이드 보트 슈즈', '브라운', 'low', 'dark brown suede boat shoes with a chunky sole'],
  ]),
  L('men', 4, '투톤 후드 집업', '블랙 & 크림', '무신사 9월 랭킹 상위의 투톤 후드 집업에 볼륨 있는 커브드 데님, 러닝화로 스포티하게 입어요', [
    ['outer', '투톤 후드 집업', '블랙', 'short', 'black and cream two-tone track hoodie zip-up jacket'],
    ['top', '반팔 티셔츠', '그레이', 'short', 'gray t-shirt'],
    ['bottom', '커브드 데님', '블랙', 'wide', 'washed black curved balloon-leg jeans'],
    ['shoes', '러닝화', '그레이', 'low', 'gray and silver retro running sneakers'],
  ]),
  // ---------- men, 12~16° ----------
  L('men', 3, '릴랙스 오피스', '차콜 & 데님', '블레이저에 미드라이즈 스트레이트 진을 매치하는 편한 오피스룩이 올해 기본이에요', [
    ['outer', '블레이저', '차콜', 'mid', 'charcoal relaxed single-breasted wool blazer'],
    ['top', '크루넥 니트', '그레이', 'long', 'gray crewneck sweater'],
    ['bottom', '스트레이트 데님', '진청', 'pants', 'dark indigo mid-rise straight-leg jeans'],
    ['shoes', '페니 로퍼', '블랙', 'low', 'black leather loafers'],
  ]),
  L('men', 3, '후디드 라이트 다운', '카키 & 블랙', '무신사 9월 1위 아이템인 후디드 라이트 다운을 후드티 위에 겹쳐 입었어요', [
    ['outer', '후디드 라이트 다운', '카키', 'short', 'khaki lightweight hooded down jacket'],
    ['top', '후드티', '그레이', 'long', 'heather gray hoodie'],
    ['bottom', '와이드 슬랙스', '블랙', 'wide', 'black wide-leg slacks'],
    ['shoes', '가죽 스니커즈', '화이트', 'low', 'white leather low-top sneakers'],
  ]),
  L('men', 3, '브라운 톤온톤', '어스 톤', '브라운 스웨이드 재킷과 아이보리 케이블 니트, 브라운 부츠로 톤을 이어 입어요', [
    ['outer', '스웨이드 재킷', '브라운', 'short', 'brown suede trucker jacket'],
    ['top', '케이블 니트', '아이보리', 'long', 'ivory cable-knit sweater'],
    ['bottom', '스트레이트 데님', '진청', 'pants', 'dark indigo straight-leg jeans'],
    ['shoes', '첼시 부츠', '브라운', 'boots', 'brown suede chelsea boots'],
  ]),
  L('men', 3, '아웃도어 체크', '레드 & 올리브', '보그가 꼽은 벌목꾼 무드: 레드 버펄로 체크 셔츠에 올리브 카고, 워커 부츠예요', [
    ['outer', '버펄로 체크 셔츠', '레드', 'short', 'red and black buffalo check overshirt'],
    ['top', '롱슬리브 티', '화이트', 'long', 'white long-sleeve t-shirt'],
    ['bottom', '카고 팬츠', '올리브', 'wide', 'olive green relaxed cargo pants'],
    ['shoes', '워커 부츠', '블랙', 'boots', 'black lace-up leather work boots'],
    ['acc', '비니', '그레이', '', 'gray knit beanie'],
  ]),
  // ---------- men, 9~11° ----------
  L('men', 2, '3세대 프레피', '카멜 & 그레이', '토글 단추 더플 코트에 그레이 니트, 와이드 슬랙스, 로퍼로 단정하지만 편하게 입어요', [
    ['outer', '더플 코트', '카멜', 'mid', 'camel corduroy duffle coat with toggle buttons'],
    ['top', '크루넥 니트', '그레이', 'long', 'gray crewneck sweater'],
    ['bottom', '와이드 슬랙스', '차콜', 'wide', 'charcoal wide-leg wool slacks'],
    ['shoes', '페니 로퍼', '브라운', 'low', 'brown leather penny loafers'],
  ]),
  L('men', 2, '핑크 니트 & 레더', '블랙 & 핑크', '올해 남성복 포인트 컬러인 핑크 니트를 블랙 레더 재킷과 블랙 진으로 눌러 줬어요', [
    ['outer', '레더 자켓', '블랙', 'short', 'black leather jacket'],
    ['top', '크루넥 니트', '핑크', 'long', 'soft pink crewneck sweater'],
    ['bottom', '스트레이트 데님', '블랙', 'pants', 'black straight-leg jeans'],
    ['shoes', '첼시 부츠', '블랙', 'boots', 'black leather chelsea boots'],
  ]),
  L('men', 2, '숏 패딩 데일리', '블랙 & 그레이', '랭킹 상위 숏 패딩에 그레이 후드티, 진청 스트레이트, 러닝화를 맞춘 데일리룩이에요', [
    ['outer', '숏 패딩', '블랙', 'short', 'black short puffer down jacket'],
    ['top', '후드티', '그레이', 'long', 'gray hoodie with the hood out'],
    ['bottom', '스트레이트 데님', '진청', 'pants', 'dark indigo straight-leg jeans'],
    ['shoes', '러닝화', '그레이', 'low', 'gray retro running sneakers'],
  ]),
  L('men', 2, '다크 롱코트', '차콜 & 버건디', '긴 다크 코트와 블랙 터틀넥, 버건디 머플러 하나로 레드 포인트를 줬어요', [
    ['outer', '롱 울코트', '차콜', 'long', 'long charcoal wool overcoat'],
    ['top', '터틀넥 니트', '블랙', 'long', 'black turtleneck sweater'],
    ['bottom', '울 슬랙스', '그레이', 'pants', 'gray straight wool trousers'],
    ['shoes', '더비 슈즈', '블랙', 'low', 'black leather derby shoes'],
    ['acc', '머플러', '버건디', '', 'burgundy wool scarf'],
  ]),
  // ---------- men, 5~8° ----------
  L('men', 1, '스키 스웨터', '그레이 & 레드', '알프스 무드의 패턴 니트를 그레이 롱코트 안에 넣고 레드 머플러로 포인트를 줬어요', [
    ['outer', '롱 울코트', '그레이', 'long', 'long gray wool overcoat'],
    ['top', '노르딕 패턴 니트', '아이보리', 'long', 'ivory nordic ski sweater with a navy and red pattern'],
    ['bottom', '스트레이트 데님', '진청', 'pants', 'dark indigo straight-leg jeans'],
    ['shoes', '워커 부츠', '브라운', 'boots', 'brown leather lace-up boots'],
    ['acc', '머플러', '레드', '', 'red wool scarf'],
  ]),
  L('men', 1, '퍼 자켓', '브라운 & 크림', '겨울 남친룩에 많이 나오는 퍼 자켓에 크림 니트, 연청 스트레이트, 로퍼로 부드럽게 입어요', [
    ['outer', '페이크 퍼 자켓', '브라운', 'short', 'brown faux shearling fur jacket'],
    ['top', '크루넥 니트', '크림', 'long', 'cream crewneck sweater'],
    ['bottom', '스트레이트 데님', '연청', 'pants', 'light-wash straight-leg jeans'],
    ['shoes', '페니 로퍼', '블랙', 'low', 'black leather loafers'],
  ]),
  L('men', 1, '발마칸 & 집업 니트', '카멜 & 그레이', '카멜 발마칸 코트 안에 그레이 집업 니트를 겹쳐 입고 블랙 와이드 슬랙스로 정리했어요', [
    ['outer', '울 발마칸 코트', '카멜', 'long', 'camel wool balmacaan coat'],
    ['top', '집업 니트', '그레이', 'long', 'gray zip-up knit sweater'],
    ['bottom', '와이드 슬랙스', '블랙', 'wide', 'black wide-leg wool slacks'],
    ['shoes', '더비 슈즈', '블랙', 'low', 'black leather derby shoes'],
    ['acc', '머플러', '그레이', '', 'gray wool scarf'],
  ]),
  L('men', 1, '레더 봄버', '올리브 & 블랙', '런웨이에 많이 나온 올리브 레더 봄버에 후드티와 카고 팬츠, 워커 부츠를 맞췄어요', [
    ['outer', '레더 봄버', '올리브', 'short', 'olive green leather bomber jacket'],
    ['top', '후드티', '그레이', 'long', 'gray hoodie with the hood out'],
    ['bottom', '카고 팬츠', '블랙', 'wide', 'black relaxed cargo pants'],
    ['shoes', '워커 부츠', '블랙', 'boots', 'black lace-up leather boots'],
    ['acc', '비니', '블랙', '', 'black knit beanie'],
  ]),
  // ---------- women, 17~19° ----------
  L('women', 4, '크롭 레더 재킷', '블랙 & 데님', '가을 필수템으로 꼽히는 블랙 크롭 레더 재킷에 진청 스트레이트, 로퍼, 스웨이드 숄더백을 들었어요', [
    ['outer', '크롭 레더 재킷', '블랙', 'short', 'black cropped leather jacket'],
    ['top', '반팔 티', '화이트', 'short', 'white fitted t-shirt'],
    ['bottom', '스트레이트 데님', '진청', 'pants', 'dark indigo straight-leg jeans'],
    ['shoes', '로퍼', '블랙', 'low', 'black leather loafers'],
    ['acc', '스웨이드 숄더백', '브라운', '', 'brown suede shoulder bag'],
  ]),
  L('women', 4, '꽈배기 가디건', '크림 & 데님', '꽈배기 가디건을 단추까지 잠가 상의로 입고, 랭킹 1위 핏인 커브드 데님과 맞췄어요', [
    ['top', '꽈배기 가디건', '크림', 'long', 'cream cable-knit cardigan buttoned up and worn as a top'],
    ['bottom', '커브드 데님', '중청', 'wide', 'medium-wash curved barrel-leg jeans'],
    ['shoes', '스니커즈', '브라운', 'low', 'brown and beige low-top leather sneakers'],
    ['acc', '진주 귀걸이', '아이보리', '', 'pearl earrings'],
  ]),
  L('women', 4, '컬러 레이어링', '버터 & 그레이', '버터 옐로 니트, 그레이 플리츠 스커트, 버건디 가방으로 색을 겹쳐 입는 이번 시즌 방식이에요', [
    ['top', '라운드 니트', '버터', 'long', 'butter yellow round-neck sweater'],
    ['bottom', '플리츠 미디스커트', '그레이', 'longskirt', 'gray pleated midi skirt'],
    ['shoes', '메리제인', '블랙', 'low', 'black leather mary jane shoes'],
    ['acc', '숄더백', '버건디', '', 'burgundy leather shoulder bag'],
  ]),
  L('women', 4, '스포티 트랙탑', '블랙 & 크림', '투톤 트랙 후드 집업에 커브드 데님, 볼캡으로 스포티하게 입었어요', [
    ['outer', '투톤 후드 집업', '블랙', 'short', 'black and cream two-tone track hoodie zip-up'],
    ['top', '반팔 티', '화이트', 'short', 'white t-shirt'],
    ['bottom', '커브드 데님', '블랙', 'wide', 'washed black curved balloon-leg jeans'],
    ['shoes', '스니커즈', '브라운', 'low', 'brown and beige low-top leather sneakers'],
    ['acc', '볼캡', '블랙', '', 'black baseball cap'],
  ]),
  // ---------- women, 12~16° ----------
  L('women', 3, '스웨이드 & 롱부츠', '브라운 & 블랙', '유튜브 가을 필수 5가지(스웨이드 재킷·진청 데님·롱부츠·스웨이드 백)를 한 번에 입었어요', [
    ['outer', '스웨이드 재킷', '브라운', 'short', 'brown suede jacket'],
    ['top', '라운드 니트', '아이보리', 'long', 'ivory fine-knit sweater'],
    ['bottom', '스트레이트 데님', '진청', 'pants', 'dark indigo straight-leg jeans tucked into the boots'],
    ['shoes', '롱부츠', '블랙', 'boots', 'black knee-high leather boots'],
    ['acc', '스웨이드 숄더백', '브라운', '', 'brown suede shoulder bag'],
  ]),
  L('women', 3, '시어 라이트 다운', '베이지 & 블랙', '무신사 우먼 9월 화제템인 후디드 라이트 다운을 후드티 위에 겹쳤어요', [
    ['outer', '후디드 라이트 다운', '베이지', 'short', 'dusty beige lightweight hooded down jacket'],
    ['top', '후드티', '그레이', 'long', 'gray hoodie'],
    ['bottom', '와이드 슬랙스', '블랙', 'wide', 'black wide-leg slacks'],
    ['shoes', '러닝화', '그레이', 'low', 'gray retro running sneakers'],
  ]),
  L('women', 3, '스커트 수트', '차콜 & 화이트', '이번 시즌 클래식 키워드인 스커트 수트를 셔츠와 로퍼로 출근룩처럼 입었어요', [
    ['outer', '테일러드 재킷', '차콜', 'mid', 'charcoal tailored wool blazer'],
    ['top', '셔츠', '화이트', 'long', 'crisp white button-up shirt'],
    ['bottom', '미디 스커트', '차콜', 'longskirt', 'matching charcoal wool midi pencil skirt'],
    ['shoes', '로퍼', '블랙', 'low', 'black leather loafers'],
  ]),
  L('women', 3, '퍼플 포인트', '퍼플 & 데님', '올해의 컬러 퍼플 니트 하나에 진청 스트레이트, 블랙 발레 플랫으로 깔끔하게 맞췄어요', [
    ['top', '라운드 니트', '퍼플', 'long', 'muted purple round-neck sweater'],
    ['bottom', '스트레이트 데님', '진청', 'pants', 'dark indigo straight-leg jeans'],
    ['shoes', '발레 플랫', '블랙', 'low', 'black ballet flats'],
    ['acc', '숄더백', '블랙', '', 'black leather shoulder bag'],
  ]),
  // ---------- women, 9~11° ----------
  L('women', 2, '트렌치 & 오버 더 니', '베이지 & 블랙', '트렌치 코트 아래 롱부츠로 다리 라인을 길게 이어 주는 이번 시즌 공식이에요', [
    ['outer', '트렌치코트', '베이지', 'long', 'beige classic trench coat, belted'],
    ['top', '라운드 니트', '그레이', 'long', 'gray fine-knit sweater'],
    ['bottom', '스트레이트 데님', '진청', 'pants', 'dark indigo slim straight jeans tucked into the boots'],
    ['shoes', '롱부츠', '블랙', 'boots', 'black over-the-knee boots'],
  ]),
  L('women', 2, '미니멀 니트 드레스', '카멜 & 블랙', '몸선을 따라 떨어지는 블랙 미디 니트 드레스에 카멜 하프 코트와 롱부츠를 맞췄어요', [
    ['outer', '하프 울코트', '카멜', 'mid', 'camel mid-length wool coat'],
    ['dress', '미디 니트 원피스', '블랙', 'long-long', 'black slim midi knit dress with a clean crew neckline'],
    ['shoes', '롱부츠', '블랙', 'boots', 'black knee-high leather boots'],
  ]),
  L('women', 2, '초콜릿 레더 봄버', '브라운 톤온톤', '초콜릿 브라운 레더 봄버에 크림 터틀넥, 베이지 와이드 슬랙스로 브라운 톤을 이었어요', [
    ['outer', '레더 봄버', '브라운', 'short', 'chocolate brown leather bomber jacket'],
    ['top', '터틀넥 니트', '크림', 'long', 'cream turtleneck sweater'],
    ['bottom', '와이드 슬랙스', '베이지', 'wide', 'beige wide-leg slacks'],
    ['shoes', '로퍼', '브라운', 'low', 'brown leather loafers'],
  ]),
  L('women', 2, '레드 백 포인트', '그레이 & 레드', '그레이 집업 니트와 블랙 커브드 데님에 레드 가방 하나로 시즌 컬러를 넣었어요', [
    ['outer', '집업 니트 가디건', '그레이', 'short', 'gray zip-up knit cardigan'],
    ['top', '반팔 티', '화이트', 'short', 'white t-shirt'],
    ['bottom', '커브드 데님', '블랙', 'wide', 'washed black curved barrel-leg jeans'],
    ['shoes', '로퍼', '블랙', 'low', 'black leather loafers'],
    ['acc', '숄더백', '레드', '', 'red leather shoulder bag'],
  ]),
  // ---------- women, 5~8° ----------
  L('women', 1, '숏 패딩 & 커브드', '아이보리 & 블랙', '아이보리 숏 패딩에 커브드 데님, 스웨이드 부츠로 따뜻하면서 볼륨은 아래에만 줬어요', [
    ['outer', '숏 패딩', '아이보리', 'short', 'ivory short puffer down jacket'],
    ['top', '라운드 니트', '그레이', 'long', 'gray knit sweater'],
    ['bottom', '커브드 데님', '블랙', 'wide', 'washed black curved barrel-leg jeans'],
    ['shoes', '스웨이드 부츠', '베이지', 'boots', 'beige suede ankle boots'],
  ]),
  L('women', 1, '버건디 니트 & 롱코트', '블랙 & 버건디', '블랙 롱코트 안 버건디 니트로 시즌 레드 계열을 넣고 롱부츠로 마무리했어요', [
    ['outer', '롱 울코트', '블랙', 'long', 'long black wool coat'],
    ['top', '라운드 니트', '버건디', 'long', 'burgundy knit sweater'],
    ['bottom', '와이드 슬랙스', '그레이', 'wide', 'gray wide-leg wool slacks'],
    ['shoes', '롱부츠', '블랙', 'boots', 'black knee-high leather boots'],
  ]),
  L('women', 1, '퍼 자켓 & 데님', '크림 & 브라운', '크림 퍼 자켓에 브라운 니트, 진청 스트레이트, 브라운 롱부츠로 부드럽게 입었어요', [
    ['outer', '페이크 퍼 자켓', '크림', 'short', 'cream faux fur jacket'],
    ['top', '라운드 니트', '브라운', 'long', 'brown knit sweater'],
    ['bottom', '스트레이트 데님', '진청', 'pants', 'dark indigo straight-leg jeans tucked into the boots'],
    ['shoes', '롱부츠', '브라운', 'boots', 'brown knee-high suede boots'],
  ]),
  L('women', 1, '클래식 코트 & 스커트', '카멜 & 레드', '카멜 롱코트, 그레이 터틀넥, 차콜 미디 스커트에 레드 머플러로 포인트를 줬어요', [
    ['outer', '핸드메이드 롱코트', '카멜', 'long', 'long camel wool coat'],
    ['top', '터틀넥 니트', '그레이', 'long', 'gray turtleneck sweater'],
    ['bottom', '미디 스커트', '차콜', 'longskirt', 'charcoal wool midi skirt'],
    ['shoes', '롱부츠', '블랙', 'boots', 'black knee-high leather boots'],
    ['acc', '머플러', '레드', '', 'red wool scarf'],
  ]),
  // ---------- men, 4° 이하 ----------
  L('men', 0, '숏 패딩 & 터틀넥', '블랙 & 차콜', '롱 패딩 대신 숏 패딩이 대세예요. 안에는 12월 랭킹 1위 터틀넥, 아래는 와이드 슬랙스로 정돈했어요', [
    ['outer', '숏 패딩', '블랙', 'short', 'glossy black short puffer down jacket'],
    ['top', '터틀넥 니트', '그레이', 'long', 'gray turtleneck sweater'],
    ['bottom', '와이드 슬랙스', '차콜', 'wide', 'charcoal wide-leg wool slacks'],
    ['shoes', '더비 슈즈', '블랙', 'low', 'black chunky leather derby shoes'],
  ]),
  L('men', 0, '무스탕', '브라운 & 데님', '패딩 대신 찾는 무스탕에 크림 스웨트셔츠와 와이드 데님, 워커 부츠로 빈티지하게 입어요', [
    ['outer', '무스탕', '브라운', 'short', 'brown suede shearling aviator jacket with a cream fleece collar'],
    ['top', '스웨트셔츠', '크림', 'long', 'cream crewneck sweatshirt'],
    ['bottom', '와이드 데님', '중청', 'wide', 'medium-wash wide-leg jeans'],
    ['shoes', '워커 부츠', '브라운', 'boots', 'brown leather lace-up work boots'],
  ]),
  L('men', 0, '레더 패딩', '블랙 & 크림', '런웨이에 많이 나온 레더 패딩에 크림 터틀넥, 그레이 울 슬랙스로 깔끔하게 맞췄어요', [
    ['outer', '레더 패딩', '블랙', 'short', 'black leather puffer jacket'],
    ['top', '터틀넥 니트', '크림', 'long', 'cream turtleneck sweater'],
    ['bottom', '울 슬랙스', '그레이', 'pants', 'gray straight wool trousers'],
    ['shoes', '첼시 부츠', '블랙', 'boots', 'black leather chelsea boots'],
  ]),
  L('men', 0, '고프코어 파카', '네이비 & 베이지', '후드 다운 파카에 버건디 니트로 포인트를 주고 코듀로이 팬츠, 비니로 따뜻하게 입어요', [
    ['outer', '후드 다운 파카', '네이비', 'mid', 'navy hooded down parka'],
    ['top', '크루넥 니트', '버건디', 'long', 'burgundy crewneck sweater'],
    ['bottom', '코듀로이 팬츠', '베이지', 'pants', 'beige corduroy straight trousers'],
    ['shoes', '워커 부츠', '브라운', 'boots', 'brown leather lace-up boots'],
    ['acc', '비니', '그레이', '', 'gray knit beanie'],
  ]),
  // ---------- men, 20~22° ----------
  L('men', 5, '스트라이프 셔츠', '스카이블루 & 베이지', '여름 셔츠를 가을 치노와 스웨이드 로퍼에 섞어 입는 "두 계절 섞기" 공식이에요', [
    ['top', '스트라이프 셔츠', '스카이블루', 'long', 'oversized sky blue and white striped cotton shirt, untucked, sleeves rolled'],
    ['bottom', '와이드 치노', '베이지', 'wide', 'beige wide-leg chino trousers'],
    ['shoes', '스웨이드 로퍼', '브라운', 'low', 'brown suede loafers'],
  ]),
  L('men', 5, '럭비 셔츠', '네이비 & 데님', '스트리트에서 많이 보인 럭비 셔츠에 와이드 데님, 흰 스니커즈로 가볍게 입어요', [
    ['top', '럭비 셔츠', '네이비', 'long', 'navy and cream striped long-sleeve rugby shirt with a white collar'],
    ['bottom', '와이드 데님', '중청', 'wide', 'medium-wash wide-leg jeans'],
    ['shoes', '가죽 스니커즈', '화이트', 'low', 'white leather low-top sneakers'],
  ]),
  L('men', 5, '러너 무드', '그레이 & 블랙', '래글런 롱슬리브 티에 나일론 와이드 팬츠, 실버 러닝화로 가볍고 스포티하게 입어요', [
    ['top', '래글런 롱슬리브', '그레이', 'long', 'heather gray raglan long-sleeve t-shirt with navy sleeves'],
    ['bottom', '나일론 와이드 팬츠', '블랙', 'wide', 'black nylon wide track pants'],
    ['shoes', '러닝화', '그레이', 'low', 'silver and gray retro running sneakers'],
    ['acc', '볼캡', '블랙', '', 'black baseball cap'],
  ]),
  L('men', 5, '셔츠 & 니트 베스트', '화이트 & 그레이', '옥스퍼드 셔츠 위에 니트 베스트를 겹친 프레피룩에 와이드 슬랙스, 로퍼를 맞췄어요', [
    ['top', '옥스퍼드 셔츠', '화이트', 'long', 'white oxford button-down shirt'],
    ['top', '니트 베스트', '그레이', 'none', 'gray v-neck knit vest layered over the shirt'],
    ['bottom', '와이드 슬랙스', '차콜', 'wide', 'charcoal wide-leg slacks'],
    ['shoes', '페니 로퍼', '블랙', 'low', 'black leather penny loafers'],
  ]),
  // ---------- men, 23~27° ----------
  L('men', 6, '린넨 셔츠 & 데님 버뮤다', '베이지 & 데님', '반팔 린넨 셔츠에 데님 버뮤다, 런웨이에 많이 나온 오픈토 피셔맨 샌들을 맞췄어요', [
    ['top', '린넨 반팔 셔츠', '베이지', 'short', 'oatmeal beige linen short-sleeve camp-collar shirt'],
    ['bottom', '데님 버뮤다', '진청', 'shorts', 'dark indigo knee-length denim bermuda shorts'],
    ['shoes', '피셔맨 샌들', '브라운', 'sandal', 'brown leather fisherman sandals'],
  ]),
  L('men', 6, '니트 폴로', '네이비 & 아이보리', '반팔 니트 폴로에 아이보리 와이드 슬랙스, 로퍼로 더운 날에도 단정하게 입어요', [
    ['top', '니트 폴로', '네이비', 'short', 'navy short-sleeve knit polo shirt'],
    ['bottom', '와이드 슬랙스', '아이보리', 'wide', 'ivory wide-leg slacks'],
    ['shoes', '페니 로퍼', '브라운', 'low', 'brown leather penny loafers'],
  ]),
  L('men', 6, '미니멀 반팔', '화이트 & 블랙', '박시한 흰 반팔 티에 냉감 와이드 슬랙스, 블랙 스니커즈로 군더더기 없이 입어요', [
    ['top', '박시 반팔 티', '화이트', 'short', 'heavyweight white boxy short-sleeve t-shirt'],
    ['bottom', '냉감 와이드 슬랙스', '블랙', 'wide', 'black lightweight wide-leg slacks'],
    ['shoes', '스니커즈', '블랙', 'low', 'black leather low-top sneakers'],
  ]),
  L('men', 6, '축구 저지', '올리브 & 데님', '축구 유니폼 저지에 연청 스트레이트, 납작한 스니커즈를 맞춘 블록코어룩이에요', [
    ['top', '축구 저지', '올리브', 'short', 'green and white retro football jersey'],
    ['bottom', '스트레이트 데님', '연청', 'pants', 'light-wash straight-leg jeans'],
    ['shoes', '테라스 스니커즈', '화이트', 'low', 'white leather low-profile terrace sneakers with gum soles'],
  ]),
  // ---------- men, 28° 이상 ----------
  L('men', 7, '민소매 & 린넨', '화이트 & 스카이블루', '흰 민소매 위에 린넨 셔츠를 열어 걸치고 린넨 반바지, 6월 랭킹 상위 리커버리 샌들을 신었어요', [
    ['outer', '린넨 셔츠', '스카이블루', 'short', 'sky blue linen short-sleeve shirt worn open'],
    ['top', '민소매', '화이트', 'none', 'white ribbed tank top'],
    ['bottom', '린넨 반바지', '베이지', 'shorts', 'beige linen drawstring shorts'],
    ['shoes', '리커버리 샌들', '블랙', 'sandal', 'black chunky recovery slide sandals'],
  ]),
  L('men', 7, '캠프 셔츠', '블랙 & 그레이', '블랙 캠프 칼라 셔츠에 그레이 반바지, 블랙 레더 슬리퍼로 시원하게 입어요', [
    ['top', '캠프 칼라 셔츠', '블랙', 'short', 'black rayon short-sleeve camp-collar shirt'],
    ['bottom', '반바지', '그레이', 'shorts', 'gray cotton shorts above the knee'],
    ['shoes', '레더 슬리퍼', '블랙', 'sandal', 'black leather slide sandals with yellow welt stitching'],
  ]),
  L('men', 7, '반팔 & 데님 쇼츠', '화이트 & 데님', '흰 반팔 티에 데님 반바지, 흰 스니커즈와 볼캡의 가장 쉬운 여름 공식이에요', [
    ['top', '반팔 티셔츠', '화이트', 'short', 'plain white crewneck t-shirt'],
    ['bottom', '데님 반바지', '중청', 'shorts', 'medium-wash denim shorts'],
    ['shoes', '캔버스 스니커즈', '화이트', 'low', 'white canvas low-top sneakers'],
    ['acc', '볼캡', '네이비', '', 'navy baseball cap'],
  ]),
  L('men', 7, '여름 고프코어', '그레이 & 블랙', '기능성 반팔에 나일론 반바지, 트레일 러너와 버킷햇으로 아웃도어 무드를 냈어요', [
    ['top', '기능성 반팔', '그레이', 'short', 'gray technical short-sleeve t-shirt'],
    ['bottom', '나일론 반바지', '블랙', 'shorts', 'black nylon hiking shorts'],
    ['shoes', '트레일 러너', '그레이', 'low', 'gray trail running sneakers'],
    ['acc', '버킷햇', '블랙', '', 'black nylon bucket hat'],
  ]),
  // ---------- women, 4° 이하 ----------
  L('women', 0, '레더 패딩 & 미디', '블랙 & 크림', '레더 패딩에 크림 터틀넥, 그레이 미디 스커트, 롱부츠로 따뜻하지만 여성스럽게 입어요', [
    ['outer', '레더 패딩', '블랙', 'short', 'black leather short puffer jacket'],
    ['top', '터틀넥 니트', '크림', 'long', 'cream turtleneck sweater'],
    ['bottom', '미디 스커트', '그레이', 'longskirt', 'gray wool midi skirt'],
    ['shoes', '롱부츠', '블랙', 'boots', 'black knee-high leather boots'],
  ]),
  L('women', 0, '무스탕 & 데님', '브라운 & 데님', '무스탕에 아이보리 니트, 진청 스트레이트, 퍼 부츠로 포근하게 입어요', [
    ['outer', '무스탕', '브라운', 'short', 'brown suede shearling jacket with a cream fleece collar'],
    ['top', '라운드 니트', '아이보리', 'long', 'ivory knit sweater'],
    ['bottom', '스트레이트 데님', '진청', 'pants', 'dark indigo straight-leg jeans'],
    ['shoes', '퍼 부츠', '베이지', 'boots', 'beige suede sheepskin ankle boots'],
  ]),
  L('women', 0, '핑크 니트 & 숏 패딩', '블랙 & 핑크', '블랙 숏 패딩 안에 핑크 니트로 색을 넣고 와이드 데님, 패딩 부츠를 맞췄어요', [
    ['outer', '숏 패딩', '블랙', 'short', 'black short puffer down jacket'],
    ['top', '크루넥 니트', '핑크', 'long', 'soft pink crewneck sweater'],
    ['bottom', '와이드 데님', '연청', 'wide', 'light-wash wide-leg jeans'],
    ['shoes', '패딩 부츠', '블랙', 'boots', 'black quilted padded snow boots'],
  ]),
  L('women', 0, '브라운 롱코트', '브라운 & 블랙', '초콜릿 브라운 롱코트에 블랙 터틀넥, 와이드 슬랙스, 버건디 가방으로 한겨울 톤을 맞췄어요', [
    ['outer', '롱 울코트', '브라운', 'long', 'long chocolate brown wool coat'],
    ['top', '터틀넥 니트', '블랙', 'long', 'black turtleneck sweater'],
    ['bottom', '와이드 슬랙스', '블랙', 'wide', 'black wide-leg wool slacks'],
    ['shoes', '첼시 부츠', '블랙', 'boots', 'black leather chelsea boots'],
    ['acc', '숄더백', '버건디', '', 'burgundy leather shoulder bag'],
  ]),
  // ---------- women, 20~22° ----------
  L('women', 5, '실크 셔츠 & 커브드', '아이보리 & 데님', '올가을 셔츠 트렌드인 실크 버튼다운에 커브드 데님, 키튼힐 슬링백을 맞췄어요', [
    ['top', '실크 셔츠', '아이보리', 'long', 'ivory silk button-down shirt, half tucked'],
    ['bottom', '커브드 데님', '연청', 'wide', 'light-wash curved barrel-leg jeans'],
    ['shoes', '키튼힐 슬링백', '브라운', 'low', 'brown leather kitten-heel slingback shoes'],
  ]),
  L('women', 5, '슬리브리스 터틀넥', '블랙 & 베이지', '가을용으로 바뀐 슬리브리스 터틀넥에 가디건을 걸치고 베이지 와이드 슬랙스, 로퍼를 신었어요', [
    ['outer', '가디건', '아이보리', 'short', 'ivory fine-knit cardigan draped over the shoulders'],
    ['top', '슬리브리스 터틀넥', '블랙', 'none', 'black sleeveless mock-turtleneck knit top'],
    ['bottom', '와이드 슬랙스', '베이지', 'wide', 'beige wide-leg slacks'],
    ['shoes', '로퍼', '블랙', 'low', 'black leather loafers'],
  ]),
  L('women', 5, '셔츠 원피스', '스카이블루 & 브라운', '셔츠 원피스에 브라운 벨트로 허리를 잡고 흰 스니커즈로 가볍게 마무리했어요', [
    ['dress', '셔츠 원피스', '스카이블루', 'long-long', 'sky blue cotton midi shirt dress with a brown leather belt'],
    ['shoes', '가죽 스니커즈', '화이트', 'low', 'white leather low-top sneakers'],
    ['acc', '숄더백', '브라운', '', 'brown leather shoulder bag'],
  ]),
  L('women', 5, '럭비 & 플리츠', '네이비 & 그레이', '럭비 셔츠에 플리츠 미니스커트, 니삭스와 로퍼로 프레피하게 입어요', [
    ['top', '럭비 셔츠', '네이비', 'long', 'navy and white striped long-sleeve rugby shirt'],
    ['bottom', '플리츠 미니스커트', '그레이', 'skirt', 'gray pleated mini skirt'],
    ['shoes', '로퍼', '브라운', 'low', 'brown leather loafers with cream knee socks'],
  ]),
  // ---------- women, 23~27° ----------
  L('women', 6, '시어 레이어링', '블랙 & 데님', '이번 여름 키워드인 씨스루예요. 메쉬 톱을 흰 탱크톱 위에 겹치고 와이드 데님, 젤리 메리제인을 신었어요', [
    ['top', '시어 메쉬 톱', '블랙', 'long', 'sheer black mesh long-sleeve top layered over a white tank top'],
    ['bottom', '와이드 데님', '연청', 'wide', 'light-wash wide-leg jeans'],
    ['shoes', '젤리 메리제인', '블랙', 'low', 'black translucent jelly mary jane flats'],
  ]),
  L('women', 6, '리본 블라우스', '화이트 & 데님', '리본이 주인공인 반팔 블라우스에 데님 미디 스커트, 발레 플랫으로 걸리시하게 입어요', [
    ['top', '리본 블라우스', '화이트', 'short', 'white short-sleeve cotton blouse with a large bow at the neck'],
    ['bottom', '데님 미디스커트', '중청', 'longskirt', 'medium-wash denim midi skirt'],
    ['shoes', '발레 플랫', '블랙', 'low', 'black ballet flats'],
  ]),
  L('women', 6, '크로셰 & 린넨', '아이보리 & 베이지', '크로셰 니트 반팔에 베이지 린넨 와이드 팬츠, 피셔맨 샌들로 휴양지 무드를 냈어요', [
    ['top', '크로셰 니트', '아이보리', 'short', 'ivory crochet knit short-sleeve top'],
    ['bottom', '린넨 와이드 팬츠', '베이지', 'wide', 'beige linen wide-leg pants'],
    ['shoes', '피셔맨 샌들', '브라운', 'sandal', 'brown leather fisherman sandals'],
  ]),
  L('women', 6, '버뮤다 스포티', '그레이 & 블랙', '그레이 반팔 티에 블랙 버뮤다 팬츠, 흰 양말과 로퍼, 볼캡으로 스포티하게 입어요', [
    ['top', '반팔 티', '그레이', 'short', 'heather gray fitted t-shirt'],
    ['bottom', '버뮤다 팬츠', '블랙', 'shorts', 'black knee-length bermuda shorts'],
    ['shoes', '로퍼', '블랙', 'low', 'black leather loafers with white socks'],
    ['acc', '볼캡', '블랙', '', 'black baseball cap'],
  ]),
  // ---------- women, 28° 이상 ----------
  L('women', 7, '슬리브리스 원피스', '블랙 & 베이지', '몸에 붙지 않는 블랙 슬리브리스 미디 원피스 하나에 젤리 샌들과 라피아 백만 더했어요', [
    ['dress', '슬리브리스 원피스', '블랙', 'none-long', 'black sleeveless cotton midi dress with a relaxed fit'],
    ['shoes', '젤리 샌들', '블랙', 'sandal', 'black translucent jelly sandals'],
    ['acc', '라피아 백', '베이지', '', 'natural raffia tote bag'],
  ]),
  L('women', 7, '탱크톱 & 린넨', '화이트 & 버터', '흰 리브 탱크톱에 버터 옐로 린넨 팬츠, 브라운 샌들로 색 하나만 밝게 넣었어요', [
    ['top', '리브 탱크톱', '화이트', 'none', 'white ribbed tank top'],
    ['bottom', '린넨 와이드 팬츠', '버터', 'wide', 'butter yellow linen wide-leg pants'],
    ['shoes', '스트랩 샌들', '브라운', 'sandal', 'brown leather strappy flat sandals'],
  ]),
  L('women', 7, '레이스 캐미솔', '아이보리 & 데님', '레이스 캐미솔에 데님 롱스커트, 블랙 플립플랍으로 씨스루 트렌드를 여름답게 입어요', [
    ['top', '레이스 캐미솔', '아이보리', 'none', 'ivory lace-trimmed camisole'],
    ['bottom', '데님 롱스커트', '중청', 'longskirt', 'medium-wash denim maxi skirt'],
    ['shoes', '플립플랍', '블랙', 'sandal', 'black leather flip-flops'],
  ]),
  L('women', 7, '스트라이프 & 보트 슈즈', '네이비 & 아이보리', '보트넥 스트라이프 반팔에 아이보리 버뮤다, 보트 슈즈를 맞춘 마린룩이에요', [
    ['top', '스트라이프 반팔', '네이비', 'short', 'navy and white striped boat-neck short-sleeve t-shirt'],
    ['bottom', '버뮤다 팬츠', '아이보리', 'shorts', 'ivory cotton bermuda shorts'],
    ['shoes', '보트 슈즈', '브라운', 'low', 'brown leather boat shoes'],
  ]),
];

const dir = process.argv[2];
const file = join(dir, 'plan.json');
if (existsSync(file) && !existsSync(join(dir, 'plan.before-trend.json'))) copyFileSync(file, join(dir, 'plan.before-trend.json'));
const old = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : [];
const idOf = new Map(old.filter(l => l.trend).map(l => [l.sig, l.id])); // keep ids (and images) of looks already planned
const plan = LOOKS.map(l => {
  const pieces = fixInners(l.pieces.map(([cat, name, color, shape, en]) => ({ cat, name, color, shape, en })), { curated: true }).pieces;
  const sig = l.style + ':' + pieces.map(p => p.color + p.name).join('/');
  const id = idOf.get(sig) || Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  return { id, g: l.g, band: l.band, style: l.style, pal: l.pal, note: l.note, sig, trend: true, bodies: ['avg'], pieces };
});
// looks from other sources (tools/musinsa-looks.mjs) stay in the plan
writeFileSync(file, JSON.stringify(plan.concat(old.filter(l => !l.trend || l.sig.startsWith('musinsa:'))), null, 1));
console.log(`plan has ${plan.length} trend looks`);
