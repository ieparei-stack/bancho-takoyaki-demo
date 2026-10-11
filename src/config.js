// data.js 로더. 게임은 window.DATA를 직접 읽지 않고 검증을 거친 CFG만 읽는다.
// 값이 빠지거나 타입이 틀리면 기본값으로 바꾸고 화면에 경고를 띄운다. (CLAUDE.md 3-1)
let CFG = null;

const Config = (() => {
  // data.js와 같은 구조. 값이 잘못됐을 때만 쓰인다.
  const DEFAULTS = {
    timing: {
      pour: {
        targetMs: 1000, perfectMs: 50, goodMs: 120, autoStopMs: 120,
        holdBeats: 2, soundSet: 1,
      },
      octopus: { legRatio: 0.6, perfectRatio: 0.3 },
      fill: { limitMs: [60000, 20000], endOnOctopusDays: [1] },
      box: { flickPx: 30, flickMs: 300, coneDeg: 60, flyMs: 350 },
      topping: { boatScale: 1.6, sauceWidth: 7, flakeEveryPx: 18, flakeMax: 400, handoffY: 170 },
      stage: { skipMs: 300, bannerMs: 1200, perfect: 11, great: 8, good: 4 },
      cook: { lead1Ms: 2500, lead2Ms: 1500, intervalMs: 1500, perfectSpanMs: 1500, goodMarginMs: 300, burnMs: 3000 },
      flip: { ignoreDeg: 30, flip1MinDeg: 90, flip1MaxDeg: 360, flip2MinDeg: 180, flip2MaxDeg: 720, flip2SpeedDps: 720 },
    },
    faces: {
      batter: { color: '#f1dfb4', squashY: 1, sagY: 0, eyeRx: 5, eyeRy: 7, eyeGap: 24, eyeY: -6, lookX: 0 },
      under: { color: '#e8d29e', squashY: 0.72, sagY: 7, eyeRx: 5, eyeRy: 2, eyeGap: 22, eyeY: -2, lookX: 0 },
      over: { color: '#f1dfb4', squashY: 1, sagY: 0, eyeRx: 5, eyeRy: 7, eyeGap: 24, eyeY: -6, lookX: 4, bridgeW: 46 },
      expect: { color: '#e8c98f', squashY: 0.85, sagY: 0, eyeRx: 5.5, eyeRy: 9, eyeGap: 24, eyeY: -6, lookX: 0, mouth: 'o', sweat: 0 },
      anxious1: { color: '#e8c98f', squashY: 0.85, sagY: 0, eyeRx: 5, eyeRy: 7, eyeGap: 24, eyeY: -6, lookX: 0, mouth: 'wave', sweat: 1 },
      anxious2: { color: '#e8c98f', squashY: 0.85, sagY: 0, eyeRx: 5, eyeRy: 7, eyeGap: 24, eyeY: -6, lookX: 0, mouth: 'wave', sweat: 2 },
      perfect: { color: '#e0a457', squashY: 1, sagY: 0, eyeRx: 5.5, eyeRy: 9, eyeGap: 24, eyeY: -6, lookX: 0, mouth: 'grin', sweat: 0 },
      tasty: { color: '#e0a457', squashY: 1, sagY: 0, eyeRx: 5, eyeRy: 7, eyeGap: 24, eyeY: -6, lookX: 0, mouth: 'smile', sweat: 0 },
      meh: { color: '#d9a35e', squashY: 1, sagY: 0, eyeRx: 5, eyeRy: 7, eyeRy2: 3, eyeGap: 24, eyeY: -6, lookX: 0, mouth: 'wave', sweat: 0, spots: 3 },
      raw: { color: '#efe3c4', squashY: 1, sagY: 2, eyeRx: 5, eyeRy: 6, eyeGap: 24, eyeY: -6, lookX: 0, mouth: 'wave', sweat: 0, forceColor: true, wobble: true },
      burnt: { color: '#2a211b', squashY: 1, sagY: 0, eyeRx: 6, eyeRy: 6, eyeGap: 24, eyeY: -6, lookX: 0, eyes: 'x', sweat: 0, forceColor: true, smoke: 2 },
      blank: { color: '#e0a457', squashY: 1, sagY: 0, eyeRx: 3, eyeRy: 3, eyeGap: 26, eyeY: -4, lookX: 0, mouth: 'flat', sweat: 0 },
      cook: { raw: '#f1dfb4', set: '#e9cf8e', golden: '#e0a457', brown: '#8a4a1f', burnt: '#2a211b', coreMin: 0.35, bubbles: 8, steam: 3, steamColor: '#ffffff', anticipate: 1.35 },
      react: {
        perfect: { squash: 0.82, stretch: 1.08, ms: 320, bounces: 2, shine: true },
        good: { squash: 0.92, stretch: 1.03, ms: 200, bounces: 1, shine: false },
        final: { squash: 0.85, stretch: 1.1, ms: 200, bounces: 2, shine: false },
      },
    },
    scene: {
      times: {
        morning: { skyTop: '#f2b880', skyBottom: '#a8d0e6', city: '#8a97ad', lamp: 0, dark: 0 },
        open: { skyTop: '#3a2a5c', skyBottom: '#d47a5a', city: '#3a2f4a', lamp: 1, dark: 0 },
        night: { skyTop: '#0d1230', skyBottom: '#232c4c', city: '#171a30', lamp: 1, dark: 0.45 },
      },
      awning: ['#c8372d', '#f3e6d6'], wood: '#3b2a1f', counter: '#8a5a34',
    },
    art: { background: '' },
    ingredients: {
      octopus: { name: '문어', price: 0, tags: ['쫄깃함', '짭조름'], flipWindow: 1.0, color: '#b9475a', base: true },
      pinenut: { name: '잣', price: 180, tags: ['고소함'], flipWindow: 0.6, color: '#efe0a8' },
      pear: { name: '배', price: 150, tags: ['단맛', '시원함'], flipWindow: 1.0, color: '#d6e89a' },
      apple: { name: '사과', price: 120, tags: ['단맛', '새콤함'], flipWindow: 1.0, color: '#d8433a' },
      radish: { name: '무', price: 80, tags: ['시원함'], flipWindow: 1.0, color: '#f6f2e6' },
      shrimp: { name: '새우', price: 200, tags: ['감칠맛', '쫄깃함'], flipWindow: 0.8, color: '#f08a4b' },
      scallion: { name: '파', price: 60, tags: ['향긋함', '감칠맛'], flipWindow: 1.0, color: '#6cb04a' },
      ginger: { name: '생강절임', price: 80, tags: ['새콤함', '매콤함'], flipWindow: 1.0, color: '#ef8aa8' },
    },
    speakers: {
      bancho: { name: '반쵸', color: '#e07a2c', mark: '…', icon: '' },
      letter: { name: '편지', color: '#8a7460', mark: '✉', icon: '' },
    },
    dialogue: {
      night1: [{ who: 'sparrow', text: '(1일차 밤 대화)' }, { who: 'bancho', text: '…', mark: '…' }],
      night2: [{ who: 'crow_b', text: '(2일차 밤 대화)' }, { who: 'bancho', text: '음.', mark: '음.' }],
    },
    menus: {
      plain: { name: '빈 타코야키', requires: [], price: 0 },
      odd: { name: '별난 타코야키', requires: [], price: 80 },
      tako: { name: '타코야키', requires: ['octopus'], price: 100, known: true },
    },
    customers: {
      receiptGapMs: 400,
      cast: {
        sparrow: { emoji: '🐦', name: '참새', order: '타코야키 하나 줘~ 짹!', again: '한 판 더 줄래? 짹!', likes: ['고소함', '짭조름'], dislikes: ['매콤함'], favorites: ['tako_pinenut'] },
        crow_a: { emoji: '🐦‍⬛', name: '까마귀', order: '까악, 하나 부탁해.', again: '하나 더. 까악.', likes: ['단맛', '시원함'], dislikes: ['매콤함'], favorites: ['tako_pear'] },
        crow_b: { emoji: '🐦‍⬛', name: '까마귀', order: '나도 하나! 까악!', again: '하나 더! 까악!', likes: ['단맛', '시원함'], dislikes: ['매콤함'], favorites: ['pear_pinenut'] },
      },
      value: { like: 20, dislike: 40, favorite: 30, faceMult: { perfect: 1.2, tasty: 1.0, meh: 0.7, raw: 0, burnt: 0, blank: 0 } },
      react: { failBalls: 3, bestBalls: 4, saucePx: 2500 },
      reactions: {
        flop: { emoji: '😵', line: '이건… 먹어도 되는 거 맞지?', satisfied: false },
        love: { emoji: '😍', line: '바로 이거야! {메뉴} 최고!', satisfied: true },
        dislike: { emoji: '😖', line: '으, {싫은 맛}… 이건 좀.', satisfied: false },
        lack: { emoji: '😐', line: '음… {빠진 맛} 좀 아쉽네.', satisfied: false },
        good: { emoji: '🙂', line: '맛있네! {빠진 맛} 더 있었으면 좋겠다.', satisfied: true },
        best: { emoji: '😋', line: '최고야! 또 올게!', satisfied: true },
      },
    },
    day: {
      resultDelayMs: 1200, replyGreat: 4000, replyOk: 2000,
      days: [
        { shop: false, enclosed: { money: 0, items: ['octopus', 'pinenut'] }, guests: [{ id: 'sparrow', orders: 2 }] },
        { shop: true, enclosed: { money: 500, items: [] }, guests: [{ id: 'crow_a', orders: 1 }, { id: 'crow_b', orders: 1 }] },
      ],
      startMoney: 0,
    },
    letters: {
      grade: { perfect: 'PERFECT!', great: 'GREAT!', good: 'GOOD', oops: 'OOPS…' },
      days: ['(1일차 편지 — 나중에 작성)', '(2일차 편지 — 나중에 작성)'],
      enclosed: { title: '동봉', items: '(준비물)' },
      fill: { done: '모두 완료!' },
      receipt: { title: '{손님}의 한 판', close: '클릭해서 닫기 ▶', like: '좋아하는 맛', dislike: '싫은 맛', fav: '좋아하는 메뉴', fresh: '새!' },
      faceName: { perfect: '완벽', tasty: '맛있음', meh: '어설픔', raw: '덜 익음', burnt: '탐', blank: '문어 없음' },
      menu: { title: '메뉴', fresh: '새 메뉴!' },
      tagSay: { 고소함: '고소한 게', 짭조름: '짭짤한 게', 단맛: '단 게', 시원함: '시원한 게', 새콤함: '새콤한 게', 매콤함: '매운 게', 감칠맛: '감칠맛이', 향긋함: '향긋한 게', 쫄깃함: '쫄깃한 게' },
      prep: { title: '준비', hint: '오늘 쓸 재료를 3개까지 고르세요', none: '오늘은 문어만', start: '영업 시작 ▶', max: 3 },
      shop: { title: '장보기', done: '장보기 끝 ▶', owned: '보유', today: '✓ 오늘 씀', base: '기본 재료' },
      result: { title: '결산 (임시)', funnyTitle: '오늘의 가장 웃긴 한 접시', aceTitle: '오늘의 에이스 한 접시', sign: '— 사장 드림' },
      funny: {
        noOcto: '문어 실종 사건', burnt: '숯불 특선 (주문한 적 없음)', raw: '반숙 타코야키, 신메뉴인가요?',
        sauce: '소스 온천에 몸 담근 타코야키', meh: '개성 넘치는 한 접시', ace: '이 정도면 사장보다 낫다',
      },
      reply: {
        great: '손님들이 또 온대. …문어는 내일도 네가 사 와. 수고했어!',
        ok: '첫날 치고 나쁘지 않네. 오늘은 푹 쉬어.',
        bad: '불판이 좀 놀랐겠지만, 내일은 더 잘할 거야. 수고했어.',
      },
    },
  };

  // 정해진 값 중 하나만 허용하는 항목
  const ALLOWED = {
    'timing.pour.soundSet': [1, 2, 3],
    'timing.pour.holdBeats': [1, 2, 3, 4],
  };

  function kind(v) {
    if (v === undefined) return 'undefined';
    if (v === null) return 'null';
    if (Array.isArray(v)) return 'array';
    if (typeof v === 'number') return Number.isFinite(v) ? 'number' : 'nan';
    return typeof v;
  }

  const KIND_NAME = {
    number: '숫자', string: '글자', boolean: '참/거짓', array: '목록', object: '묶음',
    undefined: '없음', null: '비어 있음', nan: '잘못된 숫자', function: '함수',
  };

  // "값이 없어서" / "값이 "abc"(글자)여서"
  function why(v) {
    const k = kind(v);
    if (k === 'undefined') return '없어서';
    if (k === 'object') return '묶음이어서';
    return `${JSON.stringify(v)}(${KIND_NAME[k] || k})여서`;
  }

  function clone(v) {
    return JSON.parse(JSON.stringify(v));
  }

  function walk(def, raw, path, warnings) {
    if (kind(def) === 'object') {
      if (kind(raw) !== 'object') {
        warnings.push(`${path} 묶음이 ${why(raw)} 기본값 전체를 씁니다`);
        return clone(def);
      }
      const out = {};
      for (const key of Object.keys(def)) {
        out[key] = walk(def[key], raw[key], path ? `${path}.${key}` : key, warnings);
      }
      // 기본값에 없는 항목(새 대사 장면, 새 손님 등)은 검사 없이 그대로 둔다
      for (const key of Object.keys(raw)) {
        if (!(key in def)) out[key] = clone(raw[key]);
      }
      return out;
    }
    if (kind(raw) !== kind(def)) {
      warnings.push(`${path} 값이 ${why(raw)} 기본값 ${JSON.stringify(def)}(으)로 진행합니다`);
      return clone(def);
    }
    const allowed = ALLOWED[path];
    if (allowed && !allowed.includes(raw)) {
      warnings.push(`${path} 값 ${JSON.stringify(raw)}은(는) ${allowed.join('·')} 중 하나여야 해서 기본값 ${JSON.stringify(def)}(으)로 진행합니다`);
      return clone(def);
    }
    return clone(raw);
  }

  function validate(raw) {
    const warnings = [];
    if (kind(raw) !== 'object') {
      warnings.push('data.js를 읽지 못해 전부 기본값으로 진행합니다');
      return { values: clone(DEFAULTS), warnings };
    }
    return { values: walk(DEFAULTS, raw, '', warnings), warnings };
  }

  function showBanner(warnings) {
    const box = document.getElementById('warn');
    if (!box) return;
    const list = box.querySelector('ul');
    list.innerHTML = '';
    for (const w of warnings) {
      const li = document.createElement('li');
      li.textContent = w;
      list.appendChild(li);
    }
    box.hidden = warnings.length === 0;
    box.querySelector('button').onclick = (e) => {
      e.stopPropagation();
      box.hidden = true;
    };
  }

  function load() {
    const { values, warnings } = validate(window.DATA);
    CFG = values;
    for (const w of warnings) console.warn('[data.js]', w);
    showBanner(warnings);
    return warnings;
  }

  // 실행 중에 찾은 데이터 문제도 같은 경고 상자에 덧붙인다
  function warn(msg) {
    console.warn('[data.js]', msg);
    const box = document.getElementById('warn');
    if (!box) return;
    const li = document.createElement('li');
    li.textContent = msg;
    box.querySelector('ul').appendChild(li);
    box.hidden = false;
  }

  return { load, validate, warn, DEFAULTS };
})();
