// 아침 예약 쪽지 (T46, 사용자 결정 2026-10-11 "손님이 오기 전에 주문을 먼저 — '오늘 오후에 방문할 테니, 단 걸 준비해 주세요'").
// 편지 다음, 장보기 전에 "오늘의 예약" 카드(판자에 꽂힌 쪽지). 장보기 화면 옆에도 작게 붙는다.
// 문구는 data.js day.days[i].reserve [{ who, text }] — 힌트 곡선대로 2일차는 맛 방향, 3일차는 맛 정보 없음
// T52 (사용자 2026-10-12): 예약 판이 저절로 뜨지 않고, 화면 오른쪽 코르크 메모판을 눌러 직접 연다.
//   아침에는 꼭 읽어야 장보기로 (morning), 그 뒤로는 하루 종일 메모판을 눌러 다시 본다.
const Reserve = (() => {
  const NOTE = { w: 340, h: 170 };
  const PIN = { x: 1080, y: 18, w: 188, h: 104, gap: 8 };
  const EMOJI_FONT = 'Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, Malgun Gothic, sans-serif';
  const PAPER = ['#fff7c9', '#fde3e3', '#e3f1fd'];
  const BOARD = { x: 1102, y: 196, w: 156, h: 118 }; // 코르크 메모판 (왼쪽 위 = 돈 표시, 오른쪽 아래 = 종 자리를 피해서)

  let boardG = null;
  let mini = null;      // 메모판 위 작은 쪽지들
  let badge = null;     // 안 읽음 "!"
  let glow = null;
  let pulse = 0;
  let dayNow = -1;
  let read = false;     // 오늘 예약을 읽었나
  let gate = null;      // 아침 관문 { block, then }
  let open = false;     // 예약 판이 펼쳐져 있나

  // 그날 예약 + 어제 소문을 듣고 예약한 손님 쪽지 (T57, customers.cast[id].reserve)
  function list(dayIdx) {
    const rumor = Rumor.guests(dayIdx).filter((id) => CFG.customers.cast[id] && CFG.customers.cast[id].reserve)
      .map((id) => ({ who: id, text: CFG.customers.cast[id].reserve }));
    return [...((CFG.day.days[dayIdx] || {}).reserve || []), ...rumor].filter((r) => {
      if (CFG.customers.cast[r.who]) return true;
      Config.warn(`day.days[${dayIdx}].reserve의 손님 "${r.who}"가 customers.cast에 없어 건너뜁니다`);
      return false;
    });
  }

  // 글자 수로 줄 나누기
  function wrap(str, max) {
    const out = [];
    let line = '';
    for (const word of String(str).split(' ')) {
      if ((line + ' ' + word).trim().length > max && line) { out.push(line); line = word; }
      else line = (line + ' ' + word).trim();
    }
    if (line) out.push(line);
    return out;
  }

  // 쪽지 한 장 (x, y = 왼쪽 위). 글이 길면 아래로 늘어난다. 실제 높이를 돌려준다
  function note(parent, r, k, x, y, w, h, size) {
    const c = CFG.customers.cast[r.who];
    const lines = wrap(r.text, Math.floor(w / (size * 1.02)));
    h = Math.max(h, size * 3.7 + (lines.length - 1) * size * 1.45 + size * 1.1);
    const tilt = [-3, 2.5, -1.5][k % 3];
    const g = Board.el('g', { transform: `rotate(${tilt} ${x + w / 2} ${y + h / 2})` }, parent);
    Board.el('rect', { x: x + 3, y: y + 4, width: w, height: h, rx: 4, fill: '#000000', opacity: 0.25 }, g);
    Board.el('rect', { x, y, width: w, height: h, rx: 4, fill: PAPER[k % PAPER.length], stroke: '#d6c79a', 'stroke-width': 1.5 }, g);
    Board.el('circle', { cx: x + w / 2, cy: y + 10, r: size * 0.32, fill: '#c0392b', stroke: '#7a2018', 'stroke-width': 1.5 }, g); // 압정
    const t = (tx, ty, str, attrs) => { const n = Board.el('text', { x: tx, y: ty, fill: '#3a2a1e', ...attrs }, g); n.textContent = str; return n; };
    t(x + 14, y + size * 2.2, `${c.emoji} ${c.name}`, { 'font-size': size * 1.05, 'font-weight': 900, 'font-family': EMOJI_FONT });
    lines.forEach((ln, i) => Board.rich(t(x + 14, y + size * 3.7 + i * size * 1.45, '', { 'font-size': size }), ln)); // "**힌트**" 강조 (T47)
    return h;
  }

  // ── 코르크 메모판 (T52) ─────────────────────────────────

  function init() {
    const side = Board.layer('side');
    boardG = Board.el('g', { cursor: 'pointer' }, side);
    const B = BOARD;
    Board.el('line', { x1: B.x + 22, y1: B.y + 6, x2: B.x + B.w / 2, y2: B.y - 30, stroke: '#2a1d14', 'stroke-width': 2 }, boardG); // 거는 끈
    Board.el('line', { x1: B.x + B.w - 22, y1: B.y + 6, x2: B.x + B.w / 2, y2: B.y - 30, stroke: '#2a1d14', 'stroke-width': 2 }, boardG);
    Board.el('circle', { cx: B.x + B.w / 2, cy: B.y - 30, r: 4, fill: '#8a8a8a', stroke: '#3a3a3a', 'stroke-width': 1.5 }, boardG); // 못
    Board.el('rect', { x: B.x + 3, y: B.y + 5, width: B.w, height: B.h, rx: 6, fill: '#000', opacity: 0.3 }, boardG);
    Board.el('rect', { x: B.x, y: B.y, width: B.w, height: B.h, rx: 6, fill: '#6e4628', stroke: '#4a2f1c', 'stroke-width': 2 }, boardG); // 나무 테
    Board.el('rect', { x: B.x + 9, y: B.y + 9, width: B.w - 18, height: B.h - 18, rx: 3, fill: '#c69a62' }, boardG); // 코르크
    // 코르크 알갱이
    for (let i = 0; i < 70; i++) {
      const px = B.x + 12 + ((i * 37) % (B.w - 24));
      const py = B.y + 12 + ((i * 53) % (B.h - 24));
      Board.el('circle', { cx: px, cy: py, r: (i % 3) * 0.6 + 0.8, fill: i % 2 ? '#a87c48' : '#dcb47e', opacity: 0.8 }, boardG);
    }
    const label = Board.el('text', { x: B.x + B.w / 2, y: B.y + B.h + 18, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: '#c9b8a4' }, boardG);
    label.textContent = (CFG.letters.reserve || {}).board || '메모판';
    mini = Board.el('g', { 'pointer-events': 'none' }, boardG);
    badge = Board.el('g', { 'pointer-events': 'none', display: 'none' }, boardG);
    Board.el('circle', { cx: B.x + B.w - 4, cy: B.y + 4, r: 13, fill: '#d8433a', stroke: '#fff', 'stroke-width': 2 }, badge);
    const bt = Board.el('text', { x: B.x + B.w - 4, y: B.y + 5, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 16, 'font-weight': 900, fill: '#fff' }, badge);
    bt.textContent = '!';
    boardG.addEventListener('pointerdown', (e) => { e.stopPropagation(); Sfx.unlock(); press(); });
  }

  // 새 날: 메모판의 작은 쪽지를 그날 예약으로 (Flow가 부른다)
  function setDay(dayIdx) {
    dayNow = dayIdx;
    read = false;
    mini.replaceChildren();
    const rs = list(dayIdx);
    rs.forEach((r, k) => {
      const c = CFG.customers.cast[r.who];
      const w = 54;
      const h = 44;
      const x = BOARD.x + 16 + k * (w + 10);
      const y = BOARD.y + 22 + (k % 2) * 10;
      const g = Board.el('g', { transform: `rotate(${[-6, 5, -3][k % 3]} ${x + w / 2} ${y + h / 2})` }, mini);
      Board.el('rect', { x, y, width: w, height: h, rx: 2, fill: PAPER[k % PAPER.length], stroke: '#d6c79a', 'stroke-width': 1 }, g);
      Board.el('circle', { cx: x + w / 2, cy: y + 5, r: 3.5, fill: '#c0392b' }, g);
      const t = Board.el('text', { x: x + w / 2, y: y + h / 2 + 5, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 20, 'font-family': EMOJI_FONT }, g);
      t.textContent = c.emoji;
    });
    badge.setAttribute('display', rs.length ? 'inline' : 'none');
  }

  function press() {
    if (open || dayNow < 0 || !list(dayNow).length) return;
    if (gate) {
      // 아침 관문: 읽고 나면 장보기로
      const then = gate.then;
      endGate();
      markRead();
      show(dayNow, then);
      return;
    }
    // 하루 종일 다시 보기
    markRead();
    show(dayNow, () => {}, (CFG.letters.reserve || {}).reread || '클릭해서 닫기 ▶');
  }

  function markRead() {
    read = true;
    badge.setAttribute('display', 'none');
  }

  // 아침: 메모판을 눌러 예약을 읽어야 then (예약이 없으면 바로)
  function morning(dayIdx, then) {
    if (dayNow !== dayIdx) setDay(dayIdx);
    if (!list(dayIdx).length) { then(); return; }
    const side = Board.layer('side');
    const block = Board.el('rect', { x: 0, y: 0, width: 1280, height: 720, fill: 'transparent', 'pointer-events': 'all' }, side);
    side.insertBefore(block, side.firstChild);
    gate = { block, then };
    glow = Board.el('rect', { x: BOARD.x - 8, y: BOARD.y - 8, width: BOARD.w + 16, height: BOARD.h + 16, rx: 12, fill: 'rgba(255,211,77,0.16)', stroke: '#ffd34d', 'stroke-width': 4, 'pointer-events': 'none' }, side);
    side.insertBefore(glow, boardG);
    const t0 = performance.now();
    const step = (now) => {
      if (!glow) return;
      glow.setAttribute('opacity', (0.45 + 0.55 * Math.abs(Math.sin((now - t0) / 380))).toFixed(2));
      pulse = requestAnimationFrame(step);
    };
    pulse = requestAnimationFrame(step);
    const hint = (CFG.letters.reserve || {}).hint;
    if (hint) Hint.say(hint, '메모판');
    Log.add({ step: '예약', line: `메모판 — ${dayIdx + 1}일차 예약 ${list(dayIdx).length}장, 읽어야 장보기` });
  }

  function endGate() {
    cancelAnimationFrame(pulse);
    if (glow) glow.remove();
    glow = null;
    if (gate) gate.block.remove();
    gate = null;
    Hint.hide();
  }

  // 예약 판. 예약이 없으면 바로 then. closeText = 아래 안내 (아침엔 "장보러 가기", 다시 볼 땐 "닫기")
  function show(dayIdx, then, closeText) {
    const rs = list(dayIdx);
    if (!rs.length) { then(); return; }
    const L = CFG.letters.reserve || {};
    const g = Board.el('g', { 'pointer-events': 'all', cursor: 'pointer' }, Board.layer('top'));
    Board.el('rect', { x: 0, y: 0, width: 1280, height: 720, fill: 'rgba(15,10,8,0.6)' }, g);
    // 판자
    const bw = Math.max(520, rs.length * (NOTE.w + 30) + 60);
    const bx = 640 - bw / 2;
    Board.el('rect', { x: bx, y: 150, width: bw, height: 380, rx: 14, fill: '#8a5a34', stroke: '#5e3d22', 'stroke-width': 5 }, g);
    for (let k = 1; k < 4; k++) Board.el('line', { x1: bx, y1: 150 + k * 95, x2: bx + bw, y2: 150 + k * 95, stroke: '#6e4628', 'stroke-width': 2 }, g);
    const title = Board.el('text', { x: 640, y: 128, 'text-anchor': 'middle', 'font-size': 34, 'font-weight': 900, fill: '#ffd34d', stroke: '#1b1512', 'stroke-width': 6, 'paint-order': 'stroke' }, g);
    title.textContent = `📌 ${L.title || '오늘의 예약'}`;
    const x0 = 640 - (rs.length * NOTE.w + (rs.length - 1) * 30) / 2;
    rs.forEach((r, k) => note(g, r, k, x0 + k * (NOTE.w + 30), 245, NOTE.w, NOTE.h, 20));
    const close = Board.el('text', { x: 640, y: 580, 'text-anchor': 'middle', 'font-size': 18, 'font-weight': 700, fill: '#f3e6d6' }, g);
    close.textContent = closeText || L.close || '클릭해서 장보러 가기 ▶';
    open = true;
    Sfx.plop(false);
    for (const r of rs) Log.add({ step: '예약', day: dayIdx + 1, who: r.who, text: r.text, line: `예약 | ${dayIdx + 1}일차 | ${CFG.customers.cast[r.who].name} "${r.text}"` });
    g.addEventListener('pointerdown', (e) => { e.stopPropagation(); Sfx.unlock(); g.remove(); open = false; then(); }, { once: true });
  }

  // 장보기 화면 옆 작은 쪽지 (그날 예약 다시 보기) — 쪽지 높이만큼 아래로 쌓는다
  function pin(parent, dayIdx) {
    let y = PIN.y;
    list(dayIdx).forEach((r, k) => { y += note(parent, r, k, PIN.x, y, PIN.w, PIN.h, 13) + PIN.gap; });
  }

  return { init, setDay, morning, show, pin, state: () => ({ day: dayNow, read, gate: !!gate, open }) };
})();
