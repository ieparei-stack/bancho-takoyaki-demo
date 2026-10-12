// 배경 (T22): 도형으로 그린 포장마차. 하늘·골목 → 천막·노렌·등불 → (손님) → 카운터 앞턱 → 작업대 위 불판.
// 시간대(아침 / 영업: 오후→해 질 녘→저녁 / 밤)는 Flow 상태와 건넨 판 수에 맞춰 섞여 바뀐다 (T51). 색은 data.js scene.
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
  let gas = null;       // 불판 아래 가스불 (T32)
  let shimmer = [];     // 불판 위 아지랑이 (T32)

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

    // 불판이 굽고 있다는 느낌 (T32, F4): 불판 아래 파란 가스불 + 위쪽 옅은 아지랑이. 영업 시간대에만
    const pl = Board.plate;
    const px = +pl.getAttribute('x');
    const pw = +pl.getAttribute('width');
    const pb = +pl.getAttribute('y') + +pl.getAttribute('height');
    const pt = +pl.getAttribute('y');
    gas = Board.el('g', { display: 'none' }, counter);
    const F = S.flame;
    for (let i = 0; i < F.count; i++) {
      const fx = px + pw * ((i + 0.5) / F.count);
      const fl = Board.el('path', { fill: F.color, opacity: 0.85 }, gas);
      fl.dataset.x = fx;
      fl.dataset.y = pb + 2;
    }
    for (let i = 0; i < 3; i++) shimmer.push(Board.el('path', { fill: 'none', stroke: '#ffffff', 'stroke-width': 2, opacity: 0, 'pointer-events': 'none' }, counter));
    shimmer.forEach((p, i) => { p.dataset.x = px + pw * (0.25 + i * 0.25); p.dataset.y = pt - 4; });

    now = { ...S.times.morning };
    paint(performance.now());
    time = 'morning';
  }

  // ── 시간대 ──────────────────────────────────────────────
  // 아침(morning) → 영업(open: 오후 afternoon → 해 질 녘 dusk → 저녁 evening, 판을 건넬 때마다) → 밤(night) (T51)
  // 제등은 하나씩 켜진다 (lampOn), 가스불은 시간대와 따로 켜고 끈다 (setGas — 개점·마감 의식)

  let blend = null;     // { from, to, t0, ms }
  let lampOn = [];      // 제등마다 지금 밝기 0~1
  let lampTo = [];      // 제등마다 목표
  let gasNow = 0;       // 가스불 세기 0~1
  let gasTo = 0;
  let last = 0;         // 지난 프레임 시각

  const COLOR_KEYS = ['skyTop', 'skyBottom', 'city'];
  const NUM_KEYS = ['lamp', 'dark'];

  function mixTime(a, b, u) {
    const out = {};
    for (const k of COLOR_KEYS) out[k] = mix(a[k], b[k], u);
    for (const k of NUM_KEYS) out[k] = a[k] + (b[k] - a[k]) * u;
    return out;
  }

  function blendTo(to, ms = BLEND_MS) {
    blend = { from: { ...now }, to, t0: performance.now(), ms };
    wake();
  }

  function wake() {
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); }
  }

  // 아침·밤 (영업 중은 setOpen)
  function setTime(next) {
    if (next === time) return;
    time = next;
    blendTo(CFG.scene.times[next]);
    lampTo = LAMPS.map(() => (next === 'night' ? 1 : 0)); // 밤엔 제등이 켜진 채, 아침엔 꺼짐
  }

  // 영업 진행 u (0 = 막 연 오후, 1 = 마지막 판을 건넨 저녁). 판을 건넬 때마다 Flow가 부른다
  function setOpen(u) {
    const T = CFG.scene.times;
    const R = CFG.timing.ritual;
    u = Math.max(0, Math.min(1, u));
    time = 'open';
    const to = u <= 0.5 ? mixTime(T.afternoon, T.dusk, u / 0.5) : mixTime(T.dusk, T.evening, (u - 0.5) / 0.5);
    blendTo(to, R.blendMs);
    lampTo = LAMPS.map((_, i) => (u >= R.lampAt[i] ? 1 : 0));
  }

  // 가스불 켜기·끄기 (개점·마감 의식)
  function setGas(on) {
    gasTo = on ? 1 : 0;
    wake();
  }

  // 섞는 동안, 제등이 켜져 있는 동안(흔들림), 가스불이 있는 동안 계속 그린다
  function loop(t) {
    raf = 0;
    const dt = Math.min(0.1, (t - last) / 1000);
    last = t;
    if (blend) {
      const u = Math.min(1, (t - blend.t0) / blend.ms);
      Object.assign(now, mixTime(blend.from, blend.to, u));
      if (u >= 1) blend = null;
    }
    // 제등 하나씩: 켜질 땐 0.6 s, 꺼질 땐 0.8 s
    lampOn = LAMPS.map((_, i) => {
      const cur = lampOn[i] || 0;
      const to = lampTo[i] || 0;
      if (cur < to) { if (cur === 0) Sfx.tick(); return Math.min(to, cur + dt / 0.6); }
      return Math.max(to, cur - dt / 0.8);
    });
    gasNow = gasNow < gasTo ? Math.min(gasTo, gasNow + dt / 0.35) : Math.max(gasTo, gasNow - dt / 0.5);
    paint(t);
    const lampsMoving = lampOn.some((v, i) => v > 0 || v !== (lampTo[i] || 0));
    if (blend || lampsMoving || gasNow > 0 || gasNow !== gasTo) raf = requestAnimationFrame(loop);
  }

  function paint(t) {
    // 가스불·아지랑이: 가스가 켜져 있을 때만 일렁인다 (세기만큼 키가 자란다)
    gas.setAttribute('display', gasNow > 0 ? 'inline' : 'none');
    if (gasNow > 0) {
      Array.from(gas.children).forEach((f, i) => {
        const x = +f.dataset.x;
        const y = +f.dataset.y;
        const h = (14 + 5 * Math.sin(t / 90 + i * 1.7) + 3 * Math.sin(t / 37 + i)) * gasNow;
        const w = 7 * Math.min(1, 0.4 + gasNow);
        f.setAttribute('d', `M ${x - w} ${y} Q ${x - w + 1} ${y + h * 0.6} ${x} ${y + h} Q ${x + w - 1} ${y + h * 0.6} ${x + w} ${y} Z`);
      });
      shimmer.forEach((p, i) => {
        const x = +p.dataset.x;
        const y = +p.dataset.y;
        const ph = ((t / 1400) + i / 3) % 1;
        const w = Math.sin(t / 160 + i) * 5;
        p.setAttribute('d', `M ${x} ${y - ph * 18} q ${w} -5 0 -10 q ${-w} -5 0 -10`);
        p.setAttribute('opacity', (0.18 * gasNow * Math.sin(ph * Math.PI)).toFixed(2));
      });
    } else {
      shimmer.forEach((p) => p.setAttribute('opacity', 0));
    }
    skyTop.setAttribute('stop-color', now.skyTop);
    skyBottom.setAttribute('stop-color', now.skyBottom);
    for (const c of city) c.setAttribute('fill', now.city);
    for (const w of windows) w.setAttribute('opacity', (0.15 + 0.75 * now.lamp).toFixed(2));
    const flicker = 1 + 0.06 * Math.sin(t / 170) + 0.04 * Math.sin(t / 61);
    glows.forEach((g, i) => g.setAttribute('opacity', ((lampOn[i] || 0) * flicker * (i ? 0.95 : 1)).toFixed(2)));
    flames.forEach((f, i) => f.setAttribute('fill', mix('#8e2a22', '#e2483a', lampOn[i] || 0)));
    dark.setAttribute('opacity', now.dark.toFixed(2));
  }

  function mix(a, b, u) {
    const pa = parseInt(a.slice(1), 16);
    const pb = parseInt(b.slice(1), 16);
    const ch = (sh) => Math.round(((pa >> sh) & 255) * (1 - u) + ((pb >> sh) & 255) * u);
    return `#${[16, 8, 0].map((sh) => ch(sh).toString(16).padStart(2, '0')).join('')}`;
  }

  return {
    init, setTime, setOpen, setGas, time: () => time,
    state: () => ({ time, sky: now.skyTop, lamps: lampOn.map((v) => +v.toFixed(2)), gas: +gasNow.toFixed(2) }), // 검증용
  };
})();
