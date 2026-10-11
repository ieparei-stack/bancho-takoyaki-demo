// 아침 예약 쪽지 (T46, 사용자 결정 2026-10-11 "손님이 오기 전에 주문을 먼저 — '오늘 오후에 방문할 테니, 단 걸 준비해 주세요'").
// 편지 다음, 장보기 전에 "오늘의 예약" 카드(판자에 꽂힌 쪽지). 장보기 화면 옆에도 작게 붙는다.
// 문구는 data.js day.days[i].reserve [{ who, text }] — 힌트 곡선대로 2일차는 맛 방향, 3일차는 맛 정보 없음
const Reserve = (() => {
  const NOTE = { w: 340, h: 170 };
  const PIN = { x: 1080, y: 18, w: 188, h: 104, gap: 8 };
  const EMOJI_FONT = 'Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, Malgun Gothic, sans-serif';
  const PAPER = ['#fff7c9', '#fde3e3', '#e3f1fd'];

  function list(dayIdx) {
    return ((CFG.day.days[dayIdx] || {}).reserve || []).filter((r) => {
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

  // 쪽지 한 장 (x, y = 왼쪽 위). scale로 크기 조절
  function note(parent, r, k, x, y, w, h, size) {
    const c = CFG.customers.cast[r.who];
    const tilt = [-3, 2.5, -1.5][k % 3];
    const g = Board.el('g', { transform: `rotate(${tilt} ${x + w / 2} ${y + h / 2})` }, parent);
    Board.el('rect', { x: x + 3, y: y + 4, width: w, height: h, rx: 4, fill: '#000000', opacity: 0.25 }, g);
    Board.el('rect', { x, y, width: w, height: h, rx: 4, fill: PAPER[k % PAPER.length], stroke: '#d6c79a', 'stroke-width': 1.5 }, g);
    Board.el('circle', { cx: x + w / 2, cy: y + 10, r: size * 0.32, fill: '#c0392b', stroke: '#7a2018', 'stroke-width': 1.5 }, g); // 압정
    const t = (tx, ty, str, attrs) => { const n = Board.el('text', { x: tx, y: ty, fill: '#3a2a1e', ...attrs }, g); n.textContent = str; return n; };
    t(x + 14, y + size * 2.2, `${c.emoji} ${c.name}`, { 'font-size': size * 1.05, 'font-weight': 900, 'font-family': EMOJI_FONT });
    wrap(r.text, Math.floor(w / (size * 1.02))).forEach((ln, i) => Board.rich(t(x + 14, y + size * 3.7 + i * size * 1.45, '', { 'font-size': size }), ln)); // "**힌트**" 강조 (T47)
  }

  // 아침 예약 카드. 예약이 없으면 바로 then
  function show(dayIdx, then) {
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
    close.textContent = L.close || '클릭해서 장보러 가기 ▶';
    Sfx.plop(false);
    for (const r of rs) Log.add({ step: '예약', day: dayIdx + 1, who: r.who, text: r.text, line: `예약 | ${dayIdx + 1}일차 | ${CFG.customers.cast[r.who].name} "${r.text}"` });
    g.addEventListener('pointerdown', (e) => { e.stopPropagation(); Sfx.unlock(); g.remove(); then(); }, { once: true });
  }

  // 장보기 화면 옆 작은 쪽지 (그날 예약 다시 보기)
  function pin(parent, dayIdx) {
    list(dayIdx).forEach((r, k) => note(parent, r, k, PIN.x, PIN.y + k * (PIN.h + PIN.gap), PIN.w, PIN.h, 13));
  }

  return { show, pin };
})();
