// 재료 놓을 자리 안내 (T42, 플레이 피드백 2026-10-11): ② 단계에서 문어·재료를 집으면 넣을 수 있는 구멍 가운데에 점선 원.
// 바깥 점선 = 다리가 안 삐지는 범위(legRatio), 안쪽 원 = "깔끔(중심)" 범위(perfectRatio). 끌고 있는 점이 구멍 위면 그 구멍만 초록.
// 첫 판만 뚜렷, 이후 아주 연하게 (T34 회전 화살표와 같은 규칙, 사용자 결정 2026-10-11)
// 유령 시범 (T42, 사용자 결정 "재료를 집어야 한다는 걸 모르겠다" → 유령 시범): ② 단계에서 아무것도 안 들고 있으면
// 반투명 문어 조각 + 손가락이 재료판에서 빈 구멍까지 끌려가는 시범을 반복. 집는 순간 멈추고, 놓으면 다시.
const DropGuide = (() => {
  const GREEN = '#5fd05f';
  let g = null;
  let marks = [];   // { hole, ring, core }
  let op = null;    // [점선, 초록 채움]
  let over = null;

  // canPlace(hole) → 그 구멍에 넣을 수 있나
  function show(canPlace) {
    hide();
    const G = CFG.timing.octopus.guide;
    const strong = Flow.day() === 1 && Stage.round() === 1;
    op = strong ? G.strong : G.faint;
    const { legRatio, perfectRatio } = CFG.timing.octopus;
    const layer = Board.layer('drag');
    g = Board.el('g', { 'pointer-events': 'none' }, layer);
    layer.insertBefore(g, layer.firstChild); // 집은 조각보다 뒤
    marks = Board.holes.filter(canPlace).map((hole) => {
      const ring = Board.el('circle', { cx: hole.cx, cy: hole.cy, r: hole.r * legRatio, fill: 'none', stroke: '#ffffff', 'stroke-width': 3, 'stroke-dasharray': '6 6', opacity: op[0] }, g);
      const core = Board.el('circle', { cx: hole.cx, cy: hole.cy, r: hole.r * perfectRatio, fill: '#ffffff', opacity: op[0] * 0.5 }, g);
      return { hole, ring, core };
    });
    over = null;
  }

  // 끌고 있는 점 p (svg 좌표)
  function move(p) {
    if (!g) return;
    const hole = Board.holeAt(p.x, p.y);
    const m = marks.find((k) => k.hole === hole) || null;
    if (m === over) return;
    if (over) paint(over, false);
    over = m;
    if (over) paint(over, true);
  }

  function paint(m, on) {
    m.ring.setAttribute('stroke', on ? GREEN : '#ffffff');
    m.ring.setAttribute('opacity', on ? Math.max(op[0], op[1]) : op[0]);
    m.core.setAttribute('fill', on ? GREEN : '#ffffff');
    m.core.setAttribute('opacity', on ? op[1] : op[0] * 0.5);
  }

  function hide() {
    if (g) g.remove();
    g = null;
    marks = [];
    over = null;
  }

  // 검증용
  function info() {
    return { count: marks.length, over: over ? over.hole.id : null, op: op && op.slice() };
  }

  // ── 유령 시범 ──────────────────────────────────
  let demo = null;  // { g, piece, hand, ring, t0, raf }

  function demoStart() {
    demoStop();
    const g = Board.el('g', { 'pointer-events': 'none', display: 'none' }, Board.layer('drag'));
    const piece = Board.el('g', {}, g);
    const icon = Board.el('g', {}, piece); // 시범하는 재료 모양 (문어 / 추가 재료) — route가 바뀌면 다시 그린다
    const hand = Board.el('text', { x: 6, y: 30, 'font-size': 30, 'font-family': 'Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, sans-serif' }, piece);
    hand.textContent = '👆';
    const ring = Board.el('circle', { r: 10, fill: 'none', stroke: '#5fd05f', 'stroke-width': 3, opacity: 0 }, g);
    demo = { g, piece, icon, iconId: null, ring, t0: performance.now(), raf: 0 };
    demo.raf = requestAnimationFrame(demoTick);
  }

  function demoStop() {
    if (!demo) return;
    cancelAnimationFrame(demo.raf);
    demo.g.remove();
    demo = null;
  }

  // 출발 = 안 쓴 문어 조각(없으면 첫 추가 재료 칸), 도착 = 그 재료를 넣을 수 있는 첫 구멍
  //   그 판에 꼭 넣어야 하는 재료가 아직 없으면(T45, 1일차 2판 잣) 그 재료를 먼저 보여준다
  function route() {
    const req = Flow.today() && Flow.today().require;
    const need = req && req.round === Flow.round() && !Board.holes.some((h) => h.ings.has(req.ing)) ? req.ing : null;
    const home = Octopus.nextHome();
    if (home && !need) {
      const hole = Board.holes.find((h) => h.hasBatter && !h.hasOcto);
      if (hole) return { id: 'octopus', from: home, to: hole };
    }
    const chosen = Tray.chosen();
    const id = need && chosen.includes(need) ? need : chosen[0];
    if (!id) return null;
    const hole = Board.holes.find((h) => h.hasBatter && !h.ings.has(id));
    const c = Tray.cell(chosen.indexOf(id) + 1);
    return hole ? { id, from: { x: c.cx, y: c.cy }, to: hole } : null;
  }

  function demoTick(now) {
    if (!demo) return;
    demo.raf = requestAnimationFrame(demoTick);
    const D = CFG.timing.octopus.demo;
    if (Stage.current() !== 'octopus') { demoStop(); return; } // 단계가 끝나면 그만
    const busy = Octopus.busy() || Fill.busy() || !Stage.is('octopus'); // 들고 있거나 배너가 떠 있으면 숨김
    const r = busy ? null : route();
    if (!r) { demo.g.setAttribute('display', 'none'); demo.t0 = now; return; }
    demo.g.setAttribute('display', 'inline');
    if (demo.iconId !== r.id) {
      demo.iconId = r.id;
      demo.icon.replaceChildren();
      if (r.id === 'octopus') Board.el('ellipse', { cx: 0, cy: 0, rx: 15, ry: 13, fill: '#b9475a', stroke: '#8e2f42', 'stroke-width': 2 }, demo.icon);
      else Shop.icon(r.id, demo.icon, 0, 0, 16);
    }
    const op = Flow.day() === 1 && Stage.round() === 1 ? D.strong : D.faint;
    const u = ((now - demo.t0) % D.cycleMs) / D.cycleMs;
    // 0~0.15 나타남 · 0.15~0.7 끌려감 · 0.7~0.85 놓은 자리 초록 · 0.85~1 사라짐
    const m = Math.min(1, Math.max(0, (u - 0.15) / 0.55));
    const e = m < 0.5 ? 2 * m * m : 1 - Math.pow(-2 * m + 2, 2) / 2;
    const x = r.from.x + (r.to.cx - r.from.x) * e;
    const y = r.from.y + (r.to.cy - r.from.y) * e;
    const a = u < 0.15 ? u / 0.15 : u > 0.85 ? (1 - u) / 0.15 : 1;
    demo.piece.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(1 + 0.15 * Math.min(1, m * 4)).toFixed(2)})`);
    demo.piece.setAttribute('opacity', (a * op).toFixed(2));
    const ringOn = u >= 0.7 && u <= 0.95;
    demo.ring.setAttribute('cx', r.to.cx);
    demo.ring.setAttribute('cy', r.to.cy);
    demo.ring.setAttribute('r', (10 + (ringOn ? (u - 0.7) * 80 : 0)).toFixed(1));
    demo.ring.setAttribute('opacity', ringOn ? (op * (1 - (u - 0.7) / 0.25)).toFixed(2) : 0);
  }

  Stage.onEnter('octopus', demoStart);

  return { show, move, hide, info, demoOn: () => !!demo && demo.g.getAttribute('display') !== 'none' };
})();
