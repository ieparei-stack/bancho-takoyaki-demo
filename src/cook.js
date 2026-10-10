// 굽기: 구멍마다 반죽을 넣은 시점부터 타이머가 돈다. 큐 시점에 "톡", 지나면 점점 탄다.
// 1차(phase 1)는 반죽 직후, 2차(phase 2)는 1차 뒤집기 직후 시작한다. 뒤집기 조작은 T08·T09.
const Cook = (() => {
  const cooking = new Map(); // hole.id → { hole, phase, startAt, cueAt, cueLogged, cueSound }
  let raf = 0;

  function start(hole, t) {
    begin(hole, 1, t);
  }

  // 1차 뒤집기가 끝나면 2차 타이머 시작 (T08에서 호출)
  function flipped(hole, t = performance.now()) {
    begin(hole, 2, t);
  }

  function begin(hole, phase, startAt) {
    const c = CFG.timing.cook;
    const cueAt = startAt + (phase === 1 ? c.cue1Ms : c.cue2Ms);
    const prev = cooking.get(hole.id);
    if (prev && prev.cueSound) prev.cueSound.cancel();
    // 소리 예약: performance 시계 → AudioContext 시계
    const cueSound = Sfx.scheduleCue((cueAt - performance.now()) / 1000, phase);
    cooking.set(hole.id, { hole, phase, startAt, cueAt, cueLogged: false, cueSound });
    Sfx.sizzleOn();
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
    if (cooking.size === 0) Sfx.sizzleOff();
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

  // 반죽색 → (큐) 황금 → 굿 창 유지 → burnMs 동안 갈색 → 검정
  function paint(s, now) {
    const c = CFG.timing.cook;
    const k = CFG.faces.cook;
    const base = s.phase === 1 ? k.raw : k.golden;
    let color;
    if (now < s.cueAt) {
      color = mix(base, k.golden, (now - s.startAt) / (s.cueAt - s.startAt));
    } else if (now < s.cueAt + c.goodMs) {
      color = k.golden;
    } else {
      const u = Math.min(1, (now - s.cueAt - c.goodMs) / c.burnMs);
      color = u < 0.5 ? mix(k.golden, k.brown, u * 2) : mix(k.brown, k.burnt, (u - 0.5) * 2);
    }
    s.hole.cookColor = color;
    s.hole.batter.setAttribute('fill', color);
    s.hole.batter.setAttribute('stroke', Face.shade(color));
    if (s.hole.bridge.getAttribute('visibility') === 'visible') s.hole.bridge.setAttribute('fill', color);
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
    }
    cooking.clear();
    Sfx.sizzleOff();
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }

  return { start, flipped, state, stop, reset };
})();
