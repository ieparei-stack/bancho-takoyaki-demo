// 첫 판 유령 시범 (T44, 플레이 피드백 2026-10-11 "첫 칸을 눌러서 짜기 시작해야 한다는 걸 모르겠다"):
// ① 짜기 · ⑤ 후네 · ⑥ 건네기에 반투명 👆 손가락 시범. (② 재료는 dropguide.js, ③④ 뒤집기는 guide.js 화살표)
// 1일차 첫 판에만(timing.demo.*.later = 0). 그 동작을 하는 동안은 숨고, 손을 떼면 다음 차례에서 다시 보인다.
const Demo = (() => {
  const HAND_FONT = 'Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, sans-serif';
  const GREEN = '#5fd05f';

  let g = null;
  let parts = null;   // { batter, rim, ring, ball, arrow, boat, hand }
  let shown = null;   // { kind, target } — 검증용
  let t0 = 0;
  let lastKey = '';

  function init() {
    g = Board.el('g', { 'pointer-events': 'none', display: 'none' }, Board.layer('drag'));
    parts = {
      rim: Board.el('circle', { fill: 'none', stroke: GREEN, 'stroke-width': 3, 'stroke-dasharray': '6 5' }, g),
      batter: Board.el('circle', { fill: CFG.faces.batter.color, stroke: '#c9b07a', 'stroke-width': 2 }, g),
      ring: Board.el('circle', { fill: 'none', stroke: GREEN, 'stroke-width': 4 }, g),
      arrow: Board.el('path', { fill: 'none', stroke: '#ffffff', 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-dasharray': '2 9' }, g),
      head: Board.el('path', { fill: '#ffffff' }, g),
      ball: Board.el('circle', { r: 20, fill: '#e0a457', stroke: '#9a6a30', 'stroke-width': 2 }, g),
      boat: Board.el('path', { d: Box.OUTLINE, fill: '#efe2c2', stroke: '#c4ad80', 'stroke-width': 4 }, g),
      hand: Board.el('text', { 'font-size': 44, 'font-family': HAND_FONT, 'text-anchor': 'middle' }, g),
    };
    parts.hand.textContent = '👆';
    requestAnimationFrame(tick);
  }

  function opacity(kind) {
    const D = CFG.timing.demo[kind];
    return Flow.day() === 1 && Stage.round() === 1 ? D.first : D.later;
  }

  // 지금 보일 시범: { kind, target, ... } 또는 null
  function pick() {
    if (Flow.state() !== 'COOK' || Stage.busy()) return null;
    const st = Stage.current();
    if (st === 'pour' && Stage.is('pour') && !Pour.busy()) {
      const hole = Board.holes[Pour.next()];
      return hole ? { kind: 'pour', target: hole.id, hole } : null;
    }
    if (st === 'box' && Stage.is('box') && !Box.busy()) {
      const hole = Board.holes.find((h) => !h.boxed);
      return hole ? { kind: 'box', target: hole.id, hole } : null;
    }
    if (st === 'topping' && Stage.is('topping') && !Topping.busy()) return { kind: 'topping', target: 'boat' };
    return null;
  }

  function showOnly(...names) {
    for (const k of Object.keys(parts)) parts[k].setAttribute('display', names.includes(k) ? 'inline' : 'none');
  }
  function hand(x, y, scale, op) {
    parts.hand.setAttribute('transform', `translate(${x.toFixed(1)} ${(y + 34).toFixed(1)}) scale(${scale.toFixed(2)})`);
    parts.hand.setAttribute('opacity', op.toFixed(2));
  }
  const ease = (m) => (m < 0.5 ? 2 * m * m : 1 - Math.pow(-2 * m + 2, 2) / 2);
  const clamp = (v) => Math.max(0, Math.min(1, v));

  function tick(now) {
    requestAnimationFrame(tick);
    const p = pick();
    const op = p ? opacity(p.kind) : 0;
    if (!p || op <= 0) {
      if (shown) { g.setAttribute('display', 'none'); shown = null; lastKey = ''; }
      return;
    }
    const key = `${p.kind}:${p.target}`;
    if (key !== lastKey) { lastKey = key; t0 = now; }
    shown = { kind: p.kind, target: p.target };
    g.setAttribute('display', 'inline');
    const u = ((now - t0) % CFG.timing.demo[p.kind].cycleMs) / CFG.timing.demo[p.kind].cycleMs;
    const fade = u < 0.1 ? u / 0.1 : u > 0.9 ? (1 - u) / 0.1 : 1;
    if (p.kind === 'pour') pour(p.hole, u, op * fade);
    else if (p.kind === 'box') box(p.hole, u, op * fade);
    else topping(u, op * fade);
  }

  // ① 짜기: 내려와 꾹 → 반죽이 박자마다 툭툭 3번 커져 테두리까지 → 떼기 + 초록 링
  function pour(hole, u, op) {
    showOnly('rim', 'batter', 'ring', 'hand');
    parts.rim.setAttribute('cx', hole.cx); parts.rim.setAttribute('cy', hole.cy); parts.rim.setAttribute('r', hole.r);
    parts.rim.setAttribute('opacity', (op * 0.8).toFixed(2));
    const press = u >= 0.15 && u < 0.75;
    // 0.15~0.75 동안 4박(도-미-솔-도)에 맞춰 계단식으로 커진다
    const beat = press ? Math.min(4, Math.floor((u - 0.15) / 0.15) + 1) : u >= 0.75 ? 4 : 0;
    const r = hole.r * beat / 4;
    parts.batter.setAttribute('cx', hole.cx); parts.batter.setAttribute('cy', hole.cy); parts.batter.setAttribute('r', r.toFixed(1));
    parts.batter.setAttribute('opacity', (beat ? op * 0.75 : 0).toFixed(2));
    const ringU = clamp((u - 0.75) / 0.15);
    parts.ring.setAttribute('cx', hole.cx); parts.ring.setAttribute('cy', hole.cy);
    parts.ring.setAttribute('r', (hole.r + ringU * 18).toFixed(1));
    parts.ring.setAttribute('opacity', (u >= 0.75 ? op * (1 - ringU) : 0).toFixed(2));
    const lift = u < 0.15 ? (1 - u / 0.15) * 24 : u >= 0.75 ? clamp((u - 0.75) / 0.1) * 24 : 0;
    hand(hole.cx, hole.cy - 10 - lift, press ? 0.85 : 1, op);
  }

  // ⑤ 후네: 구멍을 꾹 → 후네 쪽으로 휙 (반투명 공이 날아감), 점선 화살표
  function box(hole, u, op) {
    showOnly('arrow', 'head', 'ball', 'hand');
    const spot = Box.spotFor(hole);
    const dx = spot.x - hole.cx;
    const dy = spot.y - hole.cy;
    const len = Math.hypot(dx, dy);
    const nx = dx / len;
    const ny = dy / len;
    const ax = hole.cx + nx * (hole.r + 6);
    const ay = hole.cy + ny * (hole.r + 6);
    const bx = spot.x - nx * 30;
    const by = spot.y - ny * 30;
    parts.arrow.setAttribute('d', `M ${ax.toFixed(1)} ${ay.toFixed(1)} L ${bx.toFixed(1)} ${by.toFixed(1)}`);
    parts.arrow.setAttribute('opacity', (op * 0.8).toFixed(2));
    parts.head.setAttribute('d', `M ${(bx + nx * 14).toFixed(1)} ${(by + ny * 14).toFixed(1)} L ${(bx - ny * 9).toFixed(1)} ${(by + nx * 9).toFixed(1)} L ${(bx + ny * 9).toFixed(1)} ${(by - nx * 9).toFixed(1)} Z`);
    parts.head.setAttribute('opacity', (op * 0.8).toFixed(2));
    // 0.2~0.35 꾹, 0.35~0.5 휙(손가락이 짧게), 0.35~0.7 공이 후네로
    const flick = ease(clamp((u - 0.35) / 0.15));
    hand(hole.cx + nx * 40 * flick, hole.cy + ny * 40 * flick, u >= 0.2 && u < 0.5 ? 0.85 : 1, op);
    const fly = ease(clamp((u - 0.35) / 0.35));
    parts.ball.setAttribute('cx', (hole.cx + dx * fly).toFixed(1));
    parts.ball.setAttribute('cy', (hole.cy + dy * fly).toFixed(1));
    parts.ball.setAttribute('opacity', (u >= 0.35 && u < 0.75 ? op * 0.7 : 0).toFixed(2));
  }

  // ⑥ 건네기: 후네를 꾹 잡고 위로(손님 쪽) 끌어올린다
  function topping(u, op) {
    showOnly('arrow', 'head', 'boat', 'hand');
    const b = Box.pos;
    const top = CFG.timing.topping.handoffY - 40;
    const m = ease(clamp((u - 0.2) / 0.55));
    const y = b.y + (top - b.y) * m;
    parts.boat.setAttribute('transform', `translate(${b.x.toFixed(1)} ${y.toFixed(1)}) scale(${(b.zoom * (1 - 0.45 * m)).toFixed(3)})`);
    parts.boat.setAttribute('opacity', (u >= 0.2 ? op * 0.45 : 0).toFixed(2));
    const ax = b.x + 170;
    parts.arrow.setAttribute('d', `M ${ax} ${b.y + 20} L ${ax} ${top + 20}`);
    parts.arrow.setAttribute('opacity', (op * 0.8).toFixed(2));
    parts.head.setAttribute('d', `M ${ax} ${top} L ${ax - 11} ${top + 20} L ${ax + 11} ${top + 20} Z`);
    parts.head.setAttribute('opacity', (op * 0.8).toFixed(2));
    hand(b.x, y, u >= 0.15 && u < 0.8 ? 0.85 : 1, op);
  }

  return { init, state: () => shown && { ...shown } };
})();
