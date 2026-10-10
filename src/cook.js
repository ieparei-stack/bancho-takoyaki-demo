// 굽기: 뒤집기 단계(③ 1차 / ④ 2차)가 시작되면 6구멍이 함께 굽기 시작하고, 1→6 차례로 큐가 온다. (T12)
// 큐 순간 "톡"(2차 "톡톡")과 기포. 큐부터 perfectSpanMs 동안이 퍼펙트, 앞뒤 goodMarginMs가 굿, 그 뒤로 점점 탄다.
const Cook = (() => {
  const cooking = new Map(); // hole.id → { hole, phase, startAt, cueAt, cueLogged, cueSound }
  let raf = 0;

  // n번 구멍 큐 = 단계 시작 + lead + (n−1) × interval
  function sequence(phase, now) {
    const c = CFG.timing.cook;
    const lead = phase === 1 ? c.lead1Ms : c.lead2Ms;
    for (const hole of Board.holes) begin(hole, phase, now, now + lead + hole.id * c.intervalMs);
  }

  // 퍼펙트·굿 창이 끝나는 시각 (그 뒤로 탄다)
  function windowEnd(s) {
    const c = CFG.timing.cook;
    return s.cueAt + c.perfectSpanMs + c.goodMarginMs;
  }

  function begin(hole, phase, startAt, cueAt) {
    const prev = cooking.get(hole.id);
    if (prev && prev.cueSound) prev.cueSound.cancel();
    if (phase === 2) hideHint(hole); // 뒤집혔다
    // 소리 예약: performance 시계 → AudioContext 시계
    const cueSound = Sfx.scheduleCue((cueAt - performance.now()) / 1000, phase);
    // 2차는 뒤집은 순간의 색에서 이어진다 (이미 탄 면은 다시 밝아지지 않는다)
    const from = phase === 1 ? CFG.faces.cook.raw : (hole.cookColor || CFG.faces.cook.golden);
    cooking.set(hole.id, { hole, phase, startAt, cueAt, from, cueLogged: false, cueSound });
    if (!raf) raf = requestAnimationFrame(tick);
  }

  // T08이 타이밍 판정에 쓴다
  function state(hole) {
    return cooking.get(hole.id) || null;
  }

  function stop(hole) {
    const s = cooking.get(hole.id);
    if (s && s.cueSound) s.cueSound.cancel();
    cooking.delete(hole.id);
  }

  function tick() {
    raf = 0;
    const now = performance.now();
    for (const s of cooking.values()) {
      if (!s.cueLogged && now >= s.cueAt) {
        s.cueLogged = true;
        Log.add({
          step: `큐 ${s.phase}차`, hole: s.hole.id + 1, cueAt: Math.round(s.cueAt),
          line: `큐 ${s.phase}차 #${s.hole.id + 1} | 큐 ${Math.round(s.cueAt)}`,
        });
      }
      paint(s, now);
    }
    if (cooking.size) raf = requestAnimationFrame(tick);
  }

  // 반죽색 → (굳은 색) → (큐) 황금 → 굿 창 유지 → burnMs 동안 갈색 → 검정
  function paint(s, now) {
    const c = CFG.timing.cook;
    const k = CFG.faces.cook;
    let color;
    if (now < s.cueAt) {
      const u = (now - s.startAt) / (s.cueAt - s.startAt);
      // 1차는 테두리가 먼저 굳고(set), 큐에 황금색. 2차는 바로 황금으로
      color = s.phase === 1
        ? (u < 0.6 ? mix(s.from, k.set, u / 0.6) : mix(k.set, k.golden, (u - 0.6) / 0.4))
        : mix(s.from, k.golden, u);
    } else if (now < windowEnd(s)) {
      color = k.golden;
    } else {
      const u = Math.min(1, (now - windowEnd(s)) / c.burnMs);
      color = u < 0.5 ? mix(k.golden, k.brown, u * 2) : mix(k.brown, k.burnt, (u - 0.5) * 2);
    }
    // 시작 색이 이미 더 탔으면 밝아지지 않는다
    if (lum(s.from) < lum(color)) color = s.from;
    s.hole.cookColor = color;
    s.hole.batter.setAttribute('fill', color);
    s.hole.batter.setAttribute('stroke', Face.shade(color));
    if (s.hole.bridge.getAttribute('visibility') === 'visible') s.hole.bridge.setAttribute('fill', color);
    if (s.phase === 1) hint(s, now);
  }

  // 1차 굽기 힌트 (실제 타코야키의 판단 기준을 그대로):
  // 테두리가 바깥에서 안으로 굳어 들어오고 가운데만 반죽으로 남는다. 경계에 기포가 늘어난다.
  // 큐 순간 가운데가 살짝 가라앉고 기포가 한꺼번에 올라온다. 방치하면 가운데까지 굳는다.
  function hint(s, now) {
    const c = CFG.timing.cook;
    const k = CFG.faces.cook;
    const h = s.hole;
    const size = h.size || h.r;
    const u = Math.min(1, (now - s.startAt) / (s.cueAt - s.startAt));

    if (now >= windowEnd(s)) {
      // 속까지 굳었다
      hideHint(h);
      return;
    }

    // 가운데 반죽: 0.95r → coreMin·r. 경계는 살짝 울퉁불퉁 + 미세하게 흔들림
    const frac = 0.95 - (0.95 - k.coreMin) * u;
    const wob = 1 + 0.04 * Math.sin(now / 230 + h.id);
    let rx = size * frac * wob;
    let ry = size * frac * (2 - wob) * (h.state === 'under' ? CFG.faces.under.squashY : 1);
    let coreColor = k.raw;
    let cy = h.cy + (h.state === 'under' ? CFG.faces.under.sagY : 0);
    if (now >= s.cueAt) {
      // 큐: 가라앉는다
      ry *= 0.85;
      cy += size * 0.03;
      coreColor = mix(k.raw, k.set, 0.5);
    }
    h.core.setAttribute('cx', h.cx);
    h.core.setAttribute('cy', cy.toFixed(1));
    h.core.setAttribute('rx', rx.toFixed(1));
    h.core.setAttribute('ry', ry.toFixed(1));
    h.core.setAttribute('fill', coreColor);
    h.core.setAttribute('visibility', 'visible');

    // 기포: 큐 순간에 한꺼번에 올라와 퍼펙트 구간(1.5 s) 동안 보글거리다 사라진다
    // (2026-10-10 사용자: 서서히 말고 그 순간에 / 기포 보이는 동안 = 퍼펙트, 1.5 s)
    const since = now - s.cueAt;
    const show = since >= 0 && since < c.perfectSpanMs;
    h.bubbles.setAttribute('display', show ? 'inline' : 'none'); // visibility는 자식이 덮어써서 display로 끈다
    if (show) {
      const grow = Math.min(1, since / 120);               // 올라오는 0.12초
      h.bubbleSlots.forEach((b, i) => {
        const rr = size * (frac + (1 - frac) * b.rad);     // core 경계와 테두리 사이
        const lift = grow * 3 + Math.sin(now / 70 + i) * 1.5; // 보글
        b.el.setAttribute('cx', (h.cx + Math.cos(b.ang) * rr).toFixed(1));
        b.el.setAttribute('cy', (cy + Math.sin(b.ang) * rr * 0.95 - lift).toFixed(1));
        b.el.setAttribute('r', (b.r * grow).toFixed(1));
        b.el.setAttribute('visibility', 'visible');
      });
    }
  }

  function hideHint(h) {
    h.core.setAttribute('visibility', 'hidden');
    h.bubbles.setAttribute('display', 'none');
  }

  function lum(hex) {
    const n = parseInt(hex.slice(1), 16);
    return (n >> 16) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11;
  }

  function mix(a, b, t) {
    t = Math.max(0, Math.min(1, t));
    const pa = parseInt(a.slice(1), 16);
    const pb = parseInt(b.slice(1), 16);
    const ch = (sh) => Math.round(((pa >> sh) & 255) * (1 - t) + ((pb >> sh) & 255) * t);
    return `#${[16, 8, 0].map((sh) => ch(sh).toString(16).padStart(2, '0')).join('')}`;
  }

  function reset() {
    for (const s of cooking.values()) {
      if (s.cueSound) s.cueSound.cancel();
      delete s.hole.cookColor;
      hideHint(s.hole);
    }
    cooking.clear();
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }

  return { sequence, state, stop, reset, hideHint };
})();
