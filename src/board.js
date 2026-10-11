// 불판 SVG. 화면은 1280×720 논리 좌표.
// 배치용 상수는 여기에 둔다. data.js는 플레이 수치·텍스트 전용이다.
// 레이어 순서: 배경(포장마차) → 손님 → 카운터 앞턱 → 철판 → 구멍 → 반죽 다리(넘침) → 반죽·얼굴 → 입력 영역 → 옆 도구 → 끌기 → 맨 위
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
    const grad = el('radialGradient', { id: 'hole-shade', cx: '50%', cy: '38%', r: '62%' }, defs);
    el('stop', { offset: '0%', 'stop-color': '#2a2725' }, grad);
    el('stop', { offset: '70%', 'stop-color': '#121110' }, grad);
    el('stop', { offset: '100%', 'stop-color': '#050505' }, grad);
    // 무쇠 불판 (T35)
    const P = CFG.scene.plate;
    const iron = el('linearGradient', { id: 'plate-iron', x1: 0, y1: 0, x2: 0.3, y2: 1 }, defs);
    el('stop', { offset: '0%', 'stop-color': P.iron[0] }, iron);
    el('stop', { offset: '100%', 'stop-color': P.iron[1] }, iron);
    // 공 입체 음영 (T35): 왼쪽 위 반사광 → 투명 → 오른쪽 아래 그림자
    const ball = el('radialGradient', { id: 'ball-shade', cx: '34%', cy: '30%', r: '78%' }, defs);
    el('stop', { offset: '0%', 'stop-color': '#ffffff', 'stop-opacity': 0.55 }, ball);
    el('stop', { offset: '28%', 'stop-color': '#ffffff', 'stop-opacity': 0 }, ball);
    el('stop', { offset: '70%', 'stop-color': '#000000', 'stop-opacity': 0 }, ball);
    el('stop', { offset: '100%', 'stop-color': '#000000', 'stop-opacity': 0.38 }, ball);

    layers.bg = el('g', {}, svg);       // 포장마차 배경 (scene.js)
    layers.guest = el('g', {}, svg);    // 손님 (카운터 너머)
    layers.counter = el('g', {}, svg);  // 카운터 앞턱 — 손님 아랫부분을 가린다

    plate = el('rect', {
      x: PLATE.cx - PLATE.w / 2, y: PLATE.cy - PLATE.h / 2,
      width: PLATE.w, height: PLATE.h, rx: PLATE.r,
      fill: 'url(#plate-iron)', stroke: '#0b0a0a', 'stroke-width': 6,
    }, svg);
    // 판면 기름 윤기 (아주 옅게)
    for (const [dx, dy, w] of [[-190, -120, 60], [120, 130, 80], [200, -135, 40], [-60, 140, 50]]) {
      el('ellipse', { cx: PLATE.cx + dx, cy: PLATE.cy + dy, rx: w, ry: 5, fill: '#ffffff', opacity: 0.06, 'pointer-events': 'none' }, svg);
    }

    const holeLayer = el('g', {}, svg);
    const bridgeLayer = el('g', {}, svg);
    const batterLayer = el('g', {}, svg);
    const hitLayer = el('g', {}, svg);
    layers.side = el('g', {}, svg);                             // 불판 옆 도구(문어 접시 등)
    layers.drag = el('g', { 'pointer-events': 'none' }, svg);  // 끌고 다니는 물건
    layers.ui = el('g', {}, svg);                               // 대화창 (top을 비워도 남는다)
    layers.top = el('g', { 'pointer-events': 'none' }, svg);   // 단계 끝 등급 글자

    const x0 = PLATE.cx - HOLE.gapX * (COLS - 1) / 2;
    const y0 = PLATE.cy - HOLE.gapY * (ROWS - 1) / 2;
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const id = row * COLS + col;
        const cx = x0 + col * HOLE.gapX;
        const cy = y0 + row * HOLE.gapY;

        el('circle', { cx, cy, r: HOLE.r + 4, fill: CFG.scene.plate.rim }, holeLayer);
        el('circle', { cx, cy, r: HOLE.r, fill: 'url(#hole-shade)' }, holeLayer);
        el('path', { d: `M ${cx - (HOLE.r + 2) * 0.8} ${cy - (HOLE.r + 2) * 0.6} A ${HOLE.r + 2} ${HOLE.r + 2} 0 0 1 ${cx + (HOLE.r + 2) * 0.8} ${cy - (HOLE.r + 2) * 0.6}`, fill: 'none', stroke: CFG.scene.plate.rimHi, 'stroke-width': 2, opacity: 0.7 }, holeLayer); // 테두리 위쪽 하이라이트

        const bridge = el('rect', { rx: 18, visibility: 'hidden' }, bridgeLayer);
        const spill = el('path', { visibility: 'hidden', 'stroke-width': 1.5 }, bridgeLayer); // 구멍 둘레로 번진 반죽 (T35)

        const batter = el('ellipse', { cx, cy, rx: 0, ry: 0, 'stroke-width': 2 }, batterLayer);
        // 노릇한 테두리 링 (T32): 바닥이 익는 정도가 구멍 가장자리로 올라온다 — 뒤집을 때를 알리는 신호
        const ring = el('circle', { cx, cy, r: 0, fill: 'none', 'stroke-width': 0, visibility: 'hidden' }, batterLayer);
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
        const rawBand = el('path', { fill: 'none', 'stroke-width': 8, 'stroke-linecap': 'round', visibility: 'hidden' }, batterLayer); // 1차 반구 아래 아직 안 익은 반죽 띠 (T32)
        const shine = el('ellipse', { fill: '#fff', opacity: 0.55, visibility: 'hidden' }, batterLayer); // 잘 짠 윤기
        const face = el('g', { visibility: 'hidden' }, batterLayer);
        // 공 입체 음영 (T35): 얼굴 그룹 맨 아래 — 기울기·들썩·뒤집기 연출을 같이 따라간다
        const shade = el('ellipse', { fill: 'url(#ball-shade)', 'pointer-events': 'none' }, face);
        // 다 익은 공의 갈색 점 (T32). 눈보다 먼저 = 아래
        const dots = el('g', { display: 'none' }, face);
        for (let k = 0; k < 6; k++) el('circle', {}, dots);
        const eyes = [0, 1].map(() => ({
          white: el('ellipse', { fill: '#fffaf0' }, face),
          pupil: el('ellipse', { fill: '#2a1d14' }, face),
        }));
        const mouth = el('path', { fill: 'none', stroke: '#2a1d14', 'stroke-width': 2.5, 'stroke-linecap': 'round', visibility: 'hidden' }, face);
        const sweat = [0, 1].map(() => el('path', { fill: '#8fd3f4', stroke: '#5fb4de', 'stroke-width': 1, visibility: 'hidden' }, face));
        // 최종 표정용: X 눈(탐), 얼룩(어설픔). display로 끈다 (visibility는 자식이 부모를 덮어쓴다)
        const xeyes = el('path', { fill: 'none', stroke: '#1a1210', 'stroke-width': 3, 'stroke-linecap': 'round', display: 'none' }, face);
        const spots = el('g', { display: 'none' }, face);
        for (let k = 0; k < 4; k++) el('circle', { fill: '#8a5a2e', opacity: 0.45 }, spots);
        // 연기(탐): 기울기와 무관하게 위로 올라가므로 face 그룹 밖
        const smoke = [0, 1].map(() => el('path', { fill: 'none', stroke: '#9c9c9c', 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0.7, display: 'none' }, batterLayer));
        // 김(2차 큐 신호): 연기보다 가늘고 하얗다. face 그룹 밖
        const steam = el('g', { display: 'none' }, batterLayer);
        const steamPaths = [0, 1, 2].map(() => el('path', { fill: 'none', 'stroke-width': 3.5, 'stroke-linecap': 'round' }, steam));

        // 입력은 투명한 원이 받는다 (반죽이 넘쳐도 구멍 범위로 판정)
        const hit = el('circle', { cx, cy, r: HOLE.r + 4, fill: 'transparent' }, hitLayer);

        holes.push({ id, row, col, cx, cy, r: HOLE.r, spill, shade, batter, ring, core, bubbles, bubbleSlots, octo, rim, rawBand, shine, face, dots, eyes, mouth, sweat, xeyes, spots, smoke, steam, steamPaths, bridge, hit });
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

  // 그 점이 철판(둥근 모서리 무시한 사각형) 안인가
  function onPlate(x, y) {
    return Math.abs(x - PLATE.cx) <= PLATE.w / 2 && Math.abs(y - PLATE.cy) <= PLATE.h / 2;
  }

  return {
    create,
    onPlate,
    holes,
    neighbor,
    toSvg,
    holeAt,
    el,
    layer: (name) => layers[name],
    get plate() { return plate; },
  };
})();
