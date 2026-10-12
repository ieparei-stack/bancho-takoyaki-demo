// 결과 화면 "포장마차 운영 일지" (T41 "3일의 기록" → T55, 사용자 2026-10-12).
// 장인의 편지 뒤 DEMO_END에서 뜬다. 하나씩 차례로:
//   일차마다 — 손님 아이콘(판마다) + 만족도 별(실패 1 / 굽기 2~4 / 숨은 요구사항까지 5) + 그날 매출
//   받은 선물 목록 · 베스트 메뉴(3일 동안 가장 비싸게 판 알의 후네 + 손님 이름) · 3일 총 매출(맨 아래 크게)
// 문구는 data.js letters.result
const Result = (() => {
  // 배치 상수 (1280×720)
  const PANEL = { x: 70, y: 36, w: 1140, h: 648 };
  const STEP_MS = 320;                  // 항목이 하나씩 나타나는 간격
  const LEFT = { x: 110, right: 590 };  // 왼쪽 칸
  const DAY_ROW = { top: 160, h: 92 };
  const EMOJI_FONT = 'Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, Malgun Gothic, sans-serif';
  const INK = '#3a2a1e';
  const SUB = '#8a7460';
  const GOLD = '#e0a020';

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
    return `${n.toLocaleString('ko-KR')}원`; // 원은 숫자 뒤 (사용자 2026-10-12)
  }

  // 만족도 별 (사용자 2026-10-12): 실패(망함) 1 / 특히 좋아하는 메뉴까지 맞춤(반함) 5 / 그 밖엔 퍼펙트 알 수 — 5~6알 4, 2~4알 3, 0~1알 2
  function stars(rec) {
    if (rec.reaction === 'flop') return 1;
    if (rec.reaction === 'love') return 5;
    const perfect = rec.faces.filter((f) => f === 'perfect').length;
    return perfect >= 5 ? 4 : perfect >= 2 ? 3 : 2;
  }

  // 일차별 요약
  function days(records) {
    const n = CFG.day.days.length;
    const out = [];
    for (let d = 1; d <= n; d++) {
      const recs = records.filter((r) => r.day === d);
      out.push({ day: d, recs, sales: recs.reduce((s, r) => s + r.sales, 0) });
    }
    return out;
  }

  // 3일 동안 받은 선물 (선물 로그에서)
  function gifts() {
    return Log.entries.filter((e) => e.step === '선물' && e.got === true).map((e) => e.id);
  }

  // 베스트 메뉴: 3일 동안 판매가가 가장 높은 알 (같으면 먼저 판 것)
  function bestBall(records) {
    let best = null;
    for (const r of records) for (const b of r.balls) if (b.value > 0 && (!best || b.value > best.value)) best = { rec: r, menu: b.menu, value: b.value };
    return best;
  }

  function show({ records, total }) {
    const L = CFG.letters.result;
    const top = Board.layer('top');
    top.replaceChildren();
    root = el('g', { 'pointer-events': 'all' }, top);
    const items = [];
    const add = (g) => { g.setAttribute('opacity', 0); items.push(g); return g; };

    el('rect', { x: 0, y: 0, width: 1280, height: 720, fill: 'rgba(15,10,8,0.72)' }, root);
    el('rect', { x: PANEL.x, y: PANEL.y, width: PANEL.w, height: PANEL.h, rx: 26, fill: '#fbf3e3', stroke: '#c9b89c', 'stroke-width': 5 }, root);
    text(root, 640, 92, L.title, { 'text-anchor': 'middle', 'font-size': 38, 'font-weight': 900 });

    // ① 일차마다: 손님(판마다) + 만족도 별 + 매출
    const ds = days(records);
    ds.forEach((d, i) => {
      const g = add(el('g', {}, root));
      const y = DAY_ROW.top + i * DAY_ROW.h;
      text(g, LEFT.x, y, L.day.replace('{n}', d.day), { 'font-size': 24, 'font-weight': 900, fill: '#c0661c' });
      text(g, LEFT.right, y, won(d.sales), { 'text-anchor': 'end', 'font-size': 22, 'font-weight': 900 });
      // 판이 셋 이상이면 (T57 소문 손님) 칸을 나눠 좁히고 별·아이콘을 작게 — 왼쪽 칸 안에
      const cw = Math.min(240, (LEFT.right - LEFT.x) / Math.max(1, d.recs.length));
      const small = cw < 200;
      d.recs.forEach((r, k) => {
        const x = LEFT.x + k * cw;
        const yy = y + 42;
        text(g, x, yy, r.customer.emoji, { 'font-size': small ? 22 : 28, 'font-family': EMOJI_FONT });
        const n = stars(r);
        const sx = x + (small ? 30 : 40);
        const st = text(g, sx, yy - 3, '', { 'font-size': small ? 14 : 20, 'letter-spacing': small ? 0 : 1 });
        el('tspan', { fill: GOLD }, st).textContent = '★'.repeat(n);
        el('tspan', { fill: '#d8c7a6' }, st).textContent = '★'.repeat(5 - n);
        text(g, sx, yy + 18, r.customer.name, { 'font-size': small ? 12 : 13, fill: SUB });
      });
      el('line', { x1: LEFT.x, y1: y + 70, x2: LEFT.right, y2: y + 70, stroke: '#e5d6b8', 'stroke-width': 2 }, g);
    });

    // ② 받은 선물 목록
    let g = add(el('g', {}, root));
    const gy = DAY_ROW.top + ds.length * DAY_ROW.h + 4;
    text(g, LEFT.x, gy, L.gifts, { fill: SUB, 'font-size': 18, 'font-weight': 700 });
    const got = gifts().map((id) => { const gf = (CFG.gifts || {})[id]; return gf ? `${gf.icon || ''} ${gf.name}`.trim() : id; });
    text(g, LEFT.x, gy + 34, got.length ? got.join('  ·  ') : (L.none || '없음'), { 'font-size': 20, 'font-weight': 700, 'font-family': EMOJI_FONT });

    // ③ 베스트 메뉴 — 그 알이 든 후네 + 손님 이름
    const best = bestBall(records);
    g = add(el('g', {}, root));
    el('rect', { x: 640, y: 130, width: 530, height: 500, rx: 18, fill: '#2a211b' }, g);
    text(g, 905, 176, `★ ${L.bestTitle} ★`, { 'text-anchor': 'middle', fill: '#ffd34d', 'font-size': 24, 'font-weight': 900 });
    if (best && best.rec.boat) {
      const boat = best.rec.boat.cloneNode(true);
      const clip = boat.querySelector('clipPath'); // 복제본의 clipPath id가 겹치지 않게
      if (clip) {
        clip.setAttribute('id', 'boat-clip-result');
        boat.querySelectorAll('[clip-path]').forEach((n) => n.setAttribute('clip-path', 'url(#boat-clip-result)'));
      }
      boat.setAttribute('transform', 'translate(905 360) scale(1.6)');
      boat.removeAttribute('opacity');
      boat.setAttribute('display', 'inline');
      g.appendChild(boat);
      text(g, 905, 520, CFG.menus[best.menu].name, { 'text-anchor': 'middle', fill: '#fff3d6', 'font-size': 28, 'font-weight': 900 });
      text(g, 905, 562, `${best.rec.customer.emoji}  ${best.rec.customer.name}`, { 'text-anchor': 'middle', fill: '#c9b8a4', 'font-size': 20, 'font-family': EMOJI_FONT });
    } else {
      text(g, 905, 380, L.none || '없음', { 'text-anchor': 'middle', fill: '#c9b8a4', 'font-size': 22 });
    }

    // ④ 3일 총 매출 — 맨 아래 가장 크게
    g = add(el('g', {}, root));
    el('line', { x1: LEFT.x, y1: 572, x2: LEFT.right, y2: 572, stroke: '#c9b89c', 'stroke-width': 3 }, g);
    text(g, LEFT.x, 626, L.total, { fill: SUB, 'font-size': 22, 'font-weight': 700 });
    text(g, LEFT.right, 636, won(total), { 'text-anchor': 'end', 'font-size': 52, 'font-weight': 900, fill: '#c0661c' });

    // 하나씩 나타난다
    items.forEach((item, i) => setTimeout(() => {
      item.setAttribute('opacity', 1);
      Sfx.tick();
      if (i === items.length - 1) Sfx.finish();
    }, 400 + i * STEP_MS));

    Log.add({
      step: '결과', total, days: ds.map((d) => ({ day: d.day, sales: d.sales, stars: d.recs.map(stars) })), gifts: gifts(),
      best: best ? { menu: best.menu, value: best.value, who: best.rec.customer.id } : null,
      line: `── 포장마차 운영 일지 | 총 ${won(total)} | ${ds.map((d) => `${d.day}일차 ${won(d.sales)} ${d.recs.map((r) => '★'.repeat(stars(r))).join('/')}`).join(' · ')} | 선물 ${gifts().join(', ') || '-'} | 베스트 ${best ? CFG.menus[best.menu].name : '-'}`,
    });
  }

  return { show, days, stars };
})();
