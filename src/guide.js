// 회전 안내 화살표 (T34, 플레이 피드백): 뒤집기에서 구멍을 누르면 둘레에 반투명 원호 화살표 — 1차 반 바퀴, 2차 한 바퀴.
// 돌리는 만큼 채움선이 차오르고, 성공 범위 안이면 초록, 넘기면 빨강. 첫 판만 뚜렷, 이후 아주 연하게 (사용자 결정 2026-10-11)
const Guide = (() => {
  const GUIDE_DEG = { 1: 180, 2: 360 };   // 안내 길이 (1차 반 바퀴, 2차 한 바퀴)
  const FLIP_DIR_DEG = 20;                // 반대로 이만큼 돌리면 화살표 방향을 뒤집는다
  const FADE_MS = 150;

  let st = null;   // { hole, phase, a0, dir, r, g, guide, head, fill, op }

  const rad = (d) => (d * Math.PI) / 180;
  function pt(cx, cy, r, deg) {
    return [cx + r * Math.cos(rad(deg)), cy + r * Math.sin(rad(deg))];
  }
  // 원호 path (화면 좌표에서 각도가 커지면 시계 방향). 한 바퀴 이상은 두 조각으로
  function arc(cx, cy, r, a0, sweep) {
    const s = Math.max(-359.9, Math.min(359.9, sweep));
    const [x0, y0] = pt(cx, cy, r, a0);
    const [x1, y1] = pt(cx, cy, r, a0 + s);
    const large = Math.abs(s) > 180 ? 1 : 0;
    const cw = s > 0 ? 1 : 0;
    return `M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${r} ${r} 0 ${large} ${cw} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  }

  function show(hole, phase, startAng) {
    hide(true);
    const G = CFG.timing.flip.guide;
    const strong = Flow.day() === 1 && Stage.round() === 1;
    const op = strong ? G.strong : G.faint;
    const r = (hole.size || hole.r) + G.gap;
    const g = Board.el('g', { 'pointer-events': 'none' }, Board.layer('drag'));
    const guide = Board.el('path', { fill: 'none', stroke: '#ffffff', 'stroke-width': 7, 'stroke-linecap': 'round', 'stroke-dasharray': '2 12', opacity: op[0] }, g);
    const head = Board.el('path', { fill: '#ffffff', opacity: op[0] }, g);
    const fill = Board.el('path', { fill: 'none', stroke: '#ffffff', 'stroke-width': 8, 'stroke-linecap': 'round', opacity: op[1] }, g);
    st = { hole, phase, a0: startAng, dir: 1, r, g, guide, head, fill, op };
    drawGuide();
    update(0);
  }

  function drawGuide() {
    const { hole, a0, dir, r, phase } = st;
    const sweep = GUIDE_DEG[phase] * dir;
    st.guide.setAttribute('d', arc(hole.cx, hole.cy, r, a0, sweep));
    // 화살촉: 끝점에서 진행 방향(접선)으로
    const end = a0 + sweep * 0.999;
    const [ex, ey] = pt(hole.cx, hole.cy, r, end);
    const tang = rad(end + 90 * dir);
    const nx = Math.cos(tang);
    const ny = Math.sin(tang);
    const ox = Math.cos(rad(end));
    const oy = Math.sin(rad(end));
    const L = 14;
    const W = 9;
    st.head.setAttribute('d', `M ${(ex + nx * L).toFixed(1)} ${(ey + ny * L).toFixed(1)} L ${(ex + ox * W).toFixed(1)} ${(ey + oy * W).toFixed(1)} L ${(ex - ox * W).toFixed(1)} ${(ey - oy * W).toFixed(1)} Z`);
  }

  // 지금까지 돌린 각도(부호 있음)
  function update(deg) {
    if (!st) return;
    const want = deg >= 0 ? 1 : -1;
    if (want !== st.dir && Math.abs(deg) >= FLIP_DIR_DEG) { st.dir = want; drawGuide(); }
    const f = CFG.timing.flip;
    const [min, max] = st.phase === 1 ? [f.flip1MinDeg, f.flip1MaxDeg] : [f.flip2MinDeg, f.flip2MaxDeg];
    const a = Math.abs(deg);
    const color = a > max ? '#e8483c' : a >= min ? '#5fd05f' : '#ffffff';
    st.fill.setAttribute('stroke', color);
    st.fill.setAttribute('d', a < 1 ? '' : arc(st.hole.cx, st.hole.cy, st.r - 1, st.a0, Math.sign(deg) * Math.min(a, 359.9)));
  }

  function hide(now) {
    if (!st) return;
    const g = st.g;
    st = null;
    if (now) { g.remove(); return; }
    const t0 = performance.now();
    const step = (t) => {
      const u = Math.min(1, (t - t0) / FADE_MS);
      g.setAttribute('opacity', (1 - u).toFixed(2));
      if (u < 1) requestAnimationFrame(step); else g.remove();
    };
    requestAnimationFrame(step);
  }

  // 검증용
  function info() {
    return st ? { dir: st.dir, guideOp: +st.guide.getAttribute('opacity'), fill: st.fill.getAttribute('stroke'), d: st.guide.getAttribute('d') } : null;
  }

  return { show, update, hide, info };
})();
