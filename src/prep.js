// 준비 (T26): 오늘 가진 추가 재료 중 최대 3개를 골라 재료판 칸에 올린다. 손질 동작 없음 (사용자 결정 2026-10-10).
const Prep = (() => {
  // 배치 상수
  const PANEL = { x: 190, y: 90, w: 900, h: 560 };
  const CARD = { w: 160, h: 170, gap: 20, top: 190 };
  const MINI = { cx: 640, cy: 505, w: 300, h: 150 }; // 재료판 미리보기
  const INK = '#3a2a1e';

  let root = null;
  let cards = [];
  let picked = [];
  let preview = null;

  function el(tag, attrs, parent) {
    return Board.el(tag, attrs, parent);
  }

  // back: 장보기로 돌아가기 (사용자 2026-10-12 — 다시 재료를 살 수 있게). 장보기가 없는 날은 없음
  function open(then, back) {
    const T = CFG.letters.prep;
    picked = [];
    root = el('g', { 'pointer-events': 'all' }, Board.layer('top')); // top 레이어는 pointer-events none
    el('rect', { x: 0, y: 0, width: 1280, height: 720, fill: 'rgba(15,10,8,0.6)' }, root);
    el('rect', { x: PANEL.x, y: PANEL.y, width: PANEL.w, height: PANEL.h, rx: 24, fill: '#fbf3e3', stroke: '#c9b89c', 'stroke-width': 5 }, root);
    const t = (x, y, str, attrs) => { const n = el('text', { x, y, fill: INK, ...attrs }, root); n.textContent = str; return n; };
    t(PANEL.x + 40, PANEL.y + 52, T.title, { 'font-size': 34, 'font-weight': 900 });

    const ids = Pantry.list().filter((id) => !CFG.ingredients[id].base);
    t(PANEL.x + PANEL.w / 2, PANEL.y + 82, ids.length ? T.hint : T.none, { 'text-anchor': 'middle', 'font-size': 20, fill: '#8a7460' });
    // 재료가 많으면(최대 7) 카드 폭을 줄여 한 줄에 담는다
    const w = Math.min(CARD.w, (PANEL.w - 60 - Math.max(0, ids.length - 1) * CARD.gap) / Math.max(1, ids.length));
    const rowW = ids.length * w + Math.max(0, ids.length - 1) * CARD.gap;
    const x0 = PANEL.x + (PANEL.w - rowW) / 2;
    cards = ids.map((id, i) => card(id, x0 + i * (w + CARD.gap), CARD.top, w));

    preview = el('g', {}, root);
    drawPreview();
    Reserve.pin(root, Flow.day() - 1); // 오늘 예약 쪽지 사본 — 장보기와 같게 (T52)

    const bx = PANEL.x + PANEL.w - 150;
    const by = PANEL.y + PANEL.h - 50;
    const btn = el('g', { cursor: 'pointer' }, root);
    el('rect', { x: bx - 110, y: by - 28, width: 220, height: 56, rx: 16, fill: '#c0661c' }, btn);
    const bt = el('text', { x: bx, y: by, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 24, 'font-weight': 900, fill: '#fffaf0' }, btn);
    bt.textContent = T.start;
    btn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      root.remove();
      const names = ['문어', ...picked.map((id) => CFG.ingredients[id].name)].join(' · ');
      Log.add({ step: '준비', items: ['octopus', ...picked], line: `준비 | 재료판: ${names}` });
      then();
    }, { once: true });
    if (back) {
      const kx = PANEL.x + 150;
      const kb = el('g', { cursor: 'pointer' }, root);
      el('rect', { x: kx - 110, y: by - 28, width: 220, height: 56, rx: 16, fill: '#fffaf0', stroke: '#c0661c', 'stroke-width': 3 }, kb);
      const kt = el('text', { x: kx, y: by, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 22, 'font-weight': 900, fill: '#c0661c' }, kb);
      kt.textContent = T.back || '◀ 장보기로';
      kb.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        root.remove();
        Log.add({ step: '준비', line: '준비 → 장보기로 돌아감' });
        back();
      }, { once: true });
    }
    refresh();
  }

  function card(id, x, y, w) {
    const ing = CFG.ingredients[id];
    const g = el('g', { cursor: 'pointer' }, root);
    const bg = el('rect', { x, y, width: w, height: CARD.h, rx: 14, 'stroke-width': 3 }, g);
    Shop.icon(id, g, x + w / 2, y + 55, Math.min(32, w * 0.28));
    const t = (yy, str, attrs) => { const n = el('text', { x: x + w / 2, y: yy, 'text-anchor': 'middle', fill: INK, ...attrs }, g); n.textContent = str; return n; };
    t(y + 118, ing.name, { 'font-size': 22, 'font-weight': 900 });
    t(y + 146, ing.tags.join(' · '), { 'font-size': w < 130 ? 11 : 14, fill: '#8a7460' });
    g.addEventListener('pointerdown', (e) => { e.stopPropagation(); Sfx.unlock(); toggle(id); });
    return { id, g, bg };
  }

  function toggle(id) {
    const i = picked.indexOf(id);
    if (i >= 0) picked.splice(i, 1);
    else if (picked.length < CFG.letters.prep.max) picked.push(id);
    else { Sfx.hmm(); return; } // 칸이 꽉 찼다
    Sfx.plop(false);
    refresh();
  }

  function refresh() {
    for (const c of cards) {
      const on = picked.includes(c.id);
      c.bg.setAttribute('fill', on ? '#eef6e4' : '#fffdf6');
      c.bg.setAttribute('stroke', on ? '#5f9e3a' : '#d8c7a6');
      c.g.setAttribute('opacity', on || picked.length < CFG.letters.prep.max ? 1 : 0.45);
    }
    drawPreview();
  }

  // 재료판 미리보기: 문어 + 고른 재료 3칸
  function drawPreview() {
    preview.replaceChildren();
    const x = MINI.cx - MINI.w / 2;
    const y = MINI.cy - MINI.h / 2;
    el('rect', { x, y, width: MINI.w, height: MINI.h, rx: 14, fill: '#9a6a3e', stroke: '#5e3d22', 'stroke-width': 3 }, preview);
    const cw = (MINI.w - 30) / 4;
    ['octopus', ...picked, null, null, null].slice(0, 4).forEach((id, k) => {
      const cx = x + 6 + k * (cw + 6);
      el('rect', { x: cx, y: y + 8, width: cw, height: MINI.h - 16, rx: 8, fill: '#e9d6b0', stroke: '#b08a5a', 'stroke-width': 2 }, preview);
      if (!id) return;
      Shop.icon(id, preview, cx + cw / 2, y + 60, 24);
      const n = el('text', { x: cx + cw / 2, y: y + MINI.h - 22, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 700, fill: '#5e3d22' }, preview);
      n.textContent = CFG.ingredients[id].name;
    });
  }

  return { open, chosen: () => picked.slice() };
})();
