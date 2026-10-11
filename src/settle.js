// 하루 끝 정산 카드 (T38, 7단계 인터뷰 2026-10-11 "정산 → 밤 대화 → 선물"): 마지막 손님이 떠나면 뜨고 클릭하면 닫힌다.
// T48 (사용자 2026-10-11 "하루를 잘 넘겼다는 기분"): 항목이 하나씩 차례로 — 방문한 손님(판마다 반응) → 판매 수익(올라가며 세어짐)
//   → 추가된 레시피 → 받은 선물 → "오늘의 한 접시"(판매가가 가장 높았던 알이 든 후네 사진).
//   등장 중 클릭 = 나머지 바로 다 / 다 보인 뒤 클릭 = 닫힘. 문구는 data.js letters.settle, 간격 day.settleStepMs
const Settle = (() => {
  // 배치 상수
  const PANEL = { x: 180, y: 90, w: 920, h: 560 };
  const LEFT = 230;                                  // 왼쪽 칸 글자 x
  const CHIP_MAX_X = 720;                            // 레시피 칩이 넘으면 다음 줄
  const SNAP = { cx: 905, cy: 395, w: 250, h: 300, photo: 222, tilt: -4 }; // 폴라로이드
  const COUNT_MS = 1200;                             // 매출 세는 시간
  const INK = '#3a2a1e';
  const SUB = '#8a7460';
  const ORANGE = '#c0661c';
  const EMOJI_FONT = 'Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, Malgun Gothic, sans-serif';

  function won(n) {
    return `₩${Math.round(n).toLocaleString('ko-KR')}`;
  }

  // 오늘 기록 요약 (검증·로그용으로도 쓴다)
  function summary(day) {
    const recs = Customer.getRecords().filter((r) => r.day === day);
    const sales = recs.reduce((s, r) => s + r.sales, 0);
    const fresh = [...new Set(recs.flatMap((r) => r.fresh || []))];
    const found = [...new Set(recs.flatMap((r) => r.discovered || []))]; // T39가 채운다
    const hidden = Object.keys(CFG.menus).filter((id) => CFG.menus[id].hidden).length;
    // 방문한 손님: 온 순서대로 한 번씩, 판마다 반응
    const guests = [];
    for (const r of recs) {
      let gst = guests.find((x) => x.id === r.customer.id);
      if (!gst) guests.push(gst = { id: r.customer.id, emoji: r.customer.emoji, name: r.customer.name, reactions: [] });
      gst.reactions.push(r.reaction);
    }
    // 오늘의 한 접시: 판매가가 가장 높은 알 (같으면 먼저 판 것). 0원뿐이면 없음
    let best = null;
    for (const r of recs) for (const b of r.balls) if (b.value > 0 && (!best || b.value > best.value)) best = { rec: r, menu: b.menu, value: b.value };
    return { recs, sales, boards: recs.length, happy: recs.filter((r) => r.satisfied).length, fresh, found, hidden, guests, best, gifts: Gift.today().map((g) => g.id) };
  }

  function show(day, then) {
    const L = CFG.letters.settle || {};
    const s = summary(day);
    const stepMs = Math.max(0, Number(CFG.day.settleStepMs) || 700);

    const g = Board.el('g', { 'pointer-events': 'all', cursor: 'pointer' }, Board.layer('top'));
    Board.el('rect', { x: 0, y: 0, width: 1280, height: 720, fill: 'rgba(15,10,8,0.55)' }, g);
    Board.el('rect', { x: PANEL.x, y: PANEL.y, width: PANEL.w, height: PANEL.h, rx: 18, fill: '#fffdf6', stroke: '#c9b89c', 'stroke-width': 4 }, g);
    const text = (x, y, str, attrs, parent = g) => { const n = Board.el('text', { x, y, fill: INK, ...attrs }, parent); n.textContent = str; return n; };
    text(640, PANEL.y + 54, (L.title || '{n}일차 끝').replace('{n}', day), { 'text-anchor': 'middle', 'font-size': 34, 'font-weight': 900 });
    Board.el('line', { x1: PANEL.x + 24, y1: PANEL.y + 80, x2: PANEL.x + PANEL.w - 24, y2: PANEL.y + 80, stroke: '#e5d6b8', 'stroke-width': 2 }, g);
    Board.el('line', { x1: 762, y1: PANEL.y + 100, x2: 762, y2: PANEL.y + PANEL.h - 50, stroke: '#efe4cc', 'stroke-width': 2 }, g);

    // ── 등장 연출 ──────────
    // 새 요소를 투명하게 만들고, 나타날 때 아래에서 살짝 올라오며 진해진다 (instant면 바로)
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
    const label = (y, str) => hidden(text(LEFT, y, str, { 'font-size': 18, 'font-weight': 700, fill: SUB }));

    const steps = []; // { wait: 앞 단계 뒤 기다릴 ms, run(instant) }
    const add = (wait, run) => steps.push({ wait, run });

    // 1. 방문한 손님 — 손님마다 한 줄, 판마다 반응 이모지
    let y = PANEL.y + 122;
    const gl = label(y, L.guests || '방문한 손님');
    add(400, (i) => appear(gl, i));
    for (const gst of s.guests) {
      y += 42;
      const row = hidden(Board.el('g', {}, g));
      text(LEFT, y, gst.emoji, { 'font-size': 30, 'font-family': EMOJI_FONT }, row);
      const nm = text(LEFT + 46, y - 3, gst.name, { 'font-size': 22, 'font-weight': 900 }, row);
      const fx = LEFT + 46 + nm.getComputedTextLength() + 18; // 이름 바로 뒤
      add(stepMs * 0.6, (i) => { appear(row, i); if (!i) Sfx.tick(); });
      gst.reactions.forEach((rk, k) => {
        const r = CFG.customers.reactions[rk];
        const face = hidden(text(fx + k * 40, y, r ? r.emoji : '?', { 'font-size': 28, 'font-family': EMOJI_FONT }));
        add(stepMs * 0.45, (i) => { appear(face, i, 14); if (!i) Sfx.tick(); });
      });
    }
    y += 34;
    const boards = hidden(text(LEFT, y, `${L.boards || '구운 판'}  ${(L.boardsVal || '{n}판 · 만족 {m}판').replace('{n}', s.boards).replace('{m}', s.happy)}`, { 'font-size': 16, fill: SUB }));
    add(stepMs * 0.5, (i) => appear(boards, i));

    // 2. 판매 수익 — ₩0부터 세어 올라감
    y += 50;
    const sl = label(y, L.sales || '판매 수익');
    const money = hidden(text(LEFT, y + 46, won(0), { 'font-size': 42, 'font-weight': 900, fill: ORANGE }));
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

    // 3. 추가된 레시피 — 새 레시피(크림) · 숨은 요리(금색) 칩
    y += 100;
    const rl = label(y, L.recipes || '추가된 레시피');
    add(COUNT_MS + stepMs * 0.6, (i) => appear(rl, i));
    const chips = [
      ...s.fresh.filter((id) => !s.found.includes(id)).map((id) => ({ id, hiddenMenu: false })),
      ...s.found.map((id) => ({ id, hiddenMenu: true })),
    ];
    let cx = LEFT;
    let cy = y + 16;
    if (!chips.length) {
      const none = hidden(text(LEFT, y + 40, L.none || '없음', { 'font-size': 20, 'font-weight': 700, fill: SUB }));
      add(stepMs * 0.5, (i) => appear(none, i));
    }
    for (const c of chips) {
      const name = (CFG.menus[c.id] || { name: c.id }).name;
      const tag = c.hiddenMenu ? (L.hiddenRecipe || '숨은 요리!') : (L.newRecipe || '새 레시피');
      const chip = hidden(Board.el('g', {}, g));
      const bg = Board.el('rect', { x: cx, y: cy, height: 40, rx: 20, fill: c.hiddenMenu ? '#ffe9a8' : '#f6ecd6', stroke: c.hiddenMenu ? '#d9a521' : '#d8c6a0', 'stroke-width': 2 }, chip);
      const t = text(cx + 16, cy + 26, '', { 'font-size': 18, 'font-weight': 900 }, chip);
      Board.el('tspan', { fill: c.hiddenMenu ? '#a0700a' : ORANGE, 'font-size': 14 }, t).textContent = `${tag} `;
      Board.el('tspan', {}, t).textContent = name;
      const w = t.getComputedTextLength() + 32;
      bg.setAttribute('width', w.toFixed(0));
      if (cx > LEFT && cx + w > CHIP_MAX_X) { // 다음 줄로
        cx = LEFT; cy += 48;
        bg.setAttribute('x', cx); bg.setAttribute('y', cy);
        t.setAttribute('x', cx + 16); t.setAttribute('y', cy + 26);
      }
      cx += w + 10;
      add(stepMs * 0.55, (i) => { appear(chip, i); if (!i) Sfx.tick(); });
    }
    y = Math.max(cy + 40, y + 56);

    // 4. 받은 선물 (작게)
    y += 36;
    const giftNames = s.gifts.map((id) => { const gf = (CFG.gifts || {})[id]; return gf ? `${gf.icon || ''} ${gf.name}`.trim() : id; });
    const gift = hidden(text(LEFT, y, `${L.gifts || '받은 선물'}  `, { 'font-size': 16, fill: SUB }));
    Board.el('tspan', { fill: INK, 'font-weight': 700, 'font-family': EMOJI_FONT }, gift).textContent = giftNames.length ? giftNames.join(' · ') : (L.none || '없음');
    add(stepMs * 0.8, (i) => appear(gift, i));

    // 5. 오늘의 한 접시 — 폴라로이드가 기울어 내려앉는다
    const bt = hidden(text(SNAP.cx, PANEL.y + 128, `★ ${L.best || '오늘의 한 접시'} ★`, { 'text-anchor': 'middle', 'font-size': 22, 'font-weight': 900, fill: '#b8860b' }));
    const snap = hidden(Board.el('g', {}, g));
    const inner = Board.el('g', { transform: `rotate(${SNAP.tilt} ${SNAP.cx} ${SNAP.cy})` }, snap);
    const sx = SNAP.cx - SNAP.w / 2;
    const sy = SNAP.cy - SNAP.h / 2;
    Board.el('rect', { x: sx + 4, y: sy + 6, width: SNAP.w, height: SNAP.h, rx: 4, fill: '#000', opacity: 0.18 }, inner);
    Board.el('rect', { x: sx, y: sy, width: SNAP.w, height: SNAP.h, rx: 4, fill: '#ffffff', stroke: '#e2d8c4', 'stroke-width': 1.5 }, inner);
    const px = SNAP.cx - SNAP.photo / 2;
    const py = sy + (SNAP.w - SNAP.photo) / 2;
    Board.el('rect', { x: px, y: py, width: SNAP.photo, height: SNAP.photo, fill: '#4a3424' }, inner);
    for (let k = 1; k < 6; k++) Board.el('line', { x1: px, y1: py + k * SNAP.photo / 6, x2: px + SNAP.photo, y2: py + k * SNAP.photo / 6 + 4, stroke: '#3b2a1d', 'stroke-width': 3 }, inner);
    const k = SNAP.photo / 352; // 성적표 사진(352)과 같은 비율
    if (s.best && s.best.rec.boat) {
      Board.el('ellipse', { cx: SNAP.cx, cy: py + SNAP.photo / 2 + 58 * k, rx: 160 * k, ry: 22 * k, fill: '#000000', opacity: 0.25 }, inner);
      const boat = s.best.rec.boat.cloneNode(true);
      const clip = boat.querySelector('clipPath'); // 복제본의 clipPath id가 겹치지 않게
      if (clip) {
        clip.setAttribute('id', 'boat-clip-settle');
        boat.querySelectorAll('[clip-path]').forEach((n) => n.setAttribute('clip-path', 'url(#boat-clip-settle)'));
      }
      boat.setAttribute('transform', `translate(${SNAP.cx} ${py + SNAP.photo / 2 + 8}) scale(${(1.27 * k).toFixed(3)})`);
      boat.removeAttribute('opacity');
      boat.setAttribute('display', 'inline');
      inner.appendChild(boat);
      const capY = py + SNAP.photo + 32;
      text(SNAP.cx, capY, CFG.menus[s.best.menu].name, { 'text-anchor': 'middle', 'font-size': 20, 'font-weight': 900 }, inner);
      text(SNAP.cx, capY + 26, won(s.best.rec.sales), { 'text-anchor': 'middle', 'font-size': 18, 'font-weight': 900, fill: ORANGE }, inner); // 그 후네 한 판 값 (사용자)
    } else {
      text(SNAP.cx, py + SNAP.photo / 2, L.bestNone || '오늘은 쉬어 가는 날', { 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 18, 'font-weight': 700, fill: '#f3e6d6' }, inner);
    }
    add(stepMs * 1.2, (i) => {
      appear(bt, i);
      if (i) { appear(snap, true); return; }
      // 위에서 더 기울어진 채로 떨어져 내려앉는다
      const t0 = performance.now();
      const ms = 420;
      const drop = (now) => {
        const u = Math.min(1, (now - t0) / ms);
        const e = 1 - (1 - u) ** 3;
        snap.setAttribute('opacity', Math.min(1, u * 2.5).toFixed(3));
        snap.setAttribute('transform', `translate(0 ${((1 - e) * -70).toFixed(1)}) rotate(${((1 - e) * -8).toFixed(2)} ${SNAP.cx} ${SNAP.cy})`);
        if (u < 1) requestAnimationFrame(drop); else { snap.removeAttribute('transform'); Sfx.boxLand(); }
      };
      requestAnimationFrame(drop);
    });

    // 6. 닫기 안내
    const close = hidden(text(PANEL.x + PANEL.w - 28, PANEL.y + PANEL.h - 22, L.close || '클릭해서 밤으로 ▶', { 'text-anchor': 'end', 'font-size': 16, 'font-weight': 700, fill: ORANGE }));
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
      while (!done()) steps[next++].run(true);
    }

    Log.add({
      step: '정산', day, sales: s.sales, boards: s.boards, happy: s.happy, fresh: s.fresh, found: s.found, gifts: s.gifts,
      best: s.best ? { menu: s.best.menu, value: s.best.value } : null,
      line: `정산 | ${day}일차 ${won(s.sales)} | ${s.boards}판 만족 ${s.happy} | 새 메뉴 ${s.fresh.length} | 숨은 요리 ${s.found.length} | 선물 ${s.gifts.length} | 오늘의 한 접시 ${s.best ? `${CFG.menus[s.best.menu].name} ${won(s.best.value)}` : '-'}`,
    });
    let stamped = false;
    g.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      Sfx.unlock();
      if (stamped) return;
      if (!done() || counting) { finishAll(); return; } // 등장 중 → 나머지 바로 다
      // 다 본 뒤 → 도장 쾅! 찍고 잠깐 뒤 닫힘 (사용자 2026-10-11)
      stamped = true;
      close.setAttribute('opacity', 0);
      const last = day >= (CFG.day.days || []).length;
      stamp(g, last ? (L.stampLast || '영업 끝!') : (L.stamp || '다음날로!'), () => { g.remove(); then(); });
    });
  }

  // 도장: 크게 떠 있다가 내려찍히고(쾅), 카드가 흔들린 뒤 then
  const STAMP = { cx: 500, cy: 470, w: 330, h: 120, tilt: -12, dropMs: 150, holdMs: 1000 };
  function stamp(g, word, then) {
    const RED = '#c62828';
    const s = Board.el('g', { opacity: 0, 'pointer-events': 'none' }, g);
    const body = Board.el('g', { transform: `rotate(${STAMP.tilt} ${STAMP.cx} ${STAMP.cy})` }, s);
    const x = STAMP.cx - STAMP.w / 2;
    const y = STAMP.cy - STAMP.h / 2;
    Board.el('rect', { x, y, width: STAMP.w, height: STAMP.h, rx: 14, fill: 'rgba(198,40,40,0.06)', stroke: RED, 'stroke-width': 7 }, body);
    Board.el('rect', { x: x + 10, y: y + 10, width: STAMP.w - 20, height: STAMP.h - 20, rx: 8, fill: 'none', stroke: RED, 'stroke-width': 2.5 }, body);
    const t = Board.el('text', { x: STAMP.cx, y: STAMP.cy + 2, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 58, 'font-weight': 900, fill: RED, 'letter-spacing': 4 }, body);
    t.textContent = word;
    const card = [...g.children].slice(1, -1); // 덮개(첫째)와 도장(마지막) 빼고 카드만 흔든다
    const t0 = performance.now();
    let landed = false;
    const step = (now) => {
      const ms = now - t0;
      if (ms < STAMP.dropMs) {
        const u = ms / STAMP.dropMs;
        const k = 2.4 - 1.4 * u * u; // 가속하며 내려옴
        s.setAttribute('opacity', (0.3 + 0.62 * u).toFixed(3));
        s.setAttribute('transform', `translate(${STAMP.cx} ${STAMP.cy}) scale(${k.toFixed(3)}) translate(${-STAMP.cx} ${-STAMP.cy})`);
      } else {
        if (!landed) { landed = true; s.setAttribute('opacity', 0.92); s.removeAttribute('transform'); Sfx.stamp(); }
        const sh = ms - STAMP.dropMs;
        const amp = Math.max(0, 7 * (1 - sh / 220));
        const dx = (amp * Math.sin(sh / 18)).toFixed(1);
        const dy = (amp * 0.6 * Math.cos(sh / 15)).toFixed(1);
        for (const n of card) n.setAttribute('transform', `translate(${dx} ${dy})`);
        s.setAttribute('transform', `translate(${dx} ${dy})`);
        if (sh >= STAMP.holdMs) { for (const n of card) n.removeAttribute('transform'); then(); return; }
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  return { show, summary };
})();
