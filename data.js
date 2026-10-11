// 모든 플레이 수치와 텍스트는 이 파일에 둔다. (CLAUDE.md 3-1)
// 값이 빠지거나 타입이 틀리면 화면에 경고가 뜨고 기본값으로 진행한다.
// 상태 표기는 SPEC.md 기준: 확정 / 제안 / 시작값(플레이 후 확정)
window.DATA = {
  timing: {
    // 반죽 짜기 (구멍별 클릭 홀드 → 릴리즈)
    pour: {
      targetMs: 1500,   // 목표 홀드 시간 = 큰 눈금 = 마지막 "도!" 시점, ms. 사용자 결정 (2026-10-11, 1000에서 — 디스펜서 4박)
      perfectMs: 50,    // 퍼펙트 판정 창 ±ms. 확정
      goodMs: 120,      // 굿 판정 창 ±ms. 그 밖은 부족/넘침. 확정
      autoStopMs: 120,  // 목표 + 이 시간이 지나도 누르고 있으면 자동 종료 → 넘침, ms. 확정

      // 박자: 누르는 순간 "툭", 같은 간격으로 이어져 목표 시점에 "탁!" → 그때 뗀다
      holdBeats: 3,     // 누르기~마지막 "도!" 사이 박 수. 3 = 도-미-솔-도! (박 간격 = targetMs / holdBeats = 0.5 s). 디스펜서 눈금 = 작은 3 + 큰 1. 사용자 결정 (2026-10-11)

      // 박자 소리 세트. 1로 임시 확정 (2026-10-02 사용자, 나중에 수정 가능)
      //   1 = 마림바 도-미-솔   2 = 우드블록 툭툭 + 벨   3 = 물방울 퐁퐁퐁
      soundSet: 1,
    },

    // 문어 넣기 (반죽이 든 구멍이면 언제든)
    octopus: {
      legRatio: 0.6,    // 구멍 중심에서 반지름의 이 비율보다 멀면 다리가 삐져나온다. 확정
      perfectRatio: 0.3, // 이 비율 안이면 단계 등급에서 퍼펙트(2점), legRatio 안이면 굿(1점). 모양은 그대로. 제안
    },

    // ⑤ 후네 담기: 구멍을 누른 채 후네 쪽으로 튕긴다. 실패 없음 (2026-10-10 사용자)
    box: {
      flickPx: 30,      // 이만큼 움직이면 튕김으로 본다, px. 제안
      flickMs: 300,     // 누른 뒤 이 시간 안에 flickPx를 넘어야 튕김. 느리면 흔들리기만. 제안
      coneDeg: 60,      // 후네 방향 ± 이 각도 안이어야 날아간다. 제안
      flyMs: 350,       // 날아가는 시간, ms. 제안
    },

    // ⑥ 토핑·건네기: 소스·가쓰오부시를 원하는 만큼, 후네를 화면 위로 끌어 건넨다. 등급 없음 (2026-10-10 사용자)
    topping: {
      boatScale: 1.6,   // 작업대에서 후네 확대 배율. 제안
      sauceWidth: 7,    // 소스 줄 굵기(후네 안 좌표). 제안
      flakeEveryPx: 18, // 가쓰오부시 통을 이만큼 움직일 때마다 한 조각. 제안
      flakeMax: 400,    // 가쓰오부시 조각 상한. 제안
      handoffY: 170,    // 후네를 이 높이(화면 y)보다 위로 끌고 놓으면 건넴. 제안
    },

    // ② 재료 넣기 시간 (T27). limitMs: 일차별 제한 시간(뒤 일차는 마지막 값) — 1일차 60 s(제안, 넉넉하게), 2일차부터 20 s(사용자 2026-10-11)
    //   endOnOctopusDays: 문어 6개를 다 쓰면 끝나는 일차 (1일차 튜토리얼만, 사용자)
    fill: { limitMs: [60000, 20000], endOnOctopusDays: [1] },

    // 단계 진행 (한 판 = 미니게임을 순서대로, 2026-10-10 사용자 결정)
    // 단계 끝에 6번의 점수(퍼펙트 2 / 굿 1 / 그 외 0, 0~12점)를 합쳐 등급 글자를 띄운다. 글자는 letters.grade
    stage: {
      bannerMs: 1200,   // 등급 글자가 떠 있는 시간, ms. 그동안 입력은 막히고 끝나면 다음 단계. 제안
      perfect: 11,      // 이 점수 이상 PERFECT!. 제안
      great: 8,         // 이 점수 이상 GREAT!. 제안
      good: 4,          // 이 점수 이상 GOOD, 그 아래는 OOPS…. 제안
      skipMs: 300,      // 2일차부터(등급 글자 없음) 단계 사이 쉬는 시간, ms. 제안
    },

    // 굽기 (③·④ 뒤집기 단계가 시작되면 6구멍이 함께 굽고, n번 구멍 큐 = 시작 + lead + (n−1) × interval)
    cook: {
      lead1Ms: 2500,    // ③ 1차 단계 시작 → 1번 구멍 큐 "톡", ms. 제안
      lead2Ms: 1500,    // ④ 2차 단계 시작 → 1번 구멍 큐 "톡톡", ms. 제안
      intervalMs: 1500, // 구멍 사이 큐 간격, ms. 시작값 ("여유 있게", 2026-10-10 사용자)
      perfectSpanMs: 1500, // 큐(기포가 올라오는 순간)부터 이 시간 동안 떼면 퍼펙트. 기포도 이만큼 보인다. 확정 (2026-10-10 사용자, ±150에서 변경)
      goodMarginMs: 300,   // 퍼펙트 구간 앞뒤 굿 여유, ms. 더 이르면 이름(덜 익음), 더 늦으면 늦음(탐). 제안
      burnMs: 3000,     // 굿 창을 지난 뒤 완전히 검게 되기까지, ms. 제안
    },

    // 뒤집기 제스처 (구멍 누른 채 마우스 회전)
    flip: {
      ignoreDeg: 30,    // 이보다 덜 돌리고 떼면 없던 일. 확정
      flip1MinDeg: 90,  // 1차 성공 회전량 하한. 미달이면 어설프게 뒤집힘(실패). 확정 (2026-10-10, 180°에서 변경)
      flip1MaxDeg: 360, // 1차 성공 회전량 상한. 넘기면 과회전(실패). 확정
      flip2MinDeg: 180, // 2차 성공 회전량 하한. 미달이면 어설프게(실패). 확정 (2026-10-10, 330°에서 변경 — 1차와 같은 비율)
      flip2MaxDeg: 720, // 2차 성공 회전량 상한(두 바퀴). 넘기면 과회전(실패). 확정
      // 회전 안내 화살표 (T34): strong 첫 판 [안내선, 채움선] 불투명도 / faint 그 뒤 (사용자: 첫 판만 뚜렷, 이후 아주 연하게) / gap 구멍 바깥 거리. 제안
      guide: { strong: [0.75, 0.95], faint: [0.15, 0.35], gap: 16 },
      flip2SpeedDps: 720, // 2차 각속도 하한 °/s (첫 이동~마지막 이동 평균). 미달이면 실패가 아니라 한 단계 강등: 퍼펙트→굿, 굿→느림(미스). 확정
    },
  },
  // 타코야키 표정 (SPEC 7절). 전부 제안값
  //   color 반죽 색 / squashY 세로 비율(1 = 동그라미) / sagY 아래로 처지는 px
  //   eyeRx·eyeRy 눈동자 크기(eyeRy가 작을수록 가는 눈) / eyeGap 두 눈 간격 / eyeY 눈 높이(중심 기준)
  //   lookX 곁눈질할 때 눈동자가 움직이는 px / bridgeW 넘친 반죽 다리 두께
  faces: {
    batter: { color: '#f1dfb4', squashY: 1,    sagY: 0, eyeRx: 5, eyeRy: 7, eyeGap: 24, eyeY: -6, lookX: 0 }, // 반죽: 눈만, 무표정
    under:  { color: '#e8d29e', squashY: 0.72, sagY: 7, eyeRx: 5, eyeRy: 2, eyeGap: 22, eyeY: -2, lookX: 0 }, // 부족: 찌그러지고 처짐, 힘없는 눈
    over:   { color: '#f1dfb4', squashY: 1,    sagY: 0, eyeRx: 5, eyeRy: 7, eyeGap: 24, eyeY: -6, lookX: 4, bridgeW: 46 }, // 넘침: 옆 구멍과 붙어 곁눈질
    // 1차 뒤집기 뒤 중간 표정. mouth 'o' 동그란 입 / 'wave' 물결 입, sweat 땀방울 수. 제안
    expect:   { color: '#e8c98f', squashY: 0.85, sagY: 0, eyeRx: 5.5, eyeRy: 9, eyeGap: 24, eyeY: -6, lookX: 0, mouth: 'o',    sweat: 0 }, // 기대: 성공
    anxious1: { color: '#e8c98f', squashY: 0.85, sagY: 0, eyeRx: 5,   eyeRy: 7, eyeGap: 24, eyeY: -6, lookX: 0, mouth: 'wave', sweat: 1 }, // 불안(식은땀): 이름·미달
    anxious2: { color: '#e8c98f', squashY: 0.85, sagY: 0, eyeRx: 5,   eyeRy: 7, eyeGap: 24, eyeY: -6, lookX: 0, mouth: 'wave', sweat: 2 }, // 불안(진땀): 늦음
    // 최종 표정 (2차 뒤집기 뒤, 1차·2차 합산. 점수 퍼펙트 2 / 굿 1 / 그 외 0). 전부 제안값
    //   eyeRy2 오른눈 세로(짝짝이) / eyes 'x' X 눈 / spots 얼룩 수 / smoke 연기 줄 수
    //   forceColor 굽기 색 대신 표정 색을 강제 / wobble 흐물흐물 움직임
    perfect: { color: '#e0a457', squashY: 1, sagY: 0, eyeRx: 5.5, eyeRy: 9, eyeGap: 24, eyeY: -6, lookX: 0, mouth: 'grin',  sweat: 0 },                                    // 합 4 완벽: 활짝 웃음 + 통통
    tasty:   { color: '#e0a457', squashY: 1, sagY: 0, eyeRx: 5,   eyeRy: 7, eyeGap: 24, eyeY: -6, lookX: 0, mouth: 'smile', sweat: 0 },                                    // 합 3 맛있음: 노릇 + 작은 미소
    meh:     { color: '#d9a35e', squashY: 1, sagY: 0, eyeRx: 5,   eyeRy: 7, eyeRy2: 3, eyeGap: 24, eyeY: -6, lookX: 0, mouth: 'wave', sweat: 0, spots: 3 },                // 합 2 어설픔: 얼룩 + 물결 입 + 짝짝이 눈
    raw:     { color: '#efe3c4', squashY: 1, sagY: 2, eyeRx: 5,   eyeRy: 6, eyeGap: 24, eyeY: -6, lookX: 0, mouth: 'wave', sweat: 0, forceColor: true, wobble: true },     // 합 0~1 덜 익음: 창백 + 흐물
    burnt:   { color: '#5a3418', squashY: 1, sagY: 0, eyeRx: 6,   eyeRy: 6, eyeGap: 24, eyeY: -6, lookX: 0, eyes: 'x', sweat: 0, forceColor: true, smoke: 2, spots: 4, spotColor: '#1a120c' }, // 합 0~1 + 늦은 미스 탐: 진한 갈색 + 검은 반점 + X 눈 + 연기 (2026-10-11 사용자)
    blank:   { color: '#e0a457', squashY: 1, sagY: 0, eyeRx: 3,   eyeRy: 3, eyeGap: 26, eyeY: -4, lookX: 0, mouth: 'flat', sweat: 0 },                                     // 문어 없음: 멍함 (굽기 결과 무관)
    // 굽기 색과 1차 굽기 힌트. 반죽(raw) → 테두리 굳음(set) → (큐) 황금 → 갈색 → 검정. 제안
    //   coreMin 큐 시점에 남는 가운데 반죽 반지름 비율(시작 0.95) / bubbles 큐 순간 올라오는 기포 수 (굿 창 동안 보임)
    //   2차 신호(T13): steam 큐부터 퍼펙트 구간 동안 오르는 김 줄 수(최대 3) / steamColor / anticipate 큐 직전 눈 배율(두근두근 예고)
    //   T32 (실제 타코야키처럼): 윗면은 반죽색, 바닥 색은 테두리 링으로 — ringMax 링 최대 두께 / rawBand 1차 반구 아래 안 익은 띠 색
    //   jiggle 큐 순간 들썩(px 세로, deg 흔들림, hz) / dots·dotColor 다 익은 공의 갈색 점
    cook: { raw: '#f1dfb4', set: '#e9cf8e', golden: '#e0a457', brown: '#8a4a1f', burnt: '#2a211b', coreMin: 0.35, bubbles: 8, steam: 3, steamColor: '#ffffff', anticipate: 1.35,
            ringMax: 7, rawBand: '#f1dfb4', jiggle: { px: 2.5, deg: 4, hz: 6 }, dots: 4, dotColor: '#9a5a26',
            // T35: spillPad 구멍 둘레로 번진 반죽 폭 / tenkasu·scallion 짜기 직후 뿌려지는 조각 / shade 공 입체 음영 진하기(반구·공 / 반죽)
            spillPad: 6, tenkasu: { n: 5, color: '#f2dc8e' }, scallion: { n: 3, color: '#5aa33a' }, shade: { dome: 1, batter: 0.35 } },
    // 짜기 결과 반응 (놓는 순간 반죽이 눌렸다 펴진다). 제안
    //   squash 눌림 세로 비율 / stretch 펴짐 세로 비율 / ms 길이 / bounces 횟수 / shine 윤기 점 남김
    react: {
      perfect: { squash: 0.82, stretch: 1.08, ms: 320, bounces: 2, shine: true },  // 통통 두 번 + 윤기
      good:    { squash: 0.92, stretch: 1.03, ms: 200, bounces: 1, shine: false }, // 출렁 한 번
      final:   { squash: 0.85, stretch: 1.1,  ms: 200, bounces: 2, shine: false }, // 최종 완벽: 통통 200 ms
    },
  },
  // 손님. 한 명씩 차례로, 이탈·대기 게이지 없음 (2026-10-10 사용자). 누가 며칠째 오는지는 day.days
  //   cast: 손님 정의. emoji 그림(임시 — 7단계 도형, 9단계 이미지) / name / order 주문 말풍선 / again 한 판 더 말풍선
  //   문구는 Claude 초안 (플레이 후 수정). 맛 취향·선물은 6·7단계
  // 배경 (T22): 도형 포장마차. 색은 전부 제안값. 시간대는 Flow 상태에 맞춰 바뀐다
  //   times: 아침(편지·장보기·준비) / 영업(종~반응) / 밤(밤 대화·선물·끝). skyTop·skyBottom 하늘, city 골목 실루엣, lamp 등불 0~1, dark 밤 덮개 0~1
  scene: {
    times: {
      morning: { skyTop: '#f2b880', skyBottom: '#a8d0e6', city: '#8a97ad', lamp: 0, dark: 0 },
      open:    { skyTop: '#3a2a5c', skyBottom: '#d47a5a', city: '#3a2f4a', lamp: 1, dark: 0 },
      night:   { skyTop: '#0d1230', skyBottom: '#232c4c', city: '#171a30', lamp: 1, dark: 0.45 },
    },
    awning: ['#c8372d', '#f3e6d6'],  // 천막 줄무늬 두 색
    flame: { color: '#4aa8ff', count: 9 },  // 불판 아래 가스불 (T32)
    plate: { iron: ['#2a2725', '#141312'], rim: '#34302d', rimHi: '#5a5550' }, // 검은 무쇠 불판 (T35)
    wood: '#3b2a1f',                  // 작업대
    counter: '#8a5a34',               // 카운터 앞턱
  },
  // 아트 이미지 자리 (9단계에 넣는다, 2026-10-10 사용자). 비어 있으면 도형을 쓴다. 경로 또는 data URI
  art: { background: '' },
  // 재료 (6단계, 기획서 시작값). name · price 장보기 가격 · tags 맛 태그 · flipWindow 뒤집기 성공 구간 배율(잣 0.6 = 빨리 탄다)
  //   color 도형 아이콘 색(제안) · base 기본 재료(늘 있음, 무료). 반죽에 영향을 주는 재료는 없다 (2026-10-10 사용자: pourTarget 삭제)
  //   장보기: 날마다 다시 사고, 산 날에는 무한 (2026-10-10 사용자)
  ingredients: {
    octopus:  { name: '문어',     price: 0,   tags: ['쫄깃함', '짭조름'], flipWindow: 1.0, color: '#b9475a', base: true },
    pinenut:  { name: '잣',       price: 180, tags: ['고소함'],           flipWindow: 0.6, color: '#efe0a8' },
    pear:     { name: '배',       price: 150, tags: ['단맛', '시원함'],   flipWindow: 1.0, color: '#d6e89a' },
    apple:    { name: '사과',     price: 120, tags: ['단맛', '새콤함'],   flipWindow: 1.0, color: '#d8433a' },
    radish:   { name: '무',       price: 80,  tags: ['시원함'],           flipWindow: 1.0, color: '#f6f2e6' },
    shrimp:   { name: '새우',     price: 200, tags: ['감칠맛', '쫄깃함'], flipWindow: 0.8, color: '#f08a4b' },
    scallion: { name: '파',       price: 60,  tags: ['향긋함', '감칠맛'], flipWindow: 1.0, color: '#6cb04a' },
    ginger:   { name: '생강절임', price: 80,  tags: ['새콤함', '매콤함'], flipWindow: 1.0, color: '#ef8aa8' },
  },
  // 화자 (T23): 이름 · 색 · 아이콘 기호. 손님은 customers.cast의 emoji·name을 쓴다. icon에 이미지를 넣으면 기호 대신 (9단계)
  //   반쵸는 짧은 반응만 ("…", "음.", "?") — 대사 줄의 mark로 표정 글자를 바꾼다
  speakers: {
    bancho: { name: '반쵸', color: '#e07a2c', mark: '…', icon: '' },
    letter: { name: '편지', color: '#8a7460', mark: '✉', icon: '' },
  },
  // 장면별 대사 [{ who, text, mark? }]. text 안의 \n은 줄바꿈. 밤 대화 = night + 일차. 문구는 자리 (7단계에 힌트 곡선으로 채움)
  dialogue: {
    night1: [
      { who: 'sparrow', text: '(1일차 밤 대화 — 7단계: 참새가 내일 손님 힌트를 흘림)' },
      { who: 'bancho', text: '…', mark: '…' },
    ],
    night2: [
      { who: 'crow_b', text: '(2일차 밤 대화 — 7단계: 까마귀의 한마디)' },
      { who: 'bancho', text: '음.', mark: '음.' },
    ],
  },
  // 메뉴 (T29, Claude 초안 — 플레이 후 조정). requires 필요 재료(전부 들어야 함) · price 기본가 · known 처음부터 메뉴판에 있음
  //   알의 메뉴 = 필요 재료가 모두 든 메뉴 중 기본가가 가장 높은 것 (6단계 인터뷰). 재료 0개 = plain, 문어 없이 맞는 메뉴가 없으면 odd
  //   hidden 숨은 요리(기획서) — 이름 카드·도감·최소 굽기는 7단계(T33)
  menus: {
    plain:           { name: '빈 타코야키',   requires: [],                      price: 0 },
    odd:             { name: '별난 타코야키', requires: [],                      price: 80 },
    tako:            { name: '타코야키',      requires: ['octopus'],             price: 100, known: true },
    tako_pinenut:    { name: '잣 타코야키',   requires: ['octopus', 'pinenut'],  price: 150 },
    tako_pear:       { name: '배 타코야키',   requires: ['octopus', 'pear'],     price: 140 },
    tako_apple:      { name: '사과 타코야키', requires: ['octopus', 'apple'],    price: 130 },
    tako_radish:     { name: '무 타코야키',   requires: ['octopus', 'radish'],   price: 120 },
    tako_shrimp:     { name: '새우 타코야키', requires: ['octopus', 'shrimp'],   price: 160 },
    tako_scallion:   { name: '파 타코야키',   requires: ['octopus', 'scallion'], price: 120 },
    octopus_ginger:  { name: '생강 타코야키', requires: ['octopus', 'ginger'],   price: 180, hidden: true },
    pear_pinenut:    { name: '배잣 타코야키', requires: ['pear', 'pinenut'],     price: 240, hidden: true },
    shrimp_scallion: { name: '새우파 타코야키', requires: ['shrimp', 'scallion'], price: 240, hidden: true },
  },
  customers: {
    receiptGapMs: 400,  // 성적표를 닫은 뒤 다음(한 판 더 / 손님 퇴장)까지, ms. 제안
    cast: {
      // likes·dislikes 맛 태그(기획서 시작값) / favorites 특별히 좋아하는 메뉴 id(Claude 초안) / lines 반응 대사 덮어쓰기(선택)
      //   when 조건 대사 (T36, 7단계 인터뷰): 위에서부터 처음 맞는 줄이 반응 대사를 덮는다(표정은 그대로).
      //     if 조건 — noFav: 좋아하는 메뉴 알이 0개 / not: 이 반응이면 제외 / day: 이 일차에만. clue 로그용 단서 태그
      sparrow: { emoji: '🐦', name: '참새', order: '타코야키 하나 줘~ 짹!', again: '한 판 더 줄래? 짹!',
                 likes: ['고소함', '짭조름'], dislikes: ['매콤함'], favorites: ['tako_pinenut'],
                 when: [{ if: { noFav: true, not: ['flop'] }, line: '음~ 잣 넣으면 더 맛있을 것 같은데~ 짹!', clue: '고소함' }] },
      crow_a:  { emoji: '🐦‍⬛', name: '까마귀', order: '까악, 하나 부탁해.', again: '하나 더. 까악.',
                 likes: ['단맛', '시원함'], dislikes: ['매콤함'], favorites: ['tako_pear'] },
      crow_b:  { emoji: '🐦‍⬛', name: '까마귀', order: '나도 하나! 까악!', again: '하나 더! 까악!',
                 likes: ['단맛', '시원함'], dislikes: ['매콤함'], favorites: ['pear_pinenut'] },
    },
    // 알 값 (T29, 6단계 인터뷰): (메뉴 기본가 + 좋아하는 맛 태그 × like − 싫어하는 맛 태그 × dislike + 좋아하는 메뉴면 favorite) × 표정 배수
    //   표정 배수: 실패(덜 익음·탐·문어 없음) 0 = 실패 0원 (2026-10-10 사용자). 나머지 수치는 제안
    value: { like: 20, dislike: 40, favorite: 30, faceMult: { perfect: 1.2, tasty: 1.0, meh: 0.7, raw: 0, burnt: 0, blank: 0 } },
    // 반응 기준: failBalls 실패 알 이 이상 → 망함 / bestBalls 좋아하는 맛이 든 알 이 이상 → 최고 (아니면 맛있다 + 단서). saucePx 결산 '소스 과다'
    react: { failBalls: 3, bestBalls: 4, saucePx: 2500 },
    // 반응 6종 (위에서부터 처음 맞는 것). {메뉴} {싫은 맛} {빠진 맛} 자리는 채워진다. 문구 Claude 초안 → 플레이 후 수정. satisfied = 결산 '만족'
    reactions: {
      flop:    { emoji: '😵', line: '이건… 먹어도 되는 거 맞지?', satisfied: false },
      love:    { emoji: '😍', line: '바로 이거야! {메뉴} 최고!', satisfied: true },
      dislike: { emoji: '😖', line: '으, {싫은 맛}… 이건 좀.', satisfied: false },
      lack:    { emoji: '😐', line: '음… {빠진 맛} 좀 아쉽네.', satisfied: false },
      good:    { emoji: '🙂', line: '맛있네! {빠진 맛} 더 있었으면 좋겠다.', satisfied: true },
      best:    { emoji: '😋', line: '최고야! 또 올게!', satisfied: true },
    },
  },
  // 하루 (후속 확장용). 1일차 결산
  day: {
    // 일차 구성 (SPEC 2절, 기획서 시작값). shop: 장보기 여부 / guests: 차례로 오는 손님과 주문 판 수. 3일차는 8단계
    //   enclosed: 편지에 동봉된 것 — money 송금(돈), items 준비물(재료 id → 오늘 가진 재료)
    days: [
      { shop: false, enclosed: { money: 0, items: ['octopus', 'pinenut'] }, guests: [{ id: 'sparrow', orders: 2 }] },
      { shop: true,  enclosed: { money: 500, items: [] },           guests: [{ id: 'crow_a', orders: 1 }, { id: 'crow_b', orders: 1 }] },
    ],
    startMoney: 0,       // 1일차 시작 돈. 시작값 (기획서)
    resultDelayMs: 1200, // "오늘 영업 끝!" 뒤 결산 화면까지, ms. 제안
    replyGreat: 4000,    // 매출이 이 이상이면 답장 great. 제안 (T29 가격 기준으로 낮춤)
    replyOk: 2000,       // 이 이상이면 ok, 아래면 bad. 제안
  },
  letters: {
    // 단계 끝 등급 글자 (4단계, 사용자 결정 2026-10-10)
    grade: { perfect: 'PERFECT!', great: 'GREAT!', good: 'GOOD', oops: 'OOPS…' },
    // 일차별 편지 (사용자가 직접 작성 — 2026-10-10. 지금은 자리만). 문자열 하나 = 한 장, ['…', '…'] = 여러 장
    days: [
      '(1일차 편지 — 나중에 작성)',
      '(2일차 편지 — 나중에 작성)',
    ],
    // 편지 동봉 카드 (T24)
    enclosed: { title: '동봉', items: '(준비물)' },
    // ② 재료 넣기 버튼 (T27)
    fill: { done: '모두 완료!' },
    // 첫 판 안내 (T33): 1일차 첫 판에만 단계마다 한 줄. **강조**는 노란 글자. Claude 초안 → 플레이 후 수정
    hints: {
      pour:    '구멍을 누르고 있다가, 반죽이 **초록 눈금**에 닿으면 떼요. 도-미-솔-도!',
      octopus: '재료판에서 문어를 끌어 **구멍 가운데**에 놓아요. 다른 재료도 넣을 수 있어요',
      flip1:   '**테두리가 노릇**해지고 알이 **들썩이면**, 누른 채 반 바퀴 돌리고 떼요',
      flip2:   '눈이 커지다 **김이 오르면**, 한 바퀴 휙 돌리고 떼요',
      box:     '구멍을 누른 채 **후네 쪽으로 휙** 튕겨요',
      topping: '소스·가쓰오부시를 뿌리고, 후네를 **위로 끌어** 손님에게 건네요',
    },
    // 판 성적표 (T30)
    receipt: { title: '{손님}의 한 판', close: '클릭해서 닫기 ▶', like: '좋아하는 맛', dislike: '싫은 맛', fav: '좋아하는 메뉴', fresh: '새!' },
    faceName: { perfect: '완벽', tasty: '맛있음', meh: '어설픔', raw: '덜 익음', burnt: '탐', blank: '문어 없음' },
    // 메뉴판 (T29)
    menu: { title: '메뉴', fresh: '새 메뉴!' },
    // 맛 태그를 대사에 넣을 때 말투 (반응 {빠진 맛} {싫은 맛})
    tagSay: {
      고소함: '고소한 게', 짭조름: '짭짤한 게', 단맛: '단 게', 시원함: '시원한 게', 새콤함: '새콤한 게',
      매콤함: '매운 게', 감칠맛: '감칠맛이', 향긋함: '향긋한 게', 쫄깃함: '쫄깃한 게',
    },
    // 준비 (T26). max = 재료판 추가 칸 수 (문어 1 + 추가 3, 사용자 결정 2026-10-10)
    prep: { title: '준비', hint: '오늘 쓸 재료를 3개까지 고르세요', none: '오늘은 문어만', start: '영업 시작 ▶', max: 3 },
    // 장보기 (T25)
    shop: { title: '장보기', done: '장보기 끝 ▶', owned: '보유', today: '✓ 오늘 씀', base: '기본 재료' },
    // 결산 화면 (T20, 8단계 결과 화면으로 교체 예정). 아래 문구는 전부 Claude 초안 → 플레이 후 수정
    result: { title: '결산 (임시)', funnyTitle: '오늘의 가장 웃긴 한 접시', aceTitle: '오늘의 에이스 한 접시', sign: '— 사장 드림' },
    // 가장 웃긴 실패 한 줄 (후네 통째로 보여주며)
    funny: {
      noOcto: '문어 실종 사건',
      burnt: '숯불 특선 (주문한 적 없음)',
      raw: '반숙 타코야키, 신메뉴인가요?',
      sauce: '소스 온천에 몸 담근 타코야키',
      meh: '개성 넘치는 한 접시',
      ace: '이 정도면 사장보다 낫다',
    },
    // 답장 편지 한 줄 (매출 기준: day.replyGreat / replyOk)
    reply: {
      great: '손님들이 또 온대. …문어는 내일도 네가 사 와. 수고했어!',
      ok: '첫날 치고 나쁘지 않네. 오늘은 푹 쉬어.',
      bad: '불판이 좀 놀랐겠지만, 내일은 더 잘할 거야. 수고했어.',
    },
  },
};
