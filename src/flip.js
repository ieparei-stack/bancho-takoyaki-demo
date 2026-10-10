// 뒤집기: 반죽이 든 구멍을 누른 채 마우스를 돌린다. 구멍 중심 기준 회전각을 누적한다.
// 1차는 T08. 2차(한 바퀴 휙)는 T09에서 phase 2로 붙인다.
// 마우스를 떼는 순간 뒤집히고, 그 시각을 큐와 비교해 타이밍을 판정한다. 회전량은 성공 폭 안이기만 하면 된다.
const Flip = (() => {
  const ANIM_MS = 150;
  let drag = null; // { hole, phase, lastAng, deg, startAt, doneAt, lastT }

  function init() {
    for (const hole of Board.holes) {
      hole.hit.addEventListener('pointerdown', (e) => start(hole, e));
    }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
  }

  function phaseOf(hole) {
    if (!hole.hasBatter) return 0;
    if (!hole.flip1) return 1;
    return 0; // 2차는 T09
  }

  function start(hole, e) {
    if (drag || e.button !== 0 || Pour.busy() || Octopus.busy()) return;
    const phase = phaseOf(hole);
    if (!phase) return;
    const p = Board.toSvg(e);
    drag = { hole, phase, lastAng: angle(hole, p), deg: 0, startAt: e.timeStamp, doneAt: null, lastT: e.timeStamp };
  }

  function angle(hole, p) {
    return Math.atan2(p.y - hole.cy, p.x - hole.cx) * 180 / Math.PI;
  }

  function move(e) {
    if (!drag || drag.doneAt) return;
    const p = Board.toSvg(e);
    const a = angle(drag.hole, p);
    let d = a - drag.lastAng;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    drag.lastAng = a;
    drag.deg += d; // 부호 있게 누적 → 왔다 갔다는 상쇄
    drag.lastT = e.timeStamp;
  }

  // 떼는 순간 뒤집힌다. 회전량이 성공 폭 안이면 타이밍으로 판정, 밖이면 실패(미달/과회전)
  function release(e) {
    if (!drag) return;
    const d = drag;
    drag = null;
    const f = CFG.timing.flip;
    const deg = Math.abs(d.deg);
    if (deg < f.ignoreDeg) return; // 실수 클릭
    d.doneAt = e.timeStamp;
    const fail = deg < f.flip1MinDeg ? '미달' : deg > f.flip1MaxDeg ? '과회전' : null;
    complete(d, fail);
  }

  function judge(errorMs) {
    const { perfectMs, goodMs } = CFG.timing.cook;
    if (Math.abs(errorMs) <= perfectMs) return '퍼펙트';
    if (Math.abs(errorMs) <= goodMs) return '굿';
    return errorMs < 0 ? '이름' : '늦음';
  }

  function complete(d, fail) {
    const { hole, phase } = d;
    const cook = Cook.state(hole);
    const cueAt = cook ? cook.cueAt : d.doneAt;
    const errorMs = Math.round(d.doneAt - cueAt);
    const result = fail || judge(errorMs);
    const deg = Math.round(Math.abs(d.deg));
    hole.flip1 = { result, errorMs, deg, late: result === '늦음' };

    const ok = result === '퍼펙트' || result === '굿';
    if (ok) Sfx.flipOk(); else Sfx.flipFail();

    const face = ok ? 'expect' : (result === '늦음' ? 'anxious2' : 'anxious1');
    // 회전량 실패는 비스듬하게. 미달은 돌린 쪽, 과회전은 반대쪽으로
    const tilt = fail ? (d.deg < 0 ? -20 : 20) * (fail === '과회전' ? -1 : 1) : 0;
    Face.flipAnim(hole, ANIM_MS, () => {
      hole.dome = true;
      Face.setTilt(hole, tilt);
      Face.apply(hole, face, hole.size, hole.look);
    });
    Cook.flipped(hole, d.doneAt);

    const sign = errorMs > 0 ? '+' : '';
    Log.add({
      step: `뒤집기 ${phase}차`, hole: hole.id + 1, cueAt: Math.round(cueAt), inputAt: Math.round(d.doneAt), errorMs, result, deg,
      line: `뒤집기 ${phase}차 #${hole.id + 1} | 큐 ${Math.round(cueAt)} | 입력 ${Math.round(d.doneAt)} | ${sign}${errorMs}ms | ${result} | ${deg}°`,
    });
  }

  return { init, busy: () => !!drag };
})();
