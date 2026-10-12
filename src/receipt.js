// 손님 후기 게시물 (T43, 플레이 피드백 2026-10-11 — T30 판 성적표를 바꿈): 건네면 바로 뜨고 클릭하면 닫힌다.
// 폰 화면의 SNS 게시물(프로필 · 정사각 후네 사진 · ♥ · 좋아요 · 본문)처럼, 옆에 종이 영수증(알별 메뉴·굽기·값·합계).
// 본문은 손님이 실제 리뷰에 쓰는 말투: "반죽이 흐물흐물했어요", "재료가 없는 알이 있었어요!", "잣이 들어가 있어서 좋았어요!"
// 굽기는 원인이 드러나게(일찍 = 흐물흐물, 늦게 = 탐 …), 맛은 시식평으로만(빠진 맛을 직접 말하지 않음). 팁은 없음 (사용자 결정 2026-10-11)
const Receipt = (() => {
  // 배치 상수 (1280×720)
  const PHONE = { x: 330, y: 22, w: 380, h: 676, pad: 14 };
  const PHOTO = { max: 352, min: 220 };            // 정사각 사진: 본문이 길면 줄어든다 (폰 안에 다 들어가게)
  const LINE = 18;                                  // 본문 줄 간격
  const MAX = 25;                                   // 본문 한 줄 글자 수
  const PAPER = { x: 760, y: 96, w: 300, rowH: 30 };
  const INK = '#262626';
  const SUB = '#8e8e8e';
  const EMOJI_FONT = 'Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, Malgun Gothic, sans-serif';
  const FAIL = ['raw', 'burnt', 'blank'];
  const KOR_N = ['', '한', '두', '세', '네', '다섯', '여섯'];

  function won(n) {
    return `${n.toLocaleString('ko-KR')}원`; // 원은 숫자 뒤 (사용자 2026-10-12)
  }

  // 글자 수로 줄 나누기 (SVG text는 자동 줄바꿈이 없다)
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

  // "{n} 알" → "두 알", 판 전체면 "여섯 알 다"
  function count(tpl, n, total) {
    const word = n >= total ? KOR_N[Math.min(n, 6)] + ' 알 다' : `${KOR_N[Math.min(n, 6)] || n} 알은`;
    return tpl.replace('{n}', word);
  }

  // 받침 있으면 '이', 없으면 '가'
  function iga(word) {
    const c = word.charCodeAt(word.length - 1);
    return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 ? '이' : '가';
  }

  // 후기 본문 문장 (화면·로그·검증이 같이 쓴다)
  function review(rec) {
    const R = CFG.letters.review;
    const S = R.say;
    const balls = rec.balls;
    const cook = rec.cook || [];
    const n = balls.length;
    const pos = [];   // 좋았던 것 (먼저 넣은 게 우선)
    const neg = [];   // 아쉬웠던 것 { line, w } — w = 그 문제가 든 알 수

    // 좋았던 것: 좋아하는 맛을 낸 재료 (넣은 걸 칭찬 — 빠진 맛은 말하지 않는다)
    const likes = rec.customer.likes || [];
    const liked = new Set();
    balls.forEach((b, i) => {
      for (const id of (rec.ings && rec.ings[i]) || []) {
        if (id === 'octopus') continue;
        const ing = CFG.ingredients[id];
        if (ing && ing.tags.some((t) => likes.includes(t))) liked.add(id);
      }
    });
    for (const id of liked) {
      const name = CFG.ingredients[id].name;
      pos.push(S.likedIng.replace('{재료}', name + iga(name)));
    }
    const perfect = balls.filter((b) => b.face === 'perfect').length;
    if (perfect >= n) pos.push(S.allPerfect);
    else if (perfect) pos.push(count(S.somePerfect, perfect, n));

    // 아쉬웠던 것: 굽기 원인을 알 수로 (값을 깎은 알만)
    const causes = {};
    balls.forEach((b, i) => {
      if (b.face === 'perfect' || b.face === 'blank') return;
      const c = cook[i] || {};
      const set = new Set([c.f1, c.f2].filter((r) => r && r !== '퍼펙트'));
      if (set.size > 1) set.delete('굿'); // 실패 원인이 있으면 "조금 빗나감"은 그 알에선 세지 않는다
      for (const r of set) causes[r] = (causes[r] || 0) + 1;
    });
    const order = ['이름', '늦음', '미달', '과회전', '느림'];
    const blank = balls.filter((b) => b.face === 'blank').length;
    if (blank) neg.push({ line: blank === 1 ? S.blankOne : count(S.blankMany, blank, n), w: blank + 0.5 }); // 빈 알은 0원 — 같은 수면 먼저
    for (const r of order) if (causes[r]) neg.push({ line: count(S.cause[r], causes[r], n), w: causes[r] });
    const disliked = balls.filter((b) => b.dislikeN > 0).length;
    if (disliked) neg.push({ line: count(S.disliked, disliked, n), w: disliked - 0.5 });
    if (causes['굿'] && !neg.length) neg.push({ line: S.cause['굿'], w: 0 });
    neg.sort((a, b) => b.w - a.w);

    // 글이 길지 않게 (사용자 피드백 2026-10-11): 좋았던 것 하나 + 가장 큰 문제 하나, 한쪽이 없으면 다른 쪽으로 채워 최대 R.maxLines줄
    const max = R.maxLines || 2;
    const p = pos.slice(0, neg.length ? 1 : max);
    const q = neg.slice(0, max - p.length).map((x) => x.line);
    const lines = [...p, ...q];

    const stars = R.stars[rec.reaction] ?? 3;
    const likesN = Math.max(1, Math.round(rec.sales / 9) + stars * 3);
    return { stars, likes: likesN, lines, fails: balls.filter((b) => FAIL.includes(b.face)).length };
  }

  function show(rec, then) {
    const R = CFG.letters.review;
    const L = CFG.letters.receipt;
    const rv = review(rec);
    const t0 = performance.now();
    const g = Board.el('g', { 'pointer-events': 'all', cursor: 'pointer' }, Board.layer('top')); // top 레이어는 pointer-events none
    Board.el('rect', { x: 0, y: 0, width: 1280, height: 720, fill: 'rgba(15,10,8,0.6)' }, g);
    const text = (x, y, str, attrs) => { const t = Board.el('text', { x, y, fill: INK, ...attrs }, g); t.textContent = str; return t; };

    // ── 폰 ────────────────────────────────
    const P = PHONE;
    Board.el('rect', { x: P.x, y: P.y, width: P.w, height: P.h, rx: 34, fill: '#1b1b1b' }, g);
    Board.el('rect', { x: P.x + P.pad, y: P.y + P.pad, width: P.w - P.pad * 2, height: P.h - P.pad * 2, rx: 24, fill: '#ffffff' }, g);
    const x0 = P.x + P.pad;
    const inner = P.w - P.pad * 2;
    let y = P.y + P.pad;
    // 상태바 + 앱 이름
    text(x0 + 22, y + 20, '9:41', { 'font-size': 12, 'font-weight': 700 });
    Board.el('rect', { x: x0 + inner / 2 - 40, y: y + 8, width: 80, height: 16, rx: 8, fill: '#1b1b1b' }, g);
    text(x0 + inner - 22, y + 20, '▮▮▮', { 'text-anchor': 'end', 'font-size': 10 });
    text(x0 + 14, y + 52, R.app, { 'font-size': 20, 'font-weight': 900, 'font-style': 'italic' });
    y += 66;
    Board.el('line', { x1: x0, y1: y, x2: x0 + inner, y2: y, stroke: '#efefef', 'stroke-width': 1 }, g);
    // 프로필
    y += 26;
    Board.el('circle', { cx: x0 + 26, cy: y, r: 16, fill: '#f3e6d6', stroke: '#e1306c', 'stroke-width': 2 }, g);
    text(x0 + 26, y + 1, rec.customer.emoji, { 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 17, 'font-family': EMOJI_FONT });
    text(x0 + 50, y - 3, (rec.customer.handle || `@${rec.customer.id}`).replace(/^@/, ''), { 'font-size': 14, 'font-weight': 700 });
    text(x0 + 50, y + 13, R.place, { 'font-size': 11, fill: INK });
    text(x0 + inner - 16, y, '···', { 'text-anchor': 'end', 'font-size': 16, 'font-weight': 900 });
    y += 24;
    // 본문 줄 수를 먼저 세서 사진 크기를 정한다
    const body = [rec.line, ...rv.lines]; // "**힌트**" 강조 유지 (T47)
    const tags = [...new Set(rec.balls.map((b) => b.menu))].map((id) => `#${CFG.menus[id].name.replace(/\s/g, '')}`).join(' ');
    const bodyLines = body.reduce((a, s) => a + wrap(s, MAX).length, 0) + wrap(tags, MAX + 4).length;
    const bottom = P.y + P.h - P.pad - 14;
    const after = 30 + 22 + 22 + bodyLines * LINE + LINE; // 아이콘 · 좋아요 · 아이디 · 본문 · 날짜
    // 정사각 사진: 어두운 나무 바탕 위 후네
    const ps = Math.round(Math.max(PHOTO.min, Math.min(PHOTO.max, bottom - y - after)));
    const px = x0 + (inner - ps) / 2;
    Board.el('rect', { x: px, y, width: ps, height: ps, fill: '#4a3424' }, g);
    for (let k = 1; k < 6; k++) Board.el('line', { x1: px, y1: y + k * ps / 6, x2: px + ps, y2: y + k * ps / 6 + 5, stroke: '#3b2a1d', 'stroke-width': 3 }, g);
    Board.el('ellipse', { cx: px + ps / 2, cy: y + ps / 2 + 58 * ps / PHOTO.max, rx: 160 * ps / PHOTO.max, ry: 22 * ps / PHOTO.max, fill: '#000000', opacity: 0.25 }, g);
    if (rec.boat) {
      const boat = rec.boat.cloneNode(true);
      const clip = boat.querySelector('clipPath'); // 복제본의 clipPath id가 겹치지 않게
      if (clip) {
        clip.setAttribute('id', 'boat-clip-review');
        boat.querySelectorAll('[clip-path]').forEach((k) => k.setAttribute('clip-path', 'url(#boat-clip-review)'));
      }
      boat.setAttribute('transform', `translate(${px + ps / 2} ${y + ps / 2 + 8}) scale(${(1.27 * ps / PHOTO.max).toFixed(3)})`);
      boat.removeAttribute('opacity');
      boat.setAttribute('display', 'inline');
      g.appendChild(boat);
    }
    y += ps;
    // ♥ 💬 ➤ … 🔖
    y += 30;
    const loved = rv.stars >= 3;
    text(x0 + 14, y, loved ? '♥' : '♡', { 'font-size': 26, fill: loved ? '#ed4956' : INK });
    text(x0 + 50, y - 2, '💬', { 'font-size': 20, 'font-family': EMOJI_FONT });
    text(x0 + 84, y - 2, '➤', { 'font-size': 20 });
    text(x0 + inner - 14, y - 2, '🔖', { 'text-anchor': 'end', 'font-size': 18, 'font-family': EMOJI_FONT });
    y += 22;
    text(x0 + 14, y, R.likes.replace('{n}', rv.likes.toLocaleString('ko-KR')), { 'font-size': 13, 'font-weight': 700 });
    // 본문: 아이디 별점 / 시식평 / 리뷰 문장 / 해시태그
    y += 22;
    const handle = (rec.customer.handle || `@${rec.customer.id}`).replace(/^@/, '');
    const head = text(x0 + 14, y, handle, { 'font-size': 13, 'font-weight': 700 });
    const star = Board.el('tspan', { dx: 6, fill: '#f0b41c' }, head);
    star.textContent = '★'.repeat(rv.stars) + '☆'.repeat(5 - rv.stars);
    for (const [k, s] of body.entries()) {
      for (const part of wrap(s, MAX)) { y += LINE; Board.rich(text(x0 + 14, y, '', { 'font-size': 13, 'font-weight': k === 0 ? 700 : 400 }), part); }
    }
    for (const part of wrap(tags, MAX + 4)) { y += LINE; text(x0 + 14, y, part, { 'font-size': 13, fill: '#00376b' }); }
    y += LINE;
    text(x0 + 14, y, R.when.replace('{n}', rec.day), { 'font-size': 11, fill: SUB });

    // ── 영수증 (알별 메뉴·굽기·값, 합계) ──────────
    const Q = PAPER;
    const rows = rec.balls.length;
    const qh = 96 + rows * Q.rowH + 60;
    const paper = Board.el('g', { transform: `rotate(2 ${Q.x + Q.w / 2} ${Q.y + qh / 2})` }, g);
    const zig = Array.from({ length: 16 }, (_, k) => `L ${Q.x + (k + 0.5) * Q.w / 16} ${Q.y + qh + (k % 2 ? 0 : 6)}`).join(' ');
    Board.el('path', { d: `M ${Q.x} ${Q.y} L ${Q.x + Q.w} ${Q.y} L ${Q.x + Q.w} ${Q.y + qh} ${zig} L ${Q.x} ${Q.y + qh} Z`, fill: '#fffdf6', stroke: '#d9cbb0', 'stroke-width': 1.5 }, paper);
    const ptext = (x, yy, str, attrs) => { const t = Board.el('text', { x, y: yy, fill: '#3a2a1e', 'font-family': 'Malgun Gothic, Apple SD Gothic Neo, sans-serif', ...attrs }, paper); t.textContent = str; return t; };
    ptext(Q.x + Q.w / 2, Q.y + 34, R.receiptTitle, { 'text-anchor': 'middle', 'font-size': 18, 'font-weight': 900 });
    ptext(Q.x + Q.w / 2, Q.y + 56, `${rec.customer.name} · ${R.when.replace('{n}', rec.day)}`, { 'text-anchor': 'middle', 'font-size': 12, fill: '#8a7460' });
    Board.el('line', { x1: Q.x + 16, y1: Q.y + 72, x2: Q.x + Q.w - 16, y2: Q.y + 72, stroke: '#b9a88a', 'stroke-dasharray': '4 4' }, paper);
    rec.balls.forEach((b, i) => {
      const yy = Q.y + 98 + i * Q.rowH;
      const f = CFG.faces[b.face] || CFG.faces.tasty;
      Board.el('circle', { cx: Q.x + 24, cy: yy - 5, r: 7, fill: f.color, stroke: '#00000033', 'stroke-width': 1.5 }, paper);
      const heart = b.likeN > 0 ? '♥' : '';
      const nm = ptext(Q.x + 38, yy, `${heart}${CFG.menus[b.menu].name}`, { 'font-size': 13, 'font-weight': 700 });
      if (heart) nm.setAttribute('fill', '#c0392b');
      ptext(Q.x + 38, yy + 13, CFG.letters.faceName[b.face], { 'font-size': 10, fill: FAIL.includes(b.face) ? '#c0392b' : '#8a7460' });
      ptext(Q.x + Q.w - 16, yy, won(b.value), { 'text-anchor': 'end', 'font-size': 13, fill: b.value ? '#3a2a1e' : '#b0a090' });
    });
    const ty = Q.y + 98 + rows * Q.rowH + 4;
    Board.el('line', { x1: Q.x + 16, y1: ty - 14, x2: Q.x + Q.w - 16, y2: ty - 14, stroke: '#b9a88a', 'stroke-dasharray': '4 4' }, paper);
    ptext(Q.x + 16, ty + 12, R.total, { 'font-size': 15, 'font-weight': 900 });
    ptext(Q.x + Q.w - 16, ty + 12, won(rec.sales), { 'text-anchor': 'end', 'font-size': 18, 'font-weight': 900, fill: '#c0661c' });

    text(Q.x + Q.w, Q.y + qh + 50, L.close, { 'text-anchor': 'end', 'font-size': 16, 'font-weight': 700, fill: '#f3e6d6' });

    Log.add({
      step: '후기', stars: rv.stars, lines: rv.lines,
      line: `후기 | ${rec.customer.name} ${'★'.repeat(rv.stars)} | ${rec.line} | ${rv.lines.join(' / ') || '-'}`,
    });
    g.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      g.remove();
      const ms = Math.round(performance.now() - t0);
      Log.add({ step: '성적표', ms, line: `후기 닫힘 | ${(ms / 1000).toFixed(1)} s` });
      then();
    }, { once: true });
  }

  return { show, review };
})();
