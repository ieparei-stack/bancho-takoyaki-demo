// 반죽 짜기: 빈 구멍을 누르고 있다가 놓는다. 누른 시간으로 판정한다.
// 판정은 화면에 글자로 띄우지 않고 판정 로그에만 남긴다. (설계 원칙 2)
const Pour = (() => {
  const filled = new Set();
  let active = null; // { hole, downAt }

  function init() {
    for (const hole of Board.holes) {
      hole.el.addEventListener('pointerdown', (e) => start(hole, e));
    }
    window.addEventListener('pointerup', (e) => finish(e.timeStamp, false));
    window.addEventListener('pointercancel', (e) => finish(e.timeStamp, false));
  }

  function start(hole, e) {
    if (active || filled.has(hole.id) || e.button !== 0) return;
    active = { hole, downAt: e.timeStamp };
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
    const { hole, downAt } = active;
    active = null;
    filled.add(hole.id);

    const held = upAt - downAt;
    setFill(hole, held);
    const { targetMs } = CFG.timing.pour;
    const errorMs = Math.round(held - targetMs);
    const result = autoStopped ? '넘침' : judge(errorMs);
    const cueAt = Math.round(downAt + targetMs);
    const inputAt = Math.round(upAt);
    const sign = errorMs > 0 ? '+' : '';
    Log.add({
      step: '짜기', hole: hole.id + 1, cueAt, inputAt, errorMs, result, autoStopped,
      line: `짜기 #${hole.id + 1} | 큐 ${cueAt} | 입력 ${inputAt} | ${sign}${errorMs}ms | ${result}${autoStopped ? ' (자동 종료)' : ''}`,
    });
  }

  return { init };
})();
