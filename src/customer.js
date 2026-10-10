// 손님 (T17): 화면 위쪽에 이모지 손님이 걸어 들어와 주문 말풍선을 띄운다. 1일차는 대기 게이지 없음 (2026-10-10 사용자).
// 한 명씩 차례로 온다. 받기·반응은 T18, 다음 손님 흐름은 T19.
const Customer = (() => {
  // 배치 상수 (건네는 선 y 170 위쪽 공간)
  const SPOT = { x: 560, y: 85 };
  const ENTER_X = 1380;
  const WALK_MS = 500;
  const BUBBLE = { x: 640, y: 40, w: 230, h: 60 };
  const EMOJI_SIZE = 84;

  let g = null;        // 손님 그룹 (이모지)
  let emoji = null;
  let bubble = null;   // { g, text }
  let x = ENTER_X;
  let raf = 0;
  let walk = null;     // { from, t0 }
  let current = null;  // data.js customers.list 항목

  function init() {
    const side = Board.layer('side');
    g = Board.el('g', { display: 'none', 'pointer-events': 'none' }, side);
    emoji = Board.el('text', {
      x: 0, y: 0, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': EMOJI_SIZE,
      'font-family': 'Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, sans-serif',
    }, g);
    const bg = Board.el('g', { display: 'none', 'pointer-events': 'none' }, side);
    Board.el('rect', { x: BUBBLE.x, y: BUBBLE.y, width: BUBBLE.w, height: BUBBLE.h, rx: 18, fill: '#fffaf0', stroke: '#c9b89c', 'stroke-width': 3 }, bg);
    Board.el('path', { d: `M ${BUBBLE.x + 2} ${BUBBLE.y + 34} L ${BUBBLE.x - 16} ${BUBBLE.y + 44} L ${BUBBLE.x + 2} ${BUBBLE.y + 46} Z`, fill: '#fffaf0', stroke: '#c9b89c', 'stroke-width': 3, 'stroke-linejoin': 'round' }, bg);
    Board.el('rect', { x: BUBBLE.x + 1, y: BUBBLE.y + 32, width: 6, height: 16, fill: '#fffaf0' }, bg); // 꼬리 이음새 가림
    const text = Board.el('text', {
      x: BUBBLE.x + BUBBLE.w / 2, y: BUBBLE.y + BUBBLE.h / 2, 'text-anchor': 'middle', 'dominant-baseline': 'central',
      'font-size': 24, 'font-weight': 700, fill: '#3a2a1e',
    }, bg);
    bubble = { g: bg, text };
  }

  function arrive(index) {
    const list = CFG.customers.list;
    current = list[index % list.length];
    emoji.textContent = current.emoji;
    bubble.text.textContent = current.order;
    bubble.g.setAttribute('display', 'none');
    bubble.g.removeAttribute('transform');
    g.setAttribute('display', 'inline');
    walk = { from: ENTER_X, t0: performance.now() };
    if (!raf) raf = requestAnimationFrame(tick);
    Log.add({ step: '손님', index: index + 1, line: `손님 ${index + 1} 도착 | ${current.emoji} "${current.order}"` });
  }

  // 걸어 들어오기(통통 걸음) → 도착하면 말풍선, 그 뒤로는 숨쉬기
  function tick(now) {
    raf = 0;
    let y = SPOT.y;
    if (walk) {
      const u = Math.min(1, (now - walk.t0) / WALK_MS);
      const e = 1 - (1 - u) * (1 - u);
      x = walk.from + (SPOT.x - walk.from) * e;
      y -= Math.abs(Math.sin(u * Math.PI * 3)) * 8 * (1 - u);
      if (u >= 1) {
        walk = null;
        bubble.g.setAttribute('display', 'inline');
      }
    } else {
      y += Math.sin(now / 600) * 2; // 숨쉬기
    }
    g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    raf = requestAnimationFrame(tick);
  }

  // 조리를 시작하면 말풍선이 작아져 손님 옆에 남는다 (후네 자리를 가리지 않게)
  function shrinkBubble() {
    const k = 0.6;
    const ox = BUBBLE.x - 16;
    const oy = BUBBLE.y + 44;
    bubble.g.setAttribute('transform', `translate(${ox} ${oy}) scale(${k}) translate(${-ox} ${-oy})`);
  }

  function reset() {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    walk = null;
    x = ENTER_X;
    g.setAttribute('display', 'none');
    bubble.g.setAttribute('display', 'none');
  }

  return { init, arrive, shrinkBubble, reset };
})();
