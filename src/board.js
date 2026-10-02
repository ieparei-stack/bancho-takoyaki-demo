// 불판 SVG. 화면은 1280×720 논리 좌표.
// 배치용 상수는 여기에 둔다. data.js는 플레이 수치·텍스트 전용이다.
const Board = (() => {
  const NS = 'http://www.w3.org/2000/svg';
  const VIEW = { w: 1280, h: 720 };
  const PLATE = { cx: 560, cy: 380, w: 520, h: 340, r: 36 };
  const HOLE = { r: 62, gapX: 160, gapY: 150 };
  const COLS = 3;
  const ROWS = 2;

  const holes = []; // { id, cx, cy, el }

  function el(tag, attrs, parent) {
    const node = document.createElementNS(NS, tag);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(node);
    return node;
  }

  function create(container) {
    const svg = el('svg', {
      viewBox: `0 0 ${VIEW.w} ${VIEW.h}`,
      preserveAspectRatio: 'xMidYMid meet',
    }, container);

    const defs = el('defs', {}, svg);
    const grad = el('radialGradient', { id: 'hole-shade', cx: '50%', cy: '42%', r: '60%' }, defs);
    el('stop', { offset: '0%', 'stop-color': '#3a3633' }, grad);
    el('stop', { offset: '70%', 'stop-color': '#1e1c1b' }, grad);
    el('stop', { offset: '100%', 'stop-color': '#0d0c0c' }, grad);

    el('rect', {
      x: PLATE.cx - PLATE.w / 2, y: PLATE.cy - PLATE.h / 2,
      width: PLATE.w, height: PLATE.h, rx: PLATE.r,
      fill: '#4a4744', stroke: '#2b2927', 'stroke-width': 6,
    }, svg);

    const x0 = PLATE.cx - HOLE.gapX * (COLS - 1) / 2;
    const y0 = PLATE.cy - HOLE.gapY * (ROWS - 1) / 2;
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const id = row * COLS + col;
        const cx = x0 + col * HOLE.gapX;
        const cy = y0 + row * HOLE.gapY;
        const g = el('g', { 'data-hole': id }, svg);
        el('circle', { cx, cy, r: HOLE.r + 4, fill: '#5c5855' }, g);
        el('circle', { cx, cy, r: HOLE.r, fill: 'url(#hole-shade)' }, g);
        holes.push({ id, cx, cy, el: g });
      }
    }
    return svg;
  }

  return { create, holes };
})();
