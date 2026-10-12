// 선물 (T37, 7단계 인터뷰 2026-10-11): 결제는 늘 하고, 선물은 따로. 손님이 떠날 때 그 손님 판 중 하나라도 만족이면 두고 간다.
// 밤 선물 단계에서 선물마다 카드 한 장 — [팔기 ₩] / [남기기]. 남긴 재료 선물(잣 꾸러미)은 다음 날 재료로 공짜. 정답은 알려주지 않는다.
const Gift = (() => {
  // 배치 상수
  const CARD = { x: 390, y: 170, w: 500, h: 330 };
  const BTN = { w: 190, h: 64, gap: 24, y: 400 };
  const NOTE_MS = 1400;

  let today = [];   // [{ id, from }] 오늘 받은 선물
  let carry = [];   // 남긴 재료 선물 → 다음 날 재료 id

  function won(n) {
    return `${n.toLocaleString('ko-KR')}원`; // 원은 숫자 뒤 (사용자 2026-10-12)
  }
  function L() {
    return CFG.letters.gift || {};
  }
  function def(id) {
    const g = (CFG.gifts || {})[id];
    if (!g) Config.warn(`선물 "${id}"가 gifts에 없어 건너뜁니다`);
    return g;
  }

  // 손님이 떠날 때: 오늘 그 손님 판 중 만족이 있으면 선물. 받았으면 true
  function receive(guest) {
    if (!guest.gift) return false;
    const recs = Customer.getRecords().filter((r) => r.day === Flow.day() && r.customer.id === guest.id);
    if (!guest.giftAlways && !recs.some((r) => r.satisfied)) { // giftAlways: 만족과 상관없이 (T45, 1일차 참새)
      Log.add({ step: '선물', id: guest.gift, from: guest.id, got: false, line: `선물 | ${guest.name} 만족 없음 → 선물 없음` });
      return false;
    }
    const g = def(guest.gift);
    if (!g) return false;
    if (today.some((x) => x.id === guest.gift)) { // 같은 선물은 하루에 한 번 (T54: 까마귀 형제가 같은 오징어를)
      Log.add({ step: '선물', id: guest.gift, from: guest.id, got: false, line: `선물 | ${guest.name} → ${g.name} (오늘 이미 받음)` });
      return false;
    }
    today.push({ id: guest.gift, from: guest });
    note(g.name);
    Sfx.finish();
    Log.add({ step: '선물', id: guest.gift, from: guest.id, got: true, line: `선물 | ${guest.name} → ${g.name}` });
    return true;
  }

  // 손님 옆에 떠오르는 "🎁 잣 꾸러미"
  function note(str) {
    const S = Customer.spot;
    const t = Board.el('text', {
      x: S.x, y: S.y - 60, 'text-anchor': 'middle', 'font-size': 28, 'font-weight': 900, fill: '#ffd34d', stroke: '#1b1512', 'stroke-width': 6, 'paint-order': 'stroke',
    }, Board.layer('top'));
    t.textContent = `${L().got || '선물!'} ${str}`;
    const t0 = performance.now();
    const step = (now) => {
      const u = Math.min(1, (now - t0) / NOTE_MS);
      t.setAttribute('transform', `translate(0 ${(-20 * u).toFixed(1)})`);
      t.setAttribute('opacity', (u < 0.75 ? 1 : 1 - (u - 0.75) / 0.25).toFixed(2));
      if (u < 1) requestAnimationFrame(step); else t.remove();
    };
    requestAnimationFrame(step);
  }

  // 밤 선물 단계: 받은 선물마다 카드. 다 고르면 then
  function choose(then) {
    carry = [];
    const list = today;
    today = [];
    let k = 0;
    const next = () => {
      if (k >= list.length) { then(); return; }
      card(list[k++], next);
    };
    next();
  }

  function card(item, then) {
    const g = def(item.id);
    const T = L();
    const root = Board.el('g', { 'pointer-events': 'all' }, Board.layer('top'));
    Board.el('rect', { x: 0, y: 0, width: 1280, height: 720, fill: 'rgba(15,10,8,0.55)' }, root);
    Board.el('rect', { x: CARD.x, y: CARD.y, width: CARD.w, height: CARD.h, rx: 22, fill: '#fbf3e3', stroke: '#c9b89c', 'stroke-width': 4 }, root);
    const cx = CARD.x + CARD.w / 2;
    const text = (y, str, attrs) => { const n = Board.el('text', { x: cx, y, 'text-anchor': 'middle', fill: '#3a2a1e', ...attrs }, root); n.textContent = str; return n; };
    text(CARD.y + 44, (T.from || '{손님}의 선물').replace('{손님}', item.from.name), { 'font-size': 18, fill: '#8a7460' });
    text(CARD.y + 120, g.icon || '🎁', { 'font-size': 64, 'dominant-baseline': 'central', 'font-family': 'Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, sans-serif' });
    text(CARD.y + 190, g.name, { 'font-size': 30, 'font-weight': 900 });

    const button = (x, label, sub, color, onPick) => {
      const b = Board.el('g', { cursor: 'pointer' }, root);
      Board.el('rect', { x, y: BTN.y, width: BTN.w, height: BTN.h, rx: 14, fill: color, stroke: '#00000033', 'stroke-width': 2 }, b);
      const t1 = Board.el('text', { x: x + BTN.w / 2, y: BTN.y + 28, 'text-anchor': 'middle', 'font-size': 22, 'font-weight': 900, fill: '#fffdf6' }, b);
      t1.textContent = label;
      const t2 = Board.el('text', { x: x + BTN.w / 2, y: BTN.y + 50, 'text-anchor': 'middle', 'font-size': 13, fill: '#fffdf6' }, b);
      t2.textContent = sub;
      b.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        Sfx.unlock();
        root.remove();
        onPick();
        then();
      }, { once: true });
    };
    const x0 = cx - BTN.w - BTN.gap / 2;
    button(x0, (T.sell || '팔기 {값}').replace('{값}', won(g.sell || 0)), T.sellSub || '지금 돈으로', '#c0661c', () => {
      Wallet.add(g.sell || 0, '선물 판매');
      Sfx.coin();
      Log.add({ step: '선물', id: item.id, choice: 'sell', price: g.sell || 0, line: `선물 | ${g.name} 팔기 ${won(g.sell || 0)}` });
    });
    button(cx + BTN.gap / 2, T.keep || '남기기', g.keep || '', '#5e8a4a', () => {
      if (g.ingredient) {
        if (CFG.ingredients[g.ingredient]) carry.push(g.ingredient);
        else Config.warn(`선물 "${item.id}"의 재료 "${g.ingredient}"가 ingredients에 없습니다`);
      }
      Log.add({ step: '선물', id: item.id, choice: 'keep', line: `선물 | ${g.name} 남기기${g.ingredient ? ` → 내일 재료 ${g.ingredient}` : ''}` });
    });
  }

  return { receive, choose, carry: () => carry.slice(), pending: () => today.length, today: () => today.slice() };
})();
