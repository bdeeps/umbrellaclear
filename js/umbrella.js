// UmbrellaClear's shared model: the rib-and-stretcher linkage solved from its pin joints,
// the rib as a bent beam held by taut cloth, the wind and rain sums, and the 3D umbrellas.
// All lengths in this file are millimetres unless a name says otherwise. A model group is
// scaled by S, so one scene unit is 100 mm.
import { THREE, M, clamp, lerp, arrow } from './kit.js';

export const S = 0.01;
export const D2R = Math.PI / 180;
export const RHO = 1.2;                 // air density, kg/m³, near sea level at about 20 °C

// ---------------------------------------------------------------- the stick umbrella
// A "23 inch" umbrella: the trade measures an umbrella by its rib length, 23 in = 584 mm.
// The other lengths are measured-style round values for a full-size stick umbrella.
export const U = {
  L: 584,          // rib length, top notch pin to tip
  a: 250,          // top notch pin to the joint where the stretcher meets the rib
  s: 245.3,        // stretcher length, runner pin to joint
  rn: 9,           // radius of the ring of pins in the top notch
  rr: 12,          // radius of the ring of pins in the runner
  th0: 3 * D2R,    // rib angle from the shaft when shut (the ribs lie along the shaft)
  thOpen: 73 * D2R, // angle of the notch-to-joint line when the top catch clicks in
  thT: 66 * D2R,   // angle at which the cloth pulls tight (set by how the cloth is cut)
  YN: 800,         // height of the top notch above the bottom of the handle
  // Bending stiffness of one rib, E × I. A steel U-channel rib about 3.5 mm wide, 2.5 mm deep
  // and 0.4 mm thick has I of roughly 2.5 to 3 mm⁴; with E = 200 GPa that is 0.5 to 0.6 N·m².
  // A 4 mm solid fibreglass rod (E about 40 GPa, I = 12.6 mm⁴) comes to about 0.5 N·m².
  EI: 0.6,
  EI_FG: 0.5,
  RIB_G: 14, STR_G: 6, // grams: the same channel section in steel (7850 kg/m³), an estimate
};
U.b = U.L - U.a;

// Runner distance below the top notch for a given rib angle (used once, to set the two stops).
function dOf(th) { const jx = U.rn + U.a * Math.sin(th), jy = -U.a * Math.cos(th); return -jy + Math.sqrt(U.s * U.s - (jx - U.rr) ** 2); }
U.dClosed = dOf(U.th0);
U.dOpen = dOf(U.thOpen);
U.travel = U.dClosed - U.dOpen;

// Two circles in the (r, y) plane: returns the crossing point that lies further from the shaft.
function pinJoint(c1, r1, c2, r2) {
  const dx = c2[0] - c1[0], dy = c2[1] - c1[1], D = Math.hypot(dx, dy);
  const x = (r1 * r1 - r2 * r2 + D * D) / (2 * D), h = Math.sqrt(Math.max(0, r1 * r1 - x * x));
  const ex = dx / D, ey = dy / D;
  const p = [c1[0] + x * ex - h * ey, c1[1] + x * ey + h * ex], q = [c1[0] + x * ex + h * ey, c1[1] + x * ey - h * ex];
  return p[0] > q[0] ? p : q;
}

// The linkage. The runner's height is the only input. The joint sits where a circle of radius a
// about the notch pin meets a circle of radius s about the runner pin: the triangle is solved,
// not tweened. Past the taut point the cloth holds the tip, so the rib bends as a beam that is
// held at the notch and the tip and pushed at the joint (a simply supported beam with a point
// load: deflection under the load = P a² b² / (3 E I L), any strength-of-materials text).
// (r, y) coordinates are relative to the top notch, y up.
export function frame(d, { n = 8, thT = U.thT, EI = U.EI } = {}) {
  d = clamp(d, U.dOpen, U.dClosed);
  const N = [U.rn, 0], R = [U.rr, -d];
  const J = pinJoint(N, U.a, R, U.s);
  const thJ = Math.atan2(J[0] - N[0], -(J[1] - N[1]));
  const taut = thJ > thT, thC = taut ? thT : thJ, Delta = thJ - thC;
  const delta = U.a * Math.sin(Delta);                                   // mm, bow at the joint
  const a = U.a / 1000, b = U.b / 1000, L = U.L / 1000;
  const P = (3 * EI * L * (delta / 1000)) / (a * a * b * b);            // N, push at the joint, square to the rib
  const es = [(J[0] - R[0]) / U.s, (J[1] - R[1]) / U.s];                // along the stretcher, runner to joint
  const nrm = [Math.cos(thC), Math.sin(thC)];                           // square to the rib's chord, outward and up
  const Fs = P / Math.max(0.05, es[0] * nrm[0] + es[1] * nrm[1]);       // N, compression in the stretcher
  const push1 = Fs * es[1];                                             // N, each stretcher pressing the runner down
  const RT = (P * a) / L;                                               // N, what the cloth must supply at the tip
  const Fh = RT / Math.cos(thC);                                        // N, inward pull of the hem at the tip
  const hem = Fh / (2 * Math.sin(Math.PI / n));                         // N, tension along the hem between two tips
  const comp = RT * Math.tan(thC);                                      // N, squeeze along the outer rib
  const tipR = U.rn + U.L * Math.sin(thT);                              // mm, tip radius when the cloth is tight
  return {
    d, n, EI, thT, u: (U.dClosed - d) / U.travel, J, R, N, thJ, thC, taut, Delta, delta, P, es, nrm, Fs,
    push: push1 * n, RT, Fh, hem, comp, tipR, hold: RT * b,            // hold: N·m keeping each tip down, about the joint
    energy: 0.5 * P * (delta / 1000) * n,                               // J stored in all the bent ribs
    moment: (P * a * b) / L,                                            // N·m, largest bending moment (at the joint)
  };
}
export const dOfU = (u) => U.dClosed - clamp(u, 0, 1) * U.travel;
// The runner position where the cloth first goes tight, as a fraction of the travel.
export function tautU(thT = U.thT) { let lo = 0, hi = 1; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; frame(dOfU(m), { thT }).taut ? (hi = m) : (lo = m); } return hi; }

// Stations along a rib as [r, y] (relative to the notch). Station JI is the joint.
export const JI = 6, KO = 9, K = JI + KO;
export function ribPoints(f, inv = 0) {
  const { thC, Delta, P, EI } = f, a = U.a / 1000, b = U.b / 1000, L = U.L / 1000;
  const u = [Math.sin(thC), -Math.cos(thC)], nr = [Math.cos(thC), Math.sin(thC)], cD = Math.cos(Delta);
  const pts = [];
  for (let i = 0; i <= K; i++) {
    const x = i <= JI ? (a * i) / JI : a + (b * (i - JI)) / KO;        // metres along the rib
    const v = x <= a ? (P * b * x * (L * L - b * b - x * x)) / (6 * EI * L) : (P * a * (L - x) * (L * L - a * a - (L - x) ** 2)) / (6 * EI * L);
    const xc = (x <= a ? x * cD : a * cD + (x - a)) * 1000, vv = v * 1000;
    pts.push([U.rn + xc * u[0] + vv * nr[0], xc * u[1] + vv * nr[1]]);
  }
  if (inv > 0) {
    // Turned inside out. The hem cannot stretch, so each tip stays at the same radius while it
    // swings up past the joint. On the way the straight-line distance from joint to tip is
    // shorter than the rib, so the rib must bow: that bow is the snap.
    const J = pts[JI], T0 = pts[K], T = [T0[0], lerp(T0[1], 2 * J[1] - T0[1] + 30, inv)];
    const ex = T[0] - J[0], ey = T[1] - J[1], c = Math.hypot(ex, ey);
    const A = (2 / Math.PI) * Math.sqrt(Math.max(0, c * (U.b - c)));
    const px = -ey / c, py = ex / c, w = Math.min(1, inv * 6);
    for (let i = JI + 1; i <= K; i++) {
      const t = (i - JI) / KO, bow = A * Math.sin(Math.PI * t);
      const q = [J[0] + ex * t + px * bow, J[1] + ey * t + py * bow];
      pts[i] = [lerp(pts[i][0], q[0], w), lerp(pts[i][1], q[1], w)];
    }
  }
  return pts;
}

// ---------------------------------------------------------------- canopy shape numbers
export const polyArea = (n, R) => (n / 2) * R * R * Math.sin((2 * Math.PI) / n);   // area of a regular n-gon
export const roundness = (n) => (n / (2 * Math.PI)) * Math.sin((2 * Math.PI) / n);  // its share of the full circle
export const DEPTH = U.L * Math.cos(U.thT);        // mm, how far the tips sit below the notch

// ---------------------------------------------------------------- rain
// Fall speed of a raindrop of diameter D mm in still air near the ground. Atlas, Srivastava and
// Sekhon (1973) fitted v = 9.65 − 10.3 e^(−0.6 D) m/s to the measurements of Gunn and Kinzer
// (1949), the standard data: about 4 m/s at 1 mm, 6.5 m/s at 2 mm, 9.1 m/s at 5 mm.
export const dropSpeed = (D) => Math.max(0.3, 9.65 - 10.3 * Math.exp(-0.6 * D));
// The wind carries drops sideways at its own speed, so rain slants by atan(wind / fall speed).
export const rainAngle = (wind, D) => Math.atan2(wind, dropSpeed(D));

// ---------------------------------------------------------------- wind
// Drag F = ½ ρ v² Cd A. Cd for an open hemispherical shell, on its frontal area: 0.38 with the
// round side to the wind and 1.42 with the hollow side to the wind (Hoerner, Fluid-Dynamic Drag,
// 1965; the same pair is in most fluid mechanics textbook tables). Edge-on, the frontal area is
// the thin segment (about 4/3 × R × depth) with Cd taken as 1.0, a round bluff-body value.
// Between those three attitudes the model blends with the square of the wind's component along
// the shaft: an interpolation, not a measurement. Lift is left out.
// A vented double canopy lets air out through the overlap. Slotted parachutes are the nearest
// measured case: ringslot canopies have about 0.75 of the drag coefficient of solid flat ones
// (Knacke, Parachute Recovery Systems Design Manual, 1992, table 5-1). Used here as a guide.
export const CD = { round: 0.38, cup: 1.42, edge: 1.0, vent: 0.75 };
export function windLoad(v, tiltDeg, { n = 8, vented = false, EI = U.EI } = {}) {
  const f = frame(U.dOpen, { n, EI });
  const R = f.tipR / 1000, A = polyArea(n, R), Aside = (4 / 3) * R * (DEPTH / 1000);
  const c = Math.sin(tiltDeg * D2R);                    // +1: the top points into the wind. −1: the wind blows into the cup
  const end = c >= 0 ? CD.round * A : CD.cup * A * (vented ? CD.vent : 1);
  const CdA = CD.edge * Aside + (end - CD.edge * Aside) * c * c;
  const q = 0.5 * RHO * v * v;
  const F = q * CdA;
  const lift = c < 0 ? q * end * c * c : 0;             // N, the part that blows up into the cup, along the shaft
  // Share of the canopy outside the joint circle, and where its load acts on the outer rib.
  const rj = f.J[0] / 1000, outer = 1 - (rj / R) ** 2;
  const turn = ((outer * lift) / n) * 0.55 * (U.b / 1000);   // N·m per rib, trying to swing the tip up about the joint
  return { F, CdA, A, c, lift, turn, hold: f.hold, ratio: turn / f.hold, q };
}
// Beaufort scale, land descriptions, limits in km/h (Met Office / WMO table).
const BFT = [[1, 'Calm'], [5, 'Light air'], [11, 'Light breeze'], [19, 'Gentle breeze'], [28, 'Moderate breeze'], [38, 'Fresh breeze'], [49, 'Strong breeze'], [61, 'Near gale'], [74, 'Gale'], [88, 'Strong gale'], [102, 'Storm']];
export function beaufort(kmh) { const i = BFT.findIndex(([top]) => kmh <= top); return i < 0 ? { force: 11, name: 'Violent storm' } : { force: i, name: BFT[i][1] }; }

// ---------------------------------------------------------------- the three-fold umbrella
// A "21 inch" pocket umbrella: a 535 mm rib in three sections that fold into a Z.
//  - the top rib hangs from the top notch and is pushed out by a stretcher from the runner, as on a stick umbrella;
//  - the middle rib hinges on the end of the top rib. A short link from the stretcher to a small lever on the
//    middle rib makes a four-bar linkage, so the middle rib swings open as the stretcher and top rib spread;
//  - the end rib hinges on the middle rib. A long thin wire beside the middle rib ties a lever on the end rib
//    back to the top rib. That is a parallelogram, so the end rib always stays parallel to the top rib.
// The lever sizes below were found by a search for a linkage that folds flat and opens straight
// without passing a dead point; real makers' dimensions differ.
export const F3 = {
  l1: 195, l2: 180, l3: 160, a: 110, s: 112, rn: 8, rr: 10,
  m: 19.775, mu: 2.8872, k: 19.552, ka: 3.5793,      // stretcher lever, its angle; middle-rib lever, its angle
  e: 10, q: 176 * D2R,                                 // parallelogram lever and its angle to the top rib
  th0: 4 * D2R, thOpen: 78 * D2R, th2Closed: 176 * D2R,
};
F3.L = F3.l1 + F3.l2 + F3.l3;
const rot = (v, t) => [v[0] * Math.cos(t) - v[1] * Math.sin(t), v[0] * Math.sin(t) + v[1] * Math.cos(t)];
const dirOf = (th) => [Math.sin(th), -Math.cos(th)];
function f3d(th) { const jx = F3.rn + F3.a * Math.sin(th), jy = -F3.a * Math.cos(th); return -jy + Math.sqrt(F3.s * F3.s - (jx - F3.rr) ** 2); }
F3.dClosed = f3d(F3.th0); F3.dOpen = f3d(F3.thOpen); F3.travel = F3.dClosed - F3.dOpen;
function f3raw(d, prevK) {
  const N = [F3.rn, 0], R = [F3.rr, -d];
  const dx = R[0] - N[0], dy = R[1] - N[1], D = Math.hypot(dx, dy);
  const x = (F3.a * F3.a - F3.s * F3.s + D * D) / (2 * D), h = Math.sqrt(Math.max(0, F3.a * F3.a - x * x)), ex = dx / D, ey = dy / D;
  const p1 = [N[0] + x * ex - h * ey, N[1] + x * ey + h * ex], p2 = [N[0] + x * ex + h * ey, N[1] + x * ey - h * ex];
  const J = p1[0] > p2[0] ? p1 : p2;
  const th1 = Math.atan2(J[0] - N[0], -(J[1] - N[1])), u1 = dirOf(th1);
  const B = [N[0] + F3.l1 * u1[0], N[1] + F3.l1 * u1[1]];
  const es = [(J[0] - R[0]) / F3.s, (J[1] - R[1]) / F3.s], mv = rot(es, F3.mu);
  const Mp = [J[0] + F3.m * mv[0], J[1] + F3.m * mv[1]];
  return { N, R, J, th1, u1, B, Mp, prevK };
}
// The four-bar is followed from the shut position in small steps so it stays on one branch.
// The result is tabulated once; f3frame() reads the table.
const F3T = (() => {
  const steps = 400, tab = [];
  let c = 0, Kp = null;
  for (let i = 0; i <= steps; i++) {
    const d = F3.dClosed - (F3.travel * i) / steps, g = f3raw(d);
    if (i === 0) { const kv = rot(dirOf(F3.th2Closed), F3.ka); Kp = [g.B[0] + F3.k * kv[0], g.B[1] + F3.k * kv[1]]; c = Math.hypot(Kp[0] - g.Mp[0], Kp[1] - g.Mp[1]); F3.c = c; }
    else {
      const dx = g.Mp[0] - g.B[0], dy = g.Mp[1] - g.B[1], D = Math.hypot(dx, dy);
      const x = (F3.k * F3.k - c * c + D * D) / (2 * D), h = Math.sqrt(Math.max(0, F3.k * F3.k - x * x)), ex = dx / D, ey = dy / D;
      const p1 = [g.B[0] + x * ex - h * ey, g.B[1] + x * ey + h * ex], p2 = [g.B[0] + x * ex + h * ey, g.B[1] + x * ey - h * ex];
      Kp = Math.hypot(p1[0] - Kp[0], p1[1] - Kp[1]) < Math.hypot(p2[0] - Kp[0], p2[1] - Kp[1]) ? p1 : p2;
    }
    const kv = [(Kp[0] - g.B[0]) / F3.k, (Kp[1] - g.B[1]) / F3.k], u2 = rot(kv, -F3.ka);
    let th2 = Math.atan2(u2[0], -u2[1]); if (th2 < -0.5) th2 += 2 * Math.PI;
    tab.push(th2);
  }
  return tab;
})();
export function f3frame(u) {
  u = clamp(u, 0, 1);
  const d = F3.dClosed - F3.travel * u, g = f3raw(d);
  const x = u * (F3T.length - 1), i = Math.min(F3T.length - 2, Math.floor(x)), th2 = lerp(F3T[i], F3T[i + 1], x - i);
  const u2 = dirOf(th2), kv = rot(u2, F3.ka), Kp = [g.B[0] + F3.k * kv[0], g.B[1] + F3.k * kv[1]];
  const C = [g.B[0] + F3.l2 * u2[0], g.B[1] + F3.l2 * u2[1]];
  const u3 = g.u1, T = [C[0] + F3.l3 * u3[0], C[1] + F3.l3 * u3[1]];
  const lv = rot(g.u1, F3.q), Q = [g.B[0] + F3.e * lv[0], g.B[1] + F3.e * lv[1]], W = [C[0] + F3.e * lv[0], C[1] + F3.e * lv[1]];
  return { ...g, d, u, th2, K: Kp, C, T, Q, W };
}

// ---------------------------------------------------------------- page helpers
export const inReel = () => document.body.classList.contains('gb-reel');
export const narrowScreen = () => window.innerWidth < 560 && !inReel();
export function rows(head, list, keep = 3) {
  return `<div class="big">${head}</div>` + (narrowScreen() ? list.slice(0, keep) : list).map(([a, b, cls]) => `<div class="row"><span>${a}</span><b${cls ? ` class="${cls}"` : ''}>${b}</b></div>`).join('');
}
// On a phone-width stage, hide minor labels and nudge the picture down, clear of the readout.
export function fitNarrow(stage, minor = [], y = -0.13, wideX = 0) {
  const narrow = stage.host.clientWidth < 560 && !inReel();
  minor.forEach((l) => { if (l) l.visible = !narrow; });
  const sy = narrow ? y : 0, sx = narrow || inReel() ? 0 : wideX;
  if (!stage.shift || stage.shift[1] !== sy || stage.shift[0] !== sx) stage.setShift(sx, sy);
  return narrow;
}
export const fmtN = (F) => (F >= 100 ? Math.round(F) + ' N' : F >= 10 ? F.toFixed(0) + ' N' : F.toFixed(1) + ' N');
export const COL = { cloth: 0xe5502c, cloth2: 0xb93b1c, steel: 0xc3c8d1, dark: 0x4d525e, wood: 0x9c6b3e, rib: 0xdfe4ec, stretcher: 0x7aa2ff, runner: 0xffb547, spring: 0x5ce1a9, tension: 0x8ef0ff, push: 0xffb547, bad: 0xff5a8a, link: 0xc49bff };

// A chart board: a canvas on a plane. place() moves it for the tall video frame.
export function board(root, w, h, pxW, pxH, draw, pos, rotY = 0) {
  const c = document.createElement('canvas'); c.width = pxW; c.height = pxH;
  const g = c.getContext('2d'), tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const redraw = () => { draw(g, pxW, pxH); tex.needsUpdate = true; };
  redraw();
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, side: THREE.DoubleSide }));
  mesh.position.set(...pos); mesh.rotation.y = rotY; root.add(mesh);
  const b = { mesh, redraw, home: { p: new THREE.Vector3(...pos), r: rotY } };
  b.place = (reelPos, reelScale = 1, reelRot = 0) => {
    if (inReel()) { mesh.position.set(...reelPos); mesh.rotation.y = reelRot; mesh.scale.setScalar(reelScale); }
    else { mesh.position.copy(b.home.p); mesh.rotation.y = b.home.r; mesh.scale.setScalar(1); }
  };
  return b;
}
export function panelBg(g, w, h) { g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(8,10,16,.9)'; g.beginPath(); g.roundRect(0, 0, w, h, 22); g.fill(); }

// A force arrow that draws over everything. aim(from, direction, length).
const UP = new THREE.Vector3(0, 1, 0), tmpV = new THREE.Vector3();
export function force(color, r = 0.035, head = 0.22) {
  const a = arrow(color, 1, head, r);
  a.traverse((o) => { if (o.material) { o.material.depthTest = false; o.material.transparent = true; o.renderOrder = 10; } });
  a.aim = (from, dir, len) => {
    a.position.set(...from);
    tmpV.set(...dir); if (tmpV.lengthSq() < 1e-9) tmpV.set(1, 0, 0);
    a.quaternion.setFromUnitVectors(UP, tmpV.normalize());
    a.set(Math.max(0.001, len));
    a.visible = len > head * 0.5;
  };
  return a;
}

// ---------------------------------------------------------------- 3D parts
const shadowed = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };
function cylY(r, y0, y1, mat, seg = 24, r1 = r) { const m = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(r1, r, Math.abs(y1 - y0), seg), mat)); m.position.y = (y0 + y1) / 2; return m; }

// Many thin bars between pairs of points (ribs, stretchers, links, rain streaks).
export function segs(count, mat, sides = 8) {
  const m = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, sides), mat, count);
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.castShadow = true; m.frustumCulled = false;
  const A = new THREE.Vector3(), B = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), mx = new THREE.Matrix4(), mid = new THREE.Vector3();
  m.seg = (i, ax, ay, az, bx, by, bz, r) => {
    A.set(ax, ay, az); B.set(bx, by, bz);
    const len = A.distanceTo(B);
    if (len < 1e-6 || r <= 0) { mx.makeScale(0, 0, 0); m.setMatrixAt(i, mx); return; }
    q.setFromUnitVectors(UP, tmpV.copy(B).sub(A).divideScalar(len));
    mid.copy(A).add(B).multiplyScalar(0.5); sc.set(r, len, r);
    m.setMatrixAt(i, mx.compose(mid, q, sc));
  };
  m.done = () => { m.instanceMatrix.needsUpdate = true; };
  return m;
}
export function dots(count, r, mat) {
  const m = new THREE.InstancedMesh(new THREE.SphereGeometry(r, 12, 8), mat, count);
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.castShadow = true;
  const mx = new THREE.Matrix4();
  m.put = (i, x, y, z, k = 1) => { mx.makeScale(k, k, k); mx.setPosition(x, y, z); m.setMatrixAt(i, mx); };
  m.done = () => { m.instanceMatrix.needsUpdate = true; };
  return m;
}

// The cloth: n gores, each a strip between two neighbouring ribs with a centre line. When the
// ribs are closer together than the cloth is wide, the centre line folds inwards (a pleat).
// from/to pick the stations it covers (used for the vent cap and the main canopy of a vented umbrella).
export function makeCanopy(n, stations, { colors = [COL.cloth, COL.cloth2], opacity = 1, from = 0, to = stations - 1, lift = 3 } = {}) {
  const rowsN = to - from + 1, vCount = n * rowsN * 3;
  const pos = new Float32Array(vCount * 3), col = new Float32Array(vCount * 3), idx = [];
  const c1 = new THREE.Color(colors[0]), c2 = new THREE.Color(colors[1]);
  for (let i = 0; i < n; i++) {
    const c = i % 2 ? c2 : c1, base = i * rowsN * 3;
    for (let k = 0; k < rowsN; k++) for (let j = 0; j < 3; j++) { const v = base + k * 3 + j; col[v * 3] = c.r; col[v * 3 + 1] = c.g; col[v * 3 + 2] = c.b; }
    for (let k = 0; k < rowsN - 1; k++) for (let j = 0; j < 2; j++) { const p = base + k * 3 + j, q = p + 3; idx.push(p, q, p + 1, p + 1, q, q + 1); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(idx);
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0, side: THREE.DoubleSide, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });
  const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
  const sn = Math.sin(Math.PI / n), cs = Math.cos(Math.PI / n);
  // pts: current rib stations [r, y]; open: the stations with the cloth tight (the size the cloth was cut to).
  mesh.shape = (pts, open, y0 = 0) => {
    for (let i = 0; i < n; i++) {
      const a0 = (i * 2 * Math.PI) / n, a1 = ((i + 1) * 2 * Math.PI) / n, am = (a0 + a1) / 2, base = i * rowsN * 3;
      for (let k = 0; k < rowsN; k++) {
        const [r, y] = pts[from + k], w = 2 * open[from + k][0] * sn, c = 2 * r * sn;
        const fold = Math.min(Math.sqrt(Math.max(0, w * w - c * c)) / 2, r * cs * 0.78);
        const rm = r * cs - fold, yy = y0 + y + lift, v = (base + k * 3) * 3;
        pos[v] = r * Math.cos(a0); pos[v + 1] = yy; pos[v + 2] = r * Math.sin(a0);
        pos[v + 3] = rm * Math.cos(am); pos[v + 4] = yy; pos[v + 5] = rm * Math.sin(am);
        pos[v + 6] = r * Math.cos(a1); pos[v + 7] = yy; pos[v + 8] = r * Math.sin(a1);
      }
    }
    geo.attributes.position.needsUpdate = true; geo.computeVertexNormals();
  };
  mesh.fade = (o) => { mat.opacity = o; mat.transparent = o < 1; mat.depthWrite = o >= 0.99; mesh.visible = o > 0.01; };
  return mesh;
}

// A plain stick umbrella with a crook handle. set({ d, inv, ex }) poses it:
// d = runner distance below the notch, inv = how far it has turned inside out, ex = explode.
export function makeUmbrella({ n = 8, vented = false, colors, opacity = 1, handle = true } = {}) {
  const g = new THREE.Group(); g.scale.setScalar(S);
  const YN = U.YN;
  const steel = M.metal(COL.steel), dark = M.metal(COL.dark, { roughness: 0.5 });
  const shaft = cylY(5, 95, YN + 12, steel, 20);
  const ferrule = new THREE.Group();
  ferrule.add(cylY(3.4, YN + 12, YN + 78, steel, 16, 2.6), cylY(4.2, YN + 78, YN + 88, dark, 16));
  const cap = cylY(20, YN + 5, YN + 15, dark, 28, 6); ferrule.add(cap);
  const notch = new THREE.Group(); notch.add(cylY(U.rn + 3, YN - 9, YN + 4, dark, 24), cylY(7, YN - 16, YN - 9, dark, 20));
  const runner = new THREE.Group();
  runner.add(cylY(U.rr + 3, -3, 7, M.metal(COL.runner, { roughness: 0.4 }), 24), cylY(8.5, -30, -3, M.metal(COL.runner, { roughness: 0.4 }), 24));
  const grip = new THREE.Group();
  if (handle) {
    const wood = M.plastic(COL.wood, { roughness: 0.6 });
    const curve = new THREE.CatmullRomCurve3([[0, 100], [0, 60], [-4, 28], [-22, 6], [-46, 2], [-66, 18], [-72, 46], [-70, 62]].map(([x, y]) => new THREE.Vector3(x, y, 0)));
    grip.add(shadowed(new THREE.Mesh(new THREE.TubeGeometry(curve, 60, 10.5, 14, false), wood)));
    const e1 = shadowed(new THREE.Mesh(new THREE.SphereGeometry(10.5, 14, 10), wood)); e1.position.set(-70, 62, 0); grip.add(e1);
    grip.add(cylY(8, 100, 112, dark, 18));
  }
  // The two spring catches: sprung wedges that stick out of the shaft and hold the runner.
  const sp = M.plastic(COL.spring), topSpring = shadowed(new THREE.Mesh(new THREE.BoxGeometry(7, 20, 3), sp)), botSpring = topSpring.clone();
  topSpring.position.set(6, YN - U.dOpen - 41, 0); botSpring.position.set(6, YN - U.dClosed + 18, 0);
  const ribMat = M.metal(COL.rib, { roughness: 0.35 }), strMat = M.metal(COL.stretcher, { roughness: 0.4 });
  const ribs = segs(n * K, ribMat), stretchers = segs(n, strMat), pins = dots(n * 2, 4.2, dark), tips = dots(n, 5, M.plastic(0xf2f2f2));
  const canopy = makeCanopy(n, K + 1, { colors, opacity, from: vented ? 5 : 0 });
  const ventCap = vented ? makeCanopy(n, K + 1, { colors: [COL.cloth2, COL.cloth], opacity, from: 0, to: 8, lift: 16 }) : null;
  g.add(shaft, ferrule, notch, runner, grip, topSpring, botSpring, ribs, stretchers, pins, tips, canopy);
  if (ventCap) g.add(ventCap);
  let openPts = ribPoints(frame(U.dOpen, { n }));
  const um = { g, n, parts: { shaft, ferrule, notch, runner, grip, topSpring, botSpring, ribs, stretchers, canopy, ventCap, pins, tips }, f: null, pts: null };
  um.set = ({ d = U.dOpen, inv = 0, ex = 0, thT = U.thT, EI = U.EI } = {}) => {
    const f = frame(d, { n, thT, EI }), pts = ribPoints(f, inv);
    if (thT !== um.thT) { um.thT = thT; openPts = ribPoints(frame(dOf(Math.max(thT, U.th0 + 0.01)), { n, thT })); }
    um.f = f; um.pts = pts;
    const yRib = YN + ex * 20, yStr = YN - ex * 120, yRun = YN - d - ex * 260;
    for (let i = 0; i < n; i++) {
      const a = (i * 2 * Math.PI) / n, cx = Math.cos(a), sz = Math.sin(a);
      for (let k = 0; k < K; k++) { const p = pts[k], q = pts[k + 1]; ribs.seg(i * K + k, p[0] * cx, yRib + p[1], p[0] * sz, q[0] * cx, yRib + q[1], q[0] * sz, 2.3); }
      const J = pts[JI], T = pts[K];
      // With the explode slider the stretcher keeps its shape and simply drops as one piece.
      stretchers.seg(i, U.rr * cx, yStr - d, U.rr * sz, J[0] * cx, yStr + J[1], J[0] * sz, 2);
      pins.put(i * 2, J[0] * cx, yRib + J[1], J[0] * sz); pins.put(i * 2 + 1, U.rn * cx, yRib, U.rn * sz, 0.8);
      tips.put(i, T[0] * cx, yRib + T[1], T[0] * sz);
    }
    ribs.done(); stretchers.done(); pins.done(); tips.done();
    canopy.shape(pts, openPts, YN + ex * 220);
    if (ventCap) ventCap.shape(pts, openPts, YN + ex * 220);
    runner.position.y = yRun; ferrule.position.y = ex * 340; notch.position.y = ex * 20; grip.position.y = -ex * 120;
    return f;
  };
  um.fade = (o) => { canopy.fade(o); ventCap?.fade(o); };
  um.set();
  return um;
}

// The three-fold umbrella with a telescopic shaft. set({ u, tele }): u = runner (0 shut, 1 open),
// tele = shaft pulled out (0 packed, 1 full length).
export const F3S = { h0: 58, tube: 172, stub: 215 };      // handle height, travel of each sliding tube, packed notch height above the handle
F3S.packed = F3S.h0 + F3S.stub + 16;                       // mm, packed length with its cap
F3S.full = F3S.packed + 2 * F3S.tube;
export function makeFolding({ n = 8, opacity = 0.35, colors } = {}) {
  const g = new THREE.Group(); g.scale.setScalar(S);
  const steel = M.metal(COL.steel), dark = M.metal(COL.dark, { roughness: 0.5 });
  const handle = cylY(17, 0, F3S.h0, M.plastic(0x2c3344, { roughness: 0.6 }), 28, 15);
  const t1 = cylY(7, F3S.h0, F3S.h0 + F3S.stub - 20, steel, 20), t2 = cylY(5.6, 0, F3S.stub - 12, steel, 20), t3 = cylY(4.3, 0, F3S.stub - 4, steel, 20);
  const notch = new THREE.Group(); notch.add(cylY(F3.rn + 3, -8, 4, dark, 24), cylY(12, 4, 12, dark, 24, 4));
  const runner = new THREE.Group(); runner.add(cylY(F3.rr + 3, -3, 6, M.metal(COL.runner, { roughness: 0.4 }), 24), cylY(9.5, -22, -3, M.metal(COL.runner, { roughness: 0.4 }), 24));
  const coil = new THREE.Mesh(new THREE.BufferGeometry(), M.plastic(COL.spring)); coil.visible = false;
  const ribMat = M.metal(COL.rib, { roughness: 0.35 });
  const top = segs(n, ribMat), mid = segs(n, M.metal(0xffd08a, { roughness: 0.4 })), end = segs(n, M.plastic(0x5ce1a9)), str = segs(n, M.metal(COL.stretcher, { roughness: 0.4 }));
  const links = segs(n * 4, M.plastic(COL.link)), pins = dots(n * 6, 3.2, dark), tips = dots(n, 4.5, M.plastic(0xf2f2f2));
  const ST = 10, canopy = makeCanopy(n, ST, { colors, opacity, lift: 4 });
  g.add(handle, t1, t2, t3, notch, runner, coil, top, mid, end, str, links, pins, tips, canopy);
  const stations = (f) => { const o = []; const leg = (A, B, k) => { for (let i = 1; i <= k; i++) o.push([lerp(A[0], B[0], i / k), lerp(A[1], B[1], i / k)]); }; o.push(f.N); leg(f.N, f.B, 3); leg(f.B, f.C, 3); leg(f.C, f.T, 3); return o; };
  const openPts = stations(f3frame(1));
  const fm = { g, n, parts: { handle, t1, t2, t3, notch, runner, canopy, coil }, f: null, yN: 0 };
  let coilKey = '';
  fm.set = ({ u = 1, tele = 1, spring = false } = {}) => {
    const f = f3frame(u); fm.f = f;
    const yT2 = F3S.h0 + 12 + tele * F3S.tube, yT3 = yT2 + 8 + tele * F3S.tube, yN = F3S.h0 + F3S.stub + tele * 2 * F3S.tube;
    fm.yN = yN; t2.position.y = yT2 + (F3S.stub - 12) / 2 - 12; t3.position.y = yN - (F3S.stub - 4) / 2;
    notch.position.y = yN; runner.position.y = Math.max(F3S.h0 + 24, yN - f.d);
    for (let i = 0; i < n; i++) {
      const a = (i * 2 * Math.PI) / n, cx = Math.cos(a), sz = Math.sin(a);
      const P = (p) => [p[0] * cx, yN + p[1], p[0] * sz];
      const bar = (m, j, A, B, r) => { const p = P(A), q = P(B); m.seg(j, p[0], p[1], p[2], q[0], q[1], q[2], r); };
      bar(top, i, f.N, f.B, 2.3); bar(mid, i, f.B, f.C, 2); bar(end, i, f.C, f.T, 1.6); bar(str, i, f.R, f.J, 2);
      bar(links, i * 4, f.Mp, f.K, 1.1); bar(links, i * 4 + 1, f.Q, f.W, 0.9); bar(links, i * 4 + 2, f.B, f.K, 1.6); bar(links, i * 4 + 3, f.C, f.W, 1.4);
      [f.J, f.B, f.C, f.K, f.Mp, f.W].forEach((p, j) => { const w = P(p); pins.put(i * 6 + j, w[0], w[1], w[2], j < 3 ? 1 : 0.7); });
      const t = P(f.T); tips.put(i, t[0], t[1], t[2]);
    }
    [top, mid, end, str, links, pins, tips].forEach((m) => m.done());
    canopy.shape(stations(f), openPts, yN);
    // The automatic kind: a long coil spring around the shaft, squeezed between the handle and the runner.
    coil.visible = spring;
    if (spring) {
      const y0 = F3S.h0 + 6, y1 = runner.position.y - 24, key = y1.toFixed(0);
      if (key !== coilKey && y1 > y0 + 4) {
        coilKey = key; const pts = [], turns = 16, Np = turns * 14;
        for (let i = 0; i <= Np; i++) { const t = i / Np, an = t * turns * Math.PI * 2; pts.push(new THREE.Vector3(11 * Math.cos(an), lerp(y0, y1, t), 11 * Math.sin(an))); }
        coil.geometry.dispose(); coil.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), Np, 1.3, 6, false);
      }
    }
    return f;
  };
  fm.set();
  return fm;
}
