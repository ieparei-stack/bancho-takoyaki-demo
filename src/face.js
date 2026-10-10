// 타코야키 표정. 상태별 모양·색·눈·입·땀 파라미터는 data.js faces에 있다.
// 표정은 애니메이션 없이 즉시 바꾸고, 그 뒤에 움직임(react, flipAnim)을 얹는다. (SPEC 7절)
const Face = (() => {
  // size = 반죽 크기(반지름 px), look = 곁눈질 방향 -1 / 0 / 1
  function apply(hole, state, size, look = 0) {
    const f = CFG.faces[state];
    hole.state = state;
    hole.size = size;
    hole.look = look;

    const cy = hole.cy + f.sagY;
    hole.batter.setAttribute('cx', hole.cx);
    hole.batter.setAttribute('cy', cy);
    hole.batter.setAttribute('rx', size.toFixed(1));
    hole.baseRy = size * f.squashY; // 반응 애니메이션이 돌아올 기준
    hole.batter.setAttribute('ry', hole.baseRy.toFixed(1));
    // 굽는 중이면 굽기 색이 우선한다
    const color = hole.cookColor || f.color;
    hole.batter.setAttribute('fill', color);
    hole.batter.setAttribute('stroke', shade(color));

    const lookX = look * (f.lookX || CFG.faces.over.lookX);
    const eyeY = cy + f.eyeY;
    hole.eyes.forEach((eye, i) => {
      const ex = hole.cx + (i === 0 ? -1 : 1) * f.eyeGap / 2;
      set(eye.white, { cx: ex, cy: eyeY, rx: f.eyeRx * 1.7, ry: f.eyeRy * 1.4 });
      set(eye.pupil, { cx: ex + lookX, cy: eyeY, rx: f.eyeRx, ry: f.eyeRy });
    });

    // 입: 'o' 작은 동그라미 / 'wave' 물결 / 없음
    const my = eyeY + size * 0.3;
    if (f.mouth === 'o') {
      set(hole.mouth, { d: `M ${hole.cx - 4} ${my} a 4 4 0 1 0 8 0 a 4 4 0 1 0 -8 0`, visibility: 'visible' });
    } else if (f.mouth === 'wave') {
      set(hole.mouth, { d: `M ${hole.cx - 10} ${my} q 5 -5 10 0 t 10 0`, visibility: 'visible' });
    } else {
      hole.mouth.setAttribute('visibility', 'hidden');
    }

    // 땀방울: 오른쪽 위에 1~2개
    hole.sweat.forEach((s, i) => {
      if (i < (f.sweat || 0)) {
        const sx = hole.cx + size * 0.62 + i * 9;
        const sy = eyeY - size * 0.28 - i * 10;
        set(s, { d: `M ${sx} ${sy - 7} q 5 7 0 11 q -5 -4 0 -11 z`, visibility: 'visible' });
      } else {
        s.setAttribute('visibility', 'hidden');
      }
    });

    // 뒤집힌 반구면 아래 테두리 호를 보여준다
    if (hole.dome) {
      const rx = size;
      const ry = hole.baseRy;
      set(hole.rim, {
        d: `M ${hole.cx - rx * 0.92} ${cy + ry * 0.38} A ${rx} ${ry} 0 0 0 ${hole.cx + rx * 0.92} ${cy + ry * 0.38}`,
        stroke: shade(shade(color)), visibility: 'visible',
      });
    } else {
      hole.rim.setAttribute('visibility', 'hidden');
    }

    setTilt(hole, hole.tilt || 0);
    hole.face.setAttribute('visibility', 'visible');
  }

  // 어설프게 뒤집힌 반구는 비스듬하다
  function setTilt(hole, deg) {
    hole.tilt = deg;
    const t = deg ? `rotate(${deg} ${hole.cx} ${hole.cy})` : '';
    for (const n of [hole.batter, hole.face, hole.rim, hole.octo]) {
      if (t) n.setAttribute('transform', t); else n.removeAttribute('transform');
    }
  }

  // 짜기 결과에 반죽이 반응한다. kind = 'perfect' | 'good'
  // 세로 비율이 눌렸다 펴지며 감쇠하는 사인 곡선. 입력을 막지 않는다.
  function react(hole, kind) {
    const r = CFG.faces.react[kind];
    if (hole.reactRaf) cancelAnimationFrame(hole.reactRaf);
    const t0 = performance.now();
    const amp = 1 - r.squash;          // 눌림 깊이
    const up = r.stretch - 1;           // 펴짐 높이
    const step = () => {
      const u = Math.min(1, (performance.now() - t0) / r.ms);
      // 눌림(음) → 펴짐(양) 을 bounces 번, 점점 작게
      const phase = u * r.bounces * Math.PI * 2;
      const wave = -Math.cos(phase) * (1 - u);
      const scale = 1 + (wave < 0 ? wave * amp : wave * up);
      hole.batter.setAttribute('ry', (hole.baseRy * scale).toFixed(1));
      if (u < 1) hole.reactRaf = requestAnimationFrame(step);
      else { hole.reactRaf = 0; hole.batter.setAttribute('ry', hole.baseRy.toFixed(1)); }
    };
    hole.reactRaf = requestAnimationFrame(step);

    if (r.shine) {
      const s = hole.size;
      set(hole.shine, {
        cx: hole.cx - s * 0.35, cy: hole.cy - s * 0.38, rx: s * 0.22, ry: s * 0.13,
        transform: `rotate(-25 ${hole.cx - s * 0.35} ${hole.cy - s * 0.38})`, visibility: 'visible',
      });
    }
  }

  // 뒤집기 연출: 납작해졌다 다시 펴진다. 가운데서 then()을 불러 표정을 바꾼다
  function flipAnim(hole, ms, then) {
    if (hole.reactRaf) cancelAnimationFrame(hole.reactRaf);
    hole.shine.setAttribute('visibility', 'hidden'); // 표면이 바뀌었다
    Cook.hideHint(hole);
    const t0 = performance.now();
    let mid = false;
    const step = () => {
      const u = Math.min(1, (performance.now() - t0) / ms);
      if (!mid && u >= 0.5) { mid = true; then(); }
      const k = Math.abs(1 - u * 2); // 1 → 0 → 1
      hole.batter.setAttribute('ry', (hole.baseRy * Math.max(0.1, k)).toFixed(1));
      hole.face.setAttribute('visibility', k < 0.35 ? 'hidden' : 'visible');
      if (u < 1) hole.reactRaf = requestAnimationFrame(step);
      else { hole.reactRaf = 0; hole.batter.setAttribute('ry', hole.baseRy.toFixed(1)); hole.face.setAttribute('visibility', 'visible'); }
    };
    hole.reactRaf = requestAnimationFrame(step);
  }

  // 넘친 반죽이 옆 구멍까지 이어진 다리
  function bridge(from, to) {
    const f = CFG.faces.over;
    const x = Math.min(from.cx, to.cx);
    set(from.bridge, {
      x, y: from.cy - f.bridgeW / 2, width: Math.abs(to.cx - from.cx), height: f.bridgeW,
      fill: f.color, stroke: shade(f.color), 'stroke-width': 2, visibility: 'visible',
    });
  }

  function clear(hole) {
    hole.state = null;
    hole.look = 0;
    hole.dome = false;
    delete hole.cookColor;
    if (hole.reactRaf) { cancelAnimationFrame(hole.reactRaf); hole.reactRaf = 0; }
    setTilt(hole, 0);
    set(hole.batter, { rx: 0, ry: 0 });
    hole.face.setAttribute('visibility', 'hidden');
    hole.bridge.setAttribute('visibility', 'hidden');
    hole.shine.setAttribute('visibility', 'hidden');
    hole.rim.setAttribute('visibility', 'hidden');
    Cook.hideHint(hole);
    hole.mouth.setAttribute('visibility', 'hidden');
    hole.sweat.forEach((s) => s.setAttribute('visibility', 'hidden'));
  }

  function set(node, attrs) {
    for (const k in attrs) node.setAttribute(k, typeof attrs[k] === 'number' ? attrs[k].toFixed(1) : attrs[k]);
  }

  // 테두리용으로 살짝 어둡게
  function shade(color) {
    let r, g, b;
    if (color.startsWith('#')) {
      const n = parseInt(color.slice(1), 16);
      [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255];
    } else {
      [r, g, b] = color.match(/\d+/g).map(Number);
    }
    const d = (v) => Math.max(0, Math.round(v * 0.85));
    return `rgb(${d(r)},${d(g)},${d(b)})`;
  }

  return { apply, react, flipAnim, setTilt, bridge, clear, shade };
})();
