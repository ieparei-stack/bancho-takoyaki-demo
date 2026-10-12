// 개점·마감 의식 (T51, 사용자 2026-10-12 "하루의 감각"): 한 동작씩, 실패 없음. 다음에 만질 것이 노랗게 깜빡인다.
//   개점: ① 가스 손잡이 → 파란 불 ② 작업대의 종을 처마 고리로 끌어 건다 ③ 걸린 종을 톡 → "딩~" → 영업 시작
//   마감: ① 가스 손잡이 → 불이 꺼짐 ② 고리의 종을 작업대로 내린다 → 밤
// 1일차에만 불판 아래 안내 한 줄 (data.js letters.ritual). 종·손잡이는 영업 중에도 그 자리에 보인다(만질 수는 없음).
const Ritual = (() => {
  // 배치 상수
  const KNOB = { cx: 205, cy: 472, r: 22 };   // 불판 왼쪽 아래 가스 손잡이
  const HOOK = { x: 1195, y: 40 };            // 처마 오른쪽 끝 고리 — 종이 걸리는 점(종의 맨 위). 왼쪽 위는 돈 표시 자리
  const REST = { x: 1180, y: 520 };           // 작업대 오른쪽(재료판 옆) 종 자리(종의 맨 위)
  const SNAP_R = 75;                          // 이 안에 놓으면 걸린다/내려놓인다
  const BELL_C = 32;                          // 종 맨 위에서 몸통 가운데까지

  let side = null;
  let block = null;
  let knobG = null;
  let knobArm = null;
  let bellG = null;
  let bellSwing = null;
  let glow = null;
  let target = null;      // 놓을 자리 점선 원
  let pos = { ...REST };  // 종 맨 위 지금 위치
  let gasOn = false;
  let job = null;         // { kind: 'open'|'close', step, then }
  let drag = null;        // { ox, oy, from }
  let pulse = 0;
  let swingRaf = 0;

  function el(tag, attrs, parent) {
    return Board.el(tag, attrs, parent);
  }

  function init() {
    side = Board.layer('side');
    // 처마 고리 (늘 보인다)
    el('path', { d: `M ${HOOK.x} ${HOOK.y - 12} L ${HOOK.x} ${HOOK.y - 4} Q ${HOOK.x} ${HOOK.y + 3} ${HOOK.x + 6} ${HOOK.y + 2}`, fill: 'none', stroke: '#2a1d14', 'stroke-width': 3, 'stroke-linecap': 'round', 'pointer-events': 'none' }, side);

    // 가스 손잡이: 받침 + 둥근 손잡이 + 표시선 (꺼짐 = 위, 켜짐 = 오른쪽 90°)
    knobG = el('g', { 'pointer-events': 'none', cursor: 'pointer' }, side);
    el('circle', { cx: KNOB.cx, cy: KNOB.cy, r: KNOB.r + 8, fill: '#2a1d14', stroke: '#5a3a22', 'stroke-width': 2 }, knobG);
    el('circle', { cx: KNOB.cx, cy: KNOB.cy, r: KNOB.r, fill: '#cfc8bb', stroke: '#7d756a', 'stroke-width': 2 }, knobG);
    knobArm = el('g', {}, knobG);
    el('rect', { x: KNOB.cx - 5, y: KNOB.cy - KNOB.r + 2, width: 10, height: KNOB.r * 2 - 4, rx: 5, fill: '#9a9184' }, knobArm);
    el('circle', { cx: KNOB.cx, cy: KNOB.cy - KNOB.r + 8, r: 3, fill: '#c0392b' }, knobArm);
    const flame = el('text', { x: KNOB.cx, y: KNOB.cy + KNOB.r + 22, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: '#8aa6c8', 'pointer-events': 'none' }, side);
    flame.textContent = '가스';
    knobG.addEventListener('pointerdown', (e) => { e.stopPropagation(); Sfx.unlock(); pressKnob(); });

    // 종: 끈 + 금색 몸통 + 테 + 추. 바깥 g = 위치, 안쪽 g = 흔들림
    bellG = el('g', { 'pointer-events': 'none', cursor: 'grab' }, side);
    bellSwing = el('g', {}, bellG);
    el('line', { x1: 0, y1: 0, x2: 0, y2: 12, stroke: '#7a1d17', 'stroke-width': 3, 'stroke-linecap': 'round' }, bellSwing);
    el('circle', { cx: 0, cy: 0, r: 4, fill: 'none', stroke: '#7a1d17', 'stroke-width': 2.5 }, bellSwing);
    el('path', { d: 'M -19 46 Q -18 20 0 14 Q 18 20 19 46 Z', fill: '#e0b040', stroke: '#8a6418', 'stroke-width': 2 }, bellSwing);
    el('path', { d: 'M -10 40 Q -10 24 -2 19', fill: 'none', stroke: '#fff3c0', 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0.7 }, bellSwing);
    el('ellipse', { cx: 0, cy: 46, rx: 22, ry: 5, fill: '#c99a2e', stroke: '#8a6418', 'stroke-width': 2 }, bellSwing);
    el('circle', { cx: 0, cy: 53, r: 4.5, fill: '#8a6418' }, bellSwing);
    // 끌기 판정을 넉넉하게 (투명)
    el('circle', { cx: 0, cy: BELL_C, r: 34, fill: 'transparent' }, bellSwing);
    bellG.addEventListener('pointerdown', (e) => { e.stopPropagation(); Sfx.unlock(); pressBell(e); });
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    placeBell(REST);
  }

  // ── 안내 ───────────────────────────────────────────────

  // 다음에 만질 것 둘레 노란 빛 (who = 'knob' | 'bell')
  function glowOn(who) {
    glowOff();
    glow = el('circle', { r: who === 'knob' ? KNOB.r + 16 : 40, fill: 'rgba(255,211,77,0.16)', stroke: '#ffd34d', 'stroke-width': 4, 'pointer-events': 'none' }, side);
    side.insertBefore(glow, who === 'knob' ? knobG : bellG);
    const t0 = performance.now();
    const step = (now) => {
      if (!glow) return;
      const c = who === 'knob' ? { x: KNOB.cx, y: KNOB.cy } : { x: pos.x, y: pos.y + BELL_C };
      glow.setAttribute('cx', c.x.toFixed(1));
      glow.setAttribute('cy', c.y.toFixed(1));
      glow.setAttribute('opacity', (0.45 + 0.55 * Math.abs(Math.sin((now - t0) / 380))).toFixed(2));
      pulse = requestAnimationFrame(step);
    };
    pulse = requestAnimationFrame(step);
  }

  function glowOff() {
    cancelAnimationFrame(pulse);
    if (glow) glow.remove();
    glow = null;
  }

  // 종을 놓을 자리 점선 원 (at = 종 맨 위 좌표)
  function targetOn(at) {
    targetOff();
    target = el('circle', { cx: at.x, cy: at.y + BELL_C, r: 40, fill: 'rgba(255,255,255,0.08)', stroke: '#ffffff', 'stroke-width': 3, 'stroke-dasharray': '7 6', opacity: 0.8, 'pointer-events': 'none' }, side);
    side.insertBefore(target, bellG);
    target.dataset.x = at.x;
    target.dataset.y = at.y;
  }

  function targetOff() {
    if (target) target.remove();
    target = null;
  }

  function hint(key) {
    const line = (CFG.letters.ritual || {})[key];
    if (Flow.day() === 1 && line) Hint.say(line, `의식 ${key}`);
    else Hint.hide();
  }

  // ── 진행 ───────────────────────────────────────────────

  function open(then) {
    begin('open', then);
    step('gasOn');
  }

  function close(then) {
    begin('close', then);
    step('gasOff');
  }

  function begin(kind, then) {
    job = { kind, step: null, then };
    // 뒤의 불판·재료판 입력을 막는다 (손잡이·종은 이 판보다 위)
    block = el('rect', { x: 0, y: 0, width: 1280, height: 720, fill: 'transparent', 'pointer-events': 'all' }, side);
    side.insertBefore(block, side.firstChild);
    Log.add({ step: '의식', kind, line: `── ${kind === 'open' ? '개점' : '마감'} 의식` });
  }

  function step(name) {
    job.step = name;
    knobG.setAttribute('pointer-events', name === 'gasOn' || name === 'gasOff' ? 'all' : 'none');
    bellG.setAttribute('pointer-events', ['hang', 'ring', 'down'].includes(name) ? 'all' : 'none');
    bellG.setAttribute('cursor', name === 'ring' ? 'pointer' : 'grab');
    targetOff();
    if (name === 'gasOn' || name === 'gasOff') glowOn('knob');
    else glowOn('bell');
    if (name === 'hang') targetOn(HOOK);
    if (name === 'down') targetOn(REST);
    hint({ gasOn: 'gasOn', hang: 'bellHang', ring: 'bellRing', gasOff: 'gasOff', down: 'bellDown' }[name]);
  }

  function finish() {
    const then = job.then;
    Log.add({ step: '의식', kind: job.kind, line: `${job.kind === 'open' ? '개점' : '마감'} 의식 끝` });
    job = null;
    glowOff();
    targetOff();
    Hint.hide();
    knobG.setAttribute('pointer-events', 'none');
    bellG.setAttribute('pointer-events', 'none');
    if (block) block.remove();
    block = null;
    then();
  }

  // ── 손잡이 ─────────────────────────────────────────────

  function pressKnob() {
    if (!job || (job.step !== 'gasOn' && job.step !== 'gasOff')) return;
    const on = job.step === 'gasOn';
    knobG.setAttribute('pointer-events', 'none');
    glowOff();
    turnKnob(on);
    Sfx.knob(on);
    Scene.setGas(on);
    Log.add({ step: '의식', line: `가스불 ${on ? '켬' : '끔'}` });
    setTimeout(() => step(on ? 'hang' : 'down'), 450);
  }

  function turnKnob(on, instant) {
    gasOn = on;
    const from = on ? 0 : 90;
    const to = on ? 90 : 0;
    if (instant) { knobArm.setAttribute('transform', `rotate(${to} ${KNOB.cx} ${KNOB.cy})`); return; }
    const t0 = performance.now();
    const anim = (now) => {
      const u = Math.min(1, (now - t0) / 220);
      const a = from + (to - from) * (1 - (1 - u) ** 2);
      knobArm.setAttribute('transform', `rotate(${a.toFixed(1)} ${KNOB.cx} ${KNOB.cy})`);
      if (u < 1) requestAnimationFrame(anim);
    };
    requestAnimationFrame(anim);
  }

  // ── 종 ─────────────────────────────────────────────────

  function placeBell(p) {
    pos = { x: p.x, y: p.y };
    bellG.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
  }

  function pressBell(e) {
    if (!job) return;
    if (job.step === 'ring') { ring(); return; }
    if (job.step !== 'hang' && job.step !== 'down') return;
    const p = Board.toSvg(e);
    drag = { ox: p.x - pos.x, oy: p.y - pos.y, from: { ...pos } };
    bellG.setAttribute('cursor', 'grabbing');
    glowOff();
  }

  function move(e) {
    if (!drag) return;
    const p = Board.toSvg(e);
    placeBell({ x: p.x - drag.ox, y: p.y - drag.oy });
    if (target) {
      const near = Math.hypot(pos.x - +target.dataset.x, pos.y - +target.dataset.y) < SNAP_R;
      target.setAttribute('stroke', near ? '#5fd05f' : '#ffffff');
    }
  }

  function up() {
    if (!drag) return;
    const d = drag;
    drag = null;
    bellG.setAttribute('cursor', 'grab');
    const at = job.step === 'hang' ? HOOK : REST;
    if (Math.hypot(pos.x - at.x, pos.y - at.y) < SNAP_R) {
      slide(at, 120, () => {
        if (job.step === 'hang') {
          Sfx.bell(0.3);
          swing(14);
          Log.add({ step: '의식', line: '종을 걸었다' });
          setTimeout(() => step('ring'), 350);
        } else {
          Sfx.boxLand();
          swing(0);
          Log.add({ step: '의식', line: '종을 내렸다' });
          setTimeout(finish, 300);
        }
      });
    } else {
      slide(d.from, 220, () => glowOn('bell')); // 멀리 놓으면 제자리로 (실패 없음)
    }
  }

  function slide(to, ms, then) {
    const from = { ...pos };
    const t0 = performance.now();
    const anim = (now) => {
      const u = Math.min(1, (now - t0) / ms);
      const e = 1 - (1 - u) ** 2;
      placeBell({ x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e });
      if (u < 1) requestAnimationFrame(anim); else then();
    };
    requestAnimationFrame(anim);
  }

  // 흔들림 (각도 amp에서 줄어든다)
  function swing(amp) {
    cancelAnimationFrame(swingRaf);
    if (!amp) { bellSwing.removeAttribute('transform'); return; }
    const t0 = performance.now();
    const anim = (now) => {
      const s = (now - t0) / 1000;
      const a = amp * Math.exp(-s / 0.7) * Math.sin(s * Math.PI * 2 / 0.55);
      bellSwing.setAttribute('transform', `rotate(${a.toFixed(2)})`);
      if (s < 3) swingRaf = requestAnimationFrame(anim); else bellSwing.removeAttribute('transform');
    };
    swingRaf = requestAnimationFrame(anim);
  }

  function ring() {
    bellG.setAttribute('pointer-events', 'none');
    glowOff();
    Sfx.bell(1);
    swing(22);
    Log.add({ step: '의식', line: '종을 울렸다 — 영업 시작' });
    setTimeout(finish, 650);
  }

  // 새 날: 가스 꺼짐, 종은 작업대 (마감 의식을 거쳤으면 이미 그렇다)
  function reset() {
    if (gasOn) { turnKnob(false, true); Scene.setGas(false); }
    placeBell(REST);
    swing(0);
  }

  return { init, open, close, reset, state: () => ({ gasOn, bell: pos, step: job && job.step }) };
})();
