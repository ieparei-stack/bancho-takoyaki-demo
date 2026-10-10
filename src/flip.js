// 뒤집기: 반죽이 든 구멍을 누른 채 마우스를 돌린다. 구멍 중심 기준 회전각을 누적한다.
// 1차(반 바퀴, ③ 단계)와 2차(한 바퀴 휙, ④ 단계) 모두 마우스를 떼는 순간 뒤집히고, 그 시각을 큐와 비교해 타이밍을 판정한다.
// 회전량은 phase별 성공 폭 안이기만 하면 된다. 2차는 각속도가 모자라면 한 단계 강등된다.
const Flip = (() => {
  const ANIM_MS = 150;
  let drag = null; // { hole, phase, lastAng, deg, startAt, firstMoveT, lastT, doneAt, dps }

  function init() {
    for (const hole of Board.holes) {
      hole.hit.addEventListener('pointerdown', (e) => start(hole, e));
    }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    // 단계가 시작되면 6구멍이 함께 굽기 시작하고 1→6 차례로 큐가 온다 (T12)
    Stage.onEnter('flip1', (now) => Cook.sequence(1, now));
    Stage.onEnter('flip2', (now) => Cook.sequence(2, now));
  }

  // 지금 단계에서 이 구멍을 뒤집을 수 있으면 그 차수, 아니면 0
  function phaseOf(hole) {
    if (!hole.hasBatter) return 0;
    if (Stage.is('flip1')) return hole.flip1 ? 0 : 1;
    if (Stage.is('flip2')) return hole.flip1 && !hole.flip2 ? 2 : 0;
    return 0;
  }

  function start(hole, e) {
    if (drag || e.button !== 0) return;
    const phase = phaseOf(hole);
    if (!phase) return;
    const p = Board.toSvg(e);
    drag = { hole, phase, lastAng: angle(hole, p), deg: 0, startAt: e.timeStamp, firstMoveT: null, lastT: e.timeStamp, doneAt: null, dps: 0 };
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
    if (d === 0) return;
    drag.lastAng = a;
    drag.deg += d; // 부호 있게 누적 → 왔다 갔다는 상쇄
    if (drag.firstMoveT === null) drag.firstMoveT = e.timeStamp;
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
    const min = d.phase === 1 ? f.flip1MinDeg : f.flip2MinDeg;
    const max = d.phase === 1 ? f.flip1MaxDeg : f.flip2MaxDeg;
    const fail = deg < min ? '미달' : deg > max ? '과회전' : null;
    // 각속도: 첫 이동부터 마지막 이동까지의 평균 (한 바퀴를 "휙" 돌렸는지)
    const spanMs = Math.max(16, d.lastT - (d.firstMoveT ?? d.startAt));
    d.dps = Math.round(deg / spanMs * 1000);
    complete(d, fail);
  }

  // 최종 표정 (T10): 1차·2차 점수 합. 퍼펙트 2 / 굿 1 / 그 외 0. 2단계 인터뷰 #8·#10
  const SCORE = { 퍼펙트: 2, 굿: 1 };
  const FINAL_NAME = { perfect: '완벽', tasty: '맛있음', meh: '어설픔', raw: '덜 익음', burnt: '탐', blank: '문어 없음' };
  function finalState(hole) {
    if (!hole.hasOcto) return 'blank'; // 문어 없음은 굽기 결과와 무관하게 멍함
    const sum = (SCORE[hole.flip1.result] || 0) + (SCORE[hole.flip2.result] || 0);
    if (sum >= 4) return 'perfect';
    if (sum === 3) return 'tasty';
    if (sum === 2) return 'meh';
    return (hole.flip1.late || hole.flip2.late) ? 'burnt' : 'raw'; // 늦은 미스가 있으면 탐, 아니면 덜 익음
  }

  // 큐(기포가 올라온 순간)부터 perfectSpanMs 동안 퍼펙트, 그 앞뒤 goodMarginMs는 굿 (2026-10-10 사용자)
  function judge(errorMs) {
    const { perfectSpanMs, goodMarginMs } = CFG.timing.cook;
    if (errorMs >= 0 && errorMs <= perfectSpanMs) return '퍼펙트';
    if (errorMs >= -goodMarginMs && errorMs <= perfectSpanMs + goodMarginMs) return '굿';
    return errorMs < 0 ? '이름' : '늦음';
  }

  function complete(d, fail) {
    const { hole, phase } = d;
    const cook = Cook.state(hole);
    const cueAt = cook ? cook.cueAt : d.doneAt;
    const errorMs = Math.round(d.doneAt - cueAt);
    let result = fail || judge(errorMs);
    const deg = Math.round(Math.abs(d.deg));

    // 2차: 각속도 미달이면 실패가 아니라 한 단계 강등 (퍼펙트→굿, 굿→느림=미스). 2단계 인터뷰 #5
    const slow = phase === 2 && d.dps < CFG.timing.flip.flip2SpeedDps;
    let demoted = false;
    if (slow && result === '퍼펙트') { result = '굿'; demoted = true; }
    else if (slow && result === '굿') { result = '느림'; demoted = true; }

    const info = { result, errorMs, deg, dps: d.dps, slow, late: result === '늦음' };
    if (phase === 1) hole.flip1 = info; else hole.flip2 = info;

    const ok = result === '퍼펙트' || result === '굿';
    if (phase === 1) { if (ok) Sfx.flipOk(); else Sfx.flipFail(); }
    else if (ok) Sfx.flip2Ok();
    else if (result === '느림') Sfx.flip2Slow();
    else Sfx.flipFail();

    // 회전량 실패는 비스듬하게. 미달은 돌린 쪽, 과회전은 반대쪽으로
    const tilt = fail ? (d.deg < 0 ? -20 : 20) * (fail === '과회전' ? -1 : 1) : 0;
    if (phase === 1) {
      const face = ok ? 'expect' : (result === '늦음' ? 'anxious2' : 'anxious1');
      Face.flipAnim(hole, ANIM_MS, () => {
        hole.dome = true;
        Face.setTilt(hole, tilt);
        Face.apply(hole, face, hole.size, hole.look);
      });
      Cook.stop(hole); // ④가 시작될 때까지 색 고정
      Cook.hideHint(hole);
    } else {
      // 2차: 공 모양 + 최종 표정(합산). 더 굽지 않는다 (사용자 결정 2026-10-10)
      Cook.stop(hole);
      hole.final = finalState(hole);
      Face.flipAnim(hole, ANIM_MS, () => {
        hole.ball = true;
        Face.setTilt(hole, tilt);
        Face.apply(hole, hole.final, hole.size, hole.look);
        if (hole.final === 'perfect') Face.react(hole, 'final'); // 통통
      });
    }

    const sign = errorMs > 0 ? '+' : '';
    const speed = phase === 2 ? ` | ${d.dps}°/s${demoted ? ' (느림 강등)' : ''} | 최종 ${FINAL_NAME[hole.final]}` : '';
    Log.add({
      step: `뒤집기 ${phase}차`, hole: hole.id + 1, cueAt: Math.round(cueAt), inputAt: Math.round(d.doneAt), errorMs, result, deg,
      ...(phase === 2 ? { dps: d.dps, demoted, final: hole.final } : {}),
      line: `뒤집기 ${phase}차 #${hole.id + 1} | 큐 ${Math.round(cueAt)} | 입력 ${Math.round(d.doneAt)} | ${sign}${errorMs}ms | ${result} | ${deg}°${speed}`,
    });
    if (phase === 1 && Board.holes.every((h) => h.flip1)) {
      Stage.complete('flip1', Board.holes.map((h) => SCORE[h.flip1.result] || 0)); // 등급 → ④ 2차 뒤집기
    }
    if (phase === 2 && Board.holes.every((h) => h.flip2)) logRound(d.doneAt);
  }

  // 한 판: 1번 구멍 짜기 시작 → 마지막 2차 뒤집기
  function logRound(endAt) {
    const start = Pour.roundStart();
    const totalMs = Math.round(endAt - (start ?? endAt));
    const count = (k) => Board.holes.filter((h) => h.final === k).length;
    const tally = Object.keys(FINAL_NAME).map((k) => `${FINAL_NAME[k]} ${count(k)}`).join(' ');
    Log.add({
      step: '한 판', totalMs, perfect: count('perfect'), tasty: count('tasty'), meh: count('meh'), raw: count('raw'), burnt: count('burnt'), blank: count('blank'),
      line: `── 한 판 ${(totalMs / 1000).toFixed(1)} s (1번 짜기 시작 → 마지막 2차 뒤집기) | ${tally}`,
    });
  }

  return { init, busy: () => !!drag };
})();
