// 대화창 (T23): 화면 아래 비주얼노벨 창. 이름표 + 화자 아이콘(도형) + 한 글자씩 나오는 대사, 클릭으로 넘긴다.
// 대사는 data.js dialogue / letters, 화자는 data.js speakers → 없으면 customers.cast. (5단계 인터뷰 2026-10-10)
// 반쵸는 짧은 반응만 ("…", "음.", "?") — 아이콘 안 표정 글자로 보여준다. 9단계에 화자 icon 이미지로 바꿀 수 있다.
const Dialogue = (() => {
  // 배치 상수
  const BOX = { x: 40, y: 540, w: 1200, h: 165 };
  const ICON = { cx: 120, cy: 622, r: 58 };
  const TEXT = { x: 200, y: 600, w: 980, lineH: 34, size: 25 };
  const TYPE_MS = 28;       // 한 글자 나오는 간격 (제안)

  let root = null;
  let parts = null;         // { nameBg, name, iconBg, iconMark, iconImg, text, more }
  let lines = [];
  let idx = 0;
  let typing = null;        // { full: [줄...], shown, t0, raf }
  let done = null;

  function el(tag, attrs, parent) {
    return Board.el(tag, attrs, parent);
  }

  function init() {
    root = el('g', { display: 'none' }, Board.layer('ui'));
    // 화면 전체 클릭 받기 (뒤 불판 입력도 막는다)
    const catcher = el('rect', { x: 0, y: 0, width: 1280, height: 720, fill: 'transparent', 'pointer-events': 'all', cursor: 'pointer' }, root);
    catcher.addEventListener('pointerdown', (e) => { e.stopPropagation(); Sfx.unlock(); click(); });
    el('rect', { x: BOX.x, y: BOX.y, width: BOX.w, height: BOX.h, rx: 20, fill: '#fbf3e3', stroke: '#8a5a34', 'stroke-width': 5, 'pointer-events': 'none' }, root);
    const nameBg = el('rect', { x: BOX.x + 150, y: BOX.y - 22, width: 140, height: 40, rx: 12, 'pointer-events': 'none' }, root);
    const name = el('text', { x: BOX.x + 220, y: BOX.y - 2, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 22, 'font-weight': 900, fill: '#fffaf0', 'pointer-events': 'none' }, root);
    const iconBg = el('circle', { cx: ICON.cx, cy: ICON.cy, r: ICON.r, stroke: '#fffaf0', 'stroke-width': 5, 'pointer-events': 'none' }, root);
    const iconMark = el('text', {
      x: ICON.cx, y: ICON.cy, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 44, 'font-weight': 900, fill: '#fffaf0',
      'font-family': 'Segoe UI Emoji, Malgun Gothic, sans-serif', 'pointer-events': 'none',
    }, root);
    const iconImg = el('image', { x: ICON.cx - ICON.r, y: ICON.cy - ICON.r, width: ICON.r * 2, height: ICON.r * 2, display: 'none', 'pointer-events': 'none' }, root);
    const text = el('text', { x: TEXT.x, y: TEXT.y, 'font-size': TEXT.size, fill: '#3a2a1e', 'pointer-events': 'none' }, root);
    const more = el('text', { x: BOX.x + BOX.w - 110, y: BOX.y + BOX.h - 22, 'text-anchor': 'middle', 'font-size': 22, fill: '#c0661c', display: 'none', 'pointer-events': 'none' }, root);
    more.textContent = '▼';
    el('animate', { attributeName: 'opacity', values: '1;0.25;1', dur: '1s', repeatCount: 'indefinite' }, more); // 깜빡임
    parts = { nameBg, name, iconBg, iconMark, iconImg, text, more };
  }

  // 화자 해석: speakers → customers.cast. 없으면 경고 후 이름 없이
  function speaker(who) {
    const s = CFG.speakers[who];
    if (s) return { name: s.name, color: s.color, mark: s.mark, icon: s.icon };
    const c = CFG.customers.cast[who];
    if (c) return { name: c.name, color: c.color || '#4a6a8a', mark: c.emoji, icon: c.icon };
    Config.warn(`대사의 화자 "${who}"가 speakers에도 customers.cast에도 없습니다`);
    return { name: '', color: '#8a7460', mark: '' };
  }

  // lines: [{ who, text, mark? }]. 다 넘기면 then()
  function play(list, then) {
    lines = (list || []).filter((l) => l && typeof l.text === 'string');
    // 편지만 있으면 대화창 대신 화면 전체 편지로 (T47)
    if (lines.length && lines.every((l) => l.who === 'letter')) { Letter.play(lines.map((l) => l.text), then); return; }
    idx = 0;
    done = then;
    if (!lines.length) { finish(); return; }
    root.setAttribute('display', 'inline');
    show(lines[0]);
  }

  function show(line) {
    const s = speaker(line.who);
    parts.name.textContent = s.name;
    parts.nameBg.setAttribute('fill', s.color);
    parts.nameBg.setAttribute('display', s.name ? 'inline' : 'none');
    parts.iconBg.setAttribute('fill', s.color);
    parts.iconMark.textContent = line.mark || s.mark || '';
    parts.iconMark.setAttribute('font-size', [...(line.mark || s.mark || '')].length > 1 ? 34 : 50);
    if (s.icon) {
      parts.iconImg.setAttribute('href', s.icon);
      parts.iconImg.setAttribute('display', 'inline');
      parts.iconMark.setAttribute('display', 'none');
    } else {
      parts.iconImg.setAttribute('display', 'none');
      parts.iconMark.setAttribute('display', 'inline');
    }
    parts.more.setAttribute('display', 'none');
    const full = Board.richLines(parts.text, line.text, TEXT.w); // \n·창 폭으로 줄 나눔, "**강조**" (T47)
    if (typing && typing.raf) cancelAnimationFrame(typing.raf);
    typing = { full, total: full.reduce((a, ln) => a + ln.length, 0), shown: -1, t0: performance.now(), raf: 0 };
    typing.raf = requestAnimationFrame(type);
    Log.add({ step: '대사', who: line.who, line: `대사 | ${s.name || line.who}: ${Board.plain(line.text).replace(/\n/g, ' ')}` });
  }

  function render(count) {
    Board.richRender(parts.text, typing.full, count, TEXT.x, TEXT.lineH);
  }

  function type(now) {
    typing.raf = 0;
    const n = Math.min(typing.total, Math.floor((now - typing.t0) / TYPE_MS) + 1);
    if (n !== typing.shown) { typing.shown = n; render(n); }
    if (n < typing.total) typing.raf = requestAnimationFrame(type);
    else parts.more.setAttribute('display', 'inline');
  }

  function click() {
    if (!typing) return;
    if (typing.shown < typing.total) {
      // 나오는 중 → 한 번에 다
      if (typing.raf) cancelAnimationFrame(typing.raf);
      typing.raf = 0;
      typing.shown = typing.total;
      render(typing.total);
      parts.more.setAttribute('display', 'inline');
      return;
    }
    idx++;
    if (idx < lines.length) show(lines[idx]);
    else finish();
  }

  function finish() {
    if (typing && typing.raf) cancelAnimationFrame(typing.raf);
    typing = null;
    root.setAttribute('display', 'none');
    const then = done;
    done = null;
    if (then) then();
  }

  return { init, play, busy: () => !!typing };
})();
