// 타코야키 표정. 상태별 모양·색·눈·입·땀 파라미터는 data.js faces에 있다.
// 표정은 애니메이션 없이 즉시 바꾸고, 그 뒤에 움직임(react, flipAnim)을 얹는다. (SPEC 7절)
const Face = (() => {
  // size = 반죽 크기(반지름 px), look = 곁눈질 방향 -1 / 0 / 1
  function apply(hole, state, size, look = 0) {
    const f = CFG.faces[state];
    hole.state = state;
    hole.size = size;
    hole.look = look;

    const cy = hole.cy + (hole.ball ? 0 : f.sagY); // 공(2차 뒤집기 뒤)은 처지지 않는다
    hole.batter.setAttribute('cx', hole.cx);
    hole.batter.setAttribute('cy', cy);
    hole.batter.setAttribute('rx', size.toFixed(1));
    hole.baseRy = size * (hole.ball ? 1 : f.squashY); // 반응 애니메이션이 돌아올 기준. 공이면 동그라미
    hole.batter.setAttribute('ry', hole.baseRy.toFixed(1));
    // 굽는 중이면 굽기 색이 우선한다. 최종 표정 중 창백·검정은 표정 색을 강제한다
    const color = (f.forceColor ? null : hole.cookColor) || f.color;
    hole.batter.setAttribute('fill', color);
    hole.batter.setAttribute('stroke', shade(color));

    const lookX = look * (f.lookX || CFG.faces.over.lookX);
    const eyeY = cy + f.eyeY;
    const xEyes = f.eyes === 'x';
    hole.eyes.forEach((eye, i) => {
      const ex = hole.cx + (i === 0 ? -1 : 1) * f.eyeGap / 2;
      const ry = i === 1 && f.eyeRy2 ? f.eyeRy2 : f.eyeRy; // 짝짝이 눈
      set(eye.white, { cx: ex, cy: eyeY, rx: f.eyeRx * 1.7, ry: ry * 1.4, display: xEyes ? 'none' : 'inline' });
      set(eye.pupil, { cx: ex + lookX, cy: eyeY, rx: f.eyeRx, ry, display: xEyes ? 'none' : 'inline' });
    });
    // X 눈 (탐)
    if (xEyes) {
      const r = f.eyeRx;
      const d = [0, 1].map((i) => {
        const ex = hole.cx + (i === 0 ? -1 : 1) * f.eyeGap / 2;
        return `M ${ex - r} ${eyeY - r} L ${ex + r} ${eyeY + r} M ${ex + r} ${eyeY - r} L ${ex - r} ${eyeY + r}`;
      }).join(' ');
      set(hole.xeyes, { d, display: 'inline' });
    } else {
      hole.xeyes.setAttribute('display', 'none');
    }

    // 입: 'o' 작은 동그라미 / 'wave' 물결 / 'smile' 작은 미소 / 'grin' 활짝 / 'flat' 일자 / 없음
    const my = eyeY + size * 0.3;
    const MOUTH = {
      o: `M ${hole.cx - 4} ${my} a 4 4 0 1 0 8 0 a 4 4 0 1 0 -8 0`,
      wave: `M ${hole.cx - 10} ${my} q 5 -5 10 0 t 10 0`,
      smile: `M ${hole.cx - 7} ${my - 2} q 7 8 14 0`,
      grin: `M ${hole.cx - 13} ${my - 4} q 13 18 26 0 z`,
      flat: `M ${hole.cx - 5} ${my} L ${hole.cx + 5} ${my}`,
    };
    if (MOUTH[f.mouth]) {
      set(hole.mouth, { d: MOUTH[f.mouth], fill: f.mouth === 'grin' ? '#6b2f22' : 'none', visibility: 'visible' });
    } else {
      hole.mouth.setAttribute('visibility', 'hidden');
    }

    // 얼룩 (어설픔 = 갈색, 탐 = 검은 반점 — T32): 구멍마다 고정된 자리
    if (f.spots) {
      Array.from(hole.spots.children).forEach((c, k) => {
        const ang = (k / f.spots) * Math.PI * 2 + hole.id * 0.7 + 0.9;
        set(c, { cx: hole.cx + Math.cos(ang) * size * 0.55, cy: cy + Math.sin(ang) * size * 0.55, r: size * 0.11, fill: f.spotColor || '#8a5a2e', opacity: f.spotColor ? 0.8 : 0.45, display: k < f.spots ? 'inline' : 'none' });
      });
      hole.spots.setAttribute('display', 'inline');
    } else {
      hole.spots.setAttribute('display', 'none');
    }

    // 움직임 플래그: 흐물(덜 익음) / 연기(탐). ambient 루프가 그린다
    hole.wobbleOn = !!f.wobble;
    hole.smokeOn = f.smoke || 0;
    if (!hole.smokeOn) hole.smoke.forEach((s) => s.setAttribute('display', 'none'));
    if (hole.wobbleOn || hole.smokeOn) ensureAmbient();

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

    // 뒤집힌 반구면 아래 테두리 호, 공이면 더 아래쪽 그림자 호를 보여준다
    if (hole.dome) {
      const rx = size;
      const ry = hole.baseRy;
      const w = hole.ball ? 0.78 : 0.92; // 호 양 끝의 가로 위치 (타원 위의 점)
      const k = hole.ball ? 0.62 : 0.38; // 호 양 끝의 세로 위치
      set(hole.rim, {
        d: `M ${hole.cx - rx * w} ${cy + ry * k} A ${rx} ${ry} 0 0 0 ${hole.cx + rx * w} ${cy + ry * k}`,
        stroke: shade(shade(color)), visibility: 'visible',
      });
    } else {
      hole.rim.setAttribute('visibility', 'hidden');
    }

    // 공 입체 음영 (T35): 반구·공은 진하게, 반죽(납작한 액체)은 약한 윤기만
    const K0 = CFG.faces.cook;
    set(hole.shade, { cx: hole.cx, cy, rx: size, ry: hole.baseRy, opacity: hole.dome ? K0.shade.dome : K0.shade.batter });

    // 1차 반구: 아래쪽에 아직 안 익은 반죽 띠 ("반은 노릇·반은 반죽", T32)
    const K = CFG.faces.cook;
    if (hole.dome && !hole.ball) {
      const rx = size;
      const ry = hole.baseRy;
      set(hole.rawBand, { d: `M ${hole.cx - rx * 0.8} ${cy + ry * 0.55} A ${rx} ${ry} 0 0 0 ${hole.cx + rx * 0.8} ${cy + ry * 0.55}`, stroke: K.rawBand, visibility: 'visible' });
    } else {
      hole.rawBand.setAttribute('visibility', 'hidden');
    }
    // 다 익은 공: 작은 갈색 점 (맛있어 보이게). 표정 색을 강제하는 실패 공에는 없다
    if (hole.ball && !f.forceColor) {
      Array.from(hole.dots.children).forEach((c, k) => {
        const h = Math.sin((hole.id + 1) * 91.7 + k * 47.3) * 9871.3;
        const fr = h - Math.floor(h);
        const ang = fr * Math.PI * 2;
        const rr = size * (0.35 + 0.45 * ((fr * 7) % 1));
        set(c, { cx: hole.cx + Math.cos(ang) * rr, cy: cy + Math.sin(ang) * rr, r: 2 + ((fr * 13) % 1) * 2, fill: K.dotColor, opacity: 0.6, display: k < K.dots ? 'inline' : 'none' });
      });
      hole.dots.setAttribute('display', 'inline');
    } else {
      hole.dots.setAttribute('display', 'none');
    }

    setTilt(hole, hole.tilt || 0);
    hole.face.setAttribute('visibility', 'visible');
  }

  // 어설프게 뒤집힌 반구는 비스듬하다. 큐 순간 들썩(T32)은 기울기 위에 더한다
  function setTilt(hole, deg) {
    hole.tilt = deg;
    applyTransform(hole);
  }
  function setOffset(hole, dy, deg) {
    hole.offDy = dy;
    hole.offDeg = deg;
    applyTransform(hole);
  }
  function applyTransform(hole) {
    const rot = (hole.tilt || 0) + (hole.offDeg || 0);
    const dy = hole.offDy || 0;
    const t = (rot || dy) ? `translate(0 ${dy.toFixed(1)}) rotate(${rot.toFixed(1)} ${hole.cx} ${hole.cy})` : '';
    for (const n of [hole.batter, hole.face, hole.rim, hole.rawBand, hole.octo]) {
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

  // 계속 도는 움직임: 덜 익음은 흐물흐물(세로 ±4 %), 탐은 연기 2줄이 올라간다. 해당 구멍이 없으면 멈춘다
  let ambientRaf = 0;
  function ensureAmbient() {
    if (!ambientRaf) ambientRaf = requestAnimationFrame(ambient);
  }
  function ambient() {
    ambientRaf = 0;
    const t = performance.now();
    let any = false;
    for (const h of Board.holes) {
      if (h.wobbleOn && !h.reactRaf) {
        any = true;
        h.batter.setAttribute('ry', (h.baseRy * (1 + 0.04 * Math.sin(t / 190 + h.id))).toFixed(1));
      }
      if (h.smokeOn) {
        any = true;
        const s = h.size || h.r;
        h.smoke.forEach((p, k) => {
          if (k >= h.smokeOn) { p.setAttribute('display', 'none'); return; }
          const x0 = h.cx + (k === 0 ? -1 : 1) * s * 0.28;
          const y0 = h.cy - s * 0.95;
          const w = Math.sin(t / 420 + k * 2.1) * 6;
          set(p, { d: `M ${x0} ${y0} q ${w} -12 0 -24 q ${-w} -12 0 -24`, opacity: 0.45 + 0.25 * Math.sin(t / 300 + k), display: 'inline' });
        });
      }
    }
    if (any) ambientRaf = requestAnimationFrame(ambient);
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

  // 구멍 둘레로 번진 반죽 자국 (T35): 반죽 크기 + spillPad, 살짝 울퉁불퉁
  function spill(hole, size, extra = 0) {
    const K = CFG.faces.cook;
    const R = Math.max(hole.r, size) + K.spillPad + extra;
    const pts = [];
    for (let k = 0; k < 28; k++) {
      const a = (k / 28) * Math.PI * 2;
      const h = Math.sin((hole.id + 1) * 37.1 + k * 11.3) * 4371.7;
      const w = 1 + 0.035 * ((h - Math.floor(h)) * 2 - 1);
      pts.push([hole.cx + Math.cos(a) * R * w, hole.cy + Math.sin(a) * R * w]);
    }
    const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ') + ' Z';
    set(hole.spill, { d, fill: K.raw, stroke: shade(K.raw), visibility: 'visible', 'stroke-linejoin': 'round' });
  }

  // 텐카스·파 (T35): 실제 공정의 "텐카스·파"를 시각으로만. data-chunk라 1차 뒤집기 때 숨는다
  function sprinkle(hole, size) {
    const K = CFG.faces.cook;
    const g = Board.el('g', { 'data-chunk': '1' }, hole.octo);
    const bits = [];
    for (let k = 0; k < K.tenkasu.n; k++) bits.push(['t', k]);
    for (let k = 0; k < K.scallion.n; k++) bits.push(['s', k]);
    bits.forEach(([kind, k], i) => {
      const h = Math.sin((hole.id + 1) * 53.7 + i * 17.9) * 7919.3;
      const f = h - Math.floor(h);
      const a = f * Math.PI * 2;
      const r = size * (0.25 + 0.55 * ((f * 7) % 1));
      const x = hole.cx + Math.cos(a) * r;
      const y = hole.cy + Math.sin(a) * r;
      const rot = (f * 360).toFixed(0);
      if (kind === 't') {
        Board.el('path', { d: `M ${x - 4} ${y - 2} L ${x + 3} ${y - 3} L ${x + 4} ${y + 2} L ${x - 3} ${y + 3} Z`, fill: K.tenkasu.color, stroke: '#c9a960', 'stroke-width': 0.8, transform: `rotate(${rot} ${x} ${y})` }, g);
      } else {
        Board.el('rect', { x: x - 4, y: y - 1.6, width: 8, height: 3.2, rx: 1.5, fill: K.scallion.color, transform: `rotate(${rot} ${x} ${y})` }, g);
      }
    });
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
    hole.ball = false;
    delete hole.cookColor;
    if (hole.reactRaf) { cancelAnimationFrame(hole.reactRaf); hole.reactRaf = 0; }
    setTilt(hole, 0);
    set(hole.batter, { rx: 0, ry: 0 });
    hole.face.setAttribute('visibility', 'hidden');
    hole.bridge.setAttribute('visibility', 'hidden');
    hole.shine.setAttribute('visibility', 'hidden');
    hole.rim.setAttribute('visibility', 'hidden');
    hole.rawBand.setAttribute('visibility', 'hidden');
    hole.spill.setAttribute('visibility', 'hidden');
    hole.dots.setAttribute('display', 'none');
    hole.offDy = 0;
    hole.offDeg = 0;
    Cook.hideHint(hole);
    hole.mouth.setAttribute('visibility', 'hidden');
    hole.sweat.forEach((s) => s.setAttribute('visibility', 'hidden'));
    hole.wobbleOn = false;
    hole.smokeOn = 0;
    hole.xeyes.setAttribute('display', 'none');
    hole.spots.setAttribute('display', 'none');
    hole.smoke.forEach((s) => s.setAttribute('display', 'none'));
    hole.eyes.forEach((eye) => { eye.white.setAttribute('display', 'inline'); eye.pupil.setAttribute('display', 'inline'); });
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

  return { apply, react, flipAnim, setTilt, setOffset, bridge, spill, sprinkle, clear, shade };
})();
