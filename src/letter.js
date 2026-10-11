// 화면 전체 편지 (T47, 사용자 2026-10-11): 화면이 어두워지고, 받는 이("반쵸군에게.") 아래로 한 장씩 글자가 찬다.
// 클릭 = 지금 장 전체 표시 / 다음 장. 장은 아래로 쌓이고, 화면이 다 차면 새 종이로. 문구는 data.js letters.days / dialogue night3
const Letter = (() => {
  const DIM = 0.88;          // 어둡게 (0~1)
  const FADE_MS = 600;       // 어두워지기·밝아지기
  const TYPE_MS = 40;        // 한 글자 나오는 간격 — 대화창(28)보다 천천히 (제안)
  const TEXT = { x: 170, w: 940, size: 30, lineH: 48 };
  const HEAD_Y = 140;        // 받는 이 줄
  const BODY_Y = 230;        // 첫 장 첫 줄
  const GAP = 30;            // 장 사이 간격
  const BOTTOM = 650;        // 이 아래로 넘치면 새 종이
  const INK = '#f3e6c8';
  const EM = { fill: '#ffb347', 'font-weight': 900 };
  const FONT = "'Nanum Myeongjo', Batang, 'Malgun Gothic', serif";

  let root = null;
  let dim = null;
  let head = null;
  let body = null;           // 장들이 쌓이는 그룹
  let more = null;
  let pages = [];
  let idx = 0;
  let y = BODY_Y;            // 다음 장이 시작할 첫 줄 y
  let typing = null;         // { node, full, total, shown, t0, raf }
  let done = null;
  let busy = false;          // 페이드 중엔 클릭 무시

  function el(tag, attrs, parent) {
    return Board.el(tag, attrs, parent);
  }

  function init() {
    root = el('g', { display: 'none' }, Board.layer('ui'));
    dim = el('rect', { x: 0, y: 0, width: 1280, height: 720, fill: '#000', opacity: 0, 'pointer-events': 'all', cursor: 'pointer' }, root);
    dim.addEventListener('pointerdown', (e) => { e.stopPropagation(); Sfx.unlock(); click(); });
    head = el('text', { x: TEXT.x, y: HEAD_Y, 'font-size': 36, 'font-weight': 700, fill: INK, 'font-family': FONT, 'pointer-events': 'none' }, root);
    body = el('g', { 'pointer-events': 'none' }, root);
    more = el('text', { x: 1150, y: 690, 'text-anchor': 'middle', 'font-size': 24, fill: INK, display: 'none', 'pointer-events': 'none' }, root);
    more.textContent = '▼';
    el('animate', { attributeName: 'opacity', values: '1;0.25;1', dur: '1s', repeatCount: 'indefinite' }, more);
  }

  // texts: ['한 장', ...]. 다 읽으면 then()
  function play(texts, then) {
    if (!root) init();
    pages = texts.map(String);
    idx = 0;
    done = then;
    body.replaceChildren();
    y = BODY_Y;
    head.textContent = (CFG.letters && CFG.letters.letterTo) || '반쵸군에게.';
    head.setAttribute('opacity', 0);
    more.setAttribute('display', 'none');
    root.setAttribute('display', 'inline');
    busy = true;
    fade(0, 1, () => { busy = false; show(); });
  }

  // 어둡게 u: 0 → 1 (글자도 같이)
  function fade(from, to, then) {
    const t0 = performance.now();
    const step = (now) => {
      const u = Math.min(1, (now - t0) / FADE_MS);
      const k = from + (to - from) * u;
      dim.setAttribute('opacity', (k * DIM).toFixed(3));
      head.setAttribute('opacity', k.toFixed(3));
      body.setAttribute('opacity', to < from ? k.toFixed(3) : 1);
      if (u < 1) requestAnimationFrame(step); else then();
    };
    requestAnimationFrame(step);
  }

  function show() {
    const text = pages[idx];
    const node = el('text', { 'font-size': TEXT.size, fill: INK, 'font-family': FONT, y }, body);
    const full = Board.richLines(node, text, TEXT.w);
    // 넘치면 새 종이 (앞 장들을 지우고 맨 위부터)
    if (y > BODY_Y && y + (full.length - 1) * TEXT.lineH > BOTTOM) {
      body.replaceChildren(node);
      y = BODY_Y;
      node.setAttribute('y', y);
    }
    y += full.length * TEXT.lineH + GAP;
    more.setAttribute('display', 'none');
    typing = { node, full, total: full.reduce((a, ln) => a + ln.length, 0), shown: -1, t0: performance.now(), raf: 0 };
    typing.raf = requestAnimationFrame(type);
    Log.add({ step: '편지', page: idx + 1, line: `편지 ${idx + 1}/${pages.length} | ${Board.plain(text).replace(/\n/g, ' ')}` });
  }

  function render(n) {
    Board.richRender(typing.node, typing.full, n, TEXT.x, TEXT.lineH, EM);
  }

  function type(now) {
    typing.raf = 0;
    const n = Math.min(typing.total, Math.floor((now - typing.t0) / TYPE_MS) + 1);
    if (n !== typing.shown) { typing.shown = n; render(n); }
    if (n < typing.total) typing.raf = requestAnimationFrame(type);
    else more.setAttribute('display', 'inline');
  }

  function click() {
    if (busy || !typing) return;
    if (typing.shown < typing.total) {
      if (typing.raf) cancelAnimationFrame(typing.raf);
      typing.raf = 0;
      typing.shown = typing.total;
      render(typing.total);
      more.setAttribute('display', 'inline');
      return;
    }
    idx++;
    if (idx < pages.length) { show(); return; }
    typing = null;
    more.setAttribute('display', 'none');
    busy = true;
    fade(1, 0, () => {
      busy = false;
      root.setAttribute('display', 'none');
      const then = done;
      done = null;
      if (then) then();
    });
  }

  return { init, play, busy: () => !!typing };
})();
