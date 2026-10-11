// ⑤ 후네 담기 (T14): 후네(배 모양 종이 상자)가 마우스가 올라간 구멍 옆(불판 가장자리 바깥)으로 따라온다.
// 구멍을 누른 채 후네 쪽으로 짧고 빠르게 튕기면 공이 날아가 후네에 담긴다. 실패는 없다. (사용자 결정 2026-10-10)
// 방향이 틀리거나 느리면 공이 구멍 안에서 흔들리기만 하고, 다시 하면 된다.
const Box = (() => {
  // 배치 상수 (board.js PLATE: cx 560, cy 380, 520×340)
  const PLATE_TOP = 210;
  const PLATE_BOTTOM = 550;
  const GAP = 72;                       // 불판 가장자리 ~ 후네 중심
  const ENTER_X = 1420;                 // 슬라이드인 시작
  const SLOTS = [[-60, -24], [0, -24], [60, -24], [-60, 24], [0, 24], [60, 24]];
  const SCALE = 0.42;                   // 후네 안 공 크기
  const ARC = 90;                       // 날아갈 때 포물선 높이 px
  const FOLLOW_MS = 70;                 // 후네가 목표로 따라가는 시간 상수
  const PARTS = ['batter', 'octo', 'rim', 'shine', 'face']; // 공을 이루는 노드
  const OUTLINE = 'M -128 0 Q -100 -58 -62 -58 L 62 -58 Q 100 -58 128 0 Q 100 58 62 58 L -62 58 Q -100 58 -128 0 Z'; // 후네 외곽 (토핑 clip에도 쓴다)
  const WORK = { x: 560, y: 400 };      // ⑥ 토핑 작업 위치 (불판 가운데)

  let boat = null;    // { g, balls }
  let pos = null;     // 후네 현재 위치
  let target = null;  // 후네 목표 위치
  let zoom = 1;       // ⑥에서 커진다
  let raf = 0;
  let lastT = 0;
  let drag = null;    // { hole, x, y, t }
  let filled = 0;
  let flying = 0;
  const inFlight = new Set(); // 날아가는 중인 공 (reset 때 지운다)

  function init() {
    const side = Board.layer('side');
    const g = Board.el('g', { display: 'none' }, side);
    // 위에서 본 후네: 양 끝이 뾰족한 종이 배
    Board.el('path', {
      d: OUTLINE,
      fill: '#efe2c2', stroke: '#c4ad80', 'stroke-width': 4,
    }, g);
    Board.el('path', {
      d: 'M -108 0 Q -86 -44 -56 -44 L 56 -44 Q 86 -44 108 0 Q 86 44 56 44 L -56 44 Q -86 44 -108 0 Z',
      fill: '#e6d6b0', stroke: '#d6c49c', 'stroke-width': 2,
    }, g);
    // 종이 결
    for (const x of [-40, 0, 40]) Board.el('line', { x1: x, y1: -44, x2: x, y2: 44, stroke: '#dccaa0', 'stroke-width': 1.5 }, g);
    const balls = Board.el('g', {}, g);
    boat = { g, balls };

    for (const hole of Board.holes) {
      hole.hit.addEventListener('pointerenter', () => aim(hole));
      hole.hit.addEventListener('pointerdown', (e) => press(hole, e));
    }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', () => { drag = null; });
    window.addEventListener('pointercancel', () => { drag = null; });
    Stage.onEnter('box', enter);
    Stage.onEnter('topping', toWork);
  }

  // ⑥: 불판 가운데로 와서 커진다
  function toWork() {
    const from = { x: pos.x, y: pos.y, z: zoom };
    const t0 = performance.now();
    const step = (now) => {
      const u = Math.min(1, (now - t0) / 300);
      const e = 1 - (1 - u) * (1 - u);
      setPose(from.x + (WORK.x - from.x) * e, from.y + (WORK.y - from.y) * e, from.z + (CFG.timing.topping.boatScale - from.z) * e);
      if (u < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function setPose(x, y, z = zoom) {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    pos = { x, y };
    target = { x, y };
    zoom = z;
    place();
  }

  function setOpacity(v) {
    boat.g.setAttribute('opacity', v.toFixed(2));
  }

  // 화면 좌표 → 후네 안 좌표
  function toBoat(x, y) {
    return { x: (x - pos.x) / zoom, y: (y - pos.y) / zoom };
  }

  // 구멍 옆 후네 자리: 윗줄은 불판 위, 아랫줄은 불판 아래
  function spotFor(hole) {
    return { x: hole.cx, y: hole.row === 0 ? PLATE_TOP - GAP : PLATE_BOTTOM + GAP };
  }

  function enter() {
    Octopus.setVisible(false);
    boat.g.setAttribute('display', 'inline');
    const first = Board.holes.find((h) => !h.boxed) || Board.holes[0];
    target = spotFor(first);
    pos = { x: ENTER_X, y: target.y };
    place();
    start();
  }

  function aim(hole) {
    if (!Stage.is('box') || hole.boxed) return;
    target = spotFor(hole);
    start();
  }

  function start() {
    if (!raf) { lastT = performance.now(); raf = requestAnimationFrame(follow); }
  }

  function follow(now) {
    raf = 0;
    const dt = now - lastT;
    lastT = now;
    const k = Math.min(1, dt / FOLLOW_MS);
    pos.x += (target.x - pos.x) * k;
    pos.y += (target.y - pos.y) * k;
    place();
    if (Math.abs(target.x - pos.x) > 0.3 || Math.abs(target.y - pos.y) > 0.3) raf = requestAnimationFrame(follow);
    else { pos.x = target.x; pos.y = target.y; place(); }
  }

  function place(bob = 1) {
    boat.g.setAttribute('transform', `translate(${pos.x.toFixed(1)} ${pos.y.toFixed(1)}) scale(${(zoom * bob).toFixed(3)} ${(zoom * (2 - bob)).toFixed(3)})`);
  }

  function press(hole, e) {
    if (!Stage.is('box') || hole.boxed || e.button !== 0) return;
    aim(hole);
    const p = Board.toSvg(e);
    drag = { hole, x: p.x, y: p.y, t: e.timeStamp };
  }

  function move(e) {
    if (!drag) return;
    const b = CFG.timing.box;
    const p = Board.toSvg(e);
    const dx = p.x - drag.x;
    const dy = p.y - drag.y;
    const dist = Math.hypot(dx, dy);
    if (dist < b.flickPx) return;
    const { hole, t: downAt } = drag;
    drag = null;
    const ms = Math.round(e.timeStamp - downAt);
    // 후네 방향과의 각도 차이
    const spot = spotFor(hole);
    const want = Math.atan2(spot.y - hole.cy, spot.x - hole.cx);
    const got = Math.atan2(dy, dx);
    let diff = Math.abs(got - want) * 180 / Math.PI;
    if (diff > 180) diff = 360 - diff;
    const fast = ms <= b.flickMs;
    if (fast && diff <= b.coneDeg) launch(hole, e.timeStamp, Math.round(diff), ms);
    else wiggle(hole, e.timeStamp, Math.round(diff), ms, fast ? '방향 어긋남' : '느림');
  }
  // 흔들리기만 한다 (실패 아님)
  function wiggle(hole, t, diff, ms, why) {
    Face.react(hole, 'good');
    Log.add({
      step: '후네', hole: hole.id + 1, inputAt: Math.round(t), diffDeg: diff, ms, result: why,
      line: `후네 #${hole.id + 1} | 각도 차 ${diff}° | ${ms}ms | ${why} → 다시`,
    });
  }

  function launch(hole, t, diff, ms) {
    hole.boxed = true;
    const slot = filled++;
    flying++;
    // 공을 복제해 날리고 원본은 숨긴다. 연기·흐물 움직임은 멈춘다
    if (hole.reactRaf) { cancelAnimationFrame(hole.reactRaf); hole.reactRaf = 0; hole.batter.setAttribute('ry', hole.baseRy.toFixed(1)); }
    const ball = Board.el('g', {}, Board.layer('drag'));
    inFlight.add(ball);
    for (const name of PARTS) {
      ball.appendChild(hole[name].cloneNode(true));
      hole[name].setAttribute('display', 'none');
    }
    hole.spill.setAttribute('visibility', 'hidden'); // 번진 반죽 테두리도 알과 같이 떠낸다 (T35 보완)
    hole.smokeOn = 0;
    hole.wobbleOn = false;
    hole.smoke.forEach((s) => s.setAttribute('display', 'none'));
    Cook.hideHint(hole);

    const [sx, sy] = SLOTS[slot];
    const t0 = performance.now();
    const fly = (now) => {
      const u = Math.min(1, (now - t0) / CFG.timing.box.flyMs);
      const ex = pos.x + sx;                    // 후네가 움직여도 따라간다
      const ey = pos.y + sy;
      const x = hole.cx + (ex - hole.cx) * u;
      const y = hole.cy + (ey - hole.cy) * u - ARC * 4 * u * (1 - u);
      const s = 1 + (SCALE - 1) * u;
      ball.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(3)}) translate(${-hole.cx} ${-hole.cy})`);
      if (!inFlight.has(ball)) return; // 새 판으로 지워졌다
      if (u < 1) { requestAnimationFrame(fly); return; }
      inFlight.delete(ball);
      // 착지: 후네 안으로 옮겨 후네와 함께 움직인다
      ball.setAttribute('transform', `translate(${sx} ${sy}) scale(${SCALE}) translate(${-hole.cx} ${-hole.cy})`);
      boat.balls.appendChild(ball);
      Sfx.boxLand();
      bob();
      flying--;
      if (filled === Board.holes.length && flying === 0) Stage.complete('box', Board.holes.map(() => 2)); // 실패 없음 → 항상 PERFECT!
    };
    requestAnimationFrame(fly);
    Log.add({
      step: '후네', hole: hole.id + 1, inputAt: Math.round(t), diffDeg: diff, ms, slot: slot + 1, result: '담김',
      line: `후네 #${hole.id + 1} | 각도 차 ${diff}° | ${ms}ms | 담김 (칸 ${slot + 1})`,
    });
  }

  // 공이 앉을 때 후네가 살짝 출렁
  function bob() {
    const t0 = performance.now();
    const step = (now) => {
      const u = Math.min(1, (now - t0) / 220);
      place(1 + 0.04 * Math.sin(u * Math.PI * 2) * (1 - u));
      if (u < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function reset() {
    drag = null;
    filled = 0;
    flying = 0;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    boat.balls.replaceChildren();
    for (const b of inFlight) b.remove();
    inFlight.clear();
    boat.g.setAttribute('display', 'none');
    boat.g.removeAttribute('opacity');
    zoom = 1;
    for (const hole of Board.holes) {
      hole.boxed = false;
      for (const name of PARTS) hole[name].removeAttribute('display');
    }
    Octopus.setVisible(true);
  }

  return {
    init, reset, setPose, setOpacity, toBoat,
    get g() { return boat.g; },
    get pos() { return { ...pos, zoom }; },
    WORK, OUTLINE,
  };
})();
