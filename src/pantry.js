// 오늘 가진 재료 (T25). 날마다 다시 사고, 산 날에는 무한으로 쓴다 (6단계 인터뷰 2026-10-10). 문어는 기본 재료라 늘 있다.
const Pantry = (() => {
  const owned = new Set();

  function baseIds() {
    return Object.keys(CFG.ingredients).filter((id) => CFG.ingredients[id].base);
  }

  // 새 날: 기본 재료 + 편지 동봉
  function newDay(enclosedIds) {
    owned.clear();
    for (const id of baseIds()) owned.add(id);
    for (const id of enclosedIds || []) {
      if (CFG.ingredients[id]) owned.add(id);
      else Config.warn(`동봉 재료 "${id}"가 ingredients에 없습니다`);
    }
    log('새 날');
  }

  function add(id) { owned.add(id); }
  function remove(id) { if (!CFG.ingredients[id].base) owned.delete(id); }

  function list() {
    // data.js 순서대로
    return Object.keys(CFG.ingredients).filter((id) => owned.has(id));
  }

  function log(why) {
    const names = list().map((id) => CFG.ingredients[id].name).join(' · ');
    Log.add({ step: '재료', items: list(), line: `재료 | ${why} | ${names}` });
  }

  return { newDay, add, remove, has: (id) => owned.has(id), list, log };
})();
