// 하루 끝 정산 = 영업 일지 (T38 → T48 → T49, 사용자 2026-10-11 "하루를 잘 넘겼다는 기분", 시안 docs/screenshots/시안 영업 일지.png)
// 가죽 표지 노트를 펼친 두 장. 왼쪽 = 한 줄씩 써 내려가는 기록(오늘의 손님·대사 → 판매 수익(세어 올라감)·판 내역 → 메뉴판에 추가 → 받은 선물),
// 오른쪽 = 테이프로 붙인 "오늘의 한 접시"(판매가가 가장 높은 알이 든 후네) + 사흘 영업 칸.
// 등장 중 클릭 = 나머지 바로 다 / 다 보인 뒤 클릭 = 오늘 칸에 도장 쾅 → 닫힘. 문구는 data.js letters.settle, 간격 day.settleStepMs
const Settle = (() => {
  // 배치 상수
  const BOOK = { x: 112, y: 62, w: 1056, h: 604 };
  const PAGE_L = { x: 136, y: 86, w: 500, h: 556 };
  const PAGE_R = { x: 644, y: 86, w: 500, h: 556 };
  const LEFT = 204;                                  // 왼쪽 장 글자 x
  const RIGHT_EDGE = 612;                            // 왼쪽 장 글자 오른쪽 끝
  const RCX = 894;                                   // 오른쪽 장 가운데
  const SNAP = { cx: 894, cy: 316, w: 252, h: 300, photo: 222, tilt: -4 }; // 폴라로이드
  const CELL = { y: 548, w: 100, h: 62, gap: 18 };   // 사흘 영업 칸
  const COUNT_MS = 1200;                             // 매출 세는 시간
  const MENU_BOARD = { x: 128, y: 250 };             // 화면 왼쪽 위 메뉴판 (칩이 날아갈 곳)
  const INK = '#3a2a1e';
  const SUB = '#8a7460';
  const ORANGE = '#c0661c';
  const RED = '#c62828';
  const PAPER = '#fbf4e2';
  const SERIF = "'Nanum Myeongjo', Batang, 'Malgun Gothic', serif";
  const EMOJI_FONT = 'Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, Malgun Gothic, sans-serif';
  const STAMP_TILT = [-11, 7, -5, 9];                // 날마다 조금씩 다르게 기울어진 도장

  function won(n) {
    return `${Math.round(n).toLocaleString('ko-KR')}원`; // 원은 숫자 뒤
  }

  // 오늘 기록 요약 (검증·로그용으로도 쓴다)
  function summary(day) {
    const recs = Customer.getRecords().filter((r) => r.day === day);
    const sales = recs.reduce((s, r) => s + r.sales, 0);
    const fresh = [...new Set(recs.flatMap((r) => r.fresh || []))];
    const found = [...new Set(recs.flatMap((r) => r.discovered || []))]; // T39가 채운다
    const hidden = Object.keys(CFG.menus).filter((id) => CFG.menus[id].hidden).length;
    // 오늘의 손님: 온 순서대로 한 번씩 — 판마다 반응, 만족 수, 가장 많이 번 판의 대사
    const guests = [];
    for (const r of recs) {
      let gst = guests.find((x) => x.id === r.customer.id);
      if (!gst) guests.push(gst = { id: r.customer.id, emoji: r.customer.emoji, name: r.customer.name, reactions: [], boards: 0, happy: 0, quote: '', top: -1 });
      gst.reactions.push(r.reaction);
      gst.boards++;
      if (r.satisfied) gst.happy++;
      if (r.sales > gst.top) { gst.top = r.sales; gst.quote = r.line || ''; }
    }
    // 오늘의 한 접시: 판매가가 가장 높은 알 (같으면 먼저 판 것). 0원뿐이면 없음
    let best = null;
    for (const r of recs) for (const b of r.balls) if (b.value > 0 && (!best || b.value > best.value)) best = { rec: r, menu: b.menu, value: b.value };
    return { recs, sales, boards: recs.length, happy: recs.filter((r) => r.satisfied).length, fresh, found, hidden, guests, best, gifts: Gift.today().map((g) => g.id) };
  }

  // ── 질감 ──────────
  // 종이·가죽 결은 캔버스에 한 번 그려 이미지로 쓴다 (SVG 노이즈 필터는 매 프레임 다시 계산돼 무겁다). 한 번 만든 것은 재사용
  const texCache = {};
  function texture(kind, w, h) {
    const key = `${kind}-${w}x${h}`;
    if (texCache[key]) return texCache[key];
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const c = cv.getContext('2d');
    let seed = kind === 'leather' ? 9 : 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; // 늘 같은 무늬
    const P = kind === 'leather'
      ? { blot: [[0, 0, 0]], blotN: 26, blotA: [0.06, 0.14], blotR: [40, 140], dot: [20, 10, 4], dotP: 0.35, dotA: 70, light: 0.05 }
      : { blot: [[150, 105, 50], [170, 130, 70]], blotN: 10, blotA: [0.018, 0.04], blotR: [70, 170], dot: [120, 85, 45], dotP: 0.1, dotA: 34, light: 0.03 };
    // 넓은 얼룩 (바랜 곳·가죽 무늬)
    for (let i = 0; i < P.blotN; i++) {
      const x = rnd() * w;
      const y = rnd() * h;
      const r = P.blotR[0] + rnd() * (P.blotR[1] - P.blotR[0]);
      const [cr, cg, cb] = P.blot[i % P.blot.length];
      const a = P.blotA[0] + rnd() * (P.blotA[1] - P.blotA[0]);
      const gr = c.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(${cr},${cg},${cb},${a})`);
      gr.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
      c.fillStyle = gr;
      c.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // 잔 점 (결)
    const img = c.getImageData(0, 0, w, h);
    const d = img.data;
    for (let p = 0; p < d.length; p += 4) {
      const v = rnd();
      if (v < P.dotP) {
        const a = (v / P.dotP) * P.dotA;
        const t = d[p + 3] ? a / 255 : 1; // 빈 픽셀은 점 색 그대로
        d[p] = d[p] * (1 - t) + P.dot[0] * t;
        d[p + 1] = d[p + 1] * (1 - t) + P.dot[1] * t;
        d[p + 2] = d[p + 2] * (1 - t) + P.dot[2] * t;
        d[p + 3] = Math.min(255, d[p + 3] + a);
      } else if (v > 1 - P.light) {
        d[p] = 255; d[p + 1] = 250; d[p + 2] = 235; d[p + 3] = Math.max(d[p + 3], 40); // 밝은 섬유 점
      }
    }
    c.putImageData(img, 0, 0);
    // 종이 섬유 (짧은 선)
    if (kind === 'paper') {
      c.strokeStyle = 'rgba(140,100,55,0.07)';
      c.lineWidth = 1;
      for (let i = 0; i < w * h / 4000; i++) {
        const x = rnd() * w;
        const y = rnd() * h;
        const a = rnd() * Math.PI;
        const l = 4 + rnd() * 10;
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke();
      }
    }
    return (texCache[key] = cv.toDataURL());
  }

  function defs(parent) {
    const d = Board.el('defs', {}, parent);
    // 도장 잉크: 군데군데 빠진 자국 (도장은 작아서 필터로 둔다)
    const ink = Board.el('filter', { id: 'jn-ink', x: '-10%', y: '-10%', width: '120%', height: '120%', 'color-interpolation-filters': 'sRGB' }, d);
    Board.el('feTurbulence', { type: 'fractalNoise', baseFrequency: 0.9, numOctaves: 2, seed: 11, result: 'n' }, ink);
    Board.el('feColorMatrix', { in: 'n', type: 'matrix', values: '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.4 2.05', result: 'm' }, ink);
    Board.el('feComposite', { in: 'SourceGraphic', in2: 'm', operator: 'in' }, ink);
    // 종이 가장자리 음영
    const vig = Board.el('radialGradient', { id: 'jn-vig', cx: 0.5, cy: 0.5, r: 0.75 }, d);
    Board.el('stop', { offset: 0.62, 'stop-color': '#7a5020', 'stop-opacity': 0 }, vig);
    Board.el('stop', { offset: 1, 'stop-color': '#7a5020', 'stop-opacity': 0.26 }, vig);
    // 가운데 접힌 곳 그림자
    const fold = Board.el('linearGradient', { id: 'jn-fold', x1: 0, y1: 0, x2: 1, y2: 0 }, d);
    Board.el('stop', { offset: 0, 'stop-color': '#5a3a14', 'stop-opacity': 0 }, fold);
    Board.el('stop', { offset: 0.5, 'stop-color': '#5a3a14', 'stop-opacity': 0.32 }, fold);
    Board.el('stop', { offset: 1, 'stop-color': '#5a3a14', 'stop-opacity': 0 }, fold);
    // 가죽 위쪽 빛
    const shine = Board.el('linearGradient', { id: 'jn-shine', x1: 0, y1: 0, x2: 0, y2: 1 }, d);
    Board.el('stop', { offset: 0, 'stop-color': '#ffffff', 'stop-opacity': 0.1 }, shine);
    Board.el('stop', { offset: 0.4, 'stop-color': '#ffffff', 'stop-opacity': 0 }, shine);
    Board.el('clipPath', { id: 'jn-cover' }, d).appendChild(Board.el('rect', { x: BOOK.x, y: BOOK.y, width: BOOK.w, height: BOOK.h, rx: 20 }));
    Board.el('clipPath', { id: 'jn-photo' }, d).appendChild(Board.el('rect', { x: -SNAP.photo / 2, y: -SNAP.photo / 2, width: SNAP.photo, height: SNAP.photo }));
  }

  // 종이 한 장: 바탕 + 결·얼룩(이미지) + 가장자리 음영
  function paper(parent, r, fill = PAPER) {
    const box = { x: r.x, y: r.y, width: r.w, height: r.h };
    Board.el('rect', { ...box, rx: r.rx || 6, fill }, parent);
    Board.el('image', { ...box, href: texture('paper', 500, 556), preserveAspectRatio: 'none', 'pointer-events': 'none' }, parent);
    if (!r.noVig) Board.el('rect', { ...box, rx: r.rx || 6, fill: 'url(#jn-vig)' }, parent);
  }

  // 도장 (cx, cy 가운데). ink 질감 + 이중 테두리
  function stampNode(parent, cx, cy, word, tilt) {
    const s = Board.el('g', { 'pointer-events': 'none' }, parent);
    const body = Board.el('g', { transform: `rotate(${tilt} ${cx} ${cy})`, filter: 'url(#jn-ink)', opacity: 0.9 }, s);
    const w = 168;
    const h = 70;
    Board.el('rect', { x: cx - w / 2, y: cy - h / 2, width: w, height: h, rx: 10, fill: 'rgba(198,40,40,0.07)', stroke: RED, 'stroke-width': 5 }, body);
    Board.el('rect', { x: cx - w / 2 + 8, y: cy - h / 2 + 8, width: w - 16, height: h - 16, rx: 6, fill: 'none', stroke: RED, 'stroke-width': 2 }, body);
    const t = Board.el('text', { x: cx, y: cy + 1, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 30, 'font-weight': 900, fill: RED, 'letter-spacing': 2 }, body);
    t.textContent = word;
    return s;
  }

  function show(day, then) {
    const L = CFG.letters.settle || {};
    const s = summary(day);
    const stepMs = Math.max(0, Number(CFG.day.settleStepMs) || 700);
    const days = Math.max(day, (CFG.day.days || []).length);
    const stampWord = (d) => (d >= days ? (L.stampLast || '영업 끝!') : (L.stamp || '다음날로!'));

    const g = Board.el('g', { 'pointer-events': 'all', cursor: 'pointer' }, Board.layer('top'));
    defs(g);
    const dim = Board.el('rect', { x: 0, y: 0, width: 1280, height: 720, fill: '#0f0a08', opacity: 0 }, g);
    const book = Board.el('g', { opacity: 0 }, g);
    const text = (x, y, str, attrs, parent = book) => { const n = Board.el('text', { x, y, fill: INK, ...attrs }, parent); n.textContent = str; return n; };

    // ── 노트 ──────────
    // 가죽 표지
    const cover = { x: BOOK.x, y: BOOK.y, width: BOOK.w, height: BOOK.h };
    Board.el('rect', { ...cover, rx: 20, fill: '#000', opacity: 0.35, transform: 'translate(6 9)' }, book);
    Board.el('rect', { ...cover, rx: 20, fill: '#5a3820' }, book);
    Board.el('image', { ...cover, href: texture('leather', BOOK.w, BOOK.h), preserveAspectRatio: 'none', 'clip-path': 'url(#jn-cover)' }, book);
    Board.el('rect', { ...cover, rx: 20, fill: 'url(#jn-shine)' }, book);
    Board.el('rect', { ...cover, rx: 20, fill: 'none', stroke: '#3a2210', 'stroke-width': 4 }, book);
    Board.el('rect', { x: BOOK.x + 13, y: BOOK.y + 13, width: BOOK.w - 26, height: BOOK.h - 26, rx: 12, fill: 'none', stroke: '#8a6040', 'stroke-width': 2, 'stroke-dasharray': '7 5', opacity: 0.8 }, book); // 바느질
    // 종이 (아래로 겹친 장들 → 두께)
    for (const k of [3, 2, 1]) {
      Board.el('rect', { x: PAGE_L.x + k, y: PAGE_L.y + k * 1.5, width: PAGE_L.w, height: PAGE_L.h, rx: 6, fill: '#e2d3b0' }, book);
      Board.el('rect', { x: PAGE_R.x - k, y: PAGE_R.y + k * 1.5, width: PAGE_R.w, height: PAGE_R.h, rx: 6, fill: '#e2d3b0' }, book);
    }
    paper(book, PAGE_L);
    paper(book, PAGE_R);
    Board.el('rect', { x: 596, y: PAGE_L.y, width: 88, height: PAGE_L.h, fill: 'url(#jn-fold)' }, book);
    Board.el('line', { x1: 640, y1: PAGE_L.y, x2: 640, y2: PAGE_L.y + PAGE_L.h, stroke: '#b9a06c', 'stroke-width': 1.5, opacity: 0.7 }, book);
    // 왼쪽 장: 여백선 + 줄
    Board.el('line', { x1: 182, y1: PAGE_L.y + 10, x2: 182, y2: PAGE_L.y + PAGE_L.h - 10, stroke: '#e3a598', 'stroke-width': 2, opacity: 0.85 }, book);
    const rule = (y) => Board.el('line', { x1: PAGE_L.x + 14, y1: y, x2: PAGE_L.x + PAGE_L.w - 20, y2: y, stroke: '#e6d6b4', 'stroke-width': 1.5 }, book);

    // 머리말
    text(LEFT, 142, L.title || '영업 일지', { 'font-family': SERIF, 'font-size': 32, 'font-weight': 700 });
    text(RIGHT_EDGE, 140, (L.dayLabel || '{n}일차 · 밤').replace('{n}', day), { 'text-anchor': 'end', 'font-size': 18, fill: SUB });
    rule(168);

    // ── 등장 연출 ──────────
    const hidden = (node) => { node.setAttribute('opacity', 0); return node; };
    function appear(node, instant, dy = 10, ms = 260) {
      if (instant) { node.setAttribute('opacity', 1); node.removeAttribute('transform'); return; }
      const t0 = performance.now();
      const step = (now) => {
        const u = Math.min(1, (now - t0) / ms);
        const e = 1 - (1 - u) * (1 - u);
        node.setAttribute('opacity', e.toFixed(3));
        node.setAttribute('transform', `translate(0 ${((1 - e) * dy).toFixed(1)})`);
        if (u < 1) requestAnimationFrame(step); else node.removeAttribute('transform');
      };
      requestAnimationFrame(step);
    }
    const label = (y, str) => hidden(text(LEFT, y, str, { 'font-size': 16, 'font-weight': 700, fill: SUB }));
    const steps = []; // { wait: 앞 단계 뒤 기다릴 ms, run(instant) }
    const add = (wait, run) => steps.push({ wait, run });

    // 0. 노트가 펼쳐진다
    add(0, (i) => {
      if (i) { dim.setAttribute('opacity', 0.72); appear(book, true); return; }
      const t0 = performance.now();
      const step = (now) => {
        const u = Math.min(1, (now - t0) / 320);
        const e = 1 - (1 - u) ** 3;
        dim.setAttribute('opacity', (0.72 * e).toFixed(3));
        book.setAttribute('opacity', e.toFixed(3));
        book.setAttribute('transform', `translate(640 364) scale(${(0.94 + 0.06 * e).toFixed(4)}) translate(-640 -364)`);
        if (u < 1) requestAnimationFrame(step); else book.removeAttribute('transform');
      };
      requestAnimationFrame(step);
      Sfx.tick();
    });

    // 1. 오늘의 손님 — 손님마다 이름·반응·만족, 그리고 그날 대사 한 줄(써 내려감)
    let y = 196;
    const gl = label(y, L.guests || '오늘의 손님');
    add(500, (i) => appear(gl, i));
    for (const gst of s.guests) {
      const row = hidden(Board.el('g', {}, book));
      const cy = y + 40;
      Board.el('circle', { cx: 232, cy, r: 25, fill: '#f3e3c3', stroke: '#e0c99a', 'stroke-width': 2 }, row);
      text(232, cy + 1, gst.emoji, { 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 28, 'font-family': EMOJI_FONT }, row);
      const nm = text(270, cy - 6, gst.name, { 'font-size': 22, 'font-weight': 900 }, row);
      let fx = 270 + nm.getComputedTextLength() + 14;
      add(stepMs * 0.6, (i) => { appear(row, i); if (!i) Sfx.tick(); });
      for (const rk of gst.reactions) {
        const r = CFG.customers.reactions[rk];
        const face = hidden(text(fx, cy - 5, r ? r.emoji : '?', { 'font-size': 23, 'font-family': EMOJI_FONT }));
        fx += 32;
        add(stepMs * 0.4, (i) => { appear(face, i, 12); if (!i) Sfx.tick(); });
      }
      const happyText = gst.happy === 0 ? (L.noneHappy || '아쉬워함')
        : gst.boards === 1 ? (L.oneHappy || '만족')
          : gst.happy === gst.boards ? (L.allHappy || '{n}판 모두 만족').replace('{n}', gst.boards)
            : (L.someHappy || '{n}판 중 {m}판 만족').replace('{n}', gst.boards).replace('{m}', gst.happy);
      const hp = hidden(text(fx + 8, cy - 7, happyText, { 'font-size': 15, 'font-weight': 700, fill: gst.happy ? '#4c8a3a' : '#a0522d' }));
      add(stepMs * 0.35, (i) => appear(hp, i));
      // 대사: 따옴표 안, 두 줄까지, 한 글자씩
      let qy = cy + 22;
      if (gst.quote) {
        const q = Board.el('text', { 'font-family': SERIF, 'font-size': 16, fill: '#5a4636', y: qy }, book);
        const lines = Board.richLines(q, `“${gst.quote}”`, RIGHT_EDGE - 270).slice(0, 2);
        const total = lines.reduce((a, ln) => a + ln.length, 0);
        Board.richRender(q, lines, 0, 270, 21);
        add(stepMs * 0.3, (i) => {
          if (i) { Board.richRender(q, lines, total, 270, 21); return; }
          const t0 = performance.now();
          const step = (now) => {
            const n = Math.min(total, Math.floor((now - t0) / 30) + 1);
            Board.richRender(q, lines, n, 270, 21);
            if (n < total && q.isConnected) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        });
        qy += (lines.length - 1) * 21;
        // 바로 다 보이기(클릭)용: 진행 중 타자도 끝 글자까지
        steps[steps.length - 1].finish = () => Board.richRender(q, lines, total, 270, 21);
      }
      y = qy + 12;
    }
    rule(y + 6);

    // 2. 판매 수익 — ₩0부터 세어 올라감 + 판 내역
    y += 34;
    const sl = label(y, L.sales || '판매 수익');
    const money = hidden(text(LEFT, y + 52, won(0), { 'font-size': 48, 'font-weight': 900, fill: ORANGE }));
    const parts = s.recs.map((r, k) => (L.boardPart || '{n}판 {값}').replace('{n}', k + 1).replace('{값}', won(r.sales)));
    const detail = hidden(text(LEFT + 2, y + 82, parts.join('  +  '), { 'font-size': 16, fill: SUB }));
    let counting = 0;
    add(stepMs, (i) => appear(sl, i));
    add(stepMs * 0.4, (i) => {
      appear(money, true);
      if (i || s.sales <= 0) { money.textContent = won(s.sales); if (!i && s.sales > 0) Sfx.coin(); return; }
      const t0 = performance.now();
      let lastTick = 0;
      const step = (now) => {
        const u = Math.min(1, (now - t0) / COUNT_MS);
        money.textContent = won(s.sales * (1 - (1 - u) ** 3));
        if (now - lastTick > 90 && u < 1) { lastTick = now; Sfx.tick(); }
        if (u < 1) counting = requestAnimationFrame(step);
        else { counting = 0; Sfx.coin(); }
      };
      counting = requestAnimationFrame(step);
    });
    add(COUNT_MS + 150, (i) => appear(detail, i));
    y += 104;
    rule(y);

    // 3. 메뉴판에 추가 — 새 레시피(크림)·숨은 요리(금색) 칩, 작은 복제가 메뉴판으로 쏙
    y += 28;
    const rl = label(y, L.recipes || '메뉴판에 추가');
    add(stepMs * 0.8, (i) => appear(rl, i));
    const chips = [
      ...s.fresh.filter((id) => !s.found.includes(id)).map((id) => ({ id, hiddenMenu: false })),
      ...s.found.map((id) => ({ id, hiddenMenu: true })),
    ];
    let cx = LEFT;
    let cy = y + 14;
    if (!chips.length) {
      const none = hidden(text(LEFT, y + 38, L.none || '없음', { 'font-size': 18, 'font-weight': 700, fill: '#b9a88a' }));
      add(stepMs * 0.5, (i) => appear(none, i));
    }
    for (const c of chips) {
      const name = (CFG.menus[c.id] || { name: c.id }).name;
      const tag = c.hiddenMenu ? (L.hiddenRecipe || '숨은 요리!') : (L.newRecipe || '새 레시피');
      const chip = hidden(Board.el('g', {}, book));
      const bg = Board.el('rect', { x: cx, y: cy, height: 40, rx: 20, fill: c.hiddenMenu ? '#ffe9a8' : '#f6ecd6', stroke: c.hiddenMenu ? '#d9a521' : '#d8c6a0', 'stroke-width': 2 }, chip);
      const t = text(cx + 16, cy + 26, '', { 'font-size': 18, 'font-weight': 900 }, chip);
      Board.el('tspan', { fill: c.hiddenMenu ? '#a0700a' : ORANGE, 'font-size': 14 }, t).textContent = `${tag}  `;
      Board.el('tspan', {}, t).textContent = name;
      const w = t.getComputedTextLength() + 32;
      bg.setAttribute('width', w.toFixed(0));
      if (cx > LEFT && cx + w > RIGHT_EDGE) { // 다음 줄로
        cx = LEFT; cy += 46;
        bg.setAttribute('x', cx); bg.setAttribute('y', cy);
        t.setAttribute('x', cx + 16); t.setAttribute('y', cy + 26);
      }
      const from = { x: cx + w / 2, y: cy + 20 };
      cx += w + 10;
      add(stepMs * 0.6, (i) => {
        appear(chip, i);
        if (i) return;
        Sfx.tick();
        // 복제가 메뉴판 쪽으로 날아가며 작아진다
        const ghost = chip.cloneNode(true);
        ghost.setAttribute('opacity', 0.9);
        g.appendChild(ghost);
        const t0 = performance.now() + 250;
        const fly = (now) => {
          const u = Math.max(0, Math.min(1, (now - t0) / 520));
          const e = u * u;
          const k = 1 - 0.75 * e;
          const px = from.x + (MENU_BOARD.x - from.x) * e;
          const py = from.y + (MENU_BOARD.y - from.y) * e - Math.sin(u * Math.PI) * 40;
          ghost.setAttribute('transform', `translate(${px.toFixed(1)} ${py.toFixed(1)}) scale(${k.toFixed(3)}) translate(${-from.x} ${-from.y})`);
          ghost.setAttribute('opacity', (0.9 * (1 - u * u)).toFixed(3));
          if (u < 1 && ghost.isConnected) requestAnimationFrame(fly); else ghost.remove();
        };
        requestAnimationFrame(fly);
      });
    }
    y = Math.max(cy + 40, y + 50);

    // 4. 받은 선물 (작게)
    y = Math.max(y + 34, 584);
    const giftNames = s.gifts.map((id) => { const gf = (CFG.gifts || {})[id]; return gf ? `${gf.icon || ''} ${gf.name}`.trim() : id; });
    const gift = hidden(text(LEFT, Math.min(y, 626), `${L.gifts || '받은 선물'}   `, { 'font-size': 16, fill: SUB }));
    Board.el('tspan', { fill: INK, 'font-weight': 700, 'font-size': 18, 'font-family': EMOJI_FONT }, gift).textContent = giftNames.length ? giftNames.join(' · ') : (L.none || '없음');
    add(stepMs * 0.8, (i) => appear(gift, i));

    // 5. 오른쪽 장 — 오늘의 한 접시 (떨어져 내려앉고, 테이프가 붙는다)
    const bt = hidden(text(RCX, 140, `★ ${L.best || '오늘의 한 접시'} ★`, { 'text-anchor': 'middle', 'font-size': 22, 'font-weight': 900, fill: '#b8860b' }));
    const snap = hidden(Board.el('g', {}, book));
    const inner = Board.el('g', { transform: `rotate(${SNAP.tilt} ${SNAP.cx} ${SNAP.cy})` }, snap);
    const sx = SNAP.cx - SNAP.w / 2;
    const sy = SNAP.cy - SNAP.h / 2;
    Board.el('rect', { x: sx + 5, y: sy + 7, width: SNAP.w, height: SNAP.h, rx: 3, fill: '#000', opacity: 0.18 }, inner);
    paper(inner, { x: sx, y: sy, w: SNAP.w, h: SNAP.h, rx: 3, noVig: true }, '#fffdf8');
    Board.el('rect', { x: sx, y: sy, width: SNAP.w, height: SNAP.h, rx: 3, fill: 'none', stroke: '#e2d8c4', 'stroke-width': 1.5 }, inner);
    const pcy = sy + 15 + SNAP.photo / 2;
    const photo = Board.el('g', { transform: `translate(${SNAP.cx} ${pcy})` }, inner);
    const clipG = Board.el('g', { 'clip-path': 'url(#jn-photo)' }, photo);
    const ph = SNAP.photo / 2;
    Board.el('rect', { x: -ph, y: -ph, width: SNAP.photo, height: SNAP.photo, fill: '#4a3424' }, clipG);
    for (let k = 1; k < 6; k++) Board.el('line', { x1: -ph, y1: -ph + k * SNAP.photo / 6, x2: ph, y2: -ph + k * SNAP.photo / 6 + 4, stroke: '#3b2a1d', 'stroke-width': 3 }, clipG);
    const k = SNAP.photo / 352; // 성적표 사진(352)과 같은 비율
    if (s.best && s.best.rec.boat) {
      Board.el('ellipse', { cx: 0, cy: 58 * k, rx: 160 * k, ry: 22 * k, fill: '#000000', opacity: 0.25 }, clipG);
      const boat = s.best.rec.boat.cloneNode(true);
      const clip = boat.querySelector('clipPath'); // 복제본의 clipPath id가 겹치지 않게
      if (clip) {
        clip.setAttribute('id', 'boat-clip-settle');
        boat.querySelectorAll('[clip-path]').forEach((n) => n.setAttribute('clip-path', 'url(#boat-clip-settle)'));
      }
      boat.setAttribute('transform', `translate(0 8) scale(${(1.27 * k).toFixed(3)})`);
      boat.removeAttribute('opacity');
      boat.setAttribute('display', 'inline');
      clipG.appendChild(boat);
      text(SNAP.cx, sy + SNAP.h - 34, CFG.menus[s.best.menu].name, { 'text-anchor': 'middle', 'font-size': 21, 'font-weight': 900 }, inner);
      text(SNAP.cx, sy + SNAP.h - 11, won(s.best.rec.sales), { 'text-anchor': 'middle', 'font-size': 17, 'font-weight': 900, fill: ORANGE }, inner); // 그 후네 한 판 값 (사용자)
    } else {
      text(0, 0, L.bestNone || '오늘은 쉬어 가는 날', { 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 18, 'font-weight': 700, fill: '#f3e6d6' }, photo);
    }
    // 마스킹테이프 (끝이 찢긴 모양)
    const tape = hidden(Board.el('g', { transform: `rotate(${SNAP.tilt + 9} ${SNAP.cx} ${sy})` }, book));
    const tw = 92;
    const th = 28;
    let td = `M ${SNAP.cx - tw / 2} ${sy - th / 2}`;
    td += ` L ${SNAP.cx + tw / 2} ${sy - th / 2}`;
    for (let j = 1; j <= 4; j++) td += ` L ${SNAP.cx + tw / 2 + (j % 2 ? 3 : -2)} ${sy - th / 2 + j * th / 4}`;
    td += ` L ${SNAP.cx - tw / 2} ${sy + th / 2}`;
    for (let j = 3; j >= 0; j--) td += ` L ${SNAP.cx - tw / 2 + (j % 2 ? -3 : 2)} ${sy - th / 2 + j * th / 4}`;
    Board.el('path', { d: `${td} Z`, fill: '#f2d98a', opacity: 0.82 }, tape);
    for (let j = 1; j < 4; j++) Board.el('line', { x1: SNAP.cx - tw / 2 + 4, y1: sy - th / 2 + j * th / 4, x2: SNAP.cx + tw / 2 - 4, y2: sy - th / 2 + j * th / 4, stroke: '#d9bd66', 'stroke-width': 1, opacity: 0.35 }, tape); // 테이프 결
    add(stepMs * 1.1, (i) => {
      appear(bt, i);
      if (i) { appear(snap, true); appear(tape, true); return; }
      const t0 = performance.now();
      const ms = 420;
      const drop = (now) => {
        const u = Math.min(1, (now - t0) / ms);
        const e = 1 - (1 - u) ** 3;
        snap.setAttribute('opacity', Math.min(1, u * 2.5).toFixed(3));
        snap.setAttribute('transform', `translate(0 ${((1 - e) * -70).toFixed(1)}) rotate(${((1 - e) * -8).toFixed(2)} ${SNAP.cx} ${SNAP.cy})`);
        if (u < 1) { requestAnimationFrame(drop); return; }
        snap.removeAttribute('transform');
        Sfx.boxLand();
        setTimeout(() => { if (tape.getAttribute('opacity') !== '1') { appear(tape, false, -6, 160); Sfx.tick(); } }, 200);
      };
      requestAnimationFrame(drop);
    });

    // 6. 사흘 영업 칸 — 지난 날은 이미 도장, 오늘 칸은 클릭하면 쾅
    const prog = hidden(Board.el('g', {}, book));
    text(RCX, CELL.y - 16, days === 3 ? (L.progress3 || '사흘 영업') : (L.progress || '{n}일 영업').replace('{n}', days), { 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 700, fill: SUB }, prog);
    const cells = [];
    const x0 = RCX - (days * CELL.w + (days - 1) * CELL.gap) / 2;
    for (let d = 1; d <= days; d++) {
      const x = x0 + (d - 1) * (CELL.w + CELL.gap);
      const today = d === day;
      Board.el('rect', { x, y: CELL.y, width: CELL.w, height: CELL.h, rx: 8, fill: d <= day ? '#fffaf0' : 'none', stroke: today ? '#c9a86a' : '#d8c6a0', 'stroke-width': 2, 'stroke-dasharray': d <= day ? 'none' : '6 5' }, prog);
      text(x + CELL.w / 2, CELL.y + 38, `${d}일차`, { 'text-anchor': 'middle', 'font-size': 16, fill: '#b9a88a' }, prog);
      cells.push({ cx: x + CELL.w / 2, cy: CELL.y + CELL.h / 2 });
      if (d < day) stampNode(prog, x + CELL.w / 2, CELL.y + CELL.h / 2, stampWord(d), STAMP_TILT[(d - 1) % STAMP_TILT.length]);
    }
    add(stepMs * 1.2, (i) => appear(prog, i));

    // 7. 닫기 안내 (노트 아래)
    const close = hidden(text(640, BOOK.y + BOOK.h + 32, L.close || '클릭해서 도장 찍기 ▶', { 'text-anchor': 'middle', 'font-size': 16, 'font-weight': 700, fill: '#f3e6d6' }, g));
    add(stepMs, (i) => appear(close, i));

    // ── 진행 ──────────
    let next = 0;
    let timer = 0;
    const done = () => next >= steps.length;
    function run() {
      timer = 0;
      if (done()) return;
      steps[next++].run(false);
      if (!done()) timer = setTimeout(run, steps[next].wait);
    }
    timer = setTimeout(run, steps[0].wait);
    function finishAll() {
      clearTimeout(timer);
      timer = 0;
      if (counting) { cancelAnimationFrame(counting); counting = 0; money.textContent = won(s.sales); }
      for (let j = 0; j < next; j++) if (steps[j].finish) steps[j].finish(); // 쓰던 대사도 끝까지
      while (!done()) steps[next++].run(true);
    }

    Log.add({
      step: '정산', day, sales: s.sales, boards: s.boards, happy: s.happy, fresh: s.fresh, found: s.found, gifts: s.gifts,
      best: s.best ? { menu: s.best.menu, value: s.best.value, boat: s.best.rec.sales } : null,
      line: `정산 | ${day}일차 ${won(s.sales)} | ${s.boards}판 만족 ${s.happy} | 새 메뉴 ${s.fresh.length} | 숨은 요리 ${s.found.length} | 선물 ${s.gifts.length} | 오늘의 한 접시 ${s.best ? `${CFG.menus[s.best.menu].name} (그 판 ${won(s.best.rec.sales)})` : '-'}`,
    });
    let stamped = false;
    g.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      Sfx.unlock();
      if (stamped) return;
      if (!done() || counting) { finishAll(); return; } // 등장 중 → 나머지 바로 다
      // 다 본 뒤 → 오늘 칸에 도장 쾅! 잠깐 뒤 닫힘 (사용자 2026-10-11)
      stamped = true;
      close.setAttribute('opacity', 0);
      const c = cells[day - 1] || cells[cells.length - 1];
      bang(book, stampNode(book, c.cx, c.cy, stampWord(day), STAMP_TILT[(day - 1) % STAMP_TILT.length]), c, () => { g.remove(); then(); });
    });
  }

  // 도장: 크게 떠 있다가 내려찍히고(쾅), 노트가 흔들린 뒤 then
  const BANG = { from: 2.6, dropMs: 150, holdMs: 1000 };
  function bang(book, s, c, then) {
    s.setAttribute('opacity', 0);
    const t0 = performance.now();
    let landed = false;
    const step = (now) => {
      const ms = now - t0;
      if (ms < BANG.dropMs) {
        const u = ms / BANG.dropMs;
        const k = BANG.from - (BANG.from - 1) * u * u; // 가속하며 내려옴
        s.setAttribute('opacity', (0.3 + 0.7 * u).toFixed(3));
        s.setAttribute('transform', `translate(${c.cx} ${c.cy}) scale(${k.toFixed(3)}) translate(${-c.cx} ${-c.cy})`);
      } else {
        if (!landed) { landed = true; s.setAttribute('opacity', 1); s.removeAttribute('transform'); Sfx.stamp(); }
        const sh = ms - BANG.dropMs;
        const amp = Math.max(0, 7 * (1 - sh / 220));
        book.setAttribute('transform', `translate(${(amp * Math.sin(sh / 18)).toFixed(1)} ${(amp * 0.6 * Math.cos(sh / 15)).toFixed(1)})`);
        if (sh >= BANG.holdMs) { book.removeAttribute('transform'); then(); return; }
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  return { show, summary };
})();
