// 결과 화면 ① 플레이어용 "3일의 기록" (T41, 8단계 인터뷰 2026-10-11 "플레이어용 + 기획자용 두 장").
// 장인의 편지 뒤 DEMO_END에서 뜬다. 일차마다 한 줄 · 잣 꾸러미를 어떻게 했는지 · 숨은 요리 · 3일 매출 · 가장 웃긴(또는 에이스) 후네.
// 하나씩 차례로 나타난다. 클릭하면 기획 노트(②, T42)로. 문구는 data.js letters.result (Claude 초안).
// (4단계 결산 화면 T20을 대체 — 7단계 결정)
const Result = (() => {
  // 배치 상수 (1280×720)
  const PANEL = { x: 70, y: 36, w: 1140, h: 648 };
  const STEP_MS = 320;                  // 항목이 하나씩 나타나는 간격
  const DAY_ROW = { x: 110, top: 168, h: 96 };
  const FAIL_WEIGHT = { blank: 5, burnt: 3, raw: 3, meh: 1 };
  const EMOJI_FONT = 'Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, Malgun Gothic, sans-serif';
  const INK = '#3a2a1e';
  const SUB = '#8a7460';

  let root = null;
  let onNext = null;

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
  function names(ids, book) {
    return ids.map((id) => (book[id] ? book[id].name : id)).join(' · ');
  }

  // 가장 웃긴 실패: 실패 가중치 + 소스 과다가 가장 큰 후네. 하나도 없으면 매출이 가장 큰 후네 = 에이스
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

  // 잣 꾸러미를 어떻게 했나: 'keep' | 'sell' | 'missed' (선물 로그에서)
  function pinenutChoice() {
    const e = Log.entries.find((x) => x.step === '선물' && x.id === 'pinenut_pack' && x.choice);
    return e ? e.choice : 'missed';
  }

  // 일차별 요약
  function days(records) {
    const n = CFG.day.days.length;
    const out = [];
    for (let d = 1; d <= n; d++) {
      const recs = records.filter((r) => r.day === d);
      const guests = [];
      for (const r of recs) if (!guests.includes(r.customer)) guests.push(r.customer);
      out.push({
        day: d, recs, guests,
        sales: recs.reduce((s, r) => s + r.sales, 0),
        fresh: [...new Set(recs.flatMap((r) => r.fresh || []))],
        found: [...new Set(recs.flatMap((r) => r.discovered || []))],
      });
    }
    return out;
  }

  function show({ records, total }, next) {
    const L = CFG.letters.result;
    onNext = next || null;
    const top = Board.layer('top');
    top.replaceChildren();
    root = el('g', { 'pointer-events': 'all' }, top);
    const items = [];
    const add = (g) => { g.setAttribute('opacity', 0); items.push(g); return g; };

    el('rect', { x: 0, y: 0, width: 1280, height: 720, fill: 'rgba(15,10,8,0.72)' }, root);
    el('rect', { x: PANEL.x, y: PANEL.y, width: PANEL.w, height: PANEL.h, rx: 26, fill: '#fbf3e3', stroke: '#c9b89c', 'stroke-width': 5 }, root);
    text(root, 640, 92, L.title, { 'text-anchor': 'middle', 'font-size': 38, 'font-weight': 900 });

    // ① 일차마다 한 줄
    const ds = days(records);
    ds.forEach((d, i) => {
      const g = add(el('g', {}, root));
      const y = DAY_ROW.top + i * DAY_ROW.h;
      text(g, DAY_ROW.x, y, L.day.replace('{n}', d.day), { 'font-size': 24, 'font-weight': 900, fill: '#c0661c' });
      const who = d.guests.map((c) => `${c.emoji} ${c.name}`).join(' · ');
      text(g, DAY_ROW.x + 90, y, `${who}  ${L.boards.replace('{n}', d.recs.length)}`, { 'font-size': 20, 'font-family': EMOJI_FONT });
      text(g, DAY_ROW.x + 440, y, won(d.sales), { 'text-anchor': 'end', 'font-size': 22, 'font-weight': 900 });
      const parts = [];
      if (d.fresh.length) parts.push(`${L.fresh} ${names(d.fresh, CFG.menus)}`);
      if (d.found.length) parts.push(`${L.found} ${names(d.found, CFG.menus)}`);
      text(g, DAY_ROW.x + 90, y + 32, parts.join('   ') || L.quiet, { 'font-size': 16, fill: d.found.length ? '#e07a2c' : SUB, 'font-weight': d.found.length ? 700 : 400 });
    });

    // ② 잣 꾸러미 · 숨은 요리 · 3일 매출
    const choice = pinenutChoice();
    let g = add(el('g', {}, root));
    const gy = DAY_ROW.top + ds.length * DAY_ROW.h + 6;
    el('line', { x1: DAY_ROW.x, y1: gy - 30, x2: DAY_ROW.x + 440, y2: gy - 30, stroke: '#e5d6b8', 'stroke-width': 2 }, g);
    const pin = (CFG.gifts || {}).pinenut_pack;
    text(g, DAY_ROW.x, gy, `${pin ? pin.icon : '🌰'} ${L.pinenut}`, { fill: SUB, 'font-size': 18, 'font-family': EMOJI_FONT });
    text(g, DAY_ROW.x + 440, gy, L[choice].replace('{값}', won(pin ? pin.sell : 0)), { 'text-anchor': 'end', 'font-size': 18, 'font-weight': 700 });
    g = add(el('g', {}, root));
    const found = Discover.found();
    const all = Object.keys(CFG.menus).filter((id) => CFG.menus[id].hidden).length;
    text(g, DAY_ROW.x, gy + 36, `📖 ${L.book}`, { fill: SUB, 'font-size': 18, 'font-family': EMOJI_FONT });
    text(g, DAY_ROW.x + 440, gy + 36, `${found.length ? names(found, CFG.menus) + '  ' : ''}${found.length}/${all}`, { 'text-anchor': 'end', 'font-size': 18, 'font-weight': 700, fill: found.length ? '#e07a2c' : INK });
    g = add(el('g', {}, root));
    text(g, DAY_ROW.x, gy + 84, L.total, { fill: SUB, 'font-size': 18 });
    text(g, DAY_ROW.x + 440, gy + 88, won(total), { 'text-anchor': 'end', 'font-size': 36, 'font-weight': 900, fill: '#c0661c' });

    // ③ 3일 중 가장 웃긴 (또는 에이스) 후네 — 통째로
    const fun = funniest(records);
    g = add(el('g', {}, root));
    el('rect', { x: 620, y: 140, width: 550, height: 420, rx: 18, fill: '#2a211b' }, g);
    text(g, 895, 182, fun.key === 'ace' ? L.aceTitle : L.funnyTitle, { 'text-anchor': 'middle', fill: '#f3e6d6', 'font-size': 22, 'font-weight': 700 });
    const boat = fun.rec.boat.cloneNode(true);
    const clip = boat.querySelector('clipPath'); // 복제본의 clipPath id가 겹치지 않게
    if (clip) {
      clip.setAttribute('id', 'boat-clip-result');
      boat.querySelectorAll('[clip-path]').forEach((n) => n.setAttribute('clip-path', 'url(#boat-clip-result)'));
    }
    boat.setAttribute('transform', 'translate(895 350) scale(1.6)');
    boat.removeAttribute('opacity');
    boat.setAttribute('display', 'inline');
    g.appendChild(boat);
    text(g, 895, 470, `${fun.rec.customer.emoji}  ${CFG.letters.funny[fun.key]}`, { 'text-anchor': 'middle', fill: '#ffd34d', 'font-size': 24, 'font-weight': 900, 'font-family': EMOJI_FONT });
    text(g, 895, 510, L.funnyDay.replace('{n}', fun.rec.day).replace('{손님}', fun.rec.customer.name), { 'text-anchor': 'middle', fill: '#c9b8a4', 'font-size': 16 });

    // ④ 다음 장으로
    g = add(el('g', {}, root));
    if (onNext) text(g, 1170, 650, L.next, { 'text-anchor': 'end', 'font-size': 18, 'font-weight': 700, fill: '#c0661c' });

    // 하나씩 나타난다. 다 나타난 뒤 클릭하면 다음 장
    items.forEach((item, i) => setTimeout(() => {
      item.setAttribute('opacity', 1);
      Sfx.tick();
      if (i === items.length - 1) {
        Sfx.finish();
        if (onNext) {
          root.setAttribute('cursor', 'pointer');
          root.addEventListener('pointerdown', (e) => { e.stopPropagation(); Sfx.unlock(); const go = onNext; onNext = null; go(); }, { once: true });
        }
      }
    }, 400 + i * STEP_MS));

    Log.add({
      step: '결과', total, days: ds.map((d) => ({ day: d.day, sales: d.sales, boards: d.recs.length, fresh: d.fresh, found: d.found })), pinenut: choice, found,
      line: `── 3일의 기록 | 총 ${won(total)} | ${ds.map((d) => `${d.day}일차 ${won(d.sales)}`).join(' · ')} | 잣 꾸러미 ${choice} | 숨은 요리 ${found.length}/${all}`,
    });
  }

  return { show, funniest, pinenutChoice, days };
})();
