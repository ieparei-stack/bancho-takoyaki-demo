// data.js 로더. 게임은 window.DATA를 직접 읽지 않고 검증을 거친 CFG만 읽는다.
// 값이 빠지거나 타입이 틀리면 기본값으로 바꾸고 화면에 경고를 띄운다. (CLAUDE.md 3-1)
let CFG = null;

const Config = (() => {
  // data.js와 같은 구조. 값이 잘못됐을 때만 쓰인다.
  const DEFAULTS = {
    timing: {
      pour: { targetMs: 1000, perfectMs: 50, goodMs: 120, autoStopMs: 120 },
    },
    faces: {},
    customers: {},
    day: {},
    letters: {},
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
