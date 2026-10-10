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

  const holes = []; // { id, row, col, cx, cy, r, batter, octo, face, eyes, bridge, hit }
  const layers = {};
  let plate = null;
  let svg = null;

  function el(tag, attrs, parent) {
    const node = document.createElementNS(NS, tag);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(node);
    return node;
  }

  function create(container) {
    svg = el('svg', {
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
    layers.side = el('g', {}, svg);                             // 불판 옆 도구(문어 접시 등)
    layers.drag = el('g', { 'pointer-events': 'none' }, svg);  // 끌고 다니는 물건

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
        // 1차 굽기 힌트: 아직 안 굳은 가운데 반죽 + 굳은 테두리 경계의 기포
        const core = el('ellipse', { cx, cy, rx: 0, ry: 0, visibility: 'hidden' }, batterLayer);
        const bubbles = el('g', { display: 'none' }, batterLayer);
        const bubbleSlots = [];
        for (let b = 0; b < 8; b++) {
          // 구멍·순번으로 고정된 의사난수 → 매 프레임 자리가 흔들리지 않는다
          const h = Math.sin((id + 1) * 127.1 + b * 311.7) * 43758.5453;
          const f = h - Math.floor(h);
          bubbleSlots.push({
            ang: (b / 8) * Math.PI * 2 + f * 0.6,
            rad: 0.45 + ((f * 7) % 1) * 0.45,     // core 경계 ~ 테두리 사이
            r: 2.5 + ((f * 13) % 1) * 2,
            el: el('circle', { fill: '#fff', opacity: 0.75, visibility: 'hidden' }, bubbles),
          });
        }
        const octo = el('g', {}, batterLayer);
        const rim = el('path', { fill: 'none', 'stroke-width': 3, visibility: 'hidden' }, batterLayer); // 뒤집힌 반구 아래 테두리
        const shine = el('ellipse', { fill: '#fff', opacity: 0.55, visibility: 'hidden' }, batterLayer); // 잘 짠 윤기
        const face = el('g', { visibility: 'hidden' }, batterLayer);
        const eyes = [0, 1].map(() => ({
          white: el('ellipse', { fill: '#fffaf0' }, face),
          pupil: el('ellipse', { fill: '#2a1d14' }, face),
        }));
        const mouth = el('path', { fill: 'none', stroke: '#2a1d14', 'stroke-width': 2.5, 'stroke-linecap': 'round', visibility: 'hidden' }, face);
        const sweat = [0, 1].map(() => el('path', { fill: '#8fd3f4', stroke: '#5fb4de', 'stroke-width': 1, visibility: 'hidden' }, face));

        // 입력은 투명한 원이 받는다 (반죽이 넘쳐도 구멍 범위로 판정)
        const hit = el('circle', { cx, cy, r: HOLE.r + 4, fill: 'transparent' }, hitLayer);

        holes.push({ id, row, col, cx, cy, r: HOLE.r, batter, core, bubbles, bubbleSlots, octo, rim, shine, face, eyes, mouth, sweat, bridge, hit });
      }
    }
    return svg;
  }

  // 같은 줄의 다음 구멍, 줄 끝이면 이전 구멍
  function neighbor(hole) {
    const col = hole.col < COLS - 1 ? hole.col + 1 : hole.col - 1;
    return holes[hole.row * COLS + col];
  }

  // 마우스 이벤트 좌표 → SVG 논리 좌표
  function toSvg(e) {
    const p = svg.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    return p.matrixTransform(svg.getScreenCTM().inverse());
  }

  // 그 점이 들어가는 구멍 (입력 원 기준), 없으면 null
  function holeAt(x, y) {
    return holes.find((h) => Math.hypot(x - h.cx, y - h.cy) <= h.r + 4) || null;
  }

  return {
    create,
    holes,
    neighbor,
    toSvg,
    holeAt,
    el,
    layer: (name) => layers[name],
    get plate() { return plate; },
  };
})();
