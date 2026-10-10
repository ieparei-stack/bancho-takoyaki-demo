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
      box: { flickPx: 30, flickMs: 300, coneDeg: 60, flyMs: 350 },
      topping: { boatScale: 1.6, sauceWidth: 7, flakeEveryPx: 18, flakeMax: 400, handoffY: 170 },
      stage: { bannerMs: 1200, perfect: 11, great: 8, good: 4 },
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
    customers: {
      day1: 2,
      leaveMs: 2000,
      list: [
        { emoji: '🧑', order: '타코야키 하나요!' },
        { emoji: '👵', order: '하나 줘요~' },
      ],
      price: { perfect: 800, tasty: 600, meh: 300, raw: 0, burnt: 0, blank: 0 },
      rules: { burnt: 2, fails: 3, perfect: 4, saucePx: 2500, goodSales: 2400 },
      reactions: {
        noOcto: { emoji: '🤨', line: '어… 이건 문어가 어디 갔죠?', satisfied: false },
        burnt: { emoji: '😵', line: '음… 숯불 향이 진하네요…', satisfied: false },
        raw: { emoji: '😰', line: '이거… 다 익은 거 맞죠?', satisfied: false },
        great: { emoji: '😋', line: '와, 겉바속촉! 또 올게요!', satisfied: true },
        sauce: { emoji: '😅', line: '소스… 좋아하시나 봐요?', satisfied: true },
        good: { emoji: '🙂', line: '맛있네요, 잘 먹을게요!', satisfied: true },
        meh: { emoji: '😐', line: '음, 잘 먹을게요.', satisfied: false },
      },
    },
    day: {},
    letters: {
      grade: { perfect: 'PERFECT!', great: 'GREAT!', good: 'GOOD', oops: 'OOPS…' },
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

  return { load, validate, DEFAULTS };
})();
