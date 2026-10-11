// 하루 끝 정산 카드 (T38, 7단계 인터뷰 2026-10-11 "정산 → 밤 대화 → 선물"): 마지막 손님이 떠나면 뜨고 클릭하면 닫힌다.
// 오늘 매출 · 판 수(만족) · 오늘 처음 만든 메뉴 · 발견한 숨은 요리 · 받은 선물. 문구는 data.js letters.settle
const Settle = (() => {
  // 배치 상수 (성적표와 같은 종이 카드)
  const PANEL = { x: 330, y: 150, w: 620, h: 380 };
  const ROW = { top: 268, h: 50 };
  const INK = '#3a2a1e';
  const SUB = '#8a7460';

  function won(n) {
    return `₩${n.toLocaleString('ko-KR')}`;
  }

  // 오늘 기록 요약 (검증·로그용으로도 쓴다)
  function summary(day) {
    const recs = Customer.getRecords().filter((r) => r.day === day);
    const sales = recs.reduce((s, r) => s + r.sales, 0);
    const fresh = [...new Set(recs.flatMap((r) => r.fresh || []))];
    const found = [...new Set(recs.flatMap((r) => r.discovered || []))]; // T39가 채운다
    const hidden = Object.keys(CFG.menus).filter((id) => CFG.menus[id].hidden).length;
    return { recs, sales, boards: recs.length, happy: recs.filter((r) => r.satisfied).length, fresh, found, hidden, gifts: Gift.today().map((g) => g.id) };
  }

  function show(day, then) {
    const L = CFG.letters.settle || {};
    const s = summary(day);
    const names = (ids, book) => (ids.length ? ids.map((id) => book[id] ? book[id].name : id).join(' · ') : (L.none || '없음'));
    const rows = [
      [L.sales || '오늘 매출', won(s.sales)],
      [L.boards || '구운 판', (L.boardsVal || '{n}판 · 만족 {m}판').replace('{n}', s.boards).replace('{m}', s.happy)],
      [L.fresh || '처음 만든 메뉴', names(s.fresh, CFG.menus)],
      [L.found || '숨은 요리', `${names(s.found, CFG.menus)}  (${(L.foundVal || '발견 {n}/{all}').replace('{n}', s.found.length).replace('{all}', s.hidden)})`],
      [L.gifts || '받은 선물', names(s.gifts, CFG.gifts || {})],
    ];

    const g = Board.el('g', { 'pointer-events': 'all', cursor: 'pointer' }, Board.layer('top'));
    Board.el('rect', { x: 0, y: 0, width: 1280, height: 720, fill: 'rgba(15,10,8,0.45)' }, g);
    Board.el('rect', { x: PANEL.x, y: PANEL.y, width: PANEL.w, height: PANEL.h, rx: 18, fill: '#fffdf6', stroke: '#c9b89c', 'stroke-width': 4 }, g);
    const text = (x, y, str, attrs) => { const n = Board.el('text', { x, y, fill: INK, ...attrs }, g); n.textContent = str; return n; };
    text(PANEL.x + PANEL.w / 2, PANEL.y + 54, (L.title || '{n}일차 끝').replace('{n}', day), { 'text-anchor': 'middle', 'font-size': 32, 'font-weight': 900 });
    Board.el('line', { x1: PANEL.x + 20, y1: PANEL.y + 78, x2: PANEL.x + PANEL.w - 20, y2: PANEL.y + 78, stroke: '#e5d6b8', 'stroke-width': 2 }, g);
    rows.forEach(([label, val], i) => {
      const y = ROW.top + i * ROW.h;
      text(PANEL.x + 40, y, label, { 'font-size': 18, fill: SUB });
      text(PANEL.x + PANEL.w - 40, y, val, { 'text-anchor': 'end', 'font-size': i === 0 ? 26 : 20, 'font-weight': 900, fill: i === 0 ? '#c0661c' : INK });
    });
    text(PANEL.x + PANEL.w - 28, PANEL.y + PANEL.h - 22, L.close || '클릭해서 밤으로 ▶', { 'text-anchor': 'end', 'font-size': 15, 'font-weight': 700, fill: '#c0661c' });

    Log.add({
      step: '정산', day, sales: s.sales, boards: s.boards, happy: s.happy, fresh: s.fresh, found: s.found, gifts: s.gifts,
      line: `정산 | ${day}일차 ${won(s.sales)} | ${s.boards}판 만족 ${s.happy} | 새 메뉴 ${s.fresh.length} | 숨은 요리 ${s.found.length} | 선물 ${s.gifts.length}`,
    });
    g.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      Sfx.unlock();
      g.remove();
      then();
    }, { once: true });
  }

  return { show, summary };
})();
