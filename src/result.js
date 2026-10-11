// 결산 화면 (T20): 하루가 끝나면 매출 / 만족 / 판정 집계 / 가장 웃긴 실패(후네 통째로) / 답장 편지 한 줄.
// 미니게임과 같은 비중으로 하나씩 차례로 나타난다. 문구는 data.js letters (Claude 초안 → 플레이 후 수정).
const Result = (() => {
  // 배치 상수 (1280×720)
  const PANEL = { x: 70, y: 36, w: 1140, h: 648 };
  const STEP_MS = 280;                  // 항목이 하나씩 나타나는 간격
  const GRADED = ['pour', 'octopus', 'flip1', 'flip2', 'box'];
  const STAGE_LABEL = { pour: '① 짜기', octopus: '② 문어', flip1: '③ 1차', flip2: '④ 2차', box: '⑤ 후네' };
  const GRADE_COLOR = { perfect: '#e0a020', great: '#e07a2c', good: '#5f9e3a', oops: '#7f93a8' };
  const FACE_NAME = { perfect: '완벽', tasty: '맛있음', meh: '어설픔', raw: '덜 익음', burnt: '탐', blank: '문어 없음' };
  const FAIL_WEIGHT = { blank: 5, burnt: 3, raw: 3, meh: 1 };
  const INK = '#3a2a1e';
  const SUB = '#8a7460';

  let root = null;

  function el(tag, attrs, parent) {
    return Board.el(tag, attrs, parent);
  }
  function text(parent, x, y, str, attrs = {}) {
    const t = el('text', { x, y, fill: INK, 'font-size': 20, ...attrs }, parent);
    t.textContent = str;
    return t;
  }
  function won(n) {
    return `₩${n.toLocaleString('ko-KR')}`;
  }

  // 가장 웃긴 실패: 실패 가중치 + 소스 과다가 가장 큰 후네. 하나도 없으면 매출이 가장 큰 후네 = 오늘의 에이스
  function funniest(records) {
    const saucePx = CFG.customers.react.saucePx;
    const score = (r) => r.faces.reduce((s, f) => s + (FAIL_WEIGHT[f] || 0), 0) + (r.sauceLen > saucePx ? 2 : 0);
    let best = records[0];
    for (const r of records) if (score(r) > score(best)) best = r;
    if (score(best) === 0) {
      best = records.reduce((a, b) => (b.sales > a.sales ? b : a));
      return { rec: best, key: 'ace' };
    }
    const n = (k) => best.faces.filter((f) => f === k).length;
    let key = 'meh';
    if (n('blank')) key = 'noOcto';
    else if (n('burnt') && n('burnt') >= n('raw')) key = 'burnt';
    else if (n('raw')) key = 'raw';
    else if (best.sauceLen > saucePx) key = 'sauce';
    return { rec: best, key };
  }

  function replyKey(total) {
    const d = CFG.day;
    if (total >= d.replyGreat) return 'great';
    if (total >= d.replyOk) return 'ok';
    return 'bad';
  }

  function show({ records, total }) {
    const top = Board.layer('top');
    top.replaceChildren();
    root = el('g', {}, top);
    const items = [];
    const add = (g) => { g.setAttribute('opacity', 0); items.push(g); return g; };

    el('rect', { x: 0, y: 0, width: 1280, height: 720, fill: 'rgba(15,10,8,0.72)' }, root);
    el('rect', { x: PANEL.x, y: PANEL.y, width: PANEL.w, height: PANEL.h, rx: 26, fill: '#fbf3e3', stroke: '#c9b89c', 'stroke-width': 5 }, root);
    text(root, 640, 92, CFG.letters.result.title, { 'text-anchor': 'middle', 'font-size': 38, 'font-weight': 900 });

    // ① 매출 + 만족
    const happy = records.filter((r) => r.satisfied).length;
    let g = add(el('g', {}, root));
    text(g, 110, 160, '매출', { fill: SUB });
    text(g, 110, 214, won(total), { 'font-size': 54, 'font-weight': 900, fill: '#c0661c' });
    g = add(el('g', {}, root));
    text(g, 110, 268, `만족 ${happy} / ${records.length}명`, { fill: SUB });
    records.forEach((r, i) => {
      const react = CFG.customers.reactions[r.reaction];
      text(g, 150 + i * 100, 330, `${r.customer.emoji}→${react.emoji}`, { 'font-size': 22, 'text-anchor': 'middle', 'font-family': 'Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, sans-serif' });
      text(g, 150 + i * 100, 362, won(r.sales), { 'font-size': 16, 'text-anchor': 'middle', fill: SUB });
    });

    // ② 판정 집계: 단계별 등급 × 손님, 그리고 타코야키 표정 집계
    g = add(el('g', {}, root));
    const hist = Stage.history();
    const gx = 110;
    const gy = 410;
    text(g, gx, gy, '단계 등급', { fill: SUB });
    records.forEach((r, i) => text(g, gx + 120 + i * 88, gy, r.customer.emoji, { 'font-size': 24, 'text-anchor': 'middle', 'font-family': 'Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, sans-serif' }));
    GRADED.forEach((name, row) => {
      const y = gy + 34 + row * 30;
      text(g, gx, y, STAGE_LABEL[name], { 'font-size': 18 });
      records.forEach((r, i) => {
        const h = hist.find((e) => e.round === i + 1 && e.name === name);
        if (h) text(g, gx + 120 + i * 88, y, CFG.letters.grade[h.grade], { 'font-size': 15, 'font-weight': 900, 'text-anchor': 'middle', fill: GRADE_COLOR[h.grade] });
      });
    });
    g = add(el('g', {}, root));
    const all = records.flatMap((r) => r.faces);
    const tally = Object.keys(FACE_NAME).map((k) => [FACE_NAME[k], all.filter((f) => f === k).length]).filter(([, c]) => c);
    text(g, 110, 618, `타코야키 ${all.length}개 — ` + tally.map(([k, c]) => `${k} ${c}`).join(' · '), { 'font-size': 18, fill: SUB });

    // ③ 가장 웃긴 실패 (후네 통째로)
    const fun = funniest(records);
    g = add(el('g', {}, root));
    el('rect', { x: 560, y: 128, width: 610, height: 330, rx: 18, fill: '#2a211b' }, g);
    text(g, 865, 166, fun.key === 'ace' ? CFG.letters.result.aceTitle : CFG.letters.result.funnyTitle, { 'text-anchor': 'middle', fill: '#f3e6d6', 'font-size': 22, 'font-weight': 700 });
    const boat = fun.rec.boat.cloneNode(true);
    // 복제본의 clipPath id가 겹치지 않게
    const clip = boat.querySelector('clipPath');
    if (clip) {
      clip.setAttribute('id', 'boat-clip-result');
      boat.querySelectorAll('[clip-path]').forEach((n) => n.setAttribute('clip-path', 'url(#boat-clip-result)'));
    }
    boat.setAttribute('transform', 'translate(865 300) scale(1.55)');
    boat.removeAttribute('opacity');
    boat.setAttribute('display', 'inline');
    g.appendChild(boat);
    text(g, 865, 432, `${fun.rec.customer.emoji}  ${CFG.letters.funny[fun.key]}`, { 'text-anchor': 'middle', fill: '#ffd34d', 'font-size': 24, 'font-weight': 900, 'font-family': 'Segoe UI Emoji, Malgun Gothic, sans-serif' });

    // ④ 답장 편지 한 줄
    g = add(el('g', {}, root));
    el('rect', { x: 560, y: 490, width: 610, height: 150, rx: 14, fill: '#fffdf6', stroke: '#d8c7a6', 'stroke-width': 2 }, g);
    for (let k = 0; k < 2; k++) el('line', { x1: 584, y1: 588 + k * 36, x2: 1146, y2: 588 + k * 36, stroke: '#eadcc2', 'stroke-width': 1.5 }, g);
    text(g, 584, 526, '✉ 사장님의 답장', { fill: SUB, 'font-size': 18 });
    const reply = CFG.letters.reply[replyKey(total)];
    text(g, 584, 576, reply, { 'font-size': 22, 'font-weight': 700 });
    text(g, 1146, 614, CFG.letters.result.sign, { 'text-anchor': 'end', fill: SUB, 'font-size': 18 });

    // 하나씩 나타난다
    items.forEach((item, i) => setTimeout(() => {
      item.setAttribute('opacity', 1);
      Sfx.tick();
      if (i === items.length - 1) Sfx.finish();
    }, 400 + i * STEP_MS));

    Log.add({
      step: '결산', total, satisfied: happy, customers: records.length, funny: fun.key, reply: replyKey(total),
      line: `── 결산 | 매출 ${won(total)} · 만족 ${happy}/${records.length} · 웃긴 실패 ${fun.key}(손님 ${records.indexOf(fun.rec) + 1}) · 답장 ${replyKey(total)}`,
    });
  }

  return { show, funniest };
})();
