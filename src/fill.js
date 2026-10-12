// ② 재료 넣기 확장 (T27): 재료판의 추가 재료를 구멍마다 자유롭게 넣는다. 한 알에 여러 재료, 같은 재료는 한 번만, 재고 무한.
// 끝나는 조건(먼저 오는 것): 시간 바가 다 줄어듦 / "모두 완료!". 문어를 다 쓰면 버튼이 빛나기만 한다 (T50, 사용자 2026-10-11)
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
  let btn = null;       // "모두 완료!" 버튼
  let btnGlow = null;
  let glow = null;      // { t0, raf } — 문어를 다 써서 버튼이 두근거리는 중
  let mass = true;      // 한꺼번에 넣기 스위치 (T53, 도구를 샀을 때만 보인다. 켜고 끈 상태는 다음 판에도)
  let massG = null;
  let massText = null;

  function init() {
    for (const h of Board.holes) h.ings = new Set();
    const side = Board.layer('side');
    ui = Board.el('g', { display: 'none' }, side);
    Board.el('rect', { x: BAR.x - 4, y: BAR.y - 4, width: BAR.w + 8, height: BAR.h + 8, rx: 10, fill: '#5e3d22' }, ui);
    Board.el('rect', { x: BAR.x, y: BAR.y, width: BAR.w, height: BAR.h, rx: 7, fill: '#2c1f17' }, ui);
    fillBar = Board.el('rect', { x: BAR.x, y: BAR.y, width: BAR.w, height: BAR.h, rx: 7, fill: '#e0a457' }, ui);
    btn = Board.el('g', { cursor: 'pointer' }, ui);
    // 문어를 다 쓰면 켜지는 빛 테두리 (T50)
    btnGlow = Board.el('rect', { x: BTN.cx - BTN.w / 2 - 10, y: BTN.cy - BTN.h / 2 - 10, width: BTN.w + 20, height: BTN.h + 20, rx: 22, fill: '#ffd34d', opacity: 0.8, stroke: '#fff6c8', 'stroke-width': 4, display: 'none' }, btn);
    Board.el('rect', { x: BTN.cx - BTN.w / 2, y: BTN.cy - BTN.h / 2, width: BTN.w, height: BTN.h, rx: 14, fill: '#c0661c', stroke: '#7a3e12', 'stroke-width': 2 }, btn);
    const t = Board.el('text', { x: BTN.cx, y: BTN.cy, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 22, 'font-weight': 900, fill: '#fffaf0' }, btn);
    t.textContent = CFG.letters.fill.done;
    // 한꺼번에 넣기 스위치 (T53): "모두 완료!" 아래
    massG = Board.el('g', { cursor: 'pointer', display: 'none' }, ui);
    Board.el('rect', { x: BTN.cx - BTN.w / 2, y: BTN.cy + BTN.h / 2 + 10, width: BTN.w, height: 34, rx: 17, fill: 'rgba(15,10,8,0.55)', stroke: '#e0a457', 'stroke-width': 2 }, massG);
    massText = Board.el('text', { x: BTN.cx, y: BTN.cy + BTN.h / 2 + 28, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 15, 'font-weight': 700, fill: '#f3e6d6' }, massG);
    massG.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      Sfx.unlock();
      mass = !mass;
      Sfx.tick();
      paintMass();
      Log.add({ step: '재료', line: `한꺼번에 넣기 ${mass ? '켬' : '끔'}` });
    });
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

  function massOn() {
    return Tools.has('fillAll') && mass;
  }

  function paintMass() {
    const T = CFG.letters.tools;
    massG.setAttribute('display', Tools.has('fillAll') ? 'inline' : 'none');
    massText.textContent = mass ? T.massOn : T.massOff;
    massText.setAttribute('fill', mass ? '#ffd34d' : '#b9a88a');
  }

  function start() {
    ui.setAttribute('display', 'inline');
    paintMass();
    stopGlow();
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

  // 문어를 다 쓰면: 끝내지 않고 "모두 완료!" 버튼이 빛나며 두근거린다 — 버튼을 눌러야 끝 (T50 사용자: 문어 → 잣 순서로도 넣을 수 있게)
  function octopusDone() {
    if (!running || glow) return;
    glow = { t0: performance.now(), raf: 0 };
    btnGlow.setAttribute('display', 'inline');
    Sfx.tick();
    const step = (now) => {
      if (!glow) return;
      const u = ((now - glow.t0) % 900) / 900;
      const k = 1 + 0.09 * Math.sin(u * Math.PI * 2);
      btn.setAttribute('transform', `translate(${BTN.cx} ${BTN.cy}) scale(${k.toFixed(3)}) translate(${-BTN.cx} ${-BTN.cy})`);
      btnGlow.setAttribute('opacity', (0.75 + 0.25 * Math.sin(u * Math.PI * 2)).toFixed(3));
      glow.raf = requestAnimationFrame(step);
    };
    glow.raf = requestAnimationFrame(step);
    Log.add({ step: '재료', line: '문어 다 씀 → "모두 완료!" 버튼 강조' });
  }

  function stopGlow() {
    if (glow) cancelAnimationFrame(glow.raf);
    glow = null;
    btn.removeAttribute('transform');
    btnGlow.setAttribute('display', 'none');
  }

  function finish(reason) {
    if (!running || !Stage.is('octopus')) return;
    // 그날 그 판에 꼭 넣어야 하는 재료 (T45: 1일차 2판 잣) — 없으면 손님이 끼어들고 끝나지 않는다
    const req = Flow.today().require;
    if (req && req.round === Flow.round() && !Board.holes.some((h) => h.ings.has(req.ing))) {
      Customer.say(req.line);
      Sfx.hmm();
      running.t0 = performance.now(); // 시간 바 다시
      Log.add({ step: '재료', refused: true, reason, line: `재료 끝 막힘 (${reason}) — ${CFG.ingredients[req.ing].name} 없음` });
      return;
    }
    cancelAnimationFrame(running.raf);
    running = null;
    ui.setAttribute('display', 'none');
    stopGlow();
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
    addTo(hole, id);
    // 한꺼번에 넣기 (T53): 반죽 있고 그 재료가 없는 나머지 구멍에도
    if (massOn()) for (const h of Board.holes) if (h !== hole && h.hasBatter && !h.ings.has(id)) addTo(h, id, true);
  }

  function addTo(hole, id, quiet) {
    const name = CFG.ingredients[id].name;
    hole.ings.add(id);
    const extras = [...hole.ings].filter((x) => x !== 'octopus').length;
    const [dx, dy] = SPOTS[(extras - 1) % SPOTS.length];
    const chunk = Board.el('g', { 'data-chunk': '1' }, hole.octo);
    Shop.icon(id, chunk, hole.cx + dx, hole.cy + dy, ITEM_R);
    if (!quiet) Sfx.plop(false);
    Log.add({ step: '재료', hole: hole.id + 1, id, ings: [...hole.ings], line: `재료 #${hole.id + 1} | ${name} 넣음 | ${[...hole.ings].map((x) => CFG.ingredients[x].name).join(' · ')}` });
  }

  function reset() {
    if (running) { cancelAnimationFrame(running.raf); running = null; }
    ui.setAttribute('display', 'none');
    stopGlow();
    for (const h of Board.holes) h.ings.clear();
  }

  return { init, finish, octopusDone, reset, massOn, busy: () => !!drag };
})();
