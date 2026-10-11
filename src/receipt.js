// 판 성적표 (T30, 플레이 피드백 F7): 건네면 바로 뜨고 클릭하면 닫힌다. 알마다 메뉴·굽기 결과·값 내역 (사용자 결정 2026-10-11).
// 어떤 알이 왜 비쌌는지 보여줘서 다음 판의 가설을 돕는다 (발견 루프).
const Receipt = (() => {
  // 배치 상수 (불판 위)
  const PANEL = { x: 250, y: 140, w: 620, h: 452 };
  const ROW = { top: 228, h: 50 };
  const INK = '#3a2a1e';
  const SUB = '#8a7460';

  function won(n) {
    return `₩${n.toLocaleString('ko-KR')}`;
  }

  // "150 + 좋아하는 맛 40 + 좋아하는 메뉴 30 × 완벽 1.2 = ₩264"
  function breakdown(b) {
    const V = CFG.customers.value;
    const L = CFG.letters.receipt;
    const parts = [`${CFG.menus[b.menu].price}`];
    if (b.likeN) parts.push(`+ ${L.like} ${b.likeN * V.like}`);
    if (b.dislikeN) parts.push(`− ${L.dislike} ${b.dislikeN * V.dislike}`);
    if (b.fav) parts.push(`+ ${L.fav} ${V.favorite}`);
    return `${parts.join(' ')} × ${CFG.letters.faceName[b.face]} ${b.mult} = ${won(b.value)}`;
  }

  function show(rec, then) {
    const L = CFG.letters.receipt;
    const t0 = performance.now();
    const g = Board.el('g', { 'pointer-events': 'all', cursor: 'pointer' }, Board.layer('top')); // top 레이어는 pointer-events none
    Board.el('rect', { x: 0, y: 0, width: 1280, height: 720, fill: 'transparent' }, g);
    Board.el('rect', { x: PANEL.x, y: PANEL.y, width: PANEL.w, height: PANEL.h, rx: 18, fill: '#fffdf6', stroke: '#c9b89c', 'stroke-width': 4 }, g);
    const text = (x, y, str, attrs) => { const n = Board.el('text', { x, y, fill: INK, ...attrs }, g); n.textContent = str; return n; };
    text(PANEL.x + 28, PANEL.y + 44, L.title.replace('{손님}', rec.customer.name), { 'font-size': 26, 'font-weight': 900 });
    text(PANEL.x + PANEL.w - 28, PANEL.y + 44, won(rec.sales), { 'text-anchor': 'end', 'font-size': 26, 'font-weight': 900, fill: '#c0661c' });
    Board.el('line', { x1: PANEL.x + 20, y1: PANEL.y + 60, x2: PANEL.x + PANEL.w - 20, y2: PANEL.y + 60, stroke: '#e5d6b8', 'stroke-width': 2 }, g);

    rec.balls.forEach((b, i) => {
      const y = ROW.top + i * ROW.h;
      const f = CFG.faces[b.face] || CFG.faces.tasty;
      Board.el('circle', { cx: PANEL.x + 42, cy: y + 4, r: 15, fill: f.color, stroke: '#00000033', 'stroke-width': 2 }, g);
      text(PANEL.x + 42, y + 32, CFG.letters.faceName[b.face], { 'text-anchor': 'middle', 'font-size': 11, fill: SUB });
      const heart = b.likeN > 0 ? '♥ ' : '';
      const fresh = (rec.fresh || []).includes(b.menu) ? `  ${L.fresh}` : '';
      const name = text(PANEL.x + 72, y + 2, `${heart}${CFG.menus[b.menu].name}${fresh}`, { 'font-size': 18, 'font-weight': 900 });
      if (heart) name.setAttribute('fill', '#c0392b');
      text(PANEL.x + 72, y + 24, breakdown(b), { 'font-size': 13, fill: SUB });
      text(PANEL.x + PANEL.w - 28, y + 10, won(b.value), { 'text-anchor': 'end', 'font-size': 18, 'font-weight': 700, fill: b.value ? INK : '#b0a090' });
    });

    const fy = ROW.top + rec.balls.length * ROW.h + 6;
    Board.el('line', { x1: PANEL.x + 20, y1: fy - 14, x2: PANEL.x + PANEL.w - 20, y2: fy - 14, stroke: '#e5d6b8', 'stroke-width': 2 }, g);
    text(PANEL.x + 28, fy + 12, `${rec.customer.name}: "${rec.line}"`, { 'font-size': 16, 'font-style': 'italic' });
    text(PANEL.x + PANEL.w - 28, fy + 40, L.close, { 'text-anchor': 'end', 'font-size': 15, 'font-weight': 700, fill: '#c0661c' });

    g.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      g.remove();
      const ms = Math.round(performance.now() - t0);
      Log.add({ step: '성적표', ms, line: `성적표 닫힘 | ${(ms / 1000).toFixed(1)} s` });
      then();
    }, { once: true });
  }

  return { show };
})();
