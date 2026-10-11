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

    // 첫 판 유령 시범 (T44): ① 짜기 · ⑤ 후네 · ⑥ 건네기. cycleMs 한 번 / first 1일차 첫 판 불투명도 / later 그 뒤(0 = 안 보임). 제안
    demo: {
      pour:    { cycleMs: 2400, first: 0.6, later: 0 },
      box:     { cycleMs: 1500, first: 0.6, later: 0 },
      topping: { cycleMs: 1800, first: 0.6, later: 0 },
    },
    // 문어 넣기 (반죽이 든 구멍이면 언제든)
    octopus: {
      legRatio: 0.6,    // 구멍 중심에서 반지름의 이 비율보다 멀면 다리가 삐져나온다. 확정
      perfectRatio: 0.3, // 이 비율 안이면 단계 등급에서 퍼펙트(2점), legRatio 안이면 굿(1점). 모양은 그대로. 제안
      // 놓을 자리 안내 (T42): [점선 불투명도, 초록 채움 불투명도]. strong 1일차 첫 판 / faint 그 뒤. 제안
      guide: { strong: [0.8, 0.55], faint: [0.25, 0.2] },
      // 유령 시범 (T42): 안 들고 있을 때 반투명 문어 + 손가락이 재료판 → 빈 구멍. cycleMs 한 번, strong/faint 불투명도. 제안
      demo: { cycleMs: 1800, strong: 0.6, faint: 0.22 },
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
  art: { background: '', title: '' },
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
  // 장면별 대사 [{ who, text, mark? }]. text 안의 \n은 줄바꿈. 밤 대화 = night + 일차 — 정산 카드 뒤 (T38)
  //   힌트 곡선 (SPEC 11절): 1일차 밤 = 방향(배를 슬쩍), 2일차 밤 = 맛 정보 없음(표정을 보라는 말만).
  //   손님 성격 (Claude 초안, 사용자 의도 2026-10-11): 참새 = 수다쟁이·참견쟁이, 반쵸를 아는 척 / 까마귀 = 형님(A, 과묵) · 동생(B, 촐싹)
  //   너구리 = 까다로운 미식가, 말이 짧다. 반쵸는 "…", "음.", "?"만
  //   "**잣**"처럼 별표 두 개로 감싸면 대화창·말풍선에서 강조 글자(주황·굵게) (T47)
  dialogue: {
    // 1일차 1판 뒤 장면 (T45, 사용자 흐름 2026-10-11). day.days[0].scenes가 부른다. 망친 판이면 day1askFlop이 앞에 붙는다
    day1askFlop: [
      { who: 'sparrow', text: '…뭐, 좋아. 첫날이니까 봐줄게. 짹.' },
    ],
    day1ask: [
      { who: 'sparrow', text: '타코야키는 고소해야 맛이라고~\n알잖아? 난 **잣**이 콕 박혀 있어야 먹은 것 같다니까.' },
      { who: 'sparrow', text: '자, **잣** 넣어서 다시! 빨리빨리~' },
      { who: 'bancho', text: '…', mark: '…' },
      { who: 'sparrow', text: '…뭐어~?! **잣**이 없다고?\n가게를 이렇게 대충 열면 어떡해!' },
      { who: 'sparrow', text: '할 수 없지. 아껴 둔 건데… 특별히 줄게.\n이걸로 다시 해 봐. 짹!' },
    ],
    night1: [
      { who: 'sparrow', text: '오늘 꽤 괜찮았어~ **잣** 타코야키, 동네에 소문내 줄게. 짹!' },
      { who: 'sparrow', text: '근데 너… 이 포장마차엔 좀 "특이한" 손님들이 온다는 얘기,\n못 들었어? 전에 여기 있던 인간한테서 말이야.' },
      { who: 'bancho', text: '…', mark: '…' },
      { who: 'sparrow', text: '들은 것 같긴 한데 무슨 소린지 몰랐다고~?\n흐음. 그럼 직접 겪어 보는 수밖에 없겠네.' },
      { who: 'sparrow', text: '아, 내일은 까마귀들이 올 거야.\n걔네 입맛은 나도 잘 모르는데~' },
      { who: 'sparrow', text: '반짝이는 거라면 사족을 못 쓰고… 그러고 보니 지난가을엔\n**배** 과수원에서 한나절을 안 나오더라? 짹짹!' },
      { who: 'sparrow', text: '아마 내일 아침에 걔네가 쪽지부터 보낼걸?\n까마귀들은 예약 없이는 안 움직이거든~ 짹!' },
      { who: 'bancho', text: '음.', mark: '음.' },
    ],
    night2: [
      { who: 'crow_b', text: '까악! 생각보다 맛있었어. 형님한텐 비밀이다?' },
      { who: 'crow_a', text: '…다 들린다.' },
      { who: 'crow_a', text: '내일 오는 녀석은 입맛이 까다롭다.\n쪽지에도 뭘 좋아하는지는 안 쓸 거다.' },
      { who: 'crow_b', text: '맞아맞아, 대신 먹고 나서 하는 말을 잘 들어 봐.\n이것저것 넣어 보면 뭐가 맞는지 티가 나거든~ 까악!' },
      { who: 'bancho', text: '…', mark: '…' },
    ],
    // 3일차 밤 = 장인의 편지 (T40, 8단계 인터뷰). 문구는 사용자가 직접 작성 — 지금은 기획서 문구를 자리로
    night3: [
      { who: 'letter', text: '(장인의 편지 — 나중에 작성)\n자네만의 타코야키를 보여주게. 내일은 내가 직접 가지.' },
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
    //   desc 숨은 요리 이름 카드·도감 한 줄 (T39, Claude 초안)
    octopus_ginger:  { name: '생강 타코야키', requires: ['octopus', 'ginger'],   price: 180, hidden: true, desc: '새콤 매콤한 생강절임이 문어 맛을 깨운다.' },
    pear_pinenut:    { name: '배잣 타코야키', requires: ['pear', 'pinenut'],     price: 240, hidden: true, desc: '시원한 배와 고소한 잣. 달콤한 디저트 같은 한 알.' },
    shrimp_scallion: { name: '새우파 타코야키', requires: ['shrimp', 'scallion'], price: 240, hidden: true, desc: '탱글한 새우에 파 향을 얹은 감칠맛 덩어리.' },
  },
  customers: {
    receiptGapMs: 400,   // 성적표를 닫은 뒤 다음(한 판 더 / 손님 퇴장)까지, ms. 제안
    giftMs: 900,         // 선물을 두고 간 손님이 떠나기 전 기다림, ms (T37). 제안
    cast: {
      // likes·dislikes 맛 태그(기획서 시작값) / favorites 특별히 좋아하는 메뉴 id(Claude 초안) / lines 반응 대사 덮어쓰기(선택)
      //   when 조건 대사 (T36, 7단계 인터뷰): 위에서부터 처음 맞는 줄이 반응 대사를 덮는다(표정은 그대로).
      //     if 조건 — noFav: 좋아하는 메뉴 알이 0개 / not: 이 반응이면 제외 / day: 이 일차에만. clue 로그용 단서 태그
      //   handle 후기 게시물 아이디 (T43, Claude 초안)
      //   lines 안 {메뉴} {싫은 맛} {빠진 맛} 자리는 채워진다 ({빠진 맛} = "단 게", "감칠맛이" 처럼 조사까지 — letters.tagSay)
      sparrow: { emoji: '🐦', name: '참새', handle: '@chamsae_jjak', order: '어머, 새 사장님? 타코야키 하나 줘 봐~ 짹!', again: '이번엔 **잣** 듬뿍! 알지? 짹짹!',
                 likes: ['고소함', '짭조름'], dislikes: ['매콤함'], favorites: ['tako_pinenut'],
                 //   1일차 1판 = 정해진 장면의 첫 줄 (T45). round 그날 몇 번째 판 / react 이 반응일 때만
                 when: [
                   { if: { day: 1, round: 1, react: ['flop'] }, line: '우웩! 이게 뭐야?! 너, 타코야키 만들 줄은 알아?', clue: '고소함' },
                   { if: { day: 1, round: 1 }, line: '흐음~ 맛은 있네. 근데… 초심을 잃었네?', clue: '고소함' },
                 ],
                 lines: {
                   flop: '짹?! 이건 좀… 새 모이보다 못한데?',
                   love: '바로 이 맛이야! 고소~한 게 딱 내 스타일! 짹!',
                   dislike: '퉤퉤, {싫은 맛} 들었잖아! 혀가 얼얼해!',
                   lack: '음… 나쁘진 않은데, {빠진 맛} 하나도 없네?',
                   good: '맛있어! 근데 {빠진 맛} 조금만 더 있었으면~',
                   best: '최고야! 내일 친구들 다 데려온다? 짹짹!',
                 },
                 gift: 'pinenut_pack', giftAlways: true }, // giftAlways: 1일차 밤엔 만족과 상관없이 잣 꾸러미 (T45 사용자)
      // 까마귀 형제 — A 형님(과묵), B 동생(촐싹)
      crow_a:  { emoji: '🐦‍⬛', name: '까마귀 형님', handle: '@kkamagwi_hyung', order: '…예약한 거. 하나. 까악.', again: '…하나 더.',
                 likes: ['단맛', '시원함'], dislikes: ['매콤함'], favorites: ['tako_pear'], gift: 'button',
                 lines: {
                   flop: '…까악. 이건 못 본 걸로 하지.',
                   love: '…! {메뉴}. 이건… 인정한다.',
                   dislike: '케엑. {싫은 맛} 들었군. 질색이다.',
                   lack: '…밍밍하다. {빠진 맛} 하나도 없어.',
                   good: '나쁘지 않다. {빠진 맛} 조금 더 있었으면.',
                   best: '…괜찮군. 동생 놈한테도 알려 주지.',
                 } },
      crow_b:  { emoji: '🐦‍⬛', name: '까마귀 동생', handle: '@kkamagwi_dongsaeng', order: '나도 예약했지?! 시원~한 걸로 하나! 까악!', again: '하나 더! 하나 더! 까악!',
                 likes: ['단맛', '시원함'], dislikes: ['매콤함'], favorites: ['pear_pinenut'], gift: 'button',
                 lines: {
                   flop: '까아악?! 이거 먹는 거 맞아?!',
                   love: '까아악! {메뉴}! 반짝반짝한 맛이야!',
                   dislike: '케엑! {싫은 맛} 들었잖아! 물, 물!',
                   lack: '에이~ 밍밍해. {빠진 맛} 없으면 서운하지!',
                   good: '오, 맛있다! {빠진 맛} 쪼끔만 더~ 까악!',
                   best: '최고! 형님, 여기 단골 하자! 까악!',
                 } },
      // 너구리 (T40, 3일차): 취향을 말하지 않는다 — 첫 판 반응이 유일한 단서. 맛 이름 대신 "바다", "깊이"로 돌려 말한다 (감칠맛·짭조름, 단맛 싫음)
      tanuki:  { emoji: '🦝', name: '너구리', handle: '@neoguri_gourmet', order: '…쪽지 봤나. 하나.', again: '…다시. 이번엔 제대로.',
                 likes: ['감칠맛', '짭조름'], dislikes: ['단맛'], favorites: ['shrimp_scallion'],
                 lines: {
                   flop: '…이걸 돈 받고 팔 생각인가.',
                   love: '…! **바다**가 입 안에서 터지는군. 이거다.',
                   dislike: '**달다.** 타코야키에서 과자 맛이 나면 곤란하지.',
                   lack: '흠. 얌전하군. **바다** 냄새가 하나도 안 나.',
                   good: '괜찮군. 다만… 한 입 더 **깊었으면**.',
                   best: '…좋아. 또 오지.',
                 } },
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
  // 선물 (T37, 7단계 인터뷰 2026-10-11): 손님이 떠날 때 그 손님 판 중 하나라도 만족이면 cast[id].gift를 두고 간다(결제와 별개).
  //   밤에 선물마다 [팔기 sell] / [남기기]. ingredient 남기면 다음 날 그 재료를 공짜로 가진다. 값은 기획서 시작값, 문구 Claude 초안
  gifts: {
    pinenut_pack: { name: '잣 꾸러미',   icon: '🌰', sell: 300, keep: '내일 잣을 공짜로 쓴다', ingredient: 'pinenut' },
    button:       { name: '반짝이 단추', icon: '🔘', sell: 400, keep: '쓸모는… 글쎄' },
  },
  // 하루 (후속 확장용). 1일차 결산
  day: {
    // 일차 구성 (SPEC 2절, 기획서 시작값). shop: 장보기 여부 / guests: 차례로 오는 손님과 주문 판 수
    //   enclosed: 편지에 동봉된 것 — money 송금(돈), items 준비물(재료 id → 오늘 가진 재료)
    days: [
      // 1일차 (T45 사용자 흐름): 편지 → 도착하자마자 참새. 동봉은 문어만, 준비(prep) 없음.
      //   scenes: 1판 뒤 장면(잣 요구 → 잣 건네받음) / require: 2판은 잣을 한 알 이상 넣어야 진행
      { shop: false, prep: false, enclosed: { money: 0, items: ['octopus'] }, guests: [{ id: 'sparrow', orders: 2 }],
        scenes: [{ after: 1, dialogue: 'day1ask', flopDialogue: 'day1askFlop', give: ['pinenut'] }],
        require: { round: 2, ing: 'pinenut', line: '잠깐잠깐! **잣**은?! **잣** 어디 갔어?! 짹!' } },
      // reserve: 아침 예약 쪽지 (T46, 사용자 결정 2026-10-11 — 손님이 오기 전에 주문을 먼저). 2일차 = 맛 방향(가설), 3일차 = 맛 정보 없음
      { shop: true,  enclosed: { money: 500, items: [] },           guests: [{ id: 'crow_a', orders: 1 }, { id: 'crow_b', orders: 1 }],
        reserve: [
          { who: 'crow_a', text: '…오후에 들르지. **달달한** 걸로 준비해 둬. 까악.' },
          { who: 'crow_b', text: '나도나도! 난 **시원~한** 거! 형님이랑 같이 간다! 까악!' },
        ] },
      { shop: true,  enclosed: { money: 500, items: [] },           guests: [{ id: 'tanuki', orders: 2 }], // 3일차 (T40): 2일차와 같은 규칙
        reserve: [{ who: 'tanuki', text: '…오후에 간다. 대충 만들 거면 문 닫아 둬.' }] },
    ],
    startMoney: 0,       // 1일차 시작 돈. 시작값 (기획서)
    resultDelayMs: 1200, // "오늘 영업 끝!" 뒤 결산 화면까지, ms. 제안
    settleStepMs: 700,   // 하루 정산 카드 항목이 하나씩 나오는 간격, ms. 제안 (T48)
    replyGreat: 4000,    // 매출이 이 이상이면 답장 great. 제안 (T29 가격 기준으로 낮춤)
    replyOk: 2000,       // 이 이상이면 ok, 아래면 bad. 제안
  },
  letters: {
    // 단계 끝 등급 글자 (4단계, 사용자 결정 2026-10-10)
    grade: { perfect: 'PERFECT!', great: 'GREAT!', good: 'GOOD', oops: 'OOPS…' },
    // 일차별 편지 (사용자가 직접 작성 — 2026-10-10. 지금은 자리만). 문자열 하나 = 한 장, ['…', '…'] = 여러 장
    days: [
      // 1일차 = 장인의 편지 (사용자 원문 2026-10-11)
      ['반쵸군, 자네가 다시 일본으로 돌아오겠다는 이야기를 들었네.\n다음 행선지를 정하기 전까지, 잠깐 머리도 식힐겸 타코야키 가게를 운영해보는건 어떻겠나?',
       '오늘치 재료는 내가 준비해두었네.\n방문하는 손님들이 꽤 특이한 편이라 자네가 좋아할 것 같군...',
       '자네가 늘 이야기하는 재료 본연의 맛도 잘 살릴 수 있을 것 같고 말이야.\n무슨 말인지 모르겠다면, 그 포장마차에 가보면 알게 될걸세.'],
      '(2일차 편지 — 나중에 작성)',
      '(3일차 편지 — 나중에 작성)',
    ],
    // 화면 전체 편지 맨 위 받는 이 (T47, 사용자)
    letterTo: '반쵸군에게.',
    // 편지 동봉 카드 (T24)
    enclosed: { title: '동봉', items: '(준비물)', kept: '(어제 남긴 선물)' },
    // 숨은 요리 발견 (T39): 이름 카드·도감
    // 타이틀 화면 (T45). 배경 이미지는 art.title (9단계)
    title: { sub: '반쵸 더 셰프', name: '타코야키 포장마차', start: '클릭해서 시작 ▶' },
    // 아침 예약 카드 (T46)
    reserve: { title: '오늘의 예약', close: '클릭해서 장보러 가기 ▶' },
    discover: { recipe: '새 레시피!', title: '숨은 요리 발견!', close: '클릭해서 닫기 ▶', book: '📖 도감', bookTitle: '숨은 요리 도감', count: '발견 {n}/{all}', unknown: '???', foundOn: '{n}일차 발견' },
    // 하루 끝 정산 카드 (T38). {n} {m} {all} 자리는 채워진다
    //   T49 영업 일지: 오늘의 손님(대사) → 판매 수익(판 내역) → 메뉴판에 추가 → 받은 선물 → 오늘의 한 접시 → 사흘 영업 칸에 도장. {n} {m} {값} 자리는 채워진다
    settle: { title: '영업 일지', dayLabel: '{n}일차 · 밤', guests: '오늘의 손님', allHappy: '{n}판 모두 만족', oneHappy: '만족', someHappy: '{n}판 중 {m}판 만족', noneHappy: '아쉬워함',
              sales: '판매 수익', boardPart: '{n}판 {값}', recipes: '메뉴판에 추가', newRecipe: '새 레시피', hiddenRecipe: '숨은 요리!', gifts: '받은 선물',
              best: '오늘의 한 접시', bestNone: '오늘은 쉬어 가는 날', progress: '{n}일 영업', progress3: '사흘 영업', none: '없음', close: '클릭해서 도장 찍기 ▶', stamp: '다음날로!', stampLast: '영업 끝!' },
    // 선물 (T37). {손님} {값} {선물} 자리는 채워진다
    gift: { got: '🎁', from: '{손님}의 선물', sell: '팔기 {값}', sellSub: '지금 돈으로', keep: '남기기' },
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
    // 손님 후기 게시물 (T43, T30 성적표를 바꿈): 폰 SNS 게시물 + 옆 영수증. 본문은 손님 리뷰 말투 — 굽기는 원인이 드러나게, 맛은 시식평으로만,
    //   팁 없음 (사용자 결정 2026-10-11). stars 반응별 별점. say.cause 뒤집기 결과별 문장 ({n} = "두 알은" / "여섯 알 다"). 문구 Claude 초안
    review: {
      maxLines: 2, // 시식평 아래 리뷰 문장 최대 줄 수 — 좋았던 것 1 + 가장 큰 문제 1 (사용자 피드백 "글 양이 많다")
      app: 'Takogram', place: '반쵸네 포장마차', when: '{n}일차', likes: '좋아요 {n}개', receiptTitle: '영 수 증', total: '합계',
      stars: { flop: 1, dislike: 2, lack: 2, good: 3, best: 4, love: 5 },
      say: {
        likedIng: '타코야키에 {재료} 들어가 있어서 좋았어요!',
        allPerfect: '겉은 바삭, 속은 촉촉! 굽기가 완벽해요 👍',
        somePerfect: '{n} 겉바속촉 완벽했어요',
        cause: {
          '이름': '{n} 반죽이 흐물흐물했어요 😢',
          '늦음': '{n} 살짝 탄 맛이 났어요',
          '미달': '{n} 덜 뒤집혀서 한쪽이 납작했어요',
          '과회전': '{n} 모양이 찌그러져 있었어요',
          '느림': '{n} 겉이 고르게 안 익었어요',
          '굿': '조금만 더 바삭했으면 좋겠어요',
        },
        blankOne: '재료가 없는 알이 있었어요!',
        blankMany: '{n} 속이 텅 비어 있었어요!',
        disliked: '{n} 제 입맛엔 좀 안 맞았어요',
      },
    },
    // 판 성적표 (T30)
    receipt: { title: '{손님}의 한 판', close: '클릭해서 닫기 ▶', like: '좋아하는 맛', dislike: '싫은 맛', fav: '좋아하는 메뉴' },
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
    // 결과 화면 ① 3일의 기록 (T41). Claude 초안
    result: { title: '3일의 기록', day: '{n}일차', boards: '{n}판', fresh: '새 메뉴', found: '발견!', quiet: '새로 만든 메뉴 없음', pinenut: '잣 꾸러미', keep: '남겼다 → 다음 날 재료로', sell: '팔았다 ({값})', missed: '받지 못했다', book: '숨은 요리', total: '3일 매출', funnyTitle: '3일 중 가장 웃긴 한 접시', aceTitle: '3일 중 에이스 한 접시', funnyDay: '{n}일차 · {손님}의 한 판', next: '클릭해서 기획 노트 보기 ▶' },
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
