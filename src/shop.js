// 장보기 (T25): 재료 카드를 눌러 산다(다시 누르면 무른다). 산 재료는 오늘 하루 무한. 문어는 기본 재료.
// 인벤토리 UI 클릭으로 처리 (사용자 결정 2026-10-10). 재료 아이콘(도형)은 재료판·굽기에서도 같이 쓴다.
const Shop = (() => {
  // 배치 상수
  const PANEL = { x: 130, y: 70, w: 1020, h: 600 };
  const CARD = { w: 210, h: 210, gap: 30, top: 150 };
  const COLS = 4;
  const INK = '#3a2a1e';
  const SUB = '#8a7460';

  let root = null;
  let cards = [];      // { id, g, bg, badge }
  let moneyText = null;
  let bought = new Set();

  function el(tag, attrs, parent) {
    return Board.el(tag, attrs, parent);
  }

  // ── 재료 아이콘 (도형, 9단계 전까지) ─────────────────────
  // 반지름 r 안에 들어가는 그림. 색은 data.js ingredients[id].color
  function icon(id, parent, x, y, r) {
    const ing = CFG.ingredients[id];
    const c = ing ? ing.color : '#999';
    const g = el('g', { transform: `translate(${x} ${y})` }, parent);
    const dark = '#00000055';
    switch (id) {
      case 'octopus':
        el('ellipse', { cx: 0, cy: 0, rx: r * 0.95, ry: r * 0.8, fill: c, stroke: '#8e2f42', 'stroke-width': 2 }, g);
        [[-0.4, 0.1], [0.1, 0.35], [0.45, -0.1], [-0.05, -0.3]].forEach(([sx, sy]) => el('circle', { cx: sx * r, cy: sy * r, r: r * 0.14, fill: '#f0b9c0' }, g));
        break;
      case 'pinenut':
        el('path', { d: `M 0 ${-r} C ${r * 0.8} ${-r * 0.2} ${r * 0.7} ${r * 0.9} 0 ${r * 0.9} C ${-r * 0.7} ${r * 0.9} ${-r * 0.8} ${-r * 0.2} 0 ${-r} Z`, fill: c, stroke: '#b89a52', 'stroke-width': 2 }, g);
        break;
      case 'pear':
        el('circle', { cx: 0, cy: r * 0.3, r: r * 0.65, fill: c, stroke: '#7c9a3c', 'stroke-width': 2 }, g);
        el('circle', { cx: 0, cy: -r * 0.35, r: r * 0.42, fill: c, stroke: '#7c9a3c', 'stroke-width': 2 }, g);
        el('line', { x1: 0, y1: -r * 0.75, x2: r * 0.1, y2: -r, stroke: '#6b4a2a', 'stroke-width': 3, 'stroke-linecap': 'round' }, g);
        break;
      case 'apple':
        el('circle', { cx: 0, cy: r * 0.1, r: r * 0.8, fill: c, stroke: '#8e1f1a', 'stroke-width': 2 }, g);
        el('line', { x1: 0, y1: -r * 0.6, x2: 0, y2: -r * 0.95, stroke: '#6b4a2a', 'stroke-width': 3, 'stroke-linecap': 'round' }, g);
        el('ellipse', { cx: r * 0.25, cy: -r * 0.85, rx: r * 0.25, ry: r * 0.12, fill: '#5aa03a' }, g);
        break;
      case 'radish':
        el('ellipse', { cx: 0, cy: r * 0.2, rx: r * 0.55, ry: r * 0.75, fill: c, stroke: '#b8b0a0', 'stroke-width': 2 }, g);
        for (const a of [-25, 0, 25]) el('ellipse', { cx: 0, cy: -r * 0.65, rx: r * 0.12, ry: r * 0.35, fill: '#5aa03a', transform: `rotate(${a} 0 ${-r * 0.4})` }, g);
        break;
      case 'shrimp':
        el('path', { d: `M ${r * 0.6} ${-r * 0.5} A ${r * 0.7} ${r * 0.7} 0 1 0 ${r * 0.5} ${r * 0.6}`, fill: 'none', stroke: c, 'stroke-width': r * 0.45, 'stroke-linecap': 'round' }, g);
        el('circle', { cx: r * 0.55, cy: -r * 0.55, r: r * 0.08, fill: '#2a1d14' }, g);
        break;
      case 'scallion':
        el('circle', { cx: -r * 0.3, cy: 0, r: r * 0.45, fill: 'none', stroke: c, 'stroke-width': r * 0.2 }, g);
        el('circle', { cx: r * 0.35, cy: r * 0.15, r: r * 0.4, fill: 'none', stroke: c, 'stroke-width': r * 0.2 }, g);
        break;
      case 'ginger':
        el('path', { d: `M ${-r * 0.8} ${r * 0.2} Q ${-r * 0.5} ${-r * 0.8} ${r * 0.2} ${-r * 0.6} Q ${r * 0.9} ${-r * 0.3} ${r * 0.6} ${r * 0.5} Q ${0} ${r * 0.9} ${-r * 0.8} ${r * 0.2} Z`, fill: c, stroke: '#b0506a', 'stroke-width': 2 }, g);
        el('path', { d: `M ${-r * 0.4} ${r * 0.1} Q 0 ${-r * 0.2} ${r * 0.4} ${r * 0.1}`, fill: 'none', stroke: '#ffffff88', 'stroke-width': 2 }, g);
        break;
      default:
        el('circle', { cx: 0, cy: 0, r: r * 0.8, fill: c, stroke: dark, 'stroke-width': 2 }, g);
    }
    return g;
  }

  // ── 장보기 화면 ─────────────────────────────────────────

  function open(then) {
    const T = CFG.letters.shop;
    bought = new Set();
    root = el('g', { 'pointer-events': 'all' }, Board.layer('top')); // top 레이어는 pointer-events none — 여기서 다시 켠다
    el('rect', { x: 0, y: 0, width: 1280, height: 720, fill: 'rgba(15,10,8,0.6)', 'pointer-events': 'all' }, root);
    el('rect', { x: PANEL.x, y: PANEL.y, width: PANEL.w, height: PANEL.h, rx: 24, fill: '#fbf3e3', stroke: '#c9b89c', 'stroke-width': 5 }, root);
    const title = el('text', { x: PANEL.x + 40, y: PANEL.y + 52, 'font-size': 34, 'font-weight': 900, fill: INK }, root);
    title.textContent = T.title;
    moneyText = el('text', { x: PANEL.x + PANEL.w - 40, y: PANEL.y + 52, 'text-anchor': 'end', 'font-size': 28, 'font-weight': 700, fill: '#c0661c' }, root);

    const ids = Object.keys(CFG.ingredients);
    const rowW = COLS * CARD.w + (COLS - 1) * CARD.gap;
    const x0 = PANEL.x + (PANEL.w - rowW) / 2;
    cards = ids.map((id, i) => {
      const x = x0 + (i % COLS) * (CARD.w + CARD.gap);
      const y = CARD.top + Math.floor(i / COLS) * (CARD.h + CARD.gap - 10);
      return card(id, x, y);
    });

    // 장보기 끝 버튼
    const bx = PANEL.x + PANEL.w / 2;
    const by = PANEL.y + PANEL.h - 50;
    const btn = el('g', { cursor: 'pointer' }, root);
    el('rect', { x: bx - 120, y: by - 28, width: 240, height: 56, rx: 16, fill: '#c0661c' }, btn);
    const bt = el('text', { x: bx, y: by, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 24, 'font-weight': 900, fill: '#fffaf0' }, btn);
    bt.textContent = T.done;
    btn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      root.remove();
      Pantry.log('장보기 끝');
      then();
    }, { once: true });

    refresh();
  }

  function card(id, x, y) {
    const ing = CFG.ingredients[id];
    const T = CFG.letters.shop;
    const g = el('g', { cursor: ing.base ? 'default' : 'pointer' }, root);
    const bg = el('rect', { x, y, width: CARD.w, height: CARD.h, rx: 16, 'stroke-width': 3 }, g);
    icon(id, g, x + CARD.w / 2, y + 62, 38);
    const t = (yy, str, attrs) => { const n = el('text', { x: x + CARD.w / 2, y: yy, 'text-anchor': 'middle', fill: INK, ...attrs }, g); n.textContent = str; return n; };
    t(y + 132, ing.name, { 'font-size': 24, 'font-weight': 900 });
    t(y + 162, ing.base ? `${T.base} · 무료` : `₩${ing.price.toLocaleString('ko-KR')}`, { 'font-size': 20, fill: '#c0661c', 'font-weight': 700 });
    t(y + 190, ing.tags.join(' · '), { 'font-size': 16, fill: SUB });
    const badge = el('text', { x: x + CARD.w - 12, y: y + 26, 'text-anchor': 'end', 'font-size': 16, 'font-weight': 900, fill: '#5f9e3a' }, g);
    if (!ing.base) g.addEventListener('pointerdown', (e) => { e.stopPropagation(); Sfx.unlock(); toggle(id); });
    return { id, g, bg, badge };
  }

  function toggle(id) {
    const ing = CFG.ingredients[id];
    if (bought.has(id)) {
      bought.delete(id);
      Pantry.remove(id);
      Wallet.refund(ing.price, `${ing.name} 무름`);
      Sfx.flipFail();
    } else if (Pantry.has(id)) {
      return; // 동봉으로 이미 가진 재료
    } else if (Wallet.spend(ing.price, `${ing.name} 구매`)) {
      bought.add(id);
      Pantry.add(id);
      Sfx.coin();
    } else {
      Sfx.hmm(); // 돈이 모자람
    }
    refresh();
  }

  function refresh() {
    const T = CFG.letters.shop;
    moneyText.textContent = `돈 ₩${Wallet.money.toLocaleString('ko-KR')}`;
    for (const c of cards) {
      const ing = CFG.ingredients[c.id];
      const have = Pantry.has(c.id);
      const afford = have || ing.price <= Wallet.money;
      c.bg.setAttribute('fill', have ? '#eef6e4' : '#fffdf6');
      c.bg.setAttribute('stroke', have ? '#5f9e3a' : '#d8c7a6');
      c.g.setAttribute('opacity', afford ? 1 : 0.4);
      c.badge.textContent = ing.base ? T.owned : bought.has(c.id) ? T.today : have ? T.owned : '';
    }
  }

  return { open, icon };
})();
