// 문어 넣기 (② 문어 단계): 재료판(tray.js) 문어 칸의 조각을 반죽이 든 구멍으로 끌어다 놓는다. 6개를 다 넣으면 단계가 끝난다.
// 구멍 중심에서 벗어난 정도로 판정한다. 많이 벗어나면 다리가 삐져나온다.
// 불판 밖(재료판 제외)에 떨어뜨리면 잃어버린다 → 그 구멍은 문어 없는 타코야키가 된다. (사용자 결정 2026-10-10)
const Octopus = (() => {
  // 배치·모양 상수
  const PIECE = { r: 13, color: '#b9475a', dark: '#8e2f42', sucker: '#f0b9c0' };
  const SLOTS = [[-32, -16], [0, -16], [32, -16], [-32, 16], [0, 16], [32, 16]]; // 문어 칸 안 2×3

  const pieces = []; // { el, home: {x, y}, used }
  let drag = null;   // { piece }
  let dishG = null;
  let scores = [];   // 단계 등급용: 중심 2 / 깔끔 1 / 다리 삐짐 0

  function init() {
    const side = Board.el('g', {}, Board.layer('side')); // 문어 조각 묶음 (재료판 위, ⑤에서 숨긴다)
    dishG = side;
    const c = Tray.cell(0);
    for (const [dx, dy] of SLOTS) {
      const home = { x: c.cx + dx, y: c.cy + dy };
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
    if (piece.used || drag || e.button !== 0 || !Stage.is('octopus')) return;
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
    dishG.appendChild(piece.el);
    piece.el.setAttribute('cursor', 'grab');

    const p = Board.toSvg(e);
    const hole = Board.holeAt(p.x, p.y);
    if (!hole && !Board.onPlate(p.x, p.y) && !Tray.contains(p.x, p.y)) {
      lose(piece, p, e.timeStamp);
      return;
    }
    if (!hole || !hole.hasBatter || hole.hasOcto) {
      // 넣을 수 없는 곳 → 재료판으로 돌아간다
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
    const { legRatio, perfectRatio } = CFG.timing.octopus;
    const leg = ratio > legRatio;
    const center = ratio <= perfectRatio;
    const result = leg ? '다리 삐짐' : center ? '깔끔(중심)' : '깔끔';
    scores.push(leg ? 0 : center ? 2 : 1);
    hole.hasOcto = true;
    hole.octoLeg = leg;
    hole.ings.add('octopus'); // 알별 재료 (T27)

    // 조각은 반죽 안쪽에 반쯤 묻힌다. 너무 바깥이면 안쪽으로 당겨 그린다
    const ang = Math.atan2(dy, dx);
    const inR = Math.min(dist, hole.r * 0.7);
    const px = hole.cx + Math.cos(ang) * inR;
    const py = hole.cy + Math.sin(ang) * inR;
    // 조각은 1차 뒤집기 때 안으로 들어가 숨는다(다리만 남는다, 2026-10-10 사용자)
    const chunk = Board.el('g', { 'data-chunk': '1' }, hole.octo);
    drawChunk(chunk, px, py, 0.85);
    if (leg) drawLeg(hole.octo, px, py, ang, hole);

    Sfx.plop(leg);
    Log.add({
      step: '문어', hole: hole.id + 1, inputAt: Math.round(inputAt), distPx: Math.round(dist), ratio: +ratio.toFixed(2), result,
      line: `문어 #${hole.id + 1} | 입력 ${Math.round(inputAt)} | 중심 거리 ${Math.round(dist)}px (${ratio.toFixed(2)}r) | ${result}`,
    });
    checkDone();
  }

  // 6조각을 다 썼으면(넣었거나 잃어버렸으면) — 1일차만 단계 끝 (T27, Fill이 판단)
  function checkDone() {
    if (pieces.every((pc) => pc.used)) Fill.octopusDone();
  }

  // 바닥으로 떨어지며 사라진다
  const LOSE_MS = 350;
  function lose(piece, p, inputAt) {
    piece.used = true;
    scores.push(0);
    Sfx.flipFail(); // 퍽
    const t0 = performance.now();
    const fall = (now) => {
      const u = Math.min(1, (now - t0) / LOSE_MS);
      piece.el.setAttribute('transform', `translate(${p.x} ${p.y + 60 * u * u}) rotate(${120 * u})`);
      piece.el.setAttribute('opacity', (1 - u).toFixed(2));
      if (u < 1) requestAnimationFrame(fall);
      else piece.el.setAttribute('visibility', 'hidden');
    };
    requestAnimationFrame(fall);
    Log.add({
      step: '문어', inputAt: Math.round(inputAt), result: '잃어버림',
      line: `문어 | 입력 ${Math.round(inputAt)} | 불판 밖 (${Math.round(p.x)}, ${Math.round(p.y)}) | 잃어버림`,
    });
    checkDone();
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
    if (hole.ings) hole.ings.clear();
  }

  function reset() {
    scores = [];
    for (const piece of pieces) {
      piece.used = false;
      piece.el.setAttribute('visibility', 'visible');
      piece.el.removeAttribute('opacity');
      piece.el.setAttribute('transform', `translate(${piece.home.x} ${piece.home.y})`);
    }
  }

  function setVisible(on) {
    dishG.setAttribute('display', on ? 'inline' : 'none');
    Tray.setVisible(on);
  }

  return { init, clear, reset, setVisible, scores: () => scores.slice(), busy: () => !!drag };
})();
