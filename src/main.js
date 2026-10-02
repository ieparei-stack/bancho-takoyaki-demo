// 초기화
(() => {
  Config.load();
  Board.create(document.getElementById('stage'));
  Log.init(document.getElementById('log-panel'), document.getElementById('log-toggle'));
  Pour.init();
  window.addEventListener('pointerdown', Sfx.unlock, { once: true });
})();
