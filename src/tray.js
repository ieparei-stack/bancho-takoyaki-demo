// 재료판 (T26): 불판 옆 칸 나뉜 나무 그릇. 왼쪽 위 = 문어(고정, 조각은 octopus.js), 나머지 3칸 = 준비에서 고른 재료.
// 칸 수는 문어 1 + 추가 3 (사용자 결정 2026-10-10). 추가 재료를 굽기에 넣는 건 T27.
const Tray = (() => {
  // 배치 상수 (원래 문어 접시 자리)
  const BOX = { cx: 950, cy: 380, w: 260, h: 230, wall: 8 };
  const CELL_W = (BOX.w - BOX.wall * 3) / 2;
  const CELL_H = (BOX.h - BOX.wall * 3) / 2;
  const ITEM_SPOTS = [[-26, -16], [26, -16], [0, 18]]; // 추가 칸 안 아이콘 자리

  let root = null;
  let extras = [];   // 칸 1~3의 내용 그룹
  let chosen = [];

  function cell(i) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = BOX.cx - BOX.w / 2 + BOX.wall + col * (CELL_W + BOX.wall);
    const y = BOX.cy - BOX.h / 2 + BOX.wall + row * (CELL_H + BOX.wall);
    return { x, y, w: CELL_W, h: CELL_H, cx: x + CELL_W / 2, cy: y + CELL_H / 2 };
  }

  function init() {
    root = Board.el('g', {}, Board.layer('side'));
    Board.el('rect', { x: BOX.cx - BOX.w / 2, y: BOX.cy - BOX.h / 2, width: BOX.w, height: BOX.h, rx: 18, fill: '#9a6a3e', stroke: '#5e3d22', 'stroke-width': 4 }, root);
    for (let i = 0; i < 4; i++) {
      const c = cell(i);
      Board.el('rect', { x: c.x, y: c.y, width: c.w, height: c.h, rx: 10, fill: '#e9d6b0', stroke: '#b08a5a', 'stroke-width': 2 }, root);
    }
    for (let i = 1; i < 4; i++) extras.push(Board.el('g', {}, root));
  }

  // 추가 칸 3개에 재료를 채운다 (빈 칸은 비워 둔다)
  function set(ids) {
    chosen = (ids || []).slice(0, 3);
    extras.forEach((g, k) => {
      g.replaceChildren();
      const id = chosen[k];
      if (!id) return;
      const c = cell(k + 1);
      for (const [dx, dy] of ITEM_SPOTS) Shop.icon(id, g, c.cx + dx, c.cy + dy - 6, 15);
      const t = Board.el('text', { x: c.cx, y: c.y + c.h - 6, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: '#5e3d22' }, g);
      t.textContent = CFG.ingredients[id].name;
    });
  }

  function contains(x, y) {
    return Math.abs(x - BOX.cx) <= BOX.w / 2 && Math.abs(y - BOX.cy) <= BOX.h / 2;
  }

  function setVisible(on) {
    root.setAttribute('display', on ? 'inline' : 'none');
  }

  return { init, set, cell, contains, setVisible, chosen: () => chosen.slice() };
})();
