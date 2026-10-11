// 손님: 화면 위쪽에 걸어 들어와 주문 말풍선을 띄운다(T17). 대기 게이지 없음 (2026-10-10 사용자).
// 건넨 후네는 맨 앞 손님이 받고(T18) 표정별 가격 합(실패 0원)으로 매출, 반응 대사·표정.
// 누가 언제 오고 남고 떠나는지는 Flow(상태 머신, T21)가 정한다. 그림은 이모지 임시 (7단계 도형 → 9단계 이미지).
const Customer = (() => {
  // 배치 상수 (건네는 선 y 170 위쪽 공간)
  const SPOT = { x: 560, y: 108 };     // 카운터(y 150) 너머 — 아래가 가려져 상반신만
  const ENTER_X = 1380;
  const EXIT_X = -160;
  const WALK_MS = 500;
  const BUBBLE = { x: 640, y: 40, w: 230, h: 60 };
  const EMOJI_SIZE = 84;
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
  const records = [];  // 결산용: { day, customer, faces, sales, reaction, satisfied, boat }

  function init() {
    const guest = Board.layer('guest');
    g = Board.el('g', { display: 'none', 'pointer-events': 'none' }, guest);
    emoji = Board.el('text', {
      x: 0, y: 0, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': EMOJI_SIZE,
      'font-family': 'Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, sans-serif',
    }, g);
    const bg = Board.el('g', { display: 'none', 'pointer-events': 'none' }, guest);
    const box = Board.el('rect', { x: BUBBLE.x, y: BUBBLE.y, width: BUBBLE.w, height: BUBBLE.h, rx: 18, fill: '#fffaf0', stroke: '#c9b89c', 'stroke-width': 3 }, bg);
    Board.el('path', { d: `M ${BUBBLE.x + 2} ${BUBBLE.y + 34} L ${BUBBLE.x - 16} ${BUBBLE.y + 44} L ${BUBBLE.x + 2} ${BUBBLE.y + 46} Z`, fill: '#fffaf0', stroke: '#c9b89c', 'stroke-width': 3, 'stroke-linejoin': 'round' }, bg);
    Board.el('rect', { x: BUBBLE.x + 1, y: BUBBLE.y + 32, width: 6, height: 16, fill: '#fffaf0' }, bg); // 꼬리 이음새 가림
    const text = Board.el('text', {
      x: BUBBLE.x + BUBBLE.w / 2, y: BUBBLE.y + BUBBLE.h / 2, 'text-anchor': 'middle', 'dominant-baseline': 'central',
      'font-size': 24, 'font-weight': 700, fill: '#3a2a1e',
    }, bg);
    bubble = { g: bg, text, box };
  }

  // 말풍선 글자. "**잣**"은 강조 (T47)
  function setLine(str) {
    bubble.raw = str;
    Board.rich(bubble.text, str);
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

  // 반응 고르기 (T29, 위에서부터 처음 맞는 것). balls = Menu.price 결과 + face
  //   망함(실패 알 많음) → 반함(좋아하는 메뉴) → 싫은 맛 → 아쉬움(좋아하는 알 0, 단서) → 맛있다(일부, 단서) → 최고
  function judge(balls, guest) {
    const R = CFG.customers.react;
    const say = (t) => CFG.letters.tagSay[t] || t;
    const fails = balls.filter((b) => FAIL.includes(b.face)).length;
    if (fails >= R.failBalls) return { key: 'flop', vars: {} };
    const fav = balls.find((b) => b.fav);
    if (fav) return { key: 'love', vars: { '메뉴': CFG.menus[fav.menu].name } };
    const bad = balls.find((b) => b.dislikeN > 0);
    if (bad) {
      const tag = (guest.dislikes || []).find((t) => bad.tags.includes(t));
      return { key: 'dislike', vars: { '싫은 맛': say(tag) }, clue: tag };
    }
    // 좋아하는 맛 중 이번 판에 가장 적게 든 맛 = 단서
    const likes = guest.likes || [];
    let missing = likes[0];
    let least = Infinity;
    for (const t of likes) {
      const n = balls.filter((b) => b.tags.includes(t)).length;
      if (n < least) { least = n; missing = t; }
    }
    const liked = balls.filter((b) => b.likeN > 0).length;
    if (liked === 0) return { key: 'lack', vars: { '빠진 맛': say(missing) }, clue: missing };
    if (liked < R.bestBalls) return { key: 'good', vars: { '빠진 맛': say(missing) }, clue: missing };
    return { key: 'best', vars: {} };
  }

  // 조건 대사 (T36): cast[id].when 중 처음 맞는 줄
  function pickWhen(guest, balls, pick) {
    for (const w of guest.when || []) {
      const c = w.if || {};
      if (c.noFav && balls.some((b) => b.fav)) continue;
      if (c.not && c.not.includes(pick.key)) continue;
      if (c.day && c.day !== Flow.day()) continue;
      if (c.round && c.round !== Flow.round()) continue; // 그날 몇 번째 판 (T45)
      if (c.react && !c.react.includes(pick.key)) continue; // 이 반응일 때만 (T45)
      if (typeof w.line !== 'string') { Config.warn(`customers.cast.${guest.id}.when 줄에 line이 없습니다`); continue; }
      return w;
    }
    return null;
  }

  // {싫은 맛} {빠진 맛}은 재료 힌트라 강조 (T47)
  function fill(line, vars) {
    return line.replace(/\{([^}]+)\}/g, (m, k) => (k in vars ? (k === '메뉴' ? vars[k] : `**${vars[k]}**`) : m));
  }

  // 건넨 후네를 받는다. 알마다 메뉴·값을 매기고 (Menu.price) 반응을 고른다
  function serve({ faces, ings, cook, sauceLen, flakes, boat }) {
    const balls = faces.map((face, i) => ({ face, ...Menu.price({ ings: ings[i] || [], face }, current) }));
    const sales = balls.reduce((s, b) => s + b.value, 0);
    const pick = judge(balls, current);
    const react = CFG.customers.reactions[pick.key];
    const cond = pickWhen(current, balls, pick);
    if (cond && cond.clue) pick.clue = cond.clue;
    const line = cond ? cond.line : fill((current.lines && current.lines[pick.key]) || react.line, pick.vars); // 조건 대사 > 손님별 대사 > 기본
    total += sales;           // 결산용 매출 합 (송금 제외)
    Wallet.add(sales, '매출');
    emoji.textContent = react.emoji;
    setLine(line);
    bubble.g.removeAttribute('transform');
    showBubble();
    popup(sales);
    if (sales > 0) Sfx.coin(); else Sfx.hmm();
    const fresh = Menu.learn(balls.map((b) => b.menu));
    if (fresh.length) note(`${CFG.letters.menu.fresh} ${fresh.map((id) => CFG.menus[id].name).join(' · ')}`);
    records.push({ day: Flow.day(), customer: current, faces, ings, cook, balls, fresh, line, sales, reaction: pick.key, clueTag: pick.clue || null, satisfied: react.satisfied, sauceLen, flakes, boat });

    const counts = {};
    for (const b of balls) counts[b.menu] = (counts[b.menu] || 0) + 1;
    const menus = Object.entries(counts).map(([id, n]) => `${CFG.menus[id].name}×${n}`).join(' ');
    Log.add({
      step: '서빙', day: Flow.day(), customer: current.id, faces, ings, values: balls.map((b) => b.value), sales, reaction: pick.key, clueTag: pick.clue || null, satisfied: react.satisfied, total,
      line: `서빙 | ${Flow.day()}일차 ${current.name} ${current.emoji} | ${menus} | ${won(sales)} (${balls.map((b) => b.value).join('+')}) | 반응 ${pick.key}${pick.clue ? ` (단서: ${pick.clue})` : ''} | 누적 ${won(total)}`,
    });
    Flow.served();
  }

  // 손님 옆에 잠깐 떠오르는 알림 (새 메뉴!)
  function note(str) {
    const t = Board.el('text', {
      x: SPOT.x + 80, y: SPOT.y + 60, 'font-size': 24, 'font-weight': 900, fill: '#ffd34d', stroke: '#1b1512', 'stroke-width': 5, 'paint-order': 'stroke',
    }, Board.layer('top'));
    t.textContent = str;
    const t0 = performance.now();
    const step = (now) => {
      const u = Math.min(1, (now - t0) / 1500);
      t.setAttribute('transform', `translate(0 ${(-16 * u).toFixed(1)})`);
      t.setAttribute('opacity', (u < 0.7 ? 1 : 1 - (u - 0.7) / 0.3).toFixed(2));
      if (u < 1) requestAnimationFrame(step); else t.remove();
    };
    requestAnimationFrame(step);
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
    setLine(current.order);
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
  // 잠깐 끼어드는 말 (T45: 2판에 잣을 안 넣으면 참새가) — ms 뒤 원래 말풍선으로
  let sayTimer = 0;
  let saved = null;
  function say(line, ms = 1800) {
    if (!saved) saved = { text: bubble.raw, tf: bubble.g.getAttribute('transform') };
    clearTimeout(sayTimer);
    setLine(line);
    bubble.g.removeAttribute('transform');
    showBubble();
    sayTimer = setTimeout(() => {
      setLine(saved.text);
      if (saved.tf) bubble.g.setAttribute('transform', saved.tf);
      showBubble();
      saved = null;
    }, ms);
  }

  function stay(line) {
    emoji.textContent = current.emoji;
    setLine(line);
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

  return { init, arrive, say, stay, leave, shrinkBubble, reset, serve, judge, getRecords: () => records, get total() { return total; }, get spot() { return SPOT; } };
})();
