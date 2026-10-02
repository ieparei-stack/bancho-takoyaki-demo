// 합성음 진입점. 브라우저 자동재생 정책 때문에 첫 클릭에서 AudioContext를 연다.
const Sfx = (() => {
  let ctx = null;

  function unlock() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      console.log('[소리] AudioContext 시작');
    }
    if (ctx.state === 'suspended') ctx.resume();
  }

  return {
    unlock,
    get ctx() { return ctx; },
  };
})();
