// 반죽 짜기: 빈 구멍을 누르고 있다가 놓는다. 누른 시간으로 판정한다.
// 판정은 화면에 글자로 띄우지 않고 판정 로그에만 남긴다. (설계 원칙 2)
const Pour = (() => {
  const filled = new Set();
  let active = null; // { hole, downAt, sound }

  function init() {
    for (const hole of Board.holes) {
      hole.el.addEventListener('pointerdown', (e) => start(hole, e));
    }
    window.addEventListener('pointerup', (e) => finish(e.timeStamp, false));
    window.addEventListener('pointercancel', (e) => finish(e.timeStamp, false));
  }

  function start(hole, e) {
    if (active || filled.has(hole.id) || e.button !== 0) return;
    // 첫 클릭이 바로 짜기여도 소리가 나도록 여기서도 연다
    Sfx.unlock();
    const p = CFG.timing.pour;
    const sound = Sfx.pourStart({
      soundSet: p.soundSet, targetMs: p.targetMs, autoStopMs: p.autoStopMs, holdBeats: p.holdBeats,
    });
    active = { hole, downAt: e.timeStamp, sound };
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
  function setFill(hole, held) {
    hole.batter.setAttribute('r', (hole.r * held / CFG.timing.pour.targetMs).toFixed(1));
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
    filled.add(hole.id);
    if (autoStopped) sound.gurgle(); else sound.release();

    const held = upAt - downAt;
    setFill(hole, held);
    const { targetMs, soundSet } = CFG.timing.pour;
    const errorMs = Math.round(held - targetMs);
    const result = autoStopped ? '넘침' : judge(errorMs);
    const cueAt = Math.round(downAt + targetMs);
    const inputAt = Math.round(upAt);
    const sign = errorMs > 0 ? '+' : '';
    // 출력 지연: 스피커에서 소리가 실제로 나기까지 걸리는 시간. 튜닝 참고용
    const latencyMs = Sfx.ctx ? Math.round(((Sfx.ctx.baseLatency || 0) + (Sfx.ctx.outputLatency || 0)) * 1000) : null;
    Log.add({
      step: '짜기', hole: hole.id + 1, cueAt, inputAt, errorMs, result, autoStopped, soundSet, latencyMs,
      line: `짜기 #${hole.id + 1} | 큐 ${cueAt} | 입력 ${inputAt} | ${sign}${errorMs}ms | ${result}${autoStopped ? ' (자동 종료)' : ''} | 소리 ${soundSet}`,
    });
  }

  return { init };
})();
