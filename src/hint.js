// 첫 판 안내 (T33): 1일차 첫 판에만, 단계가 시작될 때 불판 아래에 한 줄. 입력은 막지 않는다.
// SPEC 확정 "첫 판에 한해 공정 위에 한 줄 힌트" — 단계마다 (사용자 결정 2026-10-11), 문구는 data.js letters.hints
const Hint = (() => {
  const BAR = { cx: 560, y: 612, h: 40, padX: 22 };

  let g = null;
  let bg = null;
  let text = null;

  function init() {
    g = Board.el('g', { 'pointer-events': 'none', display: 'none' }, Board.layer('ui'));
    bg = Board.el('rect', { y: BAR.y - BAR.h / 2, height: BAR.h, rx: BAR.h / 2, fill: 'rgba(15,10,8,0.75)', stroke: '#e0a457', 'stroke-width': 2 }, g);
    text = Board.el('text', { x: BAR.cx, y: BAR.y, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 19, 'font-weight': 700, fill: '#f3e6d6' }, g);
  }

  // 1일차 첫 판인가
  function first() {
    return Flow.day() === 1 && Stage.round() === 1;
  }

  // "**강조**"는 노란 글자로
  function show(stage) {
    const line = CFG.letters.hints[stage];
    if (!first() || !line) { hide(); return; }
    text.replaceChildren();
    line.split('**').forEach((part, i) => {
      if (!part) return;
      const span = Board.el('tspan', i % 2 ? { fill: '#ffd34d' } : {}, text);
      span.textContent = part;
    });
    g.setAttribute('display', 'inline');
    const w = text.getComputedTextLength() + BAR.padX * 2;
    bg.setAttribute('x', (BAR.cx - w / 2).toFixed(0));
    bg.setAttribute('width', w.toFixed(0));
    Log.add({ step: '안내', stage, line: `안내 | ${stage} | ${line.replace(/\*\*/g, '')}` });
  }

  function hide() {
    if (g) g.setAttribute('display', 'none');
  }

  function init2() {
    for (const s of ['octopus', 'flip1', 'flip2', 'box', 'topping']) Stage.onEnter(s, () => show(s));
  }

  return { init: () => { init(); init2(); }, show, hide, text: () => (g.getAttribute('display') === 'none' ? '' : text.textContent) };
})();
