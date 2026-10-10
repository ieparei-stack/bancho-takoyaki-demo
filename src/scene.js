// 배경 (T22): 도형으로 그린 포장마차. 하늘·골목 → 천막·노렌·등불 → (손님) → 카운터 앞턱 → 작업대 위 불판.
// 시간대(아침 / 영업 / 밤)는 Flow 상태에 맞춰 0.8 s 동안 섞여 바뀐다. 색은 data.js scene.
// 9단계: data.js art.background에 이미지(경로 또는 data URI)가 있으면 도형 대신 그 이미지 한 장을 쓴다.
const Scene = (() => {
  // 배치 상수 (1280×720)
  const W = 1280;
  const H = 720;
  const COUNTER = { y: 150, h: 35 };     // 카운터 앞턱 (손님 아랫부분을 가린다)
  const TABLE_Y = COUNTER.y + COUNTER.h; // 작업대 시작
  const AWNING_H = 28;
  const LAMPS = [{ x: 250, y: 92 }, { x: 1130, y: 92 }];
  const NOREN = [{ x: 300, w: 150, label: '타코' }, { x: 910, w: 150, label: '야키' }]; // 가운데(손님·말풍선 자리)를 비운다
  const BLEND_MS = 800;
  const BUILDINGS = [[60, 70, 90], [170, 40, 70], [240, 95, 110], [370, 55, 80], [470, 30, 60], [560, 80, 120], [700, 50, 95], [820, 35, 70], [900, 85, 120], [1040, 45, 80], [1140, 65, 110]];

  let skyTop = null;
  let skyBottom = null;
  let city = [];
  let windows = [];
  let glows = [];
  let flames = [];
  let dark = null;
  let shapes = null;
  let now = null;     // 지금 보이는 값
  let raf = 0;
  let time = null;

  function el(tag, attrs, parent) {
    return Board.el(tag, attrs, parent);
  }

  function init() {
    const bg = Board.layer('bg');
    const S = CFG.scene;
    const defs = el('defs', {}, bg);
    const sky = el('linearGradient', { id: 'sky', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    skyTop = el('stop', { offset: '0%' }, sky);
    skyBottom = el('stop', { offset: '100%' }, sky);
    const glow = el('radialGradient', { id: 'lamp-glow' }, defs);
    el('stop', { offset: '0%', 'stop-color': '#ffcf7a', 'stop-opacity': 0.75 }, glow);
    el('stop', { offset: '100%', 'stop-color': '#ffcf7a', 'stop-opacity': 0 }, glow);

    shapes = el('g', {}, bg);
    el('rect', { x: 0, y: 0, width: W, height: TABLE_Y, fill: 'url(#sky)' }, shapes);

    // 멀리 골목 건물 실루엣 + 창문 불빛
    for (const [x, w, h] of BUILDINGS) {
      city.push(el('rect', { x, y: COUNTER.y - h, width: w, height: h + 10 }, shapes));
      for (let wy = COUNTER.y - h + 12; wy < COUNTER.y - 14; wy += 22) {
        for (let wx = x + 8; wx < x + w - 10; wx += 18) {
          if ((wx * 7 + wy * 3) % 5 < 2) windows.push(el('rect', { x: wx, y: wy, width: 7, height: 9, fill: '#ffd98a' }, shapes));
        }
      }
    }

    // 작업대 (어두운 나무 + 판자 줄)
    el('rect', { x: 0, y: TABLE_Y, width: W, height: H - TABLE_Y, fill: S.wood }, shapes);
    for (let y = TABLE_Y + 60; y < H; y += 90) el('line', { x1: 0, y1: y, x2: W, y2: y, stroke: '#2c1f17', 'stroke-width': 3 }, shapes);

    // 기둥
    for (const x of [18, W - 46]) el('rect', { x, y: 0, width: 28, height: COUNTER.y, fill: '#5a3a22' }, shapes);

    // 천막 끝단: 줄무늬 + 물결
    for (let x = 0, k = 0; x < W; x += 64, k++) {
      el('rect', { x, y: 0, width: 64, height: AWNING_H, fill: S.awning[k % 2] }, shapes);
      el('ellipse', { cx: x + 32, cy: AWNING_H, rx: 32, ry: 12, fill: S.awning[k % 2] }, shapes);
    }

    // 노렌: 짧은 천 + 글자 (손님 머리 위를 피해서 양옆)
    for (const n of NOREN) {
      const half = n.w / 2 - 3;
      for (const dx of [0, half + 6]) el('rect', { x: n.x + dx, y: AWNING_H, width: half, height: 44, fill: '#2b3a5c', stroke: '#1d2840', 'stroke-width': 2 }, shapes);
      const t = el('text', { x: n.x + n.w / 2, y: AWNING_H + 30, 'text-anchor': 'middle', 'font-size': 22, 'font-weight': 900, fill: '#f3e6d6' }, shapes);
      t.textContent = n.label;
    }

    // 제등
    for (const L of LAMPS) {
      glows.push(el('circle', { cx: L.x, cy: L.y, r: 90, fill: 'url(#lamp-glow)' }, shapes));
      el('line', { x1: L.x, y1: AWNING_H, x2: L.x, y2: L.y - 34, stroke: '#2a1d14', 'stroke-width': 2 }, shapes);
      el('rect', { x: L.x - 16, y: L.y - 38, width: 32, height: 8, rx: 2, fill: '#2a1d14' }, shapes);
      flames.push(el('ellipse', { cx: L.x, cy: L.y, rx: 26, ry: 32, stroke: '#7a1d17', 'stroke-width': 2 }, shapes));
      for (const k of [-18, -6, 6, 18]) el('line', { x1: L.x - 24, y1: L.y + k, x2: L.x + 24, y2: L.y + k, stroke: '#7a1d17', 'stroke-width': 1.2, opacity: 0.7 }, shapes);
      el('rect', { x: L.x - 16, y: L.y + 30, width: 32, height: 8, rx: 2, fill: '#2a1d14' }, shapes);
    }

    // 9단계용 이미지 자리
    if (CFG.art.background) {
      el('image', { href: CFG.art.background, x: 0, y: 0, width: W, height: H, preserveAspectRatio: 'xMidYMid slice' }, bg);
      shapes.setAttribute('display', 'none');
    }

    // 밤 덮개 (배경만 어둡게 — 불판·손님은 덜 어둡다)
    dark = el('rect', { x: 0, y: 0, width: W, height: H, fill: '#05060f', opacity: 0, 'pointer-events': 'none' }, bg);

    // 카운터 앞턱 (손님 레이어보다 앞)
    const counter = Board.layer('counter');
    el('rect', { x: 0, y: COUNTER.y, width: W, height: COUNTER.h, fill: S.counter }, counter);
    el('rect', { x: 0, y: COUNTER.y, width: W, height: 5, fill: '#b07a4c' }, counter);
    el('rect', { x: 0, y: COUNTER.y + COUNTER.h - 4, width: W, height: 4, fill: '#4a2f1c' }, counter);

    now = { ...S.times.morning };
    paint(performance.now());
    time = 'morning';
  }

  // ── 시간대 ──────────────────────────────────────────────

  let blend = null;   // { from, to, t0 }

  function setTime(next) {
    if (next === time) return;
    time = next;
    blend = { from: { ...now }, to: CFG.scene.times[next], t0: performance.now() };
    if (!raf) raf = requestAnimationFrame(loop);
  }

  // 섞는 동안, 그리고 등불이 켜져 있는 동안(흔들림) 계속 그린다
  function loop(t) {
    raf = 0;
    if (blend) {
      const u = Math.min(1, (t - blend.t0) / BLEND_MS);
      for (const k of ['skyTop', 'skyBottom', 'city']) now[k] = mix(blend.from[k], blend.to[k], u);
      for (const k of ['lamp', 'dark']) now[k] = blend.from[k] + (blend.to[k] - blend.from[k]) * u;
      if (u >= 1) blend = null;
    }
    paint(t);
    if (blend || now.lamp > 0) raf = requestAnimationFrame(loop);
  }

  function paint(t) {
    skyTop.setAttribute('stop-color', now.skyTop);
    skyBottom.setAttribute('stop-color', now.skyBottom);
    for (const c of city) c.setAttribute('fill', now.city);
    for (const w of windows) w.setAttribute('opacity', (0.15 + 0.75 * now.lamp).toFixed(2));
    const flicker = 1 + 0.06 * Math.sin(t / 170) + 0.04 * Math.sin(t / 61);
    glows.forEach((g, i) => g.setAttribute('opacity', (now.lamp * flicker * (i ? 0.95 : 1)).toFixed(2)));
    flames.forEach((f) => f.setAttribute('fill', mix('#8e2a22', '#e2483a', now.lamp)));
    dark.setAttribute('opacity', now.dark.toFixed(2));
  }

  function mix(a, b, u) {
    const pa = parseInt(a.slice(1), 16);
    const pb = parseInt(b.slice(1), 16);
    const ch = (sh) => Math.round(((pa >> sh) & 255) * (1 - u) + ((pb >> sh) & 255) * u);
    return `#${[16, 8, 0].map((sh) => ch(sh).toString(16).padStart(2, '0')).join('')}`;
  }

  return { init, setTime, time: () => time };
})();
