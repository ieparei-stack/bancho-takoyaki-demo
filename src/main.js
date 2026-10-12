// 초기화
(() => {
  Config.load();
  Board.create(document.getElementById('stage'));
  Scene.init();
  Log.init(document.getElementById('log-panel'), document.getElementById('log-toggle'));
  Pour.init();
  Tray.init();
  Octopus.init();
  Fill.init();
  Flip.init();
  Box.init();
  Topping.init();
  Ritual.init(); // 개점·마감 의식 — 가스 손잡이·종 (T51)
  Wallet.init();
  Menu.init();
  Customer.init();
  Dialogue.init();
  Letter.init(); // 화면 전체 편지 (T47)
  Hint.init();
  Demo.init(); // 첫 판 유령 시범 (T44)
  Discover.init(document.getElementById('book-toggle'));
  Flow.start();
  window.addEventListener('pointerdown', Sfx.unlock, { once: true });
})();
