// 반죽 짜기: 1→6 순서대로 구멍을 누르고 있다가 "탁!"에 놓는다. 누른 시간으로 판정한다.
// 판정은 화면에 글자로 띄우지 않고 판정 로그와 표정으로만 보여준다. (설계 원칙 2·3)
const Pour = (() => {
  const RESULT_FACE = { 퍼펙트: 'batter', 굿: 'batter', 부족: 'under', 넘침: 'over' };

  let next = 0;          // 다음 차례 구멍 id
  let active = null;     // { hole, downAt, sound }
  let roundStart = null; // 1번 구멍을 누른 시각
  let results = [];
  const glanceAt = {};   // 구멍 id → 곁눈질 방향 (넘친 옆 구멍이 있을 때)

  function init() {
    for (const hole of Board.holes) {
      hole.hit.addEventListener('pointerdown', (e) => start(hole, e));
    }
    window.addEventListener('pointerup', (e) => finish(e.timeStamp, false));
    window.addEventListener('pointercancel', (e) => finish(e.timeStamp, false));
    // 임시: 6구멍을 다 짜면 불판을 클릭해 새 판 (4단계 한 판 반복으로 대체)
    Board.plate.addEventListener('pointerdown', reset);
  }

  function start(hole, e) {
    if (active || e.button !== 0 || Octopus.busy()) return;
    if (next >= Board.holes.length) { reset(); return; }
    if (hole.id !== next) return; // 순서가 아닌 구멍은 반응하지 않는다

    // 첫 클릭이 바로 짜기여도 소리가 나도록 여기서도 연다
    Sfx.unlock();
    const p = CFG.timing.pour;
    const sound = Sfx.pourStart({
      soundSet: p.soundSet, targetMs: p.targetMs, autoStopMs: p.autoStopMs, holdBeats: p.holdBeats,
    });
    if (hole.id === 0) roundStart = e.timeStamp;
    active = { hole, downAt: e.timeStamp, sound };
    Face.clear(hole);
    requestAnimationFrame(tick);
  }

  function tick() {
    if (!active) return;
    const { targetMs, autoStopMs } = CFG.timing.pour;
    const held = performance.now() - active.downAt;
    if (held >= targetMs + autoStopMs) {
      finish(active.downAt + targetMs + autoStopMs, true);
      return;
    }
    setFill(active.hole, held);
    requestAnimationFrame(tick);
  }

  // 누른 시간 / 목표 = 반지름 비율. 1.0이면 구멍에 딱 맞고, 넘으면 테두리 밖으로 넘친다.
  function size(hole, held) {
    return hole.r * held / CFG.timing.pour.targetMs;
  }
  function setFill(hole, held) {
    const s = size(hole, held).toFixed(1);
    hole.batter.setAttribute('rx', s);
    hole.batter.setAttribute('ry', s);
    hole.batter.setAttribute('fill', CFG.faces.batter.color);
  }

  function judge(errorMs) {
    const { perfectMs, goodMs } = CFG.timing.pour;
    if (Math.abs(errorMs) <= perfectMs) return '퍼펙트';
    if (Math.abs(errorMs) <= goodMs) return '굿';
    return errorMs < 0 ? '부족' : '넘침';
  }

  function finish(upAt, autoStopped) {
    if (!active) return;
    const { hole, downAt, sound } = active;
    active = null;
    next = hole.id + 1;
    if (autoStopped) sound.gurgle(); else sound.release();

    const held = upAt - downAt;
    const { targetMs, soundSet } = CFG.timing.pour;
    const errorMs = Math.round(held - targetMs);
    const result = autoStopped ? '넘침' : judge(errorMs);
    results.push(result);

    hole.hasBatter = true; // 이제 문어를 넣을 수 있다
    showFace(hole, result, size(hole, held));
    Cook.start(hole, upAt); // 반죽을 넣은 시점부터 굽기 시작
    log(hole, downAt, upAt, errorMs, result, autoStopped, soundSet);

    if (next === Board.holes.length) {
      Sfx.finish();
      logRound(upAt);
    }
  }

  // 판정 직후 같은 프레임에 표정을 바꾼다
  function showFace(hole, result, s) {
    const state = RESULT_FACE[result];
    if (state === 'over') {
      // 넘친 구멍은 옆 구멍과 붙고, 서로 곁눈질한다
      const nb = Board.neighbor(hole);
      const dir = Math.sign(nb.cx - hole.cx);
      Face.bridge(hole, nb);
      Face.apply(hole, state, s, dir);
      glanceAt[nb.id] = -dir;
      if (nb.state) Face.apply(nb, nb.state, nb.size, -dir);
    } else {
      Face.apply(hole, state, s, glanceAt[hole.id] || 0);
    }
  }

  function log(hole, downAt, upAt, errorMs, result, autoStopped, soundSet) {
    const cueAt = Math.round(downAt + CFG.timing.pour.targetMs);
    const inputAt = Math.round(upAt);
    const sign = errorMs > 0 ? '+' : '';
    // 출력 지연: 스피커에서 소리가 실제로 나기까지 걸리는 시간. 튜닝 참고용
    const latencyMs = Sfx.ctx ? Math.round(((Sfx.ctx.baseLatency || 0) + (Sfx.ctx.outputLatency || 0)) * 1000) : null;
    Log.add({
      step: '짜기', hole: hole.id + 1, cueAt, inputAt, errorMs, result, autoStopped, soundSet, latencyMs,
      line: `짜기 #${hole.id + 1} | 큐 ${cueAt} | 입력 ${inputAt} | ${sign}${errorMs}ms | ${result}${autoStopped ? ' (자동 종료)' : ''} | 소리 ${soundSet}`,
    });
  }

  function logRound(endAt) {
    const totalMs = Math.round(endAt - roundStart);
    const count = (r) => results.filter((x) => x === r).length;
    const { targetMs, holdBeats } = CFG.timing.pour;
    const bpm = Math.round(60000 / (targetMs / holdBeats));
    Log.add({
      step: '짜기 한 판', totalMs, targetMs, bpm,
      perfect: count('퍼펙트'), good: count('굿'), under: count('부족'), over: count('넘침'),
      line: `── 한 판 짜기 6구멍 ${(totalMs / 1000).toFixed(1)} s (목표 홀드 ${targetMs} ms, ${bpm} BPM) | 퍼펙트 ${count('퍼펙트')} 굿 ${count('굿')} 부족 ${count('부족')} 넘침 ${count('넘침')}`,
    });
  }

  function reset() {
    if (active || next < Board.holes.length) return;
    next = 0;
    results = [];
    roundStart = null;
    for (const k in glanceAt) delete glanceAt[k];
    Cook.reset();
    for (const hole of Board.holes) {
      hole.hasBatter = false;
      Face.clear(hole);
      Octopus.clear(hole);
    }
    Octopus.reset();
    Log.add({ step: '새 판', line: '── 새 판 ──' });
  }

  return { init, busy: () => !!active };
})();
