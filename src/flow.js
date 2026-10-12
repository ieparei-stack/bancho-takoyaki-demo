// 하루 흐름 상태 머신 (T21, SPEC 2절). 모든 화면 전환은 이 상태 사이에서만 일어난다.
// LETTER → SHOP → PREP → OPEN_BELL(개점 의식) → ORDER → COOK → REACTION → (다음 주문 | CLOSE(마감 의식) → DAY_END_TALK) → GIFT_CHOICE → 다음 날 | DEMO_END
// 아직 내용이 없는 상태는 "무엇을 할 자리인지" 보여주는 빈 패널(클릭하면 넘어감)이다. 일차 구성은 data.js day.days.
const Flow = (() => {
  const NAME = {
    TITLE: '타이틀', LETTER: '편지', MEMO: '메모판', SHOP: '장보기', PREP: '준비', OPEN_BELL: '개점', ORDER: '주문', COOK: '굽기',
    REACTION: '반응', CLOSE: '마감', DAY_END_TALK: '밤 대화', GIFT_CHOICE: '선물', DEMO_END: '데모 끝',
  };
  const CARD_MS = 1000;   // 일차 카드
  const PANEL = { x: 290, y: 200, w: 700, h: 300 };

  let state = null;
  let dayIdx = 0;
  let queue = [];         // 그날 남은 손님 [{ id, orders }]
  let guest = null;       // 지금 손님 (data.js customers.cast 항목 + id)
  let ordersLeft = 0;
  let hud = null;

  function start() {
    hud = Board.el('text', { x: 28, y: 72, 'font-size': 16, fill: '#c9b8a4' }, Board.layer('side'));
    go('TITLE'); // 타이틀 → 1일차 (T45)
  }

  function days() {
    return CFG.day.days;
  }
  function today() {
    return days()[dayIdx];
  }

  // 상태 → 배경 시간대 (T22, 제안). 영업 중(null)은 건넨 판 수로 흐른다 — Scene.setOpen (T51)
  const TIME = {
    TITLE: 'morning', LETTER: 'morning', MEMO: 'morning', SHOP: 'morning', PREP: 'morning',
    OPEN_BELL: null, ORDER: null, COOK: null, REACTION: null, CLOSE: null,
    DAY_END_TALK: 'night', GIFT_CHOICE: 'night', DEMO_END: 'night',
  };

  // 오늘 영업 진행 0~1 = 오늘 건넨 판 수 / 오늘 전체 판 수
  function progress() {
    const total = (today().guests || []).reduce((s, q) => s + (q.orders || 0), 0) || 1;
    return Math.min(1, (round() - 1) / total);
  }

  function go(next) {
    state = next;
    if (TIME[state]) Scene.setTime(TIME[state]);
    hud.textContent = `${dayIdx + 1}일차 · ${NAME[state]}`;
    Log.add({ step: '흐름', day: dayIdx + 1, state, line: `── ${dayIdx + 1}일차 · ${state}` });
    Discover.onState(state); // 굽는 동안 도감 버튼 숨김 (T39)
    ENTER[state]();
  }

  const ENTER = {
    TITLE() {
      Title.show(() => beginDay(0));
    },
    LETTER() {
      // 편지 = 대화창 (한 장 = 한 번). 문구는 사용자가 data.js letters.days에 직접 쓴다
      const raw = (CFG.letters.days || [])[dayIdx];
      const pages = Array.isArray(raw) ? raw : (raw ? [raw] : []);
      Dialogue.play(pages.map((text) => ({ who: 'letter', text: String(text) })), enclosed);
    },
    MEMO() {
      // 코르크 메모판 (T52): 예약 쪽지를 직접 눌러 읽어야 장보기로. 예약이 없는 날은 바로
      Reserve.morning(dayIdx, () => go('SHOP'));
    },
    SHOP() {
      if (!today().shop) {
        Log.add({ step: '흐름', line: `   ${dayIdx + 1}일차 SHOP 건너뜀 (재료 지급)` });
        go('PREP');
        return;
      }
      Shop.open(() => go('PREP'));
    },
    PREP() {
      if (today().prep === false) { // 1일차: 도착하자마자 영업 — 재료판은 동봉만 (T45)
        Tray.set([]);
        go('OPEN_BELL');
        return;
      }
      Prep.open(() => { Tray.set(Prep.chosen()); go('OPEN_BELL'); }, today().shop ? () => go('SHOP') : null); // 뒤로 = 장보기 (사용자 2026-10-12)
    },
    OPEN_BELL() {
      // 개점 의식 (T51): 가스불 → 종 걸기 → 종 울리기 → "시작!" → 첫 손님
      Scene.setOpen(0); // 밝은 오후
      Ritual.open(() => {
        const cover = blocker();
        const t = bigText('영업 개시', 72); // 사용자 2026-10-12 (시작! → 영업 개시)
        setTimeout(() => {
          t.remove();
          cover.remove();
          queue = today().guests.filter((q) => {
            if (CFG.customers.cast[q.id]) return true;
            Config.warn(`day.days[${dayIdx}]의 손님 "${q.id}"가 customers.cast에 없어 건너뜁니다`);
            return false;
          }).map((q) => ({ ...q }));
          nextGuest();
        }, CFG.timing.ritual.startMs); // 종을 울린 뒤 "시작!" 글자
      });
    },
    ORDER() {
      if (Stage.finished()) Pour.newRound(); // 앞 손님 판을 비운다
      Customer.arrive(guest);
      go('COOK');
    },
    COOK() {
      // 굽기 모듈(Stage ①~⑥)이 입력을 받는다. 건네면 Customer.serve → served()
      Hint.show('pour'); // 1일차 첫 판만 (T33)
    },
    REACTION() {
      // 판 성적표 (T30): 건네면 바로, 클릭하면 닫히고 잠깐 뒤 다음으로
      const recs = Customer.getRecords();
      // 성적표 → 숨은 요리를 새로 발견했으면 이름 카드 (T39) → 다음
      const rec = recs[recs.length - 1];
      // 숨은 요리 발견 카드 → 처음 만든 메뉴 레시피 카드 (T45) → 일차 장면 → 다음
      Receipt.show(rec, () => {
        const found = Discover.check(rec);
        const recipes = (rec.fresh || []).filter((id) => !CFG.menus[id].hidden);
        Discover.card([...found, ...recipes], () => scene(rec, () => setTimeout(reacted, CFG.customers.receiptGapMs)));
      });
    },
    CLOSE() {
      // 마감 의식 (T51): 가스불 끄기 → 종 내리기 → 밤이 내려앉은 뒤 영업 일지
      Ritual.close(() => {
        Scene.setTime('night');
        setTimeout(() => go('DAY_END_TALK'), CFG.timing.ritual.nightMs);
      });
    },
    DAY_END_TALK() {
      // 정산 카드 → 밤 대화 (T38). 밤 대화는 다음 날 손님 힌트 (SPEC 11절 힌트 곡선)
      Settle.show(dayIdx + 1, () => Dialogue.play(CFG.dialogue[`night${dayIdx + 1}`] || [], () => go('GIFT_CHOICE')));
    },
    GIFT_CHOICE() {
      // 받은 선물마다 팔기 / 남기기 (T37). 없으면 바로 넘어간다
      Gift.choose(() => {
        if (dayIdx + 1 < days().length) beginDay(dayIdx + 1);
        else go('DEMO_END');
      });
    },
    DEMO_END() {
      Result.show({ records: Customer.getRecords(), total: Customer.total });
    },
  };

  // 편지에 동봉된 것 (T24): 송금은 돈으로, 준비물은 오늘 가진 재료로 (T25)
  const ENCLOSED_MS = 1500;
  function enclosed() {
    const e = today().enclosed || { money: 0, items: [] };
    const L = CFG.letters.enclosed;
    const kept = Gift.carry(); // 어젯밤 남긴 재료 선물 (T37)
    Pantry.newDay([...(e.items || []), ...kept]); // 오늘 가진 재료 = 기본 재료 + 동봉 (T25) + 남긴 선물
    const parts = [];
    if (e.money) parts.push(`${e.money.toLocaleString('ko-KR')}원`);
    const names = (e.items || []).filter((id) => CFG.ingredients[id]).map((id) => CFG.ingredients[id].name);
    if (names.length) parts.push(`${names.join(' · ')} ${L.items}`);
    const keptNames = kept.filter((id) => !(e.items || []).includes(id)).map((id) => CFG.ingredients[id].name);
    if (keptNames.length) parts.push(`${keptNames.join(' · ')} ${L.kept || '(어제 선물)'}`);
    const toShop = () => go('MEMO'); // 메모판에서 예약을 읽고 → 장보기 (T46 → T52)
    if (!parts.length) { toShop(); return; }
    const g = Board.el('g', { cursor: 'pointer' }, Board.layer('top'));
    Board.el('rect', { x: 0, y: 0, width: 1280, height: 720, fill: 'transparent', 'pointer-events': 'all' }, g);
    Board.el('rect', { x: 400, y: 300, width: 480, height: 120, rx: 18, fill: '#fffdf6', stroke: '#c9b89c', 'stroke-width': 4 }, g);
    const t1 = Board.el('text', { x: 640, y: 340, 'text-anchor': 'middle', 'font-size': 20, fill: '#8a7460' }, g);
    t1.textContent = `✉ ${L.title}`;
    const t2 = Board.el('text', { x: 640, y: 388, 'text-anchor': 'middle', 'font-size': 28, 'font-weight': 900, fill: '#3a2a1e' }, g);
    t2.textContent = parts.join('  +  ');
    if (e.money) { Wallet.add(e.money, '송금'); Sfx.coin(); }
    Log.add({ step: '동봉', day: dayIdx + 1, money: e.money || 0, items: e.items || [], line: `동봉 | ${parts.join(' + ')}` });
    let gone = false;
    const close = () => { if (gone) return; gone = true; g.remove(); toShop(); };
    g.addEventListener('pointerdown', (ev) => { ev.stopPropagation(); close(); }, { once: true });
    setTimeout(close, ENCLOSED_MS);
  }

  // 일차 장면 (T45): day.days[i].scenes = [{ after: n, dialogue, flopDialogue, give: [재료] }]
  //   그날 n번째 판을 건넨 뒤 대화창 장면 → 재료를 건네받아 재료판에 들어온다 (1일차 참새의 "잣을 넣어 줘")
  function scene(rec, then) {
    const n = Customer.getRecords().filter((r) => r.day === dayIdx + 1).length;
    const sc = (today().scenes || []).find((s) => s.after === n);
    if (!sc) { then(); return; }
    const flop = rec.reaction === 'flop';
    const lines = [...((flop && CFG.dialogue[sc.flopDialogue]) || []), ...(CFG.dialogue[sc.dialogue] || [])];
    Log.add({ step: '장면', day: dayIdx + 1, after: n, flop, line: `장면 | ${dayIdx + 1}일차 ${n}판 뒤 ${sc.dialogue}${flop ? ' (망친 판)' : ''}` });
    Dialogue.play(lines, () => {
      for (const id of sc.give || []) {
        if (!CFG.ingredients[id]) { Config.warn(`장면의 재료 "${id}"가 ingredients에 없습니다`); continue; }
        Pantry.add(id);
        Tray.add(id);
        Log.add({ step: '재료', id, line: `재료 | ${CFG.ingredients[id].name} 받음 (장면)` });
      }
      then();
    });
  }

  // 그날 몇 번째 판을 굽는 중인가 (재료 강제·조건 대사용)
  function round() {
    return Customer.getRecords().filter((r) => r.day === dayIdx + 1).length + 1;
  }

  function beginDay(i) {
    dayIdx = i;
    Ritual.reset(); // 가스 꺼짐, 종은 작업대 (T51)
    Reserve.setDay(i); // 메모판에 그날 예약 쪽지 (T52)
    const cover = blocker();
    const t = bigText(`${i + 1}일차`, 96);
    setTimeout(() => { t.remove(); cover.remove(); go('LETTER'); }, CARD_MS);
  }

  function nextGuest() {
    const q = queue.shift();
    if (!q) { go('CLOSE'); return; }
    guest = { id: q.id, ...CFG.customers.cast[q.id] };
    ordersLeft = q.orders;
    go('ORDER');
  }

  // 손님이 후네를 받았다 (Customer.serve가 부른다)
  function served() {
    Hint.hide();
    Scene.setOpen(progress()); // 판을 건넬 때마다 하늘이 한 칸 저문다 (T51)
    go('REACTION');
  }

  // 반응을 보여준 뒤: 주문이 남았으면 같은 손님이 남아 한 판 더, 아니면 떠나고 다음 손님
  function reacted() {
    ordersLeft--;
    if (ordersLeft > 0) {
      Customer.stay(guest.again);
      Pour.newRound();
      go('COOK');
    } else {
      // 만족한 손님은 떠나며 선물을 두고 간다 (T37) — 떠오르는 글자를 볼 틈을 두고 걷는다
      const got = Gift.receive(guest);
      setTimeout(() => Customer.leave(nextGuest), got ? CFG.customers.giftMs : 0);
    }
  }

  // ── 화면 조각 ───────────────────────────────────────────

  // 뒤의 불판 입력을 막는 투명 판
  function blocker() {
    return Board.el('rect', { x: 0, y: 0, width: 1280, height: 720, fill: 'transparent', 'pointer-events': 'all' }, Board.layer('top'));
  }

  function bigText(str, size) {
    const t = Board.el('text', {
      x: 560, y: 380, 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'font-size': size, 'font-weight': 900,
      fill: '#ffd34d', stroke: '#1b1512', 'stroke-width': 8, 'paint-order': 'stroke', 'pointer-events': 'none',
    }, Board.layer('top'));
    t.textContent = str;
    return t;
  }

  // 빈 패널: 제목 + 본문 + 메모 + "클릭해서 계속". 어디를 눌러도 넘어간다
  function panel(title, body, note, then) {
    const g = Board.el('g', { cursor: 'pointer' }, Board.layer('top'));
    Board.el('rect', { x: 0, y: 0, width: 1280, height: 720, fill: 'rgba(15,10,8,0.55)', 'pointer-events': 'all' }, g);
    Board.el('rect', { x: PANEL.x, y: PANEL.y, width: PANEL.w, height: PANEL.h, rx: 22, fill: '#fbf3e3', stroke: '#c9b89c', 'stroke-width': 4 }, g);
    const cx = PANEL.x + PANEL.w / 2;
    const text = (y, str, attrs) => { const t = Board.el('text', { x: cx, y, 'text-anchor': 'middle', fill: '#3a2a1e', ...attrs }, g); t.textContent = str; };
    text(PANEL.y + 70, `[${title}]`, { 'font-size': 36, 'font-weight': 900 });
    text(PANEL.y + 140, body || '(비어 있음)', { 'font-size': 24 });
    text(PANEL.y + 190, note, { 'font-size': 16, fill: '#8a7460' });
    text(PANEL.y + 260, '클릭해서 계속 ▶', { 'font-size': 18, fill: '#c0661c', 'font-weight': 700 });
    g.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      Sfx.unlock();
      g.remove();
      then();
    }, { once: true });
  }

  return { start, served, day: () => dayIdx + 1, state: () => state, today: () => today(), round };
})();
