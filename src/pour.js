// 반죽 짜기: 1→6 순서대로 구멍을 누르고 있다가 "탁!"에 놓는다. 누른 시간으로 판정한다.
// 판정은 화면에 글자로 띄우지 않고 판정 로그와 표정으로만 보여준다. (설계 원칙 2·3)
// 도구 (T53): 빠른 짜기 = 박자가 도-솔-도 1 s(Pour.timing) / 한 줄 짜기 = 지금 줄의 아무 구멍이나 누르면 세 구멍이 같이, 같은 판정
const Pour = (() => {
  const RESULT_FACE = { 퍼펙트: 'batter', 굿: 'batter', 부족: 'under', 넘침: 'over' };
  const SCORE = { 퍼펙트: 2, 굿: 1 }; // 단계 등급용, 그 외 0

  let next = 0;          // 다음 차례 구멍 id
  let active = null;     // { hole, holes, downAt, sound } — holes = 같이 차오르는 구멍들 (한 줄 짜기면 셋)
  let roundStart = null; // 1번 구멍을 누른 시각
  let results = [];
  const glanceAt = {};   // 구멍 id → 곁눈질 방향 (넘친 옆 구멍이 있을 때)

  function init() {
    for (const hole of Board.holes) {
      hole.hit.addEventListener('pointerdown', (e) => start(hole, e));
    }
    window.addEventListener('pointerup', (e) => finish(e.timeStamp, false));
    window.addEventListener('pointercancel', (e) => finish(e.timeStamp, false));
  }

  // 지금 짜기 박자 (도구를 샀으면 덮어쓴다, T53)
  function timing() {
    const base = CFG.timing.pour;
    return Tools.has('pourFast') ? { ...base, ...CFG.tools.pourFast.pour } : base;
  }

  // 한 줄 짜기면 지금 줄(1~3 / 4~6)의 남은 구멍들
  function rowOf(id) {
    const row = Math.floor(id / 3) * 3;
    return Board.holes.filter((h) => h.id >= next && h.id >= row && h.id < row + 3);
  }

  function start(hole, e) {
    if (active || e.button !== 0 || !Stage.is('pour')) return;
    if (next >= Board.holes.length) return; // 다 짰다. 새 판은 손님이 떠날 때 (T19)
    const row = Tools.has('pourRow');
    // 순서가 아닌 구멍은 반응하지 않는다 (한 줄 짜기면 지금 줄의 아무 구멍이나)
    if (row ? Math.floor(hole.id / 3) !== Math.floor(next / 3) : hole.id !== next) return;
    const holes = row ? rowOf(next) : [hole];

    // 첫 클릭이 바로 짜기여도 소리가 나도록 여기서도 연다
    Sfx.unlock();
    const p = timing();
    const sound = Sfx.pourStart({
      soundSet: p.soundSet, targetMs: p.targetMs, autoStopMs: p.autoStopMs, holdBeats: p.holdBeats,
    });
    if (next === 0) { roundStart = e.timeStamp; Customer.shrinkBubble(); }
    active = { hole: holes[Math.floor(holes.length / 2)], holes, downAt: e.timeStamp, sound };
    Dispenser.show(active.hole, e.timeStamp); // 반죽통 눈금 (T31) — 한 줄이면 가운데 구멍 위
    for (const h of holes) Face.clear(h);
    requestAnimationFrame(tick);
  }

  function tick() {
    if (!active) return;
    const { targetMs, autoStopMs } = timing();
    const held = performance.now() - active.downAt;
    if (held >= targetMs + autoStopMs) {
      finish(active.downAt + targetMs + autoStopMs, true);
      return;
    }
    for (const h of active.holes) setFill(h, held);
    requestAnimationFrame(tick);
  }

  // 누른 시간 / 목표 = 반지름 비율. 1.0이면 구멍에 딱 맞고, 넘으면 테두리 밖으로 넘친다.
  function size(hole, held) {
    return hole.r * held / timing().targetMs;
  }
  function setFill(hole, held) {
    const s = size(hole, held).toFixed(1);
    hole.batter.setAttribute('rx', s);
    hole.batter.setAttribute('ry', s);
    hole.batter.setAttribute('fill', CFG.faces.batter.color);
  }

  function judge(errorMs) {
    const { perfectMs, goodMs } = timing();
    if (Math.abs(errorMs) <= perfectMs) return '퍼펙트';
    if (Math.abs(errorMs) <= goodMs) return '굿';
    return errorMs < 0 ? '부족' : '넘침';
  }

  function finish(upAt, autoStopped) {
    if (!active) return;
    const { holes, downAt, sound } = active;
    active = null;
    Dispenser.hide();
    next = holes[holes.length - 1].id + 1;
    if (autoStopped) sound.gurgle(); else sound.release();
    Sfx.sizzle(); // 반죽이 뜨거운 불판에 닿는 "치익" (T32, 붓는 순간만)

    const held = upAt - downAt;
    const { targetMs, soundSet } = timing();
    const errorMs = Math.round(held - targetMs);
    const result = autoStopped ? '넘침' : judge(errorMs);

    // 한 줄 짜기면 세 구멍이 같은 판정 (T53)
    for (const hole of holes) {
      results.push(result);
      hole.hasBatter = true;
      hole.pourAt = upAt; // 굽기는 뒤집기 단계에서 시작한다 (T11)
      showFace(hole, result, size(hole, held));
      Face.spill(hole, size(hole, held), result === '넘침' ? 6 : 0); // 번진 반죽 (T35)
      Face.sprinkle(hole, Math.min(hole.r, size(hole, held)));       // 텐카스·파 (T35)
      log(hole, downAt, upAt, errorMs, result, autoStopped, soundSet);
    }

    if (next === Board.holes.length) {
      logRound(upAt);
      Stage.complete('pour', results.map((r) => SCORE[r] || 0)); // 짝 + 등급 글자 → ② 문어
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
      // 잘 짰으면 반죽이 반응한다 (퍼펙트 통통 + 윤기, 굿 출렁)
      if (result === '퍼펙트') Face.react(hole, 'perfect');
      else if (result === '굿') Face.react(hole, 'good');
    }
  }

  function log(hole, downAt, upAt, errorMs, result, autoStopped, soundSet) {
    const cueAt = Math.round(downAt + timing().targetMs);
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
    const { targetMs, holdBeats } = timing();
    const bpm = Math.round(60000 / (targetMs / holdBeats));
    Log.add({
      step: '짜기 한 판', totalMs, targetMs, bpm,
      perfect: count('퍼펙트'), good: count('굿'), under: count('부족'), over: count('넘침'),
      line: `── 한 판 짜기 6구멍 ${(totalMs / 1000).toFixed(1)} s (목표 홀드 ${targetMs} ms, ${bpm} BPM) | 퍼펙트 ${count('퍼펙트')} 굿 ${count('굿')} 부족 ${count('부족')} 넘침 ${count('넘침')}`,
    });
  }

  // 새 판: 손님이 받고 떠나면 불판·후네·토핑을 비운다 (T19, Customer가 부른다)
  function newRound() {
    if (active || !Stage.finished()) return; // 한 판 도중에는 새 판 없음
    Stage.reset();
    next = 0;
    results = [];
    roundStart = null;
    for (const k in glanceAt) delete glanceAt[k];
    Cook.reset();
    for (const hole of Board.holes) {
      hole.hasBatter = false;
      delete hole.flip1;
      delete hole.flip2;
      delete hole.final;
      delete hole.pourAt;
      Face.clear(hole);
      Octopus.clear(hole);
    }
    Octopus.reset();
    Fill.reset();
    Hint.hide();
    Topping.reset();
    Box.reset();
    Log.add({ step: '새 판', line: '── 새 판 ──' });
  }

  return { init, newRound, timing, busy: () => !!active, roundStart: () => roundStart, next: () => next };
})();
