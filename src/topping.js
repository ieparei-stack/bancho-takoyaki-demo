// ⑥ 토핑·건네기 (T15): 소스통과 가쓰오부시 통을 집어 원하는 만큼 뿌리고, 후네를 화면 위(손님 쪽)로 끌어 건네면 한 판이 끝난다.
// 등급 없음, 연출만. 많이 뿌리면 소스·가쓰오부시가 많아 보일 뿐이다. (사용자 결정 2026-10-10)
const Topping = (() => {
  // 배치 상수 (문어 접시 자리)
  const SAUCE_HOME = { x: 960, y: 300 };
  const FLAKE_HOME = { x: 960, y: 480 };
  const SAUCE = { color: '#5a2a14', shine: '#8a4a2a' };
  const FLAKE_COLORS = ['#e9b08f', '#d99a76', '#f0c3a6', '#c98868'];
  const PATH_POINTS = 600;   // 소스 path 하나의 점 상한 (넘으면 새 path)
  const SQUIRT_EVERY = 60;   // 이만큼 그릴 때마다 "쭉"
  const FLAKE_SOUND_EVERY = 4;

  let tools = null;          // { sauce, flake } 각각 { g, home }
  let layers = null;         // 후네 안: { clip, sauce, flakes }
  let held = null;           // { kind, last: {x,y}, acc, path, pts, sinceSquirt }
  let carry = null;          // 후네 끌기 { dx, dy }
  let sauceLen = 0;
  let flakes = [];           // { el, x, y, rot }
  let flutterRaf = 0;
  let done = false;

  function init() {
    const side = Board.layer('side');
    tools = {
      sauce: { g: Board.el('g', { display: 'none', cursor: 'grab' }, side), home: SAUCE_HOME },
      flake: { g: Board.el('g', { display: 'none', cursor: 'grab' }, side), home: FLAKE_HOME },
    };
    drawSauceBottle(tools.sauce.g);
    drawFlakeBox(tools.flake.g);
    for (const kind of ['sauce', 'flake']) {
      rest(kind);
      tools[kind].g.addEventListener('pointerdown', (e) => pick(kind, e));
    }

    // 후네 안 토핑 층: 공 위에 소스(후네 모양으로 잘라냄), 그 위에 가쓰오부시
    const g = Box.g;
    const clip = Board.el('clipPath', { id: 'boat-clip' }, g);
    Board.el('path', { d: Box.OUTLINE }, clip);
    layers = {
      sauce: Board.el('g', { 'clip-path': 'url(#boat-clip)' }, g),
      flakes: Board.el('g', { 'clip-path': 'url(#boat-clip)' }, g),
    };
    g.addEventListener('pointerdown', grabBoat);

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    Stage.onEnter('topping', enter);
  }

  // 소스통: 노즐 끝이 (0,0), 몸통은 위. 놓여 있을 때는 뒤집어 세운다
  function drawSauceBottle(g) {
    Board.el('path', { d: 'M -5 -16 L 0 0 L 5 -16 Z', fill: '#d8d0c4', stroke: '#9b9184', 'stroke-width': 1.5 }, g);
    Board.el('rect', { x: -12, y: -30, width: 24, height: 14, rx: 3, fill: '#c8372d', stroke: '#8e231c', 'stroke-width': 2 }, g);
    Board.el('rect', { x: -24, y: -118, width: 48, height: 90, rx: 16, fill: '#6b3a1f', stroke: '#3f2111', 'stroke-width': 3 }, g);
    Board.el('rect', { x: -16, y: -100, width: 32, height: 34, rx: 6, fill: '#f3e6c4' }, g);
    Board.el('path', { d: 'M -10 -80 q 10 -10 20 0', fill: 'none', stroke: '#6b3a1f', 'stroke-width': 3, 'stroke-linecap': 'round' }, g);
    Board.el('rect', { x: -18, y: -112, width: 6, height: 70, rx: 3, fill: '#8a5230', opacity: 0.7 }, g);
  }

  // 가쓰오부시 통: 아랫변 가운데가 (0,0)
  function drawFlakeBox(g) {
    Board.el('rect', { x: -40, y: -56, width: 80, height: 56, rx: 6, fill: '#c79a5e', stroke: '#8c6534', 'stroke-width': 3 }, g);
    Board.el('rect', { x: -40, y: -56, width: 80, height: 12, rx: 4, fill: '#b3864c' }, g);
    for (let i = 0; i < 9; i++) {
      const x = -30 + (i % 5) * 15 + (i > 4 ? 7 : 0);
      const y = -40 + (i > 4 ? 18 : 4);
      flakeShape(g, x, y, (i * 47) % 180, FLAKE_COLORS[i % FLAKE_COLORS.length], 1.3);
    }
  }

  function flakeShape(parent, x, y, rot, color, k = 1) {
    return Board.el('path', {
      d: `M ${-6 * k} ${-3 * k} L ${5 * k} ${-4 * k} L ${6 * k} ${3 * k} L ${-5 * k} ${4 * k} Z`,
      fill: color, stroke: '#b26f52', 'stroke-width': 0.6, opacity: 0.95,
      transform: `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(0)})`,
    }, parent);
  }

  function rest(kind) {
    const t = tools[kind];
    Board.layer('side').appendChild(t.g);
    const rot = kind === 'sauce' ? ' rotate(180)' : '';
    const dy = kind === 'sauce' ? -60 : 28; // 놓인 자리 보정
    t.g.setAttribute('transform', `translate(${t.home.x} ${t.home.y + dy})${rot}`);
    t.g.setAttribute('cursor', 'grab');
  }

  function enter() {
    done = false;
    for (const kind of ['sauce', 'flake']) {
      rest(kind);
      tools[kind].g.setAttribute('display', 'inline');
    }
  }

  function pick(kind, e) {
    if (!Stage.is('topping') || held || carry || e.button !== 0) return;
    e.stopPropagation();
    Sfx.unlock();
    const p = Board.toSvg(e);
    held = { kind, last: p, acc: 0, path: null, pts: 0, sinceSquirt: 0, flakeCount: 0 };
    Board.layer('drag').appendChild(tools[kind].g);
    follow(p);
  }

  function follow(p) {
    const tilt = held.kind === 'flake' ? ' rotate(-12)' : '';
    tools[held.kind].g.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})${tilt}`);
  }

  // 후네 안(외곽 타원 근사)인가
  function inBoat(q) {
    return Math.abs(q.x) <= 128 && Math.abs(q.y) <= 58 * Math.sqrt(Math.max(0, 1 - (q.x / 140) ** 2)) + 6;
  }

  function move(e) {
    if (carry) { moveBoat(e); return; }
    if (!held) return;
    const p = Board.toSvg(e);
    follow(p);
    const step = Math.hypot(p.x - held.last.x, p.y - held.last.y);
    held.last = p;
    const q = Box.toBoat(p.x, p.y);
    if (held.kind === 'sauce') drawSauce(q, step);
    else dropFlakes(q, step);
  }

  function drawSauce(q, step) {
    const T = CFG.timing.topping;
    if (!inBoat(q)) { held.path = null; return; } // 후네 밖에서는 끊긴다
    if (!held.path || held.pts >= PATH_POINTS) {
      const d = `M ${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
      held.path = {
        base: Board.el('path', { d, fill: 'none', stroke: SAUCE.color, 'stroke-width': T.sauceWidth, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, layers.sauce),
        shine: Board.el('path', { d, fill: 'none', stroke: SAUCE.shine, 'stroke-width': T.sauceWidth * 0.3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0.8, transform: 'translate(-1 -1.5)' }, layers.sauce),
        d,
      };
      held.pts = 1;
      return;
    }
    held.path.d += ` L ${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
    held.path.base.setAttribute('d', held.path.d);
    held.path.shine.setAttribute('d', held.path.d);
    held.pts++;
    sauceLen += step;
    held.sinceSquirt += step;
    if (held.sinceSquirt >= SQUIRT_EVERY) { held.sinceSquirt = 0; Sfx.squirt(); }
  }

  function dropFlakes(q, step) {
    const T = CFG.timing.topping;
    if (!inBoat(q)) return;
    held.acc += step;
    while (held.acc >= T.flakeEveryPx && flakes.length < T.flakeMax) {
      held.acc -= T.flakeEveryPx;
      const x = q.x + (Math.random() * 2 - 1) * 14;
      const y = q.y + (Math.random() * 2 - 1) * 14;
      const rot = Math.random() * 180;
      const el = flakeShape(layers.flakes, x, y, rot, FLAKE_COLORS[Math.floor(Math.random() * FLAKE_COLORS.length)], 0.9 + Math.random() * 0.5);
      flakes.push({ el, x, y, rot, k: 0 });
      if (++held.flakeCount % FLAKE_SOUND_EVERY === 0) Sfx.flake();
    }
    if (!flutterRaf && flakes.length) flutterRaf = requestAnimationFrame(flutter);
  }

  // 불판 열기에 하늘하늘 (세 조각에 하나만 움직인다)
  function flutter(now) {
    flutterRaf = 0;
    for (let i = 0; i < flakes.length; i += 3) {
      const f = flakes[i];
      const r = f.rot + Math.sin(now / 260 + i) * 9;
      f.el.setAttribute('transform', `translate(${f.x.toFixed(1)} ${f.y.toFixed(1)}) rotate(${r.toFixed(0)})`);
    }
    if (flakes.length) flutterRaf = requestAnimationFrame(flutter);
  }

  function release(e) {
    if (carry) { dropBoat(e); return; }
    if (!held) return;
    const kind = held.kind;
    held = null;
    rest(kind);
  }

  // ── 건네기 ─────────────────────────────────────────────

  function grabBoat(e) {
    if (!Stage.is('topping') || held || carry || e.button !== 0) return;
    e.stopPropagation();
    const p = Board.toSvg(e);
    const b = Box.pos;
    carry = { dx: b.x - p.x, dy: b.y - p.y };
    Box.g.setAttribute('cursor', 'grabbing');
  }

  function moveBoat(e) {
    const p = Board.toSvg(e);
    Box.setPose(p.x + carry.dx, p.y + carry.dy);
  }

  function dropBoat() {
    carry = null;
    Box.g.removeAttribute('cursor');
    const b = Box.pos;
    if (b.y < CFG.timing.topping.handoffY) handoff(b);
    else slide(b, Box.WORK, 200);
  }

  function slide(from, to, ms, then) {
    const t0 = performance.now();
    const step = (now) => {
      const u = Math.min(1, (now - t0) / ms);
      const e = 1 - (1 - u) * (1 - u);
      Box.setPose(from.x + (to.x - from.x) * e, from.y + (to.y - from.y) * e);
      if (u < 1) requestAnimationFrame(step);
      else if (then) then();
    };
    requestAnimationFrame(step);
  }

  // 손님 쪽(화면 위)으로 나간다 → 한 판 끝
  function handoff(b) {
    if (done) return;
    done = true;
    for (const kind of ['sauce', 'flake']) tools[kind].g.setAttribute('display', 'none');
    const start = Pour.roundStart();
    const totalMs = Math.round(performance.now() - (start ?? performance.now()));
    Log.add({
      step: '한 판 완료', sauceLen: Math.round(sauceLen), flakes: flakes.length, totalMs,
      line: `── 한 판 완료 | 소스 ${Math.round(sauceLen)} px · 가쓰오부시 ${flakes.length}조각 | 총 ${(totalMs / 1000).toFixed(1)} s (1번 짜기 → 건네기)`,
    });
    // 결산(T20) "웃긴 실패 후네 통째로"용 복제
    const boat = Box.g.cloneNode(true);
    const faces = Board.holes.map((h) => h.final);
    const ings = Board.holes.map((h) => [...h.ings]); // 알별 재료 (T29 메뉴 판정)
    const cook = Board.holes.map((h) => ({ f1: h.flip1 ? h.flip1.result : null, f2: h.flip2 ? h.flip2.result : null })); // 알별 뒤집기 결과 (T43 후기 원인)
    const sp = Customer.spot;
    const to = { x: sp.x, y: sp.y + 25, z: 0.35 };
    const t0 = performance.now();
    const step = (now) => {
      const u = Math.min(1, (now - t0) / 350);
      const e = 1 - (1 - u) * (1 - u);
      Box.setPose(b.x + (to.x - b.x) * e, b.y + (to.y - b.y) * e, b.zoom + (to.z - b.zoom) * e);
      Box.setOpacity(1 - u * u);
      if (u < 1) { requestAnimationFrame(step); return; }
      Box.g.setAttribute('display', 'none');
      Customer.serve({ faces, ings, cook, sauceLen: Math.round(sauceLen), flakes: flakes.length, boat });
      Stage.complete('topping', null);
    };
    requestAnimationFrame(step);
  }

  function reset() {
    held = null;
    carry = null;
    done = false;
    sauceLen = 0;
    flakes = [];
    if (flutterRaf) { cancelAnimationFrame(flutterRaf); flutterRaf = 0; }
    layers.sauce.replaceChildren();
    layers.flakes.replaceChildren();
    for (const kind of ['sauce', 'flake']) {
      rest(kind);
      tools[kind].g.setAttribute('display', 'none');
    }
  }

  return { init, reset, busy: () => !!(held || carry) };
})();
