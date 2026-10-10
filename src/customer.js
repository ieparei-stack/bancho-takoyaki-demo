// 손님: 화면 위쪽에 걸어 들어와 주문 말풍선을 띄운다(T17). 대기 게이지 없음 (2026-10-10 사용자).
// 건넨 후네는 맨 앞 손님이 받고(T18) 표정별 가격 합(실패 0원)으로 매출, 반응 대사·표정.
// 누가 언제 오고 남고 떠나는지는 Flow(상태 머신, T21)가 정한다. 그림은 이모지 임시 (7단계 도형 → 9단계 이미지).
const Customer = (() => {
  // 배치 상수 (건네는 선 y 170 위쪽 공간)
  const SPOT = { x: 560, y: 85 };
  const ENTER_X = 1380;
  const EXIT_X = -160;
  const WALK_MS = 500;
  const BUBBLE = { x: 640, y: 40, w: 230, h: 60 };
  const EMOJI_SIZE = 84;
  const SALES = { x: 28, y: 40 };       // 왼쪽 위 매출 합계
  const POP_MS = 900;                   // "+₩" 팝업
  const FAIL = ['raw', 'burnt', 'blank'];

  let g = null;        // 손님 그룹 (이모지)
  let emoji = null;
  let bubble = null;   // { g, text }
  let x = ENTER_X;
  let raf = 0;
  let walk = null;     // { from, to, t0, then }
  let current = null;  // data.js customers.cast 항목 + id
  let total = 0;       // 매출 (데모 전체)
  let salesText = null;
  const records = [];  // 결산용: { day, customer, faces, sales, reaction, satisfied, boat }

  function init() {
    const side = Board.layer('side');
    g = Board.el('g', { display: 'none', 'pointer-events': 'none' }, side);
    emoji = Board.el('text', {
      x: 0, y: 0, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': EMOJI_SIZE,
      'font-family': 'Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, sans-serif',
    }, g);
    const bg = Board.el('g', { display: 'none', 'pointer-events': 'none' }, side);
    const box = Board.el('rect', { x: BUBBLE.x, y: BUBBLE.y, width: BUBBLE.w, height: BUBBLE.h, rx: 18, fill: '#fffaf0', stroke: '#c9b89c', 'stroke-width': 3 }, bg);
    Board.el('path', { d: `M ${BUBBLE.x + 2} ${BUBBLE.y + 34} L ${BUBBLE.x - 16} ${BUBBLE.y + 44} L ${BUBBLE.x + 2} ${BUBBLE.y + 46} Z`, fill: '#fffaf0', stroke: '#c9b89c', 'stroke-width': 3, 'stroke-linejoin': 'round' }, bg);
    Board.el('rect', { x: BUBBLE.x + 1, y: BUBBLE.y + 32, width: 6, height: 16, fill: '#fffaf0' }, bg); // 꼬리 이음새 가림
    const text = Board.el('text', {
      x: BUBBLE.x + BUBBLE.w / 2, y: BUBBLE.y + BUBBLE.h / 2, 'text-anchor': 'middle', 'dominant-baseline': 'central',
      'font-size': 24, 'font-weight': 700, fill: '#3a2a1e',
    }, bg);
    bubble = { g: bg, text, box };
    salesText = Board.el('text', { x: SALES.x, y: SALES.y, 'font-size': 24, 'font-weight': 700, fill: '#f3e6d6' }, side);
    showTotal();
  }

  // 말풍선을 보이고 글자 길이에 맞춘다 (보이는 상태여야 길이를 잴 수 있다)
  function showBubble() {
    bubble.g.setAttribute('display', 'inline');
    const w = Math.max(BUBBLE.w, bubble.text.getComputedTextLength() + 44);
    bubble.box.setAttribute('width', w.toFixed(0));
    bubble.text.setAttribute('x', (BUBBLE.x + w / 2).toFixed(0));
  }

  function won(n) {
    return `₩${n.toLocaleString('ko-KR')}`;
  }
  function showTotal() {
    salesText.textContent = `매출 ${won(total)}`;
  }

  // 표정 6개 → 반응 키 (위에서부터 처음 맞는 것). 문구·이모지·임계는 data.js
  function pickReaction(faces, sauceLen, sales) {
    const r = CFG.customers.rules;
    const n = (k) => faces.filter((f) => f === k).length;
    const fails = faces.filter((f) => FAIL.includes(f)).length;
    if (n('blank') >= 1) return 'noOcto';
    if (n('burnt') >= r.burnt) return 'burnt';
    if (fails >= r.fails) return 'raw';
    if (n('perfect') >= r.perfect) return 'great';
    if (sauceLen > r.saucePx) return 'sauce';
    if (sales >= r.goodSales) return 'good';
    return 'meh';
  }

  function price(faces) {
    const p = CFG.customers.price;
    return faces.reduce((sum, f) => sum + (p[f] || 0), 0);
  }

  // 건넨 후네를 받는다
  function serve({ faces, sauceLen, flakes, boat }) {
    const sales = price(faces);
    const key = pickReaction(faces, sauceLen, sales);
    const react = CFG.customers.reactions[key];
    total += sales;
    showTotal();
    emoji.textContent = react.emoji;
    bubble.text.textContent = react.line;
    bubble.g.removeAttribute('transform');
    showBubble();
    popup(sales);
    if (sales > 0) Sfx.coin(); else Sfx.hmm();
    records.push({ day: Flow.day(), customer: current, faces, sales, reaction: key, satisfied: react.satisfied, sauceLen, flakes, boat });

    const NAME = { perfect: '완벽', tasty: '맛있음', meh: '어설픔', raw: '덜 익음', burnt: '탐', blank: '문어 없음' };
    const tally = Object.keys(NAME).map((k) => [NAME[k], faces.filter((f) => f === k).length]).filter(([, c]) => c).map(([k, c]) => `${k} ${c}`).join(' · ');
    Log.add({
      step: '서빙', day: Flow.day(), customer: current.id, faces, sales, reaction: key, satisfied: react.satisfied, total,
      line: `서빙 | ${Flow.day()}일차 ${current.name} ${current.emoji} | ${tally} | ${won(sales)} | 반응 ${key}(${react.satisfied ? '만족' : '불만'}) | 누적 ${won(total)}`,
    });
    Flow.served();
  }

  // 손님 옆에 "+₩" 이 떠오르며 흐려진다
  function popup(sales) {
    const t = Board.el('text', {
      x: SPOT.x - 70, y: SPOT.y, 'text-anchor': 'end', 'font-size': 30, 'font-weight': 900,
      fill: sales > 0 ? '#ffd34d' : '#9fb4c8', stroke: '#1b1512', 'stroke-width': 5, 'paint-order': 'stroke',
    }, Board.layer('top'));
    t.textContent = `+${won(sales)}`;
    const t0 = performance.now();
    const step = (now) => {
      const u = Math.min(1, (now - t0) / POP_MS);
      t.setAttribute('transform', `translate(0 ${(-30 * u).toFixed(1)})`);
      t.setAttribute('opacity', (u < 0.6 ? 1 : 1 - (u - 0.6) / 0.4).toFixed(2));
      if (u < 1) requestAnimationFrame(step); else t.remove();
    };
    requestAnimationFrame(step);
  }

  function arrive(spec) {
    current = spec;
    emoji.textContent = current.emoji;
    bubble.text.textContent = current.order;
    bubble.g.setAttribute('display', 'none');
    bubble.g.removeAttribute('transform');
    g.setAttribute('display', 'inline');
    walk = { from: ENTER_X, to: SPOT.x, t0: performance.now(), then: showBubble };
    if (!raf) raf = requestAnimationFrame(tick);
    Log.add({ step: '손님', id: current.id, line: `손님 도착 | ${current.name} ${current.emoji} "${current.order}"` });
  }

  // 걷기(통통 걸음) → 끝나면 then. 서 있을 때는 숨쉬기
  function tick(now) {
    raf = 0;
    let y = SPOT.y;
    if (walk) {
      const u = Math.min(1, (now - walk.t0) / WALK_MS);
      const e = 1 - (1 - u) * (1 - u);
      x = walk.from + (walk.to - walk.from) * e;
      y -= Math.abs(Math.sin(u * Math.PI * 3)) * 8 * (1 - u);
      if (u >= 1) {
        const then = walk.then;
        walk = null;
        if (then) then();
      }
    } else {
      y += Math.sin(now / 600) * 2; // 숨쉬기
    }
    g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    if (g.getAttribute('display') !== 'none') raf = requestAnimationFrame(tick);
  }

  // 주문이 남았다: 그 자리에 남아 원래 얼굴로, 말풍선은 "한 판 더"
  function stay(line) {
    emoji.textContent = current.emoji;
    bubble.text.textContent = line;
    bubble.g.removeAttribute('transform');
    showBubble();
  }

  // 왼쪽으로 걸어 나간다 → then (Flow가 다음 손님 또는 밤 대화)
  function leave(then) {
    bubble.g.setAttribute('display', 'none');
    walk = { from: x, to: EXIT_X, t0: performance.now(), then: () => {
      g.setAttribute('display', 'none');
      then();
    } };
    if (!raf) raf = requestAnimationFrame(tick);
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

  return { init, arrive, stay, leave, shrinkBubble, reset, serve, pickReaction, getRecords: () => records, get total() { return total; }, get spot() { return SPOT; } };
})();
