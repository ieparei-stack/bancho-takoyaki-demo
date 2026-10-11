// 타이틀 화면 (T45, 사용자 흐름 2026-10-11 "편지 이미지가 있는 배경화면에서 시작, 클릭해서 시작").
// 지금은 도형 편지지 — 9단계에 art.title 이미지로 바꾼다. 문구는 data.js letters.title
const Title = (() => {
  function show(then) {
    const T = CFG.letters.title || {};
    const g = Board.el('g', { 'pointer-events': 'all', cursor: 'pointer' }, Board.layer('top'));
    Board.el('rect', { x: 0, y: 0, width: 1280, height: 720, fill: '#2a1d16' }, g);
    if (CFG.art && CFG.art.title) {
      Board.el('image', { href: CFG.art.title, x: 0, y: 0, width: 1280, height: 720, preserveAspectRatio: 'xMidYMid slice' }, g);
    } else {
      // 나무 책상 위 기울어진 편지지 + 봉투
      for (let k = 0; k < 8; k++) Board.el('rect', { x: 0, y: k * 90, width: 1280, height: 88, fill: k % 2 ? '#3a281d' : '#33231a' }, g);
      Board.el('rect', { x: 760, y: 360, width: 360, height: 230, rx: 8, fill: '#d9c39a', stroke: '#a88a5c', 'stroke-width': 3, transform: 'rotate(8 940 475)' }, g);
      Board.el('path', { d: 'M 760 360 L 940 480 L 1120 360', fill: 'none', stroke: '#a88a5c', 'stroke-width': 3, transform: 'rotate(8 940 475)' }, g);
      Board.el('circle', { cx: 940, cy: 480, r: 22, fill: '#b23a2e', transform: 'rotate(8 940 475)' }, g);
      const paper = Board.el('g', { transform: 'rotate(-4 520 380)' }, g);
      Board.el('rect', { x: 250, y: 120, width: 540, height: 520, rx: 6, fill: '#fbf5e6', stroke: '#d8c7a6', 'stroke-width': 3 }, paper);
      for (let k = 0; k < 10; k++) Board.el('line', { x1: 290, y1: 330 + k * 28, x2: 750, y2: 330 + k * 28, stroke: '#e8dcc2', 'stroke-width': 1.5 }, paper);
      const lines = [[300, 344, 380], [300, 372, 430], [300, 400, 350], [300, 428, 410], [300, 456, 300]];
      for (const [x, y, w] of lines) Board.el('line', { x1: x, y1: y, x2: x + w, y2: y, stroke: '#9a8a70', 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0.6 }, paper);
    }
    const text = (x, y, str, attrs) => { const t = Board.el('text', { x, y, 'text-anchor': 'middle', ...attrs }, g); t.textContent = str; return t; };
    text(520, 205, T.sub || '', { 'font-size': 22, fill: '#8a7460', transform: 'rotate(-4 520 380)' });
    text(520, 265, T.name || '', { 'font-size': 50, 'font-weight': 900, fill: '#3a2a1e', transform: 'rotate(-4 520 380)' });
    const start = text(640, 690, T.start || '클릭해서 시작 ▶', { 'font-size': 22, 'font-weight': 700, fill: '#ffd34d' });
    Board.el('animate', { attributeName: 'opacity', values: '1;0.3;1', dur: '1.4s', repeatCount: 'indefinite' }, start);
    g.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      Sfx.unlock();
      g.remove();
      Log.add({ step: '흐름', line: '타이틀 → 시작' });
      then();
    }, { once: true });
  }

  return { show };
})();
