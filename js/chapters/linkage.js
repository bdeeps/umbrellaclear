// Chapter 2: the linkage. Runner height sets every stretcher and rib angle through three pin
// joints (umbrella.js solves the triangle). Past the taut point the cloth holds the tips, the
// ribs bend like bows, and the top spring has to hold the runner against that push.
import { M, clamp } from '../kit.js';
import { makeUmbrella, U, frame, dOfU, tautU, segs, force, board, panelBg, rows, fitNarrow, fmtN, COL, D2R, S, inReel } from '../umbrella.js';

const UT = tautU();
// The whole travel, tabulated once for the chart.
const CURVE = Array.from({ length: 121 }, (_, i) => { const u = i / 120, f = frame(dOfU(u)); return { u, ang: f.thJ / D2R, push: f.push }; });
const PMAX = 20;

export default {
  id: 'linkage',
  short: 'The linkage',
  title: 'One push opens eight ribs',
  subtitle: 'A rib, a stretcher and the shaft make a triangle. Shorten one side and it must open.',
  view: { pos: [0.9, 7.8, 15.6], target: [0.2, 7.2, 0] },
  learn: `<p>Look at one rib. It hinges on the <b>top notch</b>. Its stretcher hinges on the <b>runner</b>. The two meet at a third hinge, the <b>joint</b>. Those three pins make a <b>triangle</b>, and one side of it is the piece of shaft between the notch and the runner.</p>
    <p>The rib side and the stretcher side cannot change length. So when you push the runner up, the shaft side gets shorter, and the triangle has only one way to go: the joint swings <b>out</b>. Every rib has the same triangle on the same runner, so all eight open together. Nothing here is guessed: the model works the joint out from the three lengths.</p>
    <p>For most of the way the cloth hangs slack and the push is light. Then, a few centimetres from the top, the cloth pulls <b>tight</b>. Now the tips cannot go out any further, but the stretchers keep pushing the middle of each rib. The ribs <b>bend</b> like bows. A bent rib is a spring (see <a href="https://glassbox.how/hookeclear/">HookeClear</a>), and it pushes the runner back down. The <b>top spring</b> clicks out under the runner and holds it against that push.</p>
    <p>There is no magic balance point. If you stop just short of the catch and let go, the runner slides back to where the cloth goes slack.</p>
    <p class="tip"><b>Try it:</b> slide the runner slowly near the top and watch the push climb. Then switch off “Hold the runner” just before it latches.</p>`,
  terms: [
    { t: 'Linkage', d: 'Stiff bars joined by pins so that moving one part moves the others in a fixed way.' },
    { t: 'Pin joint', d: 'A hinge: two bars joined so they can turn about one point but not come apart.' },
    { t: 'Slider', d: 'A part that can only move along a straight guide. The runner is a slider on the shaft.' },
    { t: 'Taut', d: 'Pulled tight. The cloth goes taut when the rib tips are as far apart as its hem allows.' },
    { t: 'Top spring', d: 'The sprung catch that pops out under the runner and holds the umbrella open.' },
  ],
  defaults: { run: 0.55, hold: true },
  controls: [
    { key: 'run', type: 'range', label: 'Push the runner up', min: 0, max: 1, step: 0.002, ends: ['shut', 'latched'], fmt: (v) => Math.round(v * U.travel) + ' mm' },
    { key: 'hold', type: 'toggle', label: 'Hold the runner', hint: 'Off: your hand lets go. Unless the top spring has clicked in, the bent ribs push the runner back.' },
  ],
  quiz: [
    { q: 'Why do all eight ribs open at the same time?', options: ['Each has its own motor', 'Their stretchers all hinge on one runner', 'The cloth pulls them', 'Gravity'], answer: 1, why: 'Eight identical triangles share one moving corner, the runner. Move it and all eight change together.' },
    { q: 'In the rib, stretcher and shaft triangle, which side changes length as the umbrella opens?', options: ['The rib', 'The stretcher', 'The shaft between notch and runner', 'None of them'], answer: 2, why: 'The bars are stiff. Only the distance from the notch to the runner changes, and that forces the joint outwards.' },
    { q: 'Near the top the push suddenly gets harder. Why?', options: ['The runner rusts', 'The cloth has gone tight, so the ribs must bend', 'The shaft gets thicker', 'Air pressure'], answer: 1, why: 'Once the hem is tight the tips are held. Pushing further bends each rib like a bow, and bent ribs push back.' },
  ],
  reel: [
    { ms: 6000, caption: 'Each rib, its stretcher and the shaft make a triangle. Push the runner up and the triangle has to open.', set: { hold: true }, anim: { run: [0.02, 0.8] }, view: { pos: [0.8, 7.6, 11.7], target: [0, 7.2, 0] }, spin: 0 },
    { ms: 5600, caption: 'Near the top the cloth pulls tight. The ribs bend like bows and the top spring holds the runner against them.', set: { hold: true }, anim: { run: [0.78, 1] }, view: { pos: [0.8, 7.6, 11.7], target: [0, 7.2, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const X0 = 0;
    const um = makeUmbrella({ opacity: 0.2 });
    um.g.position.x = X0; stage.root.add(um.g);
    // The triangle of rib 0, drawn over everything.
    const triM = (c) => { const m = segs(1, M.glow(c, { depthTest: false, transparent: true, opacity: 0.95 })); m.renderOrder = 9; um.g.add(m); return m; };
    const tri = [triM(0x8ef0ff), triM(0x7aa2ff), triM(0xffb547)];
    const push = force(COL.bad, 0.05, 0.3), up = force(COL.push, 0.05, 0.3), hem = [force(COL.tension, 0.04, 0.24), force(COL.tension, 0.04, 0.24)];
    stage.root.add(push, up, ...hem);
    const L = (t, p, cls) => stage.label(t, p, um.g, cls);
    const lb = { n: L('Notch pin', [0, 0, 0]), r: L('Runner pin', [0, 0, 0], 'hot'), j: L('Joint', [0, 0, 0], 'hot'), cloth: L('Cloth slack', [0, 0, 0]), ang: L('', [0, 0, 0]), spring: L('Top spring', [-70, U.YN - U.dOpen - 41, 0]) };
    const cur = { u: 0 };
    const chart = board(stage.root, 5.6, 3.7, 930, 615, (g, w, h) => {
      panelBg(g, w, h);
      g.fillStyle = '#e8eef8'; g.font = 'bold 30px sans-serif'; g.fillText('Runner height sets everything', 28, 46);
      const x0 = 86, y0 = h - 70, cw = w - 180, ch = h - 160, X = (u) => x0 + cw * u, YA = (a) => y0 - (ch * a) / 90, YP = (p) => y0 - (ch * Math.min(p, PMAX)) / PMAX;
      g.lineWidth = 2; g.font = '20px sans-serif';
      for (const a of [0, 30, 60, 90]) { g.strokeStyle = 'rgba(255,255,255,.13)'; g.beginPath(); g.moveTo(x0, YA(a)); g.lineTo(x0 + cw, YA(a)); g.stroke(); g.fillStyle = '#8ef0ff'; g.fillText(a + '°', x0 - 50, YA(a) + 7); }
      g.fillStyle = '#ffb547'; for (const p of [0, 10, 20]) g.fillText(p + ' N', x0 + cw + 12, YP(p) + 7);
      g.fillStyle = 'rgba(255,255,255,.65)'; for (const mm of [0, 100, 200, 300]) g.fillText(mm + '', X(mm / U.travel) - 14, y0 + 28);
      g.fillText('runner pushed up (mm)', x0 + cw / 2 - 100, y0 + 56);
      g.strokeStyle = 'rgba(255,255,255,.5)'; g.setLineDash([8, 8]); g.beginPath(); g.moveTo(X(UT), y0); g.lineTo(X(UT), y0 - ch); g.stroke(); g.setLineDash([]);
      g.fillStyle = 'rgba(255,255,255,.8)'; g.fillText('cloth tight', X(UT) - 112, y0 - ch + 18);
      const line = (key, Yf, col) => { g.strokeStyle = col; g.lineWidth = 5; g.beginPath(); CURVE.forEach((c, i) => (i ? g.lineTo(X(c.u), Yf(c[key])) : g.moveTo(X(c.u), Yf(c[key])))); g.stroke(); };
      line('ang', YA, '#8ef0ff'); line('push', YP, '#ffb547');
      g.font = 'bold 22px sans-serif'; g.fillStyle = '#8ef0ff'; g.fillText('rib angle', x0 + 14, YA(34)); g.fillStyle = '#ffb547'; g.fillText('push back on the runner', x0 + 150, y0 - 14);
      const f = frame(dOfU(cur.u));
      const dot = (y, col) => { g.fillStyle = col; g.beginPath(); g.arc(X(cur.u), y, 11, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 3; g.stroke(); };
      dot(YA(f.thJ / D2R), '#8ef0ff'); dot(YP(f.push), '#ffb547');
    }, [4.6, 11.8, 0], 0);

    let u = 0.55, key = '';
    const st = { latched: false, slipping: false };
    return {
      update(dt, s) {
        dt = Math.max(0, dt);
        st.latched = s.run >= 0.995;
        const target = s.hold || st.latched ? s.run : Math.min(s.run, UT);
        st.slipping = target < s.run - 0.002;
        u += (target - u) * Math.min(1, dt * (st.slipping ? 5 : 30));
        if (inReel()) u = s.run;
        const f = um.set({ d: dOfU(u) }), YN = U.YN, y = (v) => YN + v;
        tri[0].seg(0, f.N[0], y(0), 0, f.J[0], y(f.J[1]), 0, 4.2); tri[1].seg(0, f.R[0], y(f.R[1]), 0, f.J[0], y(f.J[1]), 0, 4.2); tri[2].seg(0, f.N[0], y(0), 0, f.R[0], y(f.R[1]), 0, 5.4); tri.forEach((m) => m.done());
        lb.n.position.set(-75, y(8), 0); lb.r.position.set(-85, y(-f.d), 0); lb.j.position.set(f.J[0] + 20, y(f.J[1]) - 38, 0);
        const T = um.pts[15];
        lb.cloth.element.textContent = f.taut ? 'Cloth tight' : 'Cloth slack'; lb.cloth.element.classList.toggle('hot', f.taut);
        lb.cloth.position.set(T[0] * 0.72, y(T[1]) + 70, T[0] * 0.72);
        lb.ang.element.textContent = Math.round(f.thJ / D2R) + '°'; lb.ang.position.set(f.J[0] * 0.42 + 26, y(f.J[1] * 0.42) - 4, 0);
        // The ribs' push on the runner (down) and the hand or the catch holding it (up).
        const k = clamp(f.push / PMAX, 0, 1) * 2.2, rx = X0, ry = y(-f.d) * S;
        push.aim([rx + 0.45, ry - 0.35, 0], [0, -1, 0], k);
        up.aim([rx - 0.45, ry - 0.5 - k, 0], [0, 1, 0], st.slipping ? 0 : k);
        // Hem tension at the tip of rib 0, pulling towards its two neighbours.
        const hk = clamp(f.hem / 8, 0, 1) * 1.5, tx = X0 + T[0] * S, ty = y(T[1]) * S, c = Math.cos(Math.PI / 4), sn = Math.sin(Math.PI / 4);
        hem[0].aim([tx, ty, 0], [c - 1, 0, sn], hk); hem[1].aim([tx, ty, 0], [c - 1, 0, -sn], hk);
        const k2 = u.toFixed(3);
        if (k2 !== key) { key = k2; cur.u = u; chart.redraw(); }
        chart.place([0, 13.2, 0], 1.25);
        const narrow = fitNarrow(stage, [lb.n, lb.spring, lb.ang], -0.1);
        chart.mesh.visible = !narrow;
      },
      readout: () => {
        const f = um.f;
        return rows(st.latched ? 'Latched on the top spring' : st.slipping ? 'Let go: it slides back' : f.taut ? 'Cloth tight: the ribs are bending' : 'Cloth slack: an easy push', [
          ['Push back on the runner', fmtN(f.push), f.push > 0.05 ? 'no' : 'ok'],
          ['Rib angle from the shaft', Math.round(f.thJ / D2R) + '°'],
          ['Notch to runner (the short side)', Math.round(f.d) + ' mm'],
          ['Each rib bows by', f.delta.toFixed(0) + ' mm'],
          ['Pull along the hem', fmtN(f.hem)],
          ['Energy stored in the bent ribs', f.energy.toFixed(2) + ' J'],
        ], 3);
      },
    };
  },
};
