// 단계 진행: 한 판을 미니게임으로 나눠 순서대로 한다. (2026-10-10 사용자 결정)
// 단계가 끝나면 6번의 점수(퍼펙트 2 / 굿 1 / 그 외 0)를 합쳐 등급 글자를 잠깐 띄우고 다음 단계로 넘어간다.
// 등급 글자는 단계 끝에만 뜬다. 동작하는 동안에는 지금처럼 소리와 표정만. (설계 원칙 2를 '동작 중'으로 한정)
const Stage = (() => {
  // T11: ① 짜기 → ② 문어 → 임시 뒤집기 구간 (T12·T13에서 1차/2차로 나눈다)
  const ORDER = ['pour', 'octopus', 'flip'];
  const NAME = { pour: '① 짜기', octopus: '② 문어', flip: '뒤집기(임시)' };
  const GRADE_COLOR = { perfect: '#ffd34d', great: '#ff9f43', good: '#9fd36b', oops: '#9fb4c8' };
  const BANNER = { x: 560, y: 380, size: 92 }; // 불판 가운데 (board.js PLATE 기준)

  let index = 0;
  let banner = null; // { el, startAt, raf, timer }
  const enterHooks = {};

  function current() {
    return ORDER[index];
  }

  // 배너가 떠 있는 동안에는 어느 단계도 아니다 → 모든 입력이 막힌다
  function is(name) {
    return !banner && current() === name;
  }

  function onEnter(name, fn) {
    (enterHooks[name] = enterHooks[name] || []).push(fn);
  }

  function grade(sum) {
    const s = CFG.timing.stage;
    if (sum >= s.perfect) return 'perfect';
    if (sum >= s.great) return 'great';
    if (sum >= s.good) return 'good';
    return 'oops';
  }

  // scores: 동작마다 0·1·2
  function complete(name, scores) {
    if (banner || current() !== name) return;
    const sum = scores.reduce((a, b) => a + b, 0);
    const max = scores.length * 2;
    const g = grade(sum);
    const text = CFG.letters.grade[g];
    Log.add({
      step: '단계 끝', stage: name, score: sum, max, grade: g,
      line: `── ${NAME[name]} 끝 | ${sum}/${max} | ${text}`,
    });
    Sfx.finish();
    show(text, GRADE_COLOR[g]);
  }

  function show(text, color) {
    const top = Board.layer('top');
    const el = Board.el('text', {
      x: BANNER.x, y: BANNER.y, 'text-anchor': 'middle', 'dominant-baseline': 'middle',
      'font-size': BANNER.size, 'font-weight': 900, 'font-family': 'Arial Black, Impact, sans-serif',
      fill: color, stroke: '#1b1512', 'stroke-width': 8, 'paint-order': 'stroke', 'letter-spacing': 2,
    }, top);
    el.textContent = text;
    banner = { el, startAt: performance.now(), raf: 0, timer: 0 };
    banner.raf = requestAnimationFrame(animate);
    banner.timer = setTimeout(next, CFG.timing.stage.bannerMs);
  }

  // 튀어나오듯 커졌다가(0.6 → 1.12 → 1) 끝 200 ms 동안 사라진다
  function animate(now) {
    if (!banner) return;
    const t = now - banner.startAt;
    const total = CFG.timing.stage.bannerMs;
    let s = 1;
    if (t < 120) s = 0.6 + (1.12 - 0.6) * (t / 120);
    else if (t < 220) s = 1.12 - 0.12 * ((t - 120) / 100);
    const fade = Math.max(0, Math.min(1, (total - t) / 200));
    banner.el.setAttribute('transform', `translate(${BANNER.x} ${BANNER.y}) scale(${s.toFixed(3)}) translate(${-BANNER.x} ${-BANNER.y})`);
    banner.el.setAttribute('opacity', fade.toFixed(2));
    banner.raf = requestAnimationFrame(animate);
  }

  function clearBanner() {
    if (!banner) return;
    cancelAnimationFrame(banner.raf);
    clearTimeout(banner.timer);
    banner.el.remove();
    banner = null;
  }

  function next() {
    clearBanner();
    if (index < ORDER.length - 1) index++;
    for (const fn of enterHooks[current()] || []) fn(performance.now());
  }

  function reset() {
    clearBanner();
    index = 0;
  }

  return { is, current, complete, onEnter, reset, busy: () => !!banner };
})();
