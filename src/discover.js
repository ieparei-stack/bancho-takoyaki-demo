// 숨은 요리 발견 (T39, 7단계 인터뷰 2026-10-11): 건넨 판에 숨은 요리(menus.hidden) 알이 있고 그 알이 맛있음 이상이면 발견.
// 성적표를 닫은 뒤 이름 카드, 도감(따로 화면)에 기록. 덜 익음·어설픔이면 메뉴판에만 오르고 발견은 아니다.
// 도감 버튼은 화면 오른쪽 아래 HTML 버튼 — 굽는 동안(주문·굽기)은 숨긴다 (타이머가 도는 중에 화면을 덮지 않게)
const Discover = (() => {
  const GOOD = ['perfect', 'tasty'];   // "맛있음 이상"
  const COOKING = ['TITLE', 'ORDER', 'COOK'];   // 도감 버튼을 숨기는 상태 (타이틀 포함, T45)
  const CARD = { x: 340, y: 130, w: 600, h: 400 };
  const BOOK = { x: 250, y: 70, w: 780, h: 560, rowTop: 168, rowH: 140 };

  const found = new Map();  // 메뉴 id → 발견 일차
  let btn = null;

  function L() {
    return CFG.letters.discover || {};
  }
  function hiddenIds() {
    return Object.keys(CFG.menus).filter((id) => CFG.menus[id].hidden);
  }

  function init(button) {
    btn = button;
    btn.textContent = L().book || '📖 도감';
    btn.addEventListener('pointerdown', (e) => e.stopPropagation());
    btn.addEventListener('click', (e) => { e.stopPropagation(); book(); });
  }

  // Flow 상태가 바뀔 때
  function onState(state) {
    if (btn) btn.hidden = COOKING.includes(state);
  }

  // 판 기록에서 새 발견을 찾아 rec.discovered에 적는다. 새로 발견한 메뉴 id 목록
  function check(rec) {
    const fresh = [];
    for (const b of rec.balls || []) {
      const m = CFG.menus[b.menu];
      if (!m || !m.hidden || !GOOD.includes(b.face) || found.has(b.menu) || fresh.includes(b.menu)) continue;
      fresh.push(b.menu);
    }
    for (const id of fresh) found.set(id, rec.day);
    rec.discovered = fresh;
    if (fresh.length) {
      Log.add({ step: '발견', day: rec.day, ids: fresh, line: `발견 | ${rec.day}일차 숨은 요리 ${fresh.map((id) => CFG.menus[id].name).join(' · ')} (${found.size}/${hiddenIds().length})` });
    }
    return fresh;
  }

  // 재료 아이콘 줄 (가운데 정렬)
  function ingRow(g, ids, cx, y, known) {
    const gap = 110;
    ids.forEach((id, i) => {
      const x = cx + (i - (ids.length - 1) / 2) * gap;
      if (known) {
        Shop.icon(id, g, x, y, 22);
        const t = Board.el('text', { x, y: y + 44, 'text-anchor': 'middle', 'font-size': 16, 'font-weight': 700, fill: '#5e3d22' }, g);
        t.textContent = CFG.ingredients[id] ? CFG.ingredients[id].name : id;
      } else {
        Board.el('circle', { cx: x, cy: y, r: 22, fill: '#e9dcc4', stroke: '#c9b89c', 'stroke-width': 2 }, g);
        const t = Board.el('text', { x, y, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 22, 'font-weight': 900, fill: '#a8957a' }, g);
        t.textContent = '?';
      }
    });
  }

  function overlay() {
    const g = Board.el('g', { 'pointer-events': 'all', cursor: 'pointer' }, Board.layer('top'));
    Board.el('rect', { x: 0, y: 0, width: 1280, height: 720, fill: 'rgba(15,10,8,0.6)' }, g);
    return g;
  }
  function text(g, x, y, str, attrs) {
    const n = Board.el('text', { x, y, 'text-anchor': 'middle', fill: '#3a2a1e', ...attrs }, g);
    n.textContent = str;
    return n;
  }

  // 이름 카드: 새로 발견한 요리마다 한 장씩, 클릭으로 넘김 → then
  function card(ids, then) {
    let k = 0;
    const next = () => {
      if (k >= ids.length) { then(); return; }
      const id = ids[k++];
      const m = CFG.menus[id];
      const g = overlay();
      const cx = CARD.x + CARD.w / 2;
      Board.el('rect', { x: CARD.x, y: CARD.y, width: CARD.w, height: CARD.h, rx: 22, fill: '#fffdf6', stroke: '#e0a457', 'stroke-width': 6 }, g);
      text(g, cx, CARD.y + 62, m.hidden ? (L().title || '숨은 요리 발견!') : (L().recipe || '새 레시피!'), { 'font-size': 30, 'font-weight': 900, fill: m.hidden ? '#e07a2c' : '#3f8a2c' }); // 일반 메뉴는 레시피 해금 (T45)
      text(g, cx, CARD.y + 140, m.name, { 'font-size': 46, 'font-weight': 900 });
      ingRow(g, m.requires, cx, CARD.y + 220, true);
      text(g, cx, CARD.y + 320, m.desc || '', { 'font-size': 18, fill: '#8a7460' });
      text(g, CARD.x + CARD.w - 90, CARD.y + CARD.h - 24, L().close || '클릭해서 닫기 ▶', { 'font-size': 15, 'font-weight': 700, fill: '#c0661c' });
      Sfx.finish();
      g.addEventListener('pointerdown', (e) => { e.stopPropagation(); Sfx.unlock(); g.remove(); next(); }, { once: true });
    };
    next();
  }

  // 도감 화면: 숨은 요리 칸마다 — 모르면 ??? , 알면 이름·재료·발견 일차·설명. 클릭으로 닫힘
  function book() {
    const ids = hiddenIds();
    const g = overlay();
    const cx = BOOK.x + BOOK.w / 2;
    Board.el('rect', { x: BOOK.x, y: BOOK.y, width: BOOK.w, height: BOOK.h, rx: 22, fill: '#fbf3e3', stroke: '#8a5a34', 'stroke-width': 5 }, g);
    text(g, cx, BOOK.y + 52, L().bookTitle || '숨은 요리 도감', { 'font-size': 30, 'font-weight': 900 });
    text(g, cx, BOOK.y + 82, (L().count || '발견 {n}/{all}').replace('{n}', found.size).replace('{all}', ids.length), { 'font-size': 17, fill: '#8a7460' });
    ids.forEach((id, i) => {
      const m = CFG.menus[id];
      const y = BOOK.rowTop + i * BOOK.rowH;
      const known = found.has(id);
      Board.el('rect', { x: BOOK.x + 30, y, width: BOOK.w - 60, height: BOOK.rowH - 16, rx: 14, fill: known ? '#fffdf6' : '#efe4cf', stroke: '#d8c7a6', 'stroke-width': 2 }, g);
      const lx = BOOK.x + 60;
      text(g, lx, y + 46, known ? m.name : (L().unknown || '???'), { 'text-anchor': 'start', 'font-size': 26, 'font-weight': 900, fill: known ? '#3a2a1e' : '#a8957a' });
      if (known) {
        text(g, lx, y + 82, m.desc || '', { 'text-anchor': 'start', 'font-size': 15, fill: '#8a7460' });
        text(g, lx, y + 110, (L().foundOn || '{n}일차 발견').replace('{n}', found.get(id)), { 'text-anchor': 'start', 'font-size': 14, 'font-weight': 700, fill: '#c0661c' });
      }
      ingRow(g, m.requires, BOOK.x + BOOK.w - 170, y + 52, known);
    });
    text(g, BOOK.x + BOOK.w - 90, BOOK.y + BOOK.h - 22, L().close || '클릭해서 닫기 ▶', { 'font-size': 15, 'font-weight': 700, fill: '#c0661c' });
    Log.add({ step: '도감', found: [...found.keys()], line: `도감 열기 | 발견 ${found.size}/${ids.length}` });
    g.addEventListener('pointerdown', (e) => { e.stopPropagation(); g.remove(); }, { once: true });
  }

  return { init, onState, check, card, book, found: () => [...found.keys()] };
})();
