// 하루 흐름 상태 머신 (T21, SPEC 2절). 모든 화면 전환은 이 상태 사이에서만 일어난다.
// LETTER → SHOP → PREP → OPEN_BELL → ORDER → COOK → REACTION → (다음 주문 | DAY_END_TALK) → GIFT_CHOICE → 다음 날 | DEMO_END
// 아직 내용이 없는 상태는 "무엇을 할 자리인지" 보여주는 빈 패널(클릭하면 넘어감)이다. 일차 구성은 data.js day.days.
const Flow = (() => {
  const NAME = {
    LETTER: '편지', SHOP: '장보기', PREP: '준비', OPEN_BELL: '종', ORDER: '주문', COOK: '굽기',
    REACTION: '반응', DAY_END_TALK: '밤 대화', GIFT_CHOICE: '선물', DEMO_END: '데모 끝',
  };
  const CARD_MS = 1000;   // 일차 카드
  const BELL_MS = 1000;   // 종
  const PANEL = { x: 290, y: 200, w: 700, h: 300 };

  let state = null;
  let dayIdx = 0;
  let queue = [];         // 그날 남은 손님 [{ id, orders }]
  let guest = null;       // 지금 손님 (data.js customers.cast 항목 + id)
  let ordersLeft = 0;
  let hud = null;

  function start() {
    hud = Board.el('text', { x: 28, y: 72, 'font-size': 16, fill: '#9a8878' }, Board.layer('side'));
    beginDay(0);
  }

  function days() {
    return CFG.day.days;
  }
  function today() {
    return days()[dayIdx];
  }

  function go(next) {
    state = next;
    hud.textContent = `${dayIdx + 1}일차 · ${NAME[state]}`;
    Log.add({ step: '흐름', day: dayIdx + 1, state, line: `── ${dayIdx + 1}일차 · ${state}` });
    ENTER[state]();
  }

  const ENTER = {
    LETTER() {
      const letter = (CFG.letters.days || [])[dayIdx] || '';
      panel('편지', letter, '편지 문구는 data.js letters.days에 직접 씁니다 (T23·T24에서 대화창으로)', () => go('SHOP'));
    },
    SHOP() {
      if (!today().shop) {
        Log.add({ step: '흐름', line: `   ${dayIdx + 1}일차 SHOP 건너뜀 (재료 지급)` });
        go('PREP');
        return;
      }
      panel('장보기', '재료를 산다', '6단계: 인벤토리 UI에서 구매', () => go('PREP'));
    },
    PREP() {
      panel('준비', '오늘 쓸 재료를 고른다', '6단계: 고른 재료가 재료판(문어 1 + 추가 3) 칸에 나타남', () => go('OPEN_BELL'));
    },
    OPEN_BELL() {
      const cover = blocker();
      const t = bigText('띵띵 ♪', 72);
      Sfx.finish(); // 종소리 자리 (9단계에서 "띵띵")
      setTimeout(() => {
        t.remove();
        cover.remove();
        queue = today().guests.filter((q) => {
          if (CFG.customers.cast[q.id]) return true;
          Config.warn(`day.days[${dayIdx}]의 손님 "${q.id}"가 customers.cast에 없어 건너뜁니다`);
          return false;
        }).map((q) => ({ ...q }));
        nextGuest();
      }, BELL_MS);
    },
    ORDER() {
      if (Stage.finished()) Pour.newRound(); // 앞 손님 판을 비운다
      Customer.arrive(guest);
      go('COOK');
    },
    COOK() {
      // 굽기 모듈(Stage ①~⑥)이 입력을 받는다. 건네면 Customer.serve → served()
    },
    REACTION() {
      setTimeout(reacted, CFG.customers.leaveMs);
    },
    DAY_END_TALK() {
      panel('밤 대화', '손님이 내일 힌트를 흘린다', '7단계: 대화창 + 힌트 곡선', () => go('GIFT_CHOICE'));
    },
    GIFT_CHOICE() {
      panel('선물', '받은 선물을 팔지 / 남길지', '7단계: 잣 꾸러미 · 반짝이 단추', () => {
        if (dayIdx + 1 < days().length) beginDay(dayIdx + 1);
        else go('DEMO_END');
      });
    },
    DEMO_END() {
      Result.show({ records: Customer.getRecords(), total: Customer.total });
    },
  };

  function beginDay(i) {
    dayIdx = i;
    const cover = blocker();
    const t = bigText(`${i + 1}일차`, 96);
    setTimeout(() => { t.remove(); cover.remove(); go('LETTER'); }, CARD_MS);
  }

  function nextGuest() {
    const q = queue.shift();
    if (!q) { go('DAY_END_TALK'); return; }
    guest = { id: q.id, ...CFG.customers.cast[q.id] };
    ordersLeft = q.orders;
    go('ORDER');
  }

  // 손님이 후네를 받았다 (Customer.serve가 부른다)
  function served() {
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
      Customer.leave(nextGuest);
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

  return { start, served, day: () => dayIdx + 1, state: () => state };
})();
