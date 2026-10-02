// 합성음. 음원 파일 없이 Web Audio로 만든다.
// 브라우저 자동재생 정책 때문에 첫 클릭에서 AudioContext를 연다.
// 음색 상수(음높이, 엔벨로프)는 사운드 디자인 값이라 여기 둔다. 판정 수치는 data.js.
const Sfx = (() => {
  let ctx = null;
  let master = null;

  function unlock() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.8;
      master.connect(ctx.destination);
      console.log('[소리] AudioContext 시작');
    }
    if (ctx.state === 'suspended') ctx.resume();
  }

  // ── 악기 ────────────────────────────────────────────────

  // 사인파 하나에 엔벨로프. 모든 악기의 재료
  function tone(c, dest, t, { freq, toFreq, type = 'sine', gain, attack = 0.004, decay, glideS }) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (toFreq) o.frequency.exponentialRampToValueAtTime(toFreq, t + (glideS || decay));
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + attack + decay + 0.02);
    return o;
  }

  // 마림바: 기음 + 4배음이 빨리 사라짐
  function marimba(c, dest, t, freq, accent) {
    const v = accent ? 1 : 0.6;
    return [
      tone(c, dest, t, { freq, gain: 0.35 * v, decay: accent ? 0.7 : 0.35 }),
      tone(c, dest, t, { freq: freq * 4, gain: 0.08 * v, decay: 0.06 }),
    ];
  }

  // 우드블록 "툭" / 벨 "탁!"
  function woodblock(c, dest, t) {
    return [
      tone(c, dest, t, { freq: 1050, toFreq: 820, type: 'triangle', gain: 0.3, decay: 0.05 }),
      tone(c, dest, t, { freq: 2600, gain: 0.05, decay: 0.015 }),
    ];
  }
  function bell(c, dest, t, freq) {
    return [
      tone(c, dest, t, { freq, gain: 0.3, decay: 0.9 }),
      tone(c, dest, t, { freq: freq * 2.76, gain: 0.1, decay: 0.35 }),
      tone(c, dest, t, { freq: freq * 5.4, gain: 0.04, decay: 0.12 }),
    ];
  }

  // 물방울 "퐁" — 음이 위로 휘어 오른다
  function bubble(c, dest, t, freq, accent) {
    const v = accent ? 1 : 0.7;
    const nodes = [tone(c, dest, t, { freq, toFreq: freq * 2, gain: 0.32 * v, decay: accent ? 0.16 : 0.09, glideS: 0.05 })];
    if (accent) nodes.push(tone(c, dest, t + 0.03, { freq: freq * 3, gain: 0.08, decay: 0.25 }));
    return nodes;
  }

  // 박자 소리 세트. beat(c, dest, t, index, isLast) → 예약한 노드 목록
  // C장조 도-미-솔처럼 올라가서 마지막 "탁!"이 해결음처럼 들리게 한다
  const NOTE = { C5: 523.25, E5: 659.25, G5: 783.99, C6: 1046.5 };
  const SETS = {
    1: (c, d, t, i, last) => marimba(c, d, t, [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6][Math.min(i, 3)], last), // 마림바 도-미-솔
    2: (c, d, t, i, last) => (last ? bell(c, d, t, NOTE.C6) : woodblock(c, d, t)),                       // 우드블록 툭툭 + 벨
    3: (c, d, t, i, last) => bubble(c, d, t, [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6][Math.min(i, 3)] / 2, last), // 물방울 퐁퐁퐁
  };

  // 누르는 동안 깔리는 부드러운 "쭈우…" — 걸러낸 잡음, 대역이 천천히 올라간다
  let noiseBuf = null;
  function noise(c) {
    if (noiseBuf && noiseBuf.sampleRate === c.sampleRate) return noiseBuf;
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return noiseBuf;
  }

  // "꾸르륵" — 귀여운 거품이 내려가며 터진다
  function gurgle(c, dest, t) {
    const freqs = [520, 440, 360, 300, 240];
    freqs.forEach((f, i) => {
      tone(c, dest, t + i * 0.07, { freq: f, toFreq: f * 0.6, gain: 0.25, decay: 0.07 });
    });
  }

  // ── 짜기 ────────────────────────────────────────────────

  // t0 = 누른 시각(컨텍스트 시간). 박자: 누르는 순간 "툭", 이후 같은 간격, 목표 시점에 "탁!"
  // opts: { soundSet, targetMs, autoStopMs, holdBeats }
  function schedulePour(c, dest, t0, opts) {
    const T = opts.targetMs / 1000;
    const over = opts.autoStopMs / 1000;
    const beats = opts.holdBeats;
    const play = SETS[opts.soundSet] || SETS[1];

    // 박자 예약
    const scheduled = []; // { t, nodes }
    for (let i = 0; i <= beats; i++) {
      const t = t0 + (T * i) / beats;
      scheduled.push({ t, nodes: play(c, dest, t, i, i === beats) });
    }

    // 깔리는 소리
    const src = c.createBufferSource();
    src.buffer = noise(c);
    src.loop = true;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 6;
    bp.frequency.setValueAtTime(350, t0);
    bp.frequency.linearRampToValueAtTime(900, t0 + T);
    bp.frequency.linearRampToValueAtTime(1000, t0 + T + over);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.12, t0 + 0.05);
    // 목표를 넘기면 대역이 떨린다
    const lfo = c.createOscillator();
    const lfoGain = c.createGain();
    lfo.frequency.value = 14;
    lfoGain.gain.setValueAtTime(0, t0);
    lfoGain.gain.setValueAtTime(0, t0 + T);
    lfoGain.gain.linearRampToValueAtTime(250, t0 + T + 0.05);
    lfo.connect(lfoGain).connect(bp.frequency);
    src.connect(bp).connect(g).connect(dest);
    src.start(t0);
    lfo.start(t0);
    const safety = t0 + T + over + 0.5;
    src.stop(safety);
    lfo.stop(safety);

    function stopAt(t) {
      if (g.gain.cancelAndHoldAtTime) g.gain.cancelAndHoldAtTime(t);
      else { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); }
      g.gain.linearRampToValueAtTime(0, t + 0.04);
      src.stop(t + 0.05);
      lfo.stop(t + 0.05);
      // 아직 안 울린 박자는 취소한다 (일찍 떼면 "탁!"이 안 난다)
      for (const s of scheduled) if (s.t > t) s.nodes.forEach((n) => n.stop(t));
    }

    return {
      release(t = c.currentTime) { stopAt(t); },
      gurgle(t = c.currentTime) { stopAt(t); gurgle(c, dest, t); },
    };
  }

  // "짝" — 6구멍을 다 짠 뒤 마림바 도-미-솔-도 빠른 아르페지오
  function finish() {
    if (!ctx) return;
    const t = ctx.currentTime + 0.12;
    [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6].forEach((f, i) => marimba(ctx, master, t + i * 0.045, f, i === 3));
  }

  // "퐁" — 문어가 반죽에 들어갈 때. 다리가 삐지면 살짝 낮게
  function plop(low) {
    if (!ctx) return;
    bubble(ctx, master, ctx.currentTime, low ? 330 : 440, false);
  }

  function pourStart(opts) {
    if (!ctx) return { release() {}, gurgle() {} };
    return schedulePour(ctx, master, ctx.currentTime, opts);
  }

  return {
    unlock,
    pourStart,
    finish,
    plop,
    schedulePour, // 검증용 오프라인 렌더링에서도 쓴다
    get ctx() { return ctx; },
  };
})();
