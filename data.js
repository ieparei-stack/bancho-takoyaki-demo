// 모든 플레이 수치와 텍스트는 이 파일에 둔다. (CLAUDE.md 3-1)
// 값이 빠지거나 타입이 틀리면 화면에 경고가 뜨고 기본값으로 진행한다.
// 상태 표기는 SPEC.md 기준: 확정 / 제안 / 시작값(플레이 후 확정)
window.DATA = {
  timing: {
    // 반죽 짜기 (구멍별 클릭 홀드 → 릴리즈)
    pour: {
      targetMs: 1000,   // 목표 홀드 시간 = "욱!" 시점, ms. 시작값 (120 BPM 2박)
      perfectMs: 50,    // 퍼펙트 판정 창 ±ms. 확정
      goodMs: 120,      // 굿 판정 창 ±ms. 그 밖은 부족/넘침. 확정
      autoStopMs: 120,  // 목표 + 이 시간이 지나도 누르고 있으면 자동 종료 → 넘침, ms. 확정

      // 박자: 누르는 순간 "툭", 같은 간격으로 이어져 목표 시점에 "탁!" → 그때 뗀다
      holdBeats: 2,     // 누르기~"탁!" 사이 박 수. 2 = 툭 툭 탁! (박 간격 = targetMs / holdBeats). 제안

      // 박자 소리 세트. 1로 임시 확정 (2026-10-02 사용자, 나중에 수정 가능)
      //   1 = 마림바 도-미-솔   2 = 우드블록 툭툭 + 벨   3 = 물방울 퐁퐁퐁
      soundSet: 1,
    },

    // 문어 넣기 (반죽이 든 구멍이면 언제든)
    octopus: {
      legRatio: 0.6,    // 구멍 중심에서 반지름의 이 비율보다 멀면 다리가 삐져나온다. 확정
      perfectRatio: 0.3, // 이 비율 안이면 단계 등급에서 퍼펙트(2점), legRatio 안이면 굿(1점). 모양은 그대로. 제안
    },

    // ⑤ 후네 담기: 구멍을 누른 채 후네 쪽으로 튕긴다. 실패 없음 (2026-10-10 사용자)
    box: {
      flickPx: 30,      // 이만큼 움직이면 튕김으로 본다, px. 제안
      flickMs: 300,     // 누른 뒤 이 시간 안에 flickPx를 넘어야 튕김. 느리면 흔들리기만. 제안
      coneDeg: 60,      // 후네 방향 ± 이 각도 안이어야 날아간다. 제안
      flyMs: 350,       // 날아가는 시간, ms. 제안
    },

    // ⑥ 토핑·건네기: 소스·가쓰오부시를 원하는 만큼, 후네를 화면 위로 끌어 건넨다. 등급 없음 (2026-10-10 사용자)
    topping: {
      boatScale: 1.6,   // 작업대에서 후네 확대 배율. 제안
      sauceWidth: 7,    // 소스 줄 굵기(후네 안 좌표). 제안
      flakeEveryPx: 18, // 가쓰오부시 통을 이만큼 움직일 때마다 한 조각. 제안
      flakeMax: 400,    // 가쓰오부시 조각 상한. 제안
      handoffY: 170,    // 후네를 이 높이(화면 y)보다 위로 끌고 놓으면 건넴. 제안
    },

    // 단계 진행 (한 판 = 미니게임을 순서대로, 2026-10-10 사용자 결정)
    // 단계 끝에 6번의 점수(퍼펙트 2 / 굿 1 / 그 외 0, 0~12점)를 합쳐 등급 글자를 띄운다. 글자는 letters.grade
    stage: {
      bannerMs: 1200,   // 등급 글자가 떠 있는 시간, ms. 그동안 입력은 막히고 끝나면 다음 단계. 제안
      perfect: 11,      // 이 점수 이상 PERFECT!. 제안
      great: 8,         // 이 점수 이상 GREAT!. 제안
      good: 4,          // 이 점수 이상 GOOD, 그 아래는 OOPS…. 제안
    },

    // 굽기 (③·④ 뒤집기 단계가 시작되면 6구멍이 함께 굽고, n번 구멍 큐 = 시작 + lead + (n−1) × interval)
    cook: {
      lead1Ms: 2500,    // ③ 1차 단계 시작 → 1번 구멍 큐 "톡", ms. 제안
      lead2Ms: 1500,    // ④ 2차 단계 시작 → 1번 구멍 큐 "톡톡", ms. 제안
      intervalMs: 1500, // 구멍 사이 큐 간격, ms. 시작값 ("여유 있게", 2026-10-10 사용자)
      perfectSpanMs: 1500, // 큐(기포가 올라오는 순간)부터 이 시간 동안 떼면 퍼펙트. 기포도 이만큼 보인다. 확정 (2026-10-10 사용자, ±150에서 변경)
      goodMarginMs: 300,   // 퍼펙트 구간 앞뒤 굿 여유, ms. 더 이르면 이름(덜 익음), 더 늦으면 늦음(탐). 제안
      burnMs: 3000,     // 굿 창을 지난 뒤 완전히 검게 되기까지, ms. 제안
    },

    // 뒤집기 제스처 (구멍 누른 채 마우스 회전)
    flip: {
      ignoreDeg: 30,    // 이보다 덜 돌리고 떼면 없던 일. 확정
      flip1MinDeg: 90,  // 1차 성공 회전량 하한. 미달이면 어설프게 뒤집힘(실패). 확정 (2026-10-10, 180°에서 변경)
      flip1MaxDeg: 360, // 1차 성공 회전량 상한. 넘기면 과회전(실패). 확정
      flip2MinDeg: 180, // 2차 성공 회전량 하한. 미달이면 어설프게(실패). 확정 (2026-10-10, 330°에서 변경 — 1차와 같은 비율)
      flip2MaxDeg: 720, // 2차 성공 회전량 상한(두 바퀴). 넘기면 과회전(실패). 확정
      flip2SpeedDps: 720, // 2차 각속도 하한 °/s (첫 이동~마지막 이동 평균). 미달이면 실패가 아니라 한 단계 강등: 퍼펙트→굿, 굿→느림(미스). 확정
    },
  },
  // 타코야키 표정 (SPEC 7절). 전부 제안값
  //   color 반죽 색 / squashY 세로 비율(1 = 동그라미) / sagY 아래로 처지는 px
  //   eyeRx·eyeRy 눈동자 크기(eyeRy가 작을수록 가는 눈) / eyeGap 두 눈 간격 / eyeY 눈 높이(중심 기준)
  //   lookX 곁눈질할 때 눈동자가 움직이는 px / bridgeW 넘친 반죽 다리 두께
  faces: {
    batter: { color: '#f1dfb4', squashY: 1,    sagY: 0, eyeRx: 5, eyeRy: 7, eyeGap: 24, eyeY: -6, lookX: 0 }, // 반죽: 눈만, 무표정
    under:  { color: '#e8d29e', squashY: 0.72, sagY: 7, eyeRx: 5, eyeRy: 2, eyeGap: 22, eyeY: -2, lookX: 0 }, // 부족: 찌그러지고 처짐, 힘없는 눈
    over:   { color: '#f1dfb4', squashY: 1,    sagY: 0, eyeRx: 5, eyeRy: 7, eyeGap: 24, eyeY: -6, lookX: 4, bridgeW: 46 }, // 넘침: 옆 구멍과 붙어 곁눈질
    // 1차 뒤집기 뒤 중간 표정. mouth 'o' 동그란 입 / 'wave' 물결 입, sweat 땀방울 수. 제안
    expect:   { color: '#e8c98f', squashY: 0.85, sagY: 0, eyeRx: 5.5, eyeRy: 9, eyeGap: 24, eyeY: -6, lookX: 0, mouth: 'o',    sweat: 0 }, // 기대: 성공
    anxious1: { color: '#e8c98f', squashY: 0.85, sagY: 0, eyeRx: 5,   eyeRy: 7, eyeGap: 24, eyeY: -6, lookX: 0, mouth: 'wave', sweat: 1 }, // 불안(식은땀): 이름·미달
    anxious2: { color: '#e8c98f', squashY: 0.85, sagY: 0, eyeRx: 5,   eyeRy: 7, eyeGap: 24, eyeY: -6, lookX: 0, mouth: 'wave', sweat: 2 }, // 불안(진땀): 늦음
    // 최종 표정 (2차 뒤집기 뒤, 1차·2차 합산. 점수 퍼펙트 2 / 굿 1 / 그 외 0). 전부 제안값
    //   eyeRy2 오른눈 세로(짝짝이) / eyes 'x' X 눈 / spots 얼룩 수 / smoke 연기 줄 수
    //   forceColor 굽기 색 대신 표정 색을 강제 / wobble 흐물흐물 움직임
    perfect: { color: '#e0a457', squashY: 1, sagY: 0, eyeRx: 5.5, eyeRy: 9, eyeGap: 24, eyeY: -6, lookX: 0, mouth: 'grin',  sweat: 0 },                                    // 합 4 완벽: 활짝 웃음 + 통통
    tasty:   { color: '#e0a457', squashY: 1, sagY: 0, eyeRx: 5,   eyeRy: 7, eyeGap: 24, eyeY: -6, lookX: 0, mouth: 'smile', sweat: 0 },                                    // 합 3 맛있음: 노릇 + 작은 미소
    meh:     { color: '#d9a35e', squashY: 1, sagY: 0, eyeRx: 5,   eyeRy: 7, eyeRy2: 3, eyeGap: 24, eyeY: -6, lookX: 0, mouth: 'wave', sweat: 0, spots: 3 },                // 합 2 어설픔: 얼룩 + 물결 입 + 짝짝이 눈
    raw:     { color: '#efe3c4', squashY: 1, sagY: 2, eyeRx: 5,   eyeRy: 6, eyeGap: 24, eyeY: -6, lookX: 0, mouth: 'wave', sweat: 0, forceColor: true, wobble: true },     // 합 0~1 덜 익음: 창백 + 흐물
    burnt:   { color: '#2a211b', squashY: 1, sagY: 0, eyeRx: 6,   eyeRy: 6, eyeGap: 24, eyeY: -6, lookX: 0, eyes: 'x', sweat: 0, forceColor: true, smoke: 2 },             // 합 0~1 + 늦은 미스 탐: 검정 + X 눈 + 연기
    blank:   { color: '#e0a457', squashY: 1, sagY: 0, eyeRx: 3,   eyeRy: 3, eyeGap: 26, eyeY: -4, lookX: 0, mouth: 'flat', sweat: 0 },                                     // 문어 없음: 멍함 (굽기 결과 무관)
    // 굽기 색과 1차 굽기 힌트. 반죽(raw) → 테두리 굳음(set) → (큐) 황금 → 갈색 → 검정. 제안
    //   coreMin 큐 시점에 남는 가운데 반죽 반지름 비율(시작 0.95) / bubbles 큐 순간 올라오는 기포 수 (굿 창 동안 보임)
    //   2차 신호(T13): steam 큐부터 퍼펙트 구간 동안 오르는 김 줄 수(최대 3) / steamColor / anticipate 큐 직전 눈 배율(두근두근 예고)
    cook: { raw: '#f1dfb4', set: '#e9cf8e', golden: '#e0a457', brown: '#8a4a1f', burnt: '#2a211b', coreMin: 0.35, bubbles: 8, steam: 3, steamColor: '#ffffff', anticipate: 1.35 },
    // 짜기 결과 반응 (놓는 순간 반죽이 눌렸다 펴진다). 제안
    //   squash 눌림 세로 비율 / stretch 펴짐 세로 비율 / ms 길이 / bounces 횟수 / shine 윤기 점 남김
    react: {
      perfect: { squash: 0.82, stretch: 1.08, ms: 320, bounces: 2, shine: true },  // 통통 두 번 + 윤기
      good:    { squash: 0.92, stretch: 1.03, ms: 200, bounces: 1, shine: false }, // 출렁 한 번
      final:   { squash: 0.85, stretch: 1.1,  ms: 200, bounces: 2, shine: false }, // 최종 완벽: 통통 200 ms
    },
  },
  // 손님 (4단계). 1일차 2명, 한 명씩 차례로, 이탈·대기 게이지 없음 (2026-10-10 사용자)
  //   list: 차례대로 오는 손님. emoji 얼굴 / order 주문 말풍선. 문구는 Claude 초안 (플레이 후 수정)
  customers: {
    day1: 2,
    list: [
      { emoji: '🧑', order: '타코야키 하나요!' },
      { emoji: '👵', order: '하나 줘요~' },
    ],
  },
  day: {},
  letters: {
    // 단계 끝 등급 글자 (4단계, 사용자 결정 2026-10-10)
    grade: { perfect: 'PERFECT!', great: 'GREAT!', good: 'GOOD', oops: 'OOPS…' },
  },
};
