// 장보기 (T25): 재료 카드를 눌러 산다(다시 누르면 무른다). 산 재료는 오늘 하루 무한. 문어는 기본 재료.
// 인벤토리 UI 클릭으로 처리 (사용자 결정 2026-10-10). 재료 아이콘(도형)은 재료판·굽기에서도 같이 쓴다.
// T53: 아래에 "도구" 줄 — 같은 돈으로 사는 인게임 성장(tools.js). 한 번 사면 계속, 그날 산 건 다시 누르면 무름.
const Shop = (() => {
  // 배치 상수
  const PANEL = { x: 130, y: 70, w: 1020, h: 600 };
  const CARD = { w: 210, h: 150, gap: 30, top: 162, rowGap: 12 };
  const TOOL = { w: 300, h: 74, gap: 20, top: 514 };
  const EMOJI_FONT = 'Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, Malgun Gothic, sans-serif';
  const COLS = 4;
  const INK = '#3a2a1e';
  const SUB = '#8a7460';

  let root = null;
  let cards = [];      // { id, g, bg, badge }
  let moneyText = null;
  let bought = new Set();
  let tools = [];      // { id, g, bg, badge }
  let toolsToday = new Set(); // 오늘 산 도구 (무를 수 있음)
  let shopDay = 0;            // bought·toolsToday가 어느 날 것인가 — 준비에서 장보기로 돌아와도 오늘 산 건 기억 (사용자 2026-10-12)

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
      case 'firefly': // 반딧불이 오징어 (T54): 세모 머리 + 몸통 + 다리, 푸른 빛 점
        el('path', { d: `M 0 ${-r} L ${r * 0.55} ${-r * 0.35} L ${-r * 0.55} ${-r * 0.35} Z`, fill: c, stroke: '#2c3f8a', 'stroke-width': 2, 'stroke-linejoin': 'round' }, g);
        el('ellipse', { cx: 0, cy: 0, rx: r * 0.42, ry: r * 0.5, fill: c, stroke: '#2c3f8a', 'stroke-width': 2 }, g);
        for (const k of [-0.3, -0.1, 0.1, 0.3]) el('line', { x1: k * r, y1: r * 0.4, x2: k * r * 1.6, y2: r * 0.95, stroke: c, 'stroke-width': r * 0.14, 'stroke-linecap': 'round' }, g);
        for (const [sx, sy] of [[-0.18, -0.05], [0.18, 0.12], [0, -0.55]]) el('circle', { cx: sx * r, cy: sy * r, r: r * 0.09, fill: '#bfefff' }, g);
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
    if (shopDay !== Flow.day()) { shopDay = Flow.day(); bought = new Set(); toolsToday = new Set(); }
    root = el('g', { 'pointer-events': 'all' }, Board.layer('top')); // top 레이어는 pointer-events none — 여기서 다시 켠다
    el('rect', { x: 0, y: 0, width: 1280, height: 720, fill: 'rgba(15,10,8,0.6)', 'pointer-events': 'all' }, root);
    el('rect', { x: PANEL.x, y: PANEL.y, width: PANEL.w, height: PANEL.h, rx: 24, fill: '#fbf3e3', stroke: '#c9b89c', 'stroke-width': 5 }, root);
    const title = el('text', { x: PANEL.x + 40, y: PANEL.y + 52, 'font-size': 34, 'font-weight': 900, fill: INK }, root);
    title.textContent = T.title;
    moneyText = el('text', { x: PANEL.x + PANEL.w - 100, y: PANEL.y + 52, // 오른쪽 위는 예약 쪽지 자리 (T46)
      'text-anchor': 'end', 'font-size': 28, 'font-weight': 700, fill: '#c0661c' }, root);

    const ids = Object.keys(CFG.ingredients);
    const rowW = COLS * CARD.w + (COLS - 1) * CARD.gap;
    const x0 = PANEL.x + (PANEL.w - rowW) / 2;
    const label = (y, str) => { const n = el('text', { x: x0, y, 'font-size': 16, 'font-weight': 700, fill: SUB }, root); n.textContent = str; };
    label(CARD.top - 10, T.ingTitle || '재료');
    cards = ids.map((id, i) => {
      const x = x0 + (i % COLS) * (CARD.w + CARD.gap);
      const y = CARD.top + Math.floor(i / COLS) * (CARD.h + CARD.rowGap);
      return card(id, x, y);
    });

    // 도구 줄 (T53)
    const tids = Object.keys(CFG.tools || {});
    const tw = tids.length * TOOL.w + Math.max(0, tids.length - 1) * TOOL.gap;
    const tx0 = PANEL.x + (PANEL.w - tw) / 2;
    label(TOOL.top - 10, T.toolTitle || '도구');
    tools = tids.map((id, i) => toolCard(id, tx0 + i * (TOOL.w + TOOL.gap), TOOL.top));

    Reserve.pin(root, Flow.day() - 1); // 오늘 예약 쪽지 (T46)

    // 장보기 끝 버튼
    const bx = PANEL.x + PANEL.w / 2;
    const by = PANEL.y + PANEL.h - 38; // 도구 줄 아래 (T53)
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
    icon(id, g, x + CARD.w / 2, y + 46, 30);
    const t = (yy, str, attrs) => { const n = el('text', { x: x + CARD.w / 2, y: yy, 'text-anchor': 'middle', fill: INK, ...attrs }, g); n.textContent = str; return n; };
    t(y + 100, ing.name, { 'font-size': 22, 'font-weight': 900 });
    t(y + 123, ing.base ? `${T.base} · 0원` : `${ing.price.toLocaleString('ko-KR')}원`, { 'font-size': 18, fill: '#c0661c', 'font-weight': 700 });
    t(y + 142, ing.tags.join(' · '), { 'font-size': 14, fill: SUB });
    const badge = el('text', { x: x + CARD.w - 12, y: y + 26, 'text-anchor': 'end', 'font-size': 16, 'font-weight': 900, fill: '#5f9e3a' }, g);
    if (!ing.base) g.addEventListener('pointerdown', (e) => { e.stopPropagation(); Sfx.unlock(); toggle(id); });
    return { id, g, bg, badge };
  }

  // 도구 카드 (T53): 그림 글자 · 이름 · 가격 · 한 줄 설명
  function toolCard(id, x, y) {
    const tool = CFG.tools[id];
    const g = el('g', { cursor: 'pointer' }, root);
    const bg = el('rect', { x, y, width: TOOL.w, height: TOOL.h, rx: 14, 'stroke-width': 3 }, g);
    const ic = el('text', { x: x + 36, y: y + TOOL.h / 2 + 1, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 32, 'font-family': EMOJI_FONT }, g);
    ic.textContent = tool.icon || '🔧';
    // 이름 / 설명 / 가격 세 줄. 설명이 길면 칸에 맞게 글자를 줄인다
    const room = TOOL.w - 70 - 10;
    const nm = el('text', { x: x + 70, y: y + 25, 'font-size': 17, 'font-weight': 900, fill: INK }, g);
    nm.textContent = tool.name;
    const ds = el('text', { x: x + 70, y: y + 45, 'font-size': 13, fill: SUB }, g);
    ds.textContent = tool.desc || '';
    for (let f = 13; f > 10 && ds.getComputedTextLength() > room; f -= 0.5) ds.setAttribute('font-size', f);
    const pr = el('text', { x: x + 70, y: y + 64, 'font-size': 15, fill: '#c0661c', 'font-weight': 700 }, g);
    pr.textContent = `${tool.price.toLocaleString('ko-KR')}원`;
    const badge = el('text', { x: x + TOOL.w - 12, y: y + 22, 'text-anchor': 'end', 'font-size': 14, 'font-weight': 900, fill: '#5f9e3a' }, g);
    g.addEventListener('pointerdown', (e) => { e.stopPropagation(); Sfx.unlock(); toggleTool(id); });
    return { id, g, bg, badge };
  }

  function toggleTool(id) {
    if (toolsToday.has(id)) {
      toolsToday.delete(id);
      Tools.refund(id);
      Sfx.flipFail();
    } else if (Tools.has(id)) {
      return; // 전에 산 도구
    } else if (Tools.buy(id)) {
      toolsToday.add(id);
      Sfx.coin();
    } else {
      Sfx.hmm(); // 돈이 모자람
    }
    refresh();
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
    moneyText.textContent = `돈 ${Wallet.money.toLocaleString('ko-KR')}원`;
    for (const c of cards) {
      const ing = CFG.ingredients[c.id];
      const have = Pantry.has(c.id);
      const afford = have || ing.price <= Wallet.money;
      c.bg.setAttribute('fill', have ? '#eef6e4' : '#fffdf6');
      c.bg.setAttribute('stroke', have ? '#5f9e3a' : '#d8c7a6');
      c.g.setAttribute('opacity', afford ? 1 : 0.4);
      c.badge.textContent = ing.base ? T.owned : bought.has(c.id) ? T.today : have ? T.owned : '';
    }
    for (const c of tools) {
      const have = Tools.has(c.id);
      const afford = have || CFG.tools[c.id].price <= Wallet.money;
      c.bg.setAttribute('fill', have ? '#eef6e4' : '#fffdf6');
      c.bg.setAttribute('stroke', have ? '#5f9e3a' : '#d8c7a6');
      c.g.setAttribute('opacity', afford ? 1 : 0.4);
      c.badge.textContent = toolsToday.has(c.id) ? (T.bought || '✓ 샀음') : have ? T.owned : '';
    }
  }

  return { open, icon };
})();
