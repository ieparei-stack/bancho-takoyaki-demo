// 돈 (T24): 편지 송금·손님 값이 들어오고, 장보기(6단계)에서 나간다. 왼쪽 위에 "돈 ₩…".
// 모든 변동은 판정 로그에 남긴다 (나중에 플레이 로그 money 필드의 근거).
const Wallet = (() => {
  const HUD = { x: 28, y: 40 };
  const POP_MS = 900;

  let money = 0;
  let text = null;

  function init() {
    const side = Board.layer('side');
    Board.el('rect', { x: 12, y: 10, width: 190, height: 74, rx: 10, fill: 'rgba(10,6,4,0.55)' }, side); // 글자 뒤 띠 (배경 위에서도 읽히게)
    text = Board.el('text', { x: HUD.x, y: HUD.y, 'font-size': 24, 'font-weight': 700, fill: '#f3e6d6' }, side);
    money = CFG.day.startMoney;
    show();
  }

  function won(n) {
    return `${n.toLocaleString('ko-KR')}원`; // 원은 숫자 뒤 (사용자 2026-10-12)
  }
  function show() {
    text.textContent = `돈 ${won(money)}`;
  }

  function add(amount, reason) {
    if (!amount) return;
    money += amount;
    show();
    pop(`+${won(amount)}`, '#ffd34d');
    Log.add({ step: '돈', amount, reason, money, line: `돈 | +${amount} ${reason} | ${won(money)}` });
  }

  // 장보기에서 무를 때
  function refund(amount, reason) {
    add(amount, reason);
  }

  // 모자라면 쓰지 않고 false
  function spend(amount, reason) {
    if (amount > money) {
      Log.add({ step: '돈', amount: -amount, reason, money, refused: true, line: `돈 | −${amount} ${reason} 모자람 | ${won(money)}` });
      return false;
    }
    money -= amount;
    show();
    pop(`−${won(amount)}`, '#9fb4c8');
    Log.add({ step: '돈', amount: -amount, reason, money, line: `돈 | −${amount} ${reason} | ${won(money)}` });
    return true;
  }

  // 돈 글자 옆에서 떠오르며 흐려진다
  function pop(str, color) {
    const t = Board.el('text', {
      x: 210, y: HUD.y, 'font-size': 22, 'font-weight': 900, fill: color, stroke: '#1b1512', 'stroke-width': 4, 'paint-order': 'stroke',
    }, Board.layer('top'));
    t.textContent = str;
    const t0 = performance.now();
    const step = (now) => {
      const u = Math.min(1, (now - t0) / POP_MS);
      t.setAttribute('transform', `translate(0 ${(-20 * u).toFixed(1)})`);
      t.setAttribute('opacity', (u < 0.6 ? 1 : 1 - (u - 0.6) / 0.4).toFixed(2));
      if (u < 1) requestAnimationFrame(step); else t.remove();
    };
    requestAnimationFrame(step);
  }

  return { init, add, spend, refund, get money() { return money; } };
})();
