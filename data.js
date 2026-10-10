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
    },

    // 굽기 (구멍별. 1차는 반죽 넣은 시점부터, 2차는 1차 뒤집기 시점부터)
    cook: {
      cue1Ms: 8000,     // 반죽 → 1차 큐 "톡", ms. 시작값 (실제 약 3분을 압축)
      cue2Ms: 4000,     // 1차 뒤집기 → 2차 큐 "톡톡", ms. 시작값. 1차 : 2차 = 2 : 1 비율은 확정
      perfectMs: 150,   // 뒤집기 퍼펙트 창 ±ms (제스처 완료 시각 기준). 확정
      goodMs: 300,      // 뒤집기 굿 창 ±ms. 이르면 덜 익음, 늦으면 탐. 확정
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
    // 굽기 색과 1차 굽기 힌트. 반죽(raw) → 테두리 굳음(set) → (큐) 황금 → 갈색 → 검정. 제안
    //   coreMin 큐 시점에 남는 가운데 반죽 반지름 비율(시작 0.95) / bubbles 큐 순간 올라오는 기포 수 (굿 창 동안 보임)
    cook: { raw: '#f1dfb4', set: '#e9cf8e', golden: '#e0a457', brown: '#8a4a1f', burnt: '#2a211b', coreMin: 0.35, bubbles: 8 },
    // 짜기 결과 반응 (놓는 순간 반죽이 눌렸다 펴진다). 제안
    //   squash 눌림 세로 비율 / stretch 펴짐 세로 비율 / ms 길이 / bounces 횟수 / shine 윤기 점 남김
    react: {
      perfect: { squash: 0.82, stretch: 1.08, ms: 320, bounces: 2, shine: true },  // 통통 두 번 + 윤기
      good:    { squash: 0.92, stretch: 1.03, ms: 200, bounces: 1, shine: false }, // 출렁 한 번
    },
  },
  customers: {},
  day: {},
  letters: {},
};
