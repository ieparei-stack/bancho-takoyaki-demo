// ② 재료 넣기 확장 (T27): 재료판의 추가 재료를 구멍마다 자유롭게 넣는다. 한 알에 여러 재료, 같은 재료는 한 번만, 재고 무한.
// 끝나는 조건(먼저 오는 것): 시간 바가 다 줄어듦 / "모두 완료!" / 1일차만 문어 6개를 다 씀. (사용자 결정 2026-10-11)
// 넣은 재료는 hole.ings(Set)에 기록 — T29 메뉴 판정의 입력. 그림은 data-chunk라 1차 뒤집기 때 숨는다.
const Fill = (() => {
  // 배치 상수
  const BAR = { x: 256, y: 220, w: 22, h: 320 };   // 불판 왼쪽 세로 시간 바
  const BTN = { cx: 950, cy: 535, w: 190, h: 46 }; // 재료판 아래
  const ITEM_R = 14;                                // 구멍 안 재료 조각 크기
  const SPOTS = [[-28, 20], [28, 20], [0, 34], [-36, -8], [36, -8]]; // 구멍 안 추가 재료 자리 (눈을 피해 아래·양옆)

  let ui = null;
  let fillBar = null;
  let running = null;   // { t0, limit, raf }
  let drag = null;      // { id, el }

  function init() {
    for (const h of Board.holes) h.ings = new Set();
    const side = Board.layer('side');
    ui = Board.el('g', { display: 'none' }, side);
    Board.el('rect', { x: BAR.x - 4, y: BAR.y - 4, width: BAR.w + 8, height: BAR.h + 8, rx: 10, fill: '#5e3d22' }, ui);
    Board.el('rect', { x: BAR.x, y: BAR.y, width: BAR.w, height: BAR.h, rx: 7, fill: '#2c1f17' }, ui);
    fillBar = Board.el('rect', { x: BAR.x, y: BAR.y, width: BAR.w, height: BAR.h, rx: 7, fill: '#e0a457' }, ui);
    const btn = Board.el('g', { cursor: 'pointer' }, ui);
    Board.el('rect', { x: BTN.cx - BTN.w / 2, y: BTN.cy - BTN.h / 2, width: BTN.w, height: BTN.h, rx: 14, fill: '#c0661c', stroke: '#7a3e12', 'stroke-width': 2 }, btn);
    const t = Board.el('text', { x: BTN.cx, y: BTN.cy, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 22, 'font-weight': 900, fill: '#fffaf0' }, btn);
    t.textContent = CFG.letters.fill.done;
    btn.addEventListener('pointerdown', (e) => { e.stopPropagation(); if (Stage.is('octopus')) finish('완료'); });

    // 재료판 추가 칸에서 조각 집기 (무한)
    Board.layer('side').addEventListener('pointerdown', pick);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', drop);
    Stage.onEnter('octopus', start);
  }

  // ── 시간 ───────────────────────────────────────────────

  function limitMs() {
    const L = CFG.timing.fill.limitMs;
    return L[Math.min(Flow.day(), L.length) - 1];
  }

  function start() {
    ui.setAttribute('display', 'inline');
    running = { t0: performance.now(), limit: limitMs(), raf: 0 };
    running.raf = requestAnimationFrame(tick);
  }

  function tick(now) {
    if (!running) return;
    const u = Math.min(1, (now - running.t0) / running.limit);
    const h = BAR.h * (1 - u);
    fillBar.setAttribute('y', (BAR.y + BAR.h - h).toFixed(1));
    fillBar.setAttribute('height', h.toFixed(1));
    fillBar.setAttribute('fill', u > 0.75 ? '#d8433a' : '#e0a457'); // 얼마 안 남으면 빨강
    if (u >= 1) { finish('시간'); return; }
    running.raf = requestAnimationFrame(tick);
  }

  // 1일차만 문어를 다 쓰면 끝 (octopus.js가 부른다)
  function octopusDone() {
    if (CFG.timing.fill.endOnOctopusDays.includes(Flow.day())) finish('문어 다 씀');
  }

  function finish(reason) {
    if (!running || !Stage.is('octopus')) return;
    cancelAnimationFrame(running.raf);
    running = null;
    ui.setAttribute('display', 'none');
    if (drag) { drag.el.remove(); drag = null; DropGuide.hide(); }
    const names = (h) => [...h.ings].map((id) => CFG.ingredients[id].name).join(' · ') || '(없음)';
    Log.add({
      step: '재료 끝', reason, ings: Board.holes.map((h) => [...h.ings]),
      line: `── ② 재료 끝 (${reason}) | ` + Board.holes.map((h) => `#${h.id + 1} ${names(h)}`).join(' / '),
    });
    const s = Octopus.scores().slice(0, 6);
    while (s.length < 6) s.push(0); // 못 넣은 문어는 0점
    Stage.complete('octopus', s);
  }

  // ── 추가 재료 끌기 ──────────────────────────────────────

  function pick(e) {
    if (drag || e.button !== 0 || !Stage.is('octopus')) return;
    const p = Board.toSvg(e);
    const id = Tray.extraAt(p.x, p.y);
    if (!id) return;
    e.stopPropagation();
    Sfx.unlock();
    const el = Board.el('g', {}, Board.layer('drag'));
    Shop.icon(id, el, 0, 0, ITEM_R * 1.3);
    drag = { id, el };
    DropGuide.show((h) => h.hasBatter && !h.ings.has(id)); // 놓을 자리 (T42)
    follow(p);
  }

  function follow(p) {
    drag.el.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
    DropGuide.move(p);
  }

  function move(e) {
    if (drag) follow(Board.toSvg(e));
  }

  function drop(e) {
    if (!drag) return;
    const { id, el } = drag;
    drag = null;
    DropGuide.hide();
    el.remove();
    const p = Board.toSvg(e);
    const hole = Board.holeAt(p.x, p.y);
    if (!hole || !hole.hasBatter) return; // 무한이라 그냥 사라진다
    const name = CFG.ingredients[id].name;
    if (hole.ings.has(id)) {
      Sfx.hmm(); // 같은 재료는 한 번만
      Log.add({ step: '재료', hole: hole.id + 1, id, refused: true, line: `재료 #${hole.id + 1} | ${name} 이미 있음` });
      return;
    }
    hole.ings.add(id);
    const extras = [...hole.ings].filter((x) => x !== 'octopus').length;
    const [dx, dy] = SPOTS[(extras - 1) % SPOTS.length];
    const chunk = Board.el('g', { 'data-chunk': '1' }, hole.octo);
    Shop.icon(id, chunk, hole.cx + dx, hole.cy + dy, ITEM_R);
    Sfx.plop(false);
    Log.add({ step: '재료', hole: hole.id + 1, id, ings: [...hole.ings], line: `재료 #${hole.id + 1} | ${name} 넣음 | ${[...hole.ings].map((x) => CFG.ingredients[x].name).join(' · ')}` });
  }

  function reset() {
    if (running) { cancelAnimationFrame(running.raf); running = null; }
    ui.setAttribute('display', 'none');
    for (const h of Board.holes) h.ings.clear();
  }

  return { init, finish, octopusDone, reset, busy: () => !!drag };
})();
