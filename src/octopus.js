// 문어 넣기: 접시의 문어 조각을 반죽이 든 구멍으로 끌어다 놓는다.
// 구멍 중심에서 벗어난 정도로 판정한다. 많이 벗어나면 다리가 삐져나온다.
const Octopus = (() => {
  // 배치·모양 상수
  const DISH = { cx: 950, cy: 380, r: 95 };
  const PIECE = { r: 13, color: '#b9475a', dark: '#8e2f42', sucker: '#f0b9c0' };
  const SLOTS = [[-38, -30], [0, -42], [38, -30], [-38, 22], [0, 34], [38, 22]];

  const pieces = []; // { el, home: {x, y}, used }
  let drag = null;   // { piece }

  function init() {
    const side = Board.layer('side');
    Board.el('circle', { cx: DISH.cx, cy: DISH.cy, r: DISH.r, fill: '#f4efe6', stroke: '#cfc6b8', 'stroke-width': 4 }, side);
    Board.el('circle', { cx: DISH.cx, cy: DISH.cy, r: DISH.r - 16, fill: 'none', stroke: '#e3dbcd', 'stroke-width': 2 }, side);
    for (const [dx, dy] of SLOTS) {
      const home = { x: DISH.cx + dx, y: DISH.cy + dy };
      const el = Board.el('g', { cursor: 'grab' }, side);
      drawChunk(el, 0, 0, 1);
      el.setAttribute('transform', `translate(${home.x} ${home.y})`);
      const piece = { el, home, used: false };
      el.addEventListener('pointerdown', (e) => pick(piece, e));
      pieces.push(piece);
    }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', drop);
  }

  // 문어 조각 한 덩이 (빨판 점 3개)
  function drawChunk(parent, x, y, scale) {
    const r = PIECE.r * scale;
    Board.el('ellipse', { cx: x, cy: y, rx: r * 1.15, ry: r, fill: PIECE.color, stroke: PIECE.dark, 'stroke-width': 2 }, parent);
    [[-0.45, 0.1], [0.1, 0.35], [0.5, -0.05]].forEach(([sx, sy]) => {
      Board.el('circle', { cx: x + sx * r, cy: y + sy * r, r: r * 0.17, fill: PIECE.sucker }, parent);
    });
  }

  function pick(piece, e) {
    if (piece.used || drag || e.button !== 0 || Pour.busy() || Flip.busy()) return;
    e.stopPropagation();
    Sfx.unlock();
    drag = { piece };
    Board.layer('drag').appendChild(piece.el);
    piece.el.setAttribute('cursor', 'grabbing');
    follow(e);
  }

  function follow(e) {
    const p = Board.toSvg(e);
    drag.piece.el.setAttribute('transform', `translate(${p.x} ${p.y}) scale(1.15)`);
  }

  function move(e) {
    if (drag) follow(e);
  }

  function drop(e) {
    if (!drag) return;
    const { piece } = drag;
    drag = null;
    Board.layer('side').appendChild(piece.el);
    piece.el.setAttribute('cursor', 'grab');

    const p = Board.toSvg(e);
    const hole = Board.holeAt(p.x, p.y);
    if (!hole || !hole.hasBatter || hole.hasOcto) {
      // 넣을 수 없는 곳 → 접시로 돌아간다
      piece.el.setAttribute('transform', `translate(${piece.home.x} ${piece.home.y})`);
      return;
    }

    piece.used = true;
    piece.el.setAttribute('visibility', 'hidden');
    place(hole, p.x, p.y, e.timeStamp);
  }

  function place(hole, x, y, inputAt) {
    const dx = x - hole.cx;
    const dy = y - hole.cy;
    const dist = Math.hypot(dx, dy);
    const ratio = dist / hole.r;
    const leg = ratio > CFG.timing.octopus.legRatio;
    const result = leg ? '다리 삐짐' : '깔끔';
    hole.hasOcto = true;
    hole.octoLeg = leg;

    // 조각은 반죽 안쪽에 반쯤 묻힌다. 너무 바깥이면 안쪽으로 당겨 그린다
    const ang = Math.atan2(dy, dx);
    const inR = Math.min(dist, hole.r * 0.7);
    const px = hole.cx + Math.cos(ang) * inR;
    const py = hole.cy + Math.sin(ang) * inR;
    drawChunk(hole.octo, px, py, 0.85);
    if (leg) drawLeg(hole.octo, px, py, ang, hole);

    Sfx.plop(leg);
    Log.add({
      step: '문어', hole: hole.id + 1, inputAt: Math.round(inputAt), distPx: Math.round(dist), ratio: +ratio.toFixed(2), result,
      line: `문어 #${hole.id + 1} | 입력 ${Math.round(inputAt)} | 중심 거리 ${Math.round(dist)}px (${ratio.toFixed(2)}r) | ${result}`,
    });
  }

  // 반죽 밖으로 말려 나온 다리
  function drawLeg(parent, x, y, ang, hole) {
    const out = (hole.size || hole.r) + 18;
    const ex = hole.cx + Math.cos(ang) * out;
    const ey = hole.cy + Math.sin(ang) * out;
    // 다리 끝이 옆으로 말리게 수직 방향으로 조절점을 민다
    const nx = -Math.sin(ang) * 16;
    const ny = Math.cos(ang) * 16;
    const mx = (x + ex) / 2 + nx;
    const my = (y + ey) / 2 + ny;
    Board.el('path', {
      d: `M ${x} ${y} Q ${mx} ${my} ${ex} ${ey} q ${-nx * 0.6} ${-ny * 0.6} ${-Math.cos(ang) * 6 - nx * 0.4} ${-Math.sin(ang) * 6 - ny * 0.4}`,
      fill: 'none', stroke: PIECE.color, 'stroke-width': 9, 'stroke-linecap': 'round',
    }, parent);
    Board.el('circle', { cx: (mx + ex) / 2, cy: (my + ey) / 2, r: 1.8, fill: PIECE.sucker }, parent);
    Board.el('circle', { cx: (x + mx) / 2, cy: (y + my) / 2, r: 1.8, fill: PIECE.sucker }, parent);
  }

  function clear(hole) {
    hole.hasOcto = false;
    hole.octoLeg = false;
    hole.octo.replaceChildren();
  }

  function reset() {
    for (const piece of pieces) {
      piece.used = false;
      piece.el.setAttribute('visibility', 'visible');
      piece.el.setAttribute('transform', `translate(${piece.home.x} ${piece.home.y})`);
    }
  }

  return { init, clear, reset, busy: () => !!drag };
})();
