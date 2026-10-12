// 소문 손님 (T57, 사용자 2026-10-12): 손님을 "제대로" 대접하면 소문을 듣고 새 손님이 온다.
//   제대로 = 그날 그 손님 판 중, 소문 재료가 든 알이 있고 반응이 rumor.reacts(최고·반함)인 판이 하나라도 있음
//   next: true → 다음 날 예약 손님 (메모판 쪽지 + 그날 손님 줄 끝) / 아니면 오늘 줄 끝에 예약 없이
//   같은 소문 손님은 한 번만 (까마귀 형제가 둘 다 성공해도 토끼 하나). 데이터는 data.js customers.cast[id].rumor
const Rumor = (() => {
  const spread = new Set();   // 소문이 난 손님 id
  const byDay = {};           // 일차 index → [소문 손님 id] (다음 날 손님)

  // 손님이 떠날 때 (Flow가 부른다). 오늘 바로 오는 손님이면 { id, orders: 1 }, 아니면 null
  function check(guest) {
    const r = guest.rumor;
    if (!r) return null;
    const who = CFG.customers.cast[r.guest];
    if (!who) { Config.warn(`customers.cast.${guest.id}.rumor의 손님 "${r.guest}"가 cast에 없습니다`); return null; }
    if (spread.has(r.guest)) return null;
    const ings = r.ings || [];
    const reacts = r.reacts || ['love', 'best'];
    const recs = Customer.getRecords().filter((x) => x.day === Flow.day() && x.customer.id === guest.id);
    const ok = recs.some((x) => reacts.includes(x.reaction) && (x.ings || []).some((ball) => ball.some((id) => ings.includes(id))));
    if (!ok) {
      Log.add({ step: '소문', from: guest.id, guest: r.guest, got: false, line: `소문 | ${guest.name} — ${ings.join('·')} 든 판으로 만족 못 함 → ${who.name} 안 옴` });
      return null;
    }
    spread.add(r.guest);
    const next = !!r.next && Flow.day() < CFG.day.days.length;
    Log.add({ step: '소문', from: guest.id, guest: r.guest, got: true, next, line: `소문 | ${guest.name} 만족 → ${who.name} ${next ? '내일 예약' : '오늘 온다'}` });
    if (next) {
      (byDay[Flow.day()] = byDay[Flow.day()] || []).push(r.guest);
      return null;
    }
    return { id: r.guest, orders: r.orders || 1 };
  }

  // 그날(일차 index) 예약으로 오는 소문 손님 id
  function guests(dayIdx) {
    return (byDay[dayIdx] || []).slice();
  }

  return { check, guests, has: (id) => spread.has(id) };
})();
