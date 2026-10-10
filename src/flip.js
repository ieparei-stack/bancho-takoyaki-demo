// 뒤집기: 반죽이 든 구멍을 누른 채 마우스를 돌린다. 구멍 중심 기준 회전각을 누적한다.
// 1차(반 바퀴)는 T08. 2차(한 바퀴 휙)는 T09에서 phase 2로 붙인다.
// 타이밍은 제스처 완료 시각(누적 각도가 목표에 닿는 순간) 기준으로 큐와 비교한다.
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
    const need = CFG.timing.flip.flip1Deg;
    if (Math.abs(drag.deg) >= need) {
      drag.doneAt = e.timeStamp;
      complete(drag, false);
    }
  }

  function release(e) {
    if (!drag) return;
    const d = drag;
    drag = null;
    if (d.doneAt) return; // 이미 완료
    if (Math.abs(d.deg) < CFG.timing.flip.ignoreDeg) return; // 실수 클릭
    d.doneAt = e.timeStamp;
    complete(d, true);
  }

  function judge(errorMs) {
    const { perfectMs, goodMs } = CFG.timing.cook;
    if (Math.abs(errorMs) <= perfectMs) return '퍼펙트';
    if (Math.abs(errorMs) <= goodMs) return '굿';
    return errorMs < 0 ? '이름' : '늦음';
  }

  function complete(d, short) {
    const { hole, phase } = d;
    const cook = Cook.state(hole);
    const cueAt = cook ? cook.cueAt : d.doneAt;
    const errorMs = Math.round(d.doneAt - cueAt);
    const result = short ? '미달' : judge(errorMs);
    const deg = Math.round(Math.abs(d.deg));
    hole.flip1 = { result, errorMs, deg, late: result === '늦음' };

    const ok = result === '퍼펙트' || result === '굿';
    if (ok) Sfx.flipOk(); else Sfx.flipFail();

    const face = ok ? 'expect' : (result === '늦음' ? 'anxious2' : 'anxious1');
    const tilt = short ? (d.deg < 0 ? -20 : 20) : 0;
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
