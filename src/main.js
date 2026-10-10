// 초기화
(() => {
  Config.load();
  Board.create(document.getElementById('stage'));
  Scene.init();
  Log.init(document.getElementById('log-panel'), document.getElementById('log-toggle'));
  Pour.init();
  Octopus.init();
  Flip.init();
  Box.init();
  Topping.init();
  Wallet.init();
  Customer.init();
  Dialogue.init();
  Flow.start();
  window.addEventListener('pointerdown', Sfx.unlock, { once: true });
})();
