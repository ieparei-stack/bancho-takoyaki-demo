// 도구 = 인게임 성장 (T53, 사용자 2026-10-12): 아침 장보기에서 재료와 같은 돈으로 산다. 한 번 사면 끝까지 간다.
// "반복 노동은 성장으로 덜어 주고, 실력이 드러나는 손맛(뒤집기)은 남긴다."
//   pourFast 빠른 짜기 (도-솔-도 1 s) / pourRow 한 줄 짜기 (한 번에 세 구멍) / fillAll 한꺼번에 넣기 (재료 하나 → 여섯 알, 켜고 끔)
// 값·이름은 data.js tools
const Tools = (() => {
  const owned = new Set();

  function has(id) {
    return owned.has(id);
  }

  function buy(id) {
    const t = CFG.tools[id];
    if (!t || owned.has(id)) return false;
    if (!Wallet.spend(t.price, `${t.name} 구매`)) return false;
    owned.add(id);
    Log.add({ step: '도구', id, price: t.price, line: `도구 | ${t.name} 구매 ₩${t.price.toLocaleString('ko-KR')}` });
    return true;
  }

  // 같은 장보기 안에서 무르기 (Shop이 그날 산 것만 부른다)
  function refund(id) {
    const t = CFG.tools[id];
    if (!t || !owned.has(id)) return;
    owned.delete(id);
    Wallet.refund(t.price, `${t.name} 무름`);
    Log.add({ step: '도구', id, line: `도구 | ${t.name} 무름` });
  }

  return { has, buy, refund, owned: () => [...owned] };
})();
