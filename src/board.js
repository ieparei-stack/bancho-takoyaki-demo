// 불판 SVG. 화면은 1280×720 논리 좌표.
// 배치용 상수는 여기에 둔다. data.js는 플레이 수치·텍스트 전용이다.
// 레이어 순서: 철판 → 구멍 → 반죽 다리(넘침) → 반죽·얼굴 → 입력 영역
const Board = (() => {
  const NS = 'http://www.w3.org/2000/svg';
  const VIEW = { w: 1280, h: 720 };
  const PLATE = { cx: 560, cy: 380, w: 520, h: 340, r: 36 };
  const HOLE = { r: 62, gapX: 160, gapY: 150 };
  const COLS = 3;
  const ROWS = 2;

  const holes = []; // { id, row, col, cx, cy, r, batter, face, eyes, bridge, hit }
  let plate = null;

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

    plate = el('rect', {
      x: PLATE.cx - PLATE.w / 2, y: PLATE.cy - PLATE.h / 2,
      width: PLATE.w, height: PLATE.h, rx: PLATE.r,
      fill: '#4a4744', stroke: '#2b2927', 'stroke-width': 6,
    }, svg);

    const holeLayer = el('g', {}, svg);
    const bridgeLayer = el('g', {}, svg);
    const batterLayer = el('g', {}, svg);
    const hitLayer = el('g', {}, svg);

    const x0 = PLATE.cx - HOLE.gapX * (COLS - 1) / 2;
    const y0 = PLATE.cy - HOLE.gapY * (ROWS - 1) / 2;
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const id = row * COLS + col;
        const cx = x0 + col * HOLE.gapX;
        const cy = y0 + row * HOLE.gapY;

        el('circle', { cx, cy, r: HOLE.r + 4, fill: '#5c5855' }, holeLayer);
        el('circle', { cx, cy, r: HOLE.r, fill: 'url(#hole-shade)' }, holeLayer);

        const bridge = el('rect', { rx: 18, visibility: 'hidden' }, bridgeLayer);

        const batter = el('ellipse', { cx, cy, rx: 0, ry: 0, 'stroke-width': 2 }, batterLayer);
        const face = el('g', { visibility: 'hidden' }, batterLayer);
        const eyes = [0, 1].map(() => ({
          white: el('ellipse', { fill: '#fffaf0' }, face),
          pupil: el('ellipse', { fill: '#2a1d14' }, face),
        }));

        // 입력은 투명한 원이 받는다 (반죽이 넘쳐도 구멍 범위로 판정)
        const hit = el('circle', { cx, cy, r: HOLE.r + 4, fill: 'transparent' }, hitLayer);

        holes.push({ id, row, col, cx, cy, r: HOLE.r, batter, face, eyes, bridge, hit });
      }
    }
    return svg;
  }

  // 같은 줄의 다음 구멍, 줄 끝이면 이전 구멍
  function neighbor(hole) {
    const col = hole.col < COLS - 1 ? hole.col + 1 : hole.col - 1;
    return holes[hole.row * COLS + col];
  }

  return {
    create,
    holes,
    neighbor,
    get plate() { return plate; },
  };
})();
