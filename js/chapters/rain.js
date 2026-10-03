// Chapter 4: keeping dry. Wind makes rain slant; the umbrella's dry zone is a slanted tube
// below its rim. Tilt the shaft along the rain and the tube falls over you again.
import { THREE, M, clamp } from '../kit.js';
import { makeUmbrella, U, DEPTH, frame, dropSpeed, rainAngle, segs, rows, fitNarrow, D2R, COL } from '../umbrella.js';

// A standing person as a stack of round slices: height (m) → radius (m). About 1.7 m tall.
const BODY = [[0, 0.15], [0.5, 0.16], [0.85, 0.175], [1.0, 0.18], [1.3, 0.2], [1.42, 0.215], [1.47, 0.2], [1.5, 0.07], [1.55, 0.075], [1.6, 0.1], [1.66, 0.105], [1.71, 0.08], [1.74, 0.03]];
const LEG = 0.85, LEGX = 0.085;                         // legs below this height, each this far from the middle (m)
const rBody = (y) => { for (let i = 1; i < BODY.length; i++) if (y <= BODY[i][0]) { const [y0, r0] = BODY[i - 1], [y1, r1] = BODY[i]; return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0); } return 0.02; };
const SL = 58, H = 1.74, HAND = [0, 1.25, 0.17];       // slices, body height, where the hand holds the handle (m)
const R = frame(U.dOpen).tipR / 1000, AX = (U.YN - DEPTH - 60) / 1000;   // rim radius; hand to the rim plane along the shaft (m)
const PART = (y) => (y < 0.3 ? 'ankles' : y < 0.6 ? 'knees' : y < 0.95 ? 'thighs' : y < 1.15 ? 'waist' : y < 1.4 ? 'chest' : 'shoulders');

// Is the point p (m) sheltered? Follow the rain backwards from p up to the plane of the rim.
// The canopy is treated as a flat disc at its rim: slightly cautious, since the dome bulges above it.
function geom(s) {
  const tau = s.tilt * D2R, phi = rainAngle(s.wind / 3.6, s.drop);
  const a = [-Math.sin(tau), Math.cos(tau), 0], d = [Math.sin(phi), -Math.cos(phi), 0];
  const C = [HAND[0] + a[0] * AX, HAND[1] + a[1] * AX, HAND[2]], da = d[0] * a[0] + d[1] * a[1];
  const dry = (p) => {
    const t = ((p[0] - C[0]) * a[0] + (p[1] - C[1]) * a[1]) / da;
    if (t <= 0) return false;
    return Math.hypot(p[0] - t * d[0] - C[0], p[1] - t * d[1] - C[1], p[2] - C[2]) <= R;
  };
  return { tau, phi, a, d, C, dry };
}
export function shelter(s) {
  const g = geom(s), wet = [];
  let dryTo = 0, found = false;
  for (let i = SL - 1; i >= 0; i--) {
    const y = ((i + 0.5) * H) / SL, r = rBody(y);
    const ok = g.dry([-r, y, 0]) && g.dry([r, y, 0]) && g.dry([0, y, r]) && g.dry([0, y, -r]);
    wet[i] = !ok;
    if (!ok && !found) { found = true; dryTo = ((i + 1) * H) / SL; }
  }
  return { ...g, wet, dryTo: found ? dryTo : 0, v: dropSpeed(s.drop) };
}

// The tilt (0 to 60°) that keeps the most of you dry in this model, found by trying each one.
export function bestTilt(s) { let best = 0, low = Infinity; for (let a = 0; a <= 60; a++) { const d = shelter({ ...s, tilt: a }).dryTo; if (d < low - 1e-6) { low = d; best = a; } } return { tilt: best, dryTo: low }; }
const dryWords = (d) => (d < 0.03 ? 'dry head to toe' : d > 1.5 ? 'head only' : 'dry to the ' + PART(d));

export default {
  id: 'rain',
  short: 'Keeping dry',
  title: 'Slanting rain and where to point it',
  subtitle: 'Rain falls at an angle set by the wind. Lean the umbrella into it.',
  view: { pos: [-1.3, 6.4, 17.6], target: [-1.8, 5.8, 0] },
  learn: `<p>In still air, rain falls straight down and an umbrella keeps a neat circle dry. But raindrops fall slowly: about <b>6.5 m/s</b> for an ordinary 2 mm drop, and only 2 m/s for drizzle. A breeze carries them sideways at its own speed. So the rain comes in at a <b>slant</b>, and the slant is steeper for small drops and strong wind.</p>
    <p>The dry space under an umbrella is a tube that leans the same way as the rain. Hold the umbrella upright in slanting rain and the tube leans away from your legs. <b>Tilt the shaft into the wind</b>, towards the falling rain, and the dry tube swings back over you. It cannot do everything. The tube starts at the canopy above your hand, so in a stiff wind your shins still get wet.</p>
    <p>The cloth keeps water out twice over. It is woven tightly, and it has a <b>water-repellent finish</b>. On a surface that repels water, a drop sits up as a bead (its <b>contact angle</b> is more than 90°) and rolls off. Dirt, rubbing and years of folding wear the finish away. Then drops spread and soak in, and an old umbrella <b>wets through</b> and drips at the seams.</p>
    <p>One thing an umbrella does not do is protect you from <b>lightning</b>. The US National Weather Service says height, a pointed shape and standing alone decide where lightning strikes, and that metal makes no difference to where it hits. In a thunderstorm the advice is simple: get indoors.</p>
    <p class="tip"><b>Try it:</b> set a 20 km/h wind with the umbrella upright and see how much of you gets wet. Then tilt it and find the angle that keeps the most of you dry.</p>`,
  terms: [
    { t: 'Terminal speed', d: 'The steady speed a falling drop reaches when air drag balances its weight. Bigger drops fall faster.' },
    { t: 'Rain angle', d: 'How far rain slants from straight down. Its tangent is wind speed ÷ fall speed.' },
    { t: 'Water-repellent finish', d: 'A coating on the fibres that makes water bead up and roll off instead of soaking in.' },
    { t: 'Contact angle', d: 'The angle a drop makes where it meets a surface. Above 90° the drop beads up. Below 90° it spreads.' },
    { t: 'Pongee', d: 'A fine, tight plain weave, usually polyester, used for most umbrella canopies.' },
  ],
  defaults: { wind: 12, drop: 2, tilt: 0 },
  controls: [
    { key: 'wind', type: 'range', label: 'Wind', min: 0, max: 40, step: 1, ends: ['still', 'strong breeze'], fmt: (v) => Math.round(v) + ' km/h' },
    { key: 'drop', type: 'seg', label: 'Drop size', options: [{ v: 0.5, label: 'Drizzle 0.5 mm' }, { v: 2, label: 'Rain 2 mm' }, { v: 4, label: 'Downpour 4 mm' }] },
    { key: 'tilt', type: 'range', label: 'Tilt the umbrella into the wind', min: 0, max: 60, step: 1, ends: ['upright', 'leaning'], fmt: (v) => Math.round(v) + '°' },
  ],
  quiz: [
    { q: 'Why does drizzle slant more than heavy rain in the same wind?', options: ['Drizzle is colder', 'Small drops fall more slowly, so the wind carries them further sideways', 'Drizzle is lighter than air', 'It does not'], answer: 1, why: 'The slant depends on wind speed ÷ fall speed. A 0.5 mm drop falls at about 2 m/s, a 4 mm drop at nearly 9 m/s.' },
    { q: 'Rain is slanting at 40° from the wind on your left. How should you hold the umbrella?', options: ['Tilted about 40° to the left, into the wind', 'Upright', 'Tilted to the right', 'Closed'], answer: 0, why: 'Face the canopy into the rain. Then it blocks the widest band of rain, and the dry tube passes over your body instead of beside it.' },
    { q: 'Why does an old umbrella start to soak through?', options: ['The ribs rust', 'Rain has changed', 'The cloth shrinks', 'Its water-repellent finish has worn off, so drops spread and wet the cloth'], answer: 3, why: 'With the finish gone, water no longer beads and rolls off. It spreads into the weave and seeps through.' },
  ],
  reel: [
    { ms: 5600, caption: 'A 2 mm raindrop falls at about 6.5 metres a second. A 20 km/h breeze pushes it 40 degrees off straight down.', set: { drop: 2, tilt: 0 }, anim: { wind: [0, 20] }, view: { pos: [1.2, 5.6, 10.6], target: [1.0, 5.6, 0] }, spin: 0 },
    { ms: 5200, caption: 'So lean the umbrella into the wind, towards the rain, and the dry space swings back over you.', set: { drop: 2, wind: 20 }, anim: { tilt: [0, 40] }, view: { pos: [1.2, 5.6, 10.6], target: [1.0, 5.6, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const G = new THREE.Group(); G.scale.setScalar(0.5); stage.root.add(G);       // inside G, 10 units = 1 m
    const U10 = 10;
    // the person
    const slot = [];                                    // which slice each drawn piece belongs to
    for (let i = 0; i < SL; i++) { const y = ((i + 0.5) * H) / SL; if (y < LEG) slot.push([i, -LEGX], [i, LEGX]); else slot.push([i, 0]); }
    const body = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 20), new THREE.MeshStandardMaterial({ roughness: 0.7 }), slot.length);
    body.castShadow = true; body.frustumCulled = false;
    const mx = new THREE.Matrix4(), dryC = new THREE.Color(0xe9d3b0), wetC = new THREE.Color(0x3d8bff);
    slot.forEach(([i, x], j) => {
      const y = ((i + 0.5) * H) / SL, leg = y < LEG, r = (leg ? rBody(y) - LEGX : rBody(y)) * U10, head = y > 1.5;
      mx.makeScale(r, (H / SL) * U10 * 1.02, leg || head ? r : r * 0.6); mx.setPosition(x * U10, y * U10, 0); body.setMatrixAt(j, mx); body.setColorAt(j, dryC);
    });
    G.add(body);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.34, 3.4, 12), M.matte(0xe9d3b0)); arm.position.set(1.2, 13.2, 0.9); arm.rotation.set(0.55, 0, -0.75); arm.castShadow = true; G.add(arm);
    // the umbrella on a pivot at the hand
    const pivot = new THREE.Group(); pivot.position.set(HAND[0] * U10, HAND[1] * U10, HAND[2] * U10); G.add(pivot);
    const um = makeUmbrella(); um.g.position.y = -0.6; pivot.add(um.g);
    // rain
    const ND = 520, rain = segs(ND, M.glow(0x9fd0ff, { transparent: true, opacity: 0.75 }), 4); G.add(rain);
    const seed = Array.from({ length: ND }, () => [Math.random(), Math.random(), Math.random()]);
    // the dry patch on the ground
    const NP = 48, patchGeo = new THREE.BufferGeometry(); patchGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((NP + 1) * 3), 3));
    const idx = []; for (let i = 0; i < NP; i++) idx.push(0, i + 1, ((i + 1) % NP) + 1); patchGeo.setIndex(idx);
    const patch = new THREE.Mesh(patchGeo, M.ghost(COL.spring, 0.3)); patch.frustumCulled = false; G.add(patch);
    const lb = { rain: stage.label('', [9, 24, 0], G, 'hot'), dry: stage.label('Dry patch on the ground', [0, 0.2, 9], G), wet: stage.label('', [4, 5, 0], G) };
    let T = 0, last = null;
    return {
      update(dt, s, time) {
        dt = Math.max(0, dt); T += dt;
        const g = shelter(s); last = g;
        pivot.rotation.z = g.tau;
        slot.forEach(([i], j) => body.setColorAt(j, g.wet[i] ? wetC : dryC));
        body.instanceColor.needsUpdate = true;
        // Drops start on a high plane and fall along the rain. Shown at about a third of real speed.
        const top = 3.3, span = top / Math.cos(g.phi), sp = g.v * 0.3;
        for (let i = 0; i < ND; i++) {
          const [a, b, c] = seed[i], t = (c * span + T * sp) % span;
          const x0 = -4.2 + a * 7.4 - Math.tan(g.phi) * top * 0.5, z0 = -1.5 + b * 3.4;
          const p = [x0 + g.d[0] * t, top + g.d[1] * t, z0];
          if (p[1] < 0.02 || g.dry(p)) { rain.seg(i, 0, 0, 0, 0, 0, 0, 0); continue; }
          const l = 0.13;
          rain.seg(i, p[0] * U10, p[1] * U10, p[2] * U10, (p[0] - g.d[0] * l) * U10, (p[1] - g.d[1] * l) * U10, p[2] * U10, 0.035);
        }
        rain.done();
        // The rim's shadow in the rain: slide each rim point along the rain to the ground.
        const pa = patchGeo.attributes.position, e1 = [Math.cos(g.tau), Math.sin(g.tau), 0];
        let cx = 0;
        for (let i = 0; i < NP; i++) {
          const an = (i * 2 * Math.PI) / NP, p = [g.C[0] + R * Math.cos(an) * e1[0], g.C[1] + R * Math.cos(an) * e1[1], g.C[2] + R * Math.sin(an)], t = p[1] / -g.d[1];
          const x = (p[0] + g.d[0] * t) * U10, z = p[2] * U10; pa.setXYZ(i + 1, x, 0.03, z); cx += x / NP;
        }
        pa.setXYZ(0, cx, 0.03, g.C[2] * U10); pa.needsUpdate = true;
        lb.rain.element.textContent = `Rain slants ${Math.round(g.phi / D2R)}°`;
        lb.dry.position.set(cx, 0.2, 9);
        lb.wet.element.textContent = g.dryTo < 0.03 ? 'Dry from head to toe' : g.dryTo > 1.5 ? 'Wet from the neck down' : `Wet below the ${PART(g.dryTo)}`; lb.wet.element.classList.toggle('hot', g.dryTo > 0.03);
        lb.wet.position.set(7.5, Math.max(1.5, g.dryTo * U10 * 0.6), 0);
        fitNarrow(stage, [lb.dry], -0.1);
        void time;
      },
      readout: (s) => {
        const g = last || shelter(s), ang = Math.round(g.phi / D2R), drift = Math.tan(g.phi) * (g.C[1]), bt = bestTilt(s);
        return rows(g.dryTo < 0.03 ? 'Dry from head to toe' : g.dryTo > 1.5 ? 'Only your head is dry' : `Dry down to the ${PART(g.dryTo)}`, [
          ['Rain slants from straight down', ang + '°'],
          ['Best tilt here', bt.tilt + '° (' + dryWords(bt.dryTo) + ')', g.dryTo <= bt.dryTo + 0.04 ? 'ok' : ''],
          ['Drop fall speed (' + s.drop + ' mm drop)', g.v.toFixed(1) + ' m/s'],
          ['Wind', (s.wind / 3.6).toFixed(1) + ' m/s'],
          ['Dry patch slides downwind by', drift.toFixed(2) + ' m'],
          ['Canopy span', (2 * R).toFixed(2) + ' m'],
        ], 3);
      },
    };
  },
};
