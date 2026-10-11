// 반죽 짜는 병 (T31, 플레이 피드백 F2): 짜는 구멍 위에 거꾸로 든 말랑한 반죽 병(사용자 선택). 누르는 동안 반죽이 줄어들고,
// 옆 자의 작은 눈금 3개 + 큰 눈금 1개(초록)를 박자마다 "움찔"하며 지난다. 큰 눈금 = 도-미-솔-도의 마지막 "도!" = 뗄 때.
// (사용자 결정 2026-10-11: 박 0.5 s, 목표 1.5 s, 짜는 구멍 위)
const Dispenser = (() => {
  // 모양 상수 (구멍 중심 기준)
  const BODY = { dx: -70, dy: -214, w: 66, h: 132 };  // 병 몸통 위치·크기 (주둥이가 구멍 왼쪽 가장자리를 향함)
  const NOZZLE = 40;                                   // 어깨 + 원뿔 주둥이 길이
  const RULER_DX = 14;                                  // 통 오른쪽 자
  const JERK_MS = 110;
  const SQUISH = 0.12;                                 // 박자마다 꾹 눌리는 정도 (옆으로 불룩, 위아래 납작)
  const FADE_MS = 200;

  let g = null;         // 지금 보이는 디스펜서
  let st = null;        // { hole, downAt, beat, jerkAt, raf, parts }

  function tickY(k, beats, top, bottom) {
    return top + (bottom - top) * (k / beats);
  }

  function show(hole, downAt) {
    hideNow();
    const P = CFG.timing.pour;
    const beats = P.holdBeats;                      // 눈금 = 박 수 + 1 (마지막이 큰 눈금)
    const x = hole.cx + BODY.dx;
    const y = hole.cy + BODY.dy;
    const top = y + 14;                             // 첫 눈금 (누르는 순간 높이)
    const bottom = y + BODY.h - 14;                 // 큰 눈금
    g = Board.el('g', { 'pointer-events': 'none' }, Board.layer('drag'));
    const body = Board.el('g', {}, g);

    // 말랑한 병 (거꾸로 든 크림색 반투명 플라스틱 + 안의 반죽). 반죽은 clip으로 높이 조절
    const nx = x + BODY.w / 2;                         // 주둥이 중심선
    const ny = y + BODY.h;                             // 몸통 아래(어깨 시작)
    const tip = { x: nx, y: ny + NOZZLE };
    const bodyPath = `M ${x + 10} ${y} H ${x + BODY.w - 10} Q ${x + BODY.w} ${y} ${x + BODY.w} ${y + 14} V ${ny - 18} Q ${x + BODY.w} ${ny} ${nx + 14} ${ny + 6} H ${nx - 14} Q ${x} ${ny} ${x} ${ny - 18} V ${y + 14} Q ${x} ${y} ${x + 10} ${y} Z`;
    const clipId = `disp-clip-${hole.id}`;
    const clip = Board.el('clipPath', { id: clipId }, body);
    Board.el('path', { d: bodyPath }, clip);
    Board.el('path', { d: bodyPath, fill: '#fbf6ea', opacity: 0.35 }, body);                 // 빈 부분 (반투명)
    const batter = Board.el('rect', { x, y: top, width: BODY.w, height: ny + 6 - top, fill: '#f2d58a', 'clip-path': `url(#${clipId})` }, body);
    const overZone = Board.el('rect', { x, y: bottom, width: BODY.w, height: ny + 6 - bottom, fill: '#d8433a', opacity: 0, 'clip-path': `url(#${clipId})` }, body);
    Board.el('path', { d: bodyPath, fill: 'none', stroke: '#e9dcc0', 'stroke-width': 3 }, body);
    Board.el('path', { d: `M ${x + 8} ${y + 18} Q ${x + 6} ${y + 60} ${x + 10} ${ny - 26}`, fill: 'none', stroke: '#ffffff', 'stroke-width': 4, opacity: 0.45, 'stroke-linecap': 'round' }, body); // 플라스틱 반짝임
    // 빨간 목 링 + 흰 원뿔 주둥이
    Board.el('rect', { x: nx - 15, y: ny + 4, width: 30, height: 10, rx: 3, fill: '#c8372d' }, body);
    Board.el('path', { d: `M ${nx - 11} ${ny + 14} L ${nx - 2} ${tip.y} L ${nx + 2} ${tip.y} L ${nx + 11} ${ny + 14} Z`, fill: '#f4efe6', stroke: '#b8ab95', 'stroke-width': 2 }, body);
    // 반죽 줄기: 주둥이 끝 → 구멍
    const stream = Board.el('path', { d: `M ${tip.x} ${tip.y} Q ${tip.x + 2} ${tip.y + 14} ${tip.x + 8} ${hole.cy - 4}`, fill: 'none', stroke: '#f2d58a', 'stroke-width': 5, 'stroke-linecap': 'round' }, g);

    // 자: 작은 눈금 beats개 + 큰 눈금 1개(초록)
    const rx = x + BODY.w + RULER_DX;
    Board.el('rect', { x: rx - 6, y: top - 14, width: 40, height: bottom - top + 28, rx: 6, fill: '#f3e6d6', stroke: '#8a5a34', 'stroke-width': 2 }, g); // 자 판
    Board.el('line', { x1: rx, y1: top - 6, x2: rx, y2: bottom + 6, stroke: '#3a2a1e', 'stroke-width': 2 }, g);
    const ticks = [];
    for (let k = 0; k <= beats; k++) {
      const ty = tickY(k, beats, top, bottom);
      const big = k === beats;
      ticks.push(Board.el('line', { x1: rx, y1: ty, x2: rx + (big ? 28 : 15), y2: ty, stroke: big ? '#3aa03a' : '#3a2a1e', 'stroke-width': big ? 6 : 3, 'stroke-linecap': 'round' }, g));
      // 통 안쪽에도 옅은 눈금 선 (반죽 높이와 맞춰 보기 쉽게)
      Board.el('line', { x1: x + 4, y1: ty, x2: x + BODY.w - 4, y2: ty, stroke: big ? '#3aa03a' : '#ffffff66', 'stroke-width': big ? 2.5 : 1, 'stroke-dasharray': big ? '' : '3 3' }, body);
    }

    st = { hole, downAt, beat: 0, jerkAt: performance.now(), raf: 0, x, y, top, bottom, beats, pivot: { x: nx, y: ny }, parts: { body, batter, overZone, ticks, stream } };
    st.raf = requestAnimationFrame(tick);
  }

  function tick(now) {
    if (!st) return;
    const P = CFG.timing.pour;
    const held = now - st.downAt;
    const beatMs = P.targetMs / st.beats;
    // 박자를 넘으면 움찔
    const beat = Math.min(st.beats, Math.floor(held / beatMs));
    if (beat > st.beat) { st.beat = beat; st.jerkAt = now; }
    // 반죽 높이: 첫 눈금 → 큰 눈금(목표 시점) → 계속 내려감
    const u = held / P.targetMs;
    const level = st.top + (st.bottom - st.top) * u;
    const bottomY = st.y + BODY.h + 6; // 병 아래(어깨)
    st.parts.batter.setAttribute('y', Math.min(level, bottomY).toFixed(1));
    st.parts.batter.setAttribute('height', Math.max(0, bottomY - level).toFixed(1));
    const over = held > P.targetMs;
    st.parts.overZone.setAttribute('opacity', over ? 0.55 : 0);
    // 큰 눈금에 닿는 순간 반짝 (굿 창 안)
    const big = st.parts.ticks[st.beats];
    const near = Math.abs(held - P.targetMs) <= P.goodMs;
    big.setAttribute('stroke', near ? '#7ee07e' : '#3aa03a');
    big.setAttribute('stroke-width', near ? 9 : 6);
    // 움찔 + 넘치면 떨림
    // 박자마다 꾹 (옆으로 불룩, 위아래 납작 — 주둥이 쪽 기준), 누르는 동안은 살짝 눌린 채, 넘치면 떨림
    const j = now - st.jerkAt;
    const k = j < JERK_MS ? Math.sin((j / JERK_MS) * Math.PI) : 0;
    const sx = 1.03 + SQUISH * k;
    const sy = 0.98 - SQUISH * 0.7 * k;
    const jx = over ? Math.sin(now / 18) * 2 : 0;
    const { x: px, y: py } = st.pivot;
    st.parts.body.setAttribute('transform', `translate(${(px + jx).toFixed(1)} ${py}) scale(${sx.toFixed(3)} ${sy.toFixed(3)}) translate(${-px} ${-py})`);
    st.raf = requestAnimationFrame(tick);
  }

  // 손을 떼면 흐려지며 사라진다
  function hide() {
    if (!g) return;
    const el = g;
    if (st) cancelAnimationFrame(st.raf);
    st = null;
    g = null;
    const t0 = performance.now();
    const step = (now) => {
      const u = Math.min(1, (now - t0) / FADE_MS);
      el.setAttribute('opacity', (1 - u).toFixed(2));
      if (u < 1) requestAnimationFrame(step); else el.remove();
    };
    requestAnimationFrame(step);
  }

  function hideNow() {
    if (st) cancelAnimationFrame(st.raf);
    if (g) g.remove();
    st = null;
    g = null;
  }

  // 검증용: 지금 반죽 높이(첫 눈금 0 → 큰 눈금 1)
  function level() {
    if (!st) return null;
    const y = +st.parts.batter.getAttribute('y');
    return +((y - st.top) / (st.bottom - st.top)).toFixed(2);
  }

  return { show, hide, level };
})();
