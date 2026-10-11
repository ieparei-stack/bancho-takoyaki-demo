// 메뉴 (T29): 알마다 든 재료로 메뉴를 정하고, 손님 취향과 굽기 표정으로 그 알의 값을 매긴다. (6단계 인터뷰 2026-10-10/11)
//   메뉴 = 필요 재료가 모두 든 메뉴 중 기본가가 가장 높은 것. 문어 없이 다른 재료만 있고 맞는 게 없으면 별난 타코야키
//   알 값 = (기본가 + 좋아하는 맛 × like − 싫어하는 맛 × dislike + 좋아하는 메뉴면 favorite) × 표정 배수
// 메뉴판(화면 왼쪽)에는 아는 메뉴만 — 처음 만든 메뉴는 서빙 때 추가된다.
const Menu = (() => {
  // 배치 상수
  const BOARD = { x: 20, y: 190, w: 216, lineH: 26 };

  const known = new Set();
  let board = null;
  let rows = null;

  function init() {
    for (const id of Object.keys(CFG.menus)) if (CFG.menus[id].known) known.add(id);
    board = Board.el('g', { 'pointer-events': 'none' }, Board.layer('side'));
    draw();
  }

  // 재료 id 목록 → 메뉴 id
  function resolve(ings) {
    const have = new Set(ings);
    if (!have.size) return 'plain';
    let best = null;
    for (const [id, m] of Object.entries(CFG.menus)) {
      if (!m.requires || !m.requires.length) continue; // plain·odd는 따로
      if (m.requires.every((r) => have.has(r)) && (!best || m.price > CFG.menus[best].price)) best = id;
    }
    return best || 'odd';
  }

  function tagsOf(ings) {
    const out = new Set();
    for (const id of ings) for (const t of (CFG.ingredients[id] ? CFG.ingredients[id].tags : [])) out.add(t);
    return out;
  }

  // 한 알의 값. ball = { ings, face }, guest = customers.cast 항목
  function price(ball, guest) {
    const V = CFG.customers.value;
    const menu = resolve(ball.ings);
    const tags = tagsOf(ball.ings);
    const likeN = (guest.likes || []).filter((t) => tags.has(t)).length;
    const dislikeN = (guest.dislikes || []).filter((t) => tags.has(t)).length;
    const fav = (guest.favorites || []).includes(menu);
    const mult = V.faceMult[ball.face] ?? 1;
    const raw = CFG.menus[menu].price + likeN * V.like - dislikeN * V.dislike + (fav ? V.favorite : 0);
    return { menu, tags: [...tags], likeN, dislikeN, fav, mult, value: Math.max(0, Math.round(raw * mult)) };
  }

  // 메뉴판 다시 그리기 (data.js 순서대로)
  function draw(fresh) {
    board.replaceChildren();
    const ids = Object.keys(CFG.menus).filter((id) => known.has(id));
    const h = 54 + ids.length * BOARD.lineH;
    Board.el('rect', { x: BOARD.x, y: BOARD.y, width: BOARD.w, height: h, rx: 12, fill: '#4a3020', stroke: '#2c1f17', 'stroke-width': 3 }, board);
    const title = Board.el('text', { x: BOARD.x + BOARD.w / 2, y: BOARD.y + 30, 'text-anchor': 'middle', 'font-size': 20, 'font-weight': 900, fill: '#f3e6d6' }, board);
    title.textContent = CFG.letters.menu.title;
    ids.forEach((id, i) => {
      const y = BOARD.y + 58 + i * BOARD.lineH;
      const color = id === fresh ? '#ffd34d' : '#f3e6d6';
      const n = Board.el('text', { x: BOARD.x + 14, y, 'font-size': 15, fill: color }, board);
      n.textContent = CFG.menus[id].name;
      const p = Board.el('text', { x: BOARD.x + BOARD.w - 14, y, 'text-anchor': 'end', 'font-size': 15, fill: color }, board);
      p.textContent = `₩${CFG.menus[id].price}`;
    });
    if (fresh) setTimeout(() => draw(), 1500); // 새 줄은 잠깐 노랗게
  }

  // 이번 판에서 처음 만든 메뉴를 배운다 → 새로 배운 id 목록
  function learn(menuIds) {
    const fresh = [];
    for (const id of menuIds) {
      if (id === 'plain' || known.has(id)) continue;
      known.add(id);
      fresh.push(id);
    }
    if (fresh.length) {
      draw(fresh[fresh.length - 1]);
      Log.add({ step: '메뉴', fresh, line: `메뉴 | 새 메뉴: ${fresh.map((id) => CFG.menus[id].name).join(' · ')}` });
    }
    return fresh;
  }

  return { init, resolve, price, learn, tagsOf, known: () => [...known] };
})();
