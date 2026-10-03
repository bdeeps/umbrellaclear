// Chapter 3: the canopy as a tension structure. The cloth is cut a little too small, so the
// latched frame has to bend its ribs to fit. Cloth in tension, ribs in bending and compression.
import { clamp } from '../kit.js';
import { makeUmbrella, U, frame, roundness, polyArea, force, board, panelBg, rows, fitNarrow, fmtN, COL, D2R, S } from '../umbrella.js';

const COUNTS = [8, 10, 16, 24];
const thTof = (s) => U.thOpen - s.tight * D2R;
export const frameMass = (n) => n * (U.RIB_G + U.STR_G);   // grams of ribs and stretchers (estimate, see umbrella.js)

export default {
  id: 'canopy',
  short: 'Taut cloth',
  title: 'Cloth that pulls, ribs that push',
  subtitle: 'The ribs are bent springs. The tight cloth is what holds them bent.',
  view: { pos: [3.8, 11.6, 15.2], target: [0.2, 7.2, 0] },
  learn: `<p>An open umbrella is not a floppy sheet lying on sticks. The cloth is cut slightly <b>too small</b> for the frame. To latch, the frame must bend every rib into a gentle curve, like eight bows strung by one sheet.</p>
    <p>That sets up a tug of war that makes the whole thing stiff. The cloth is in <b>tension</b>: it pulls along the hem from tip to tip and holds each tip down. The ribs are in <b>bending</b> and are squeezed along their length, in <b>compression</b>. Thin cloth is very strong when pulled, and a thin rib only has to span the short gap to its stretcher. So a roof a metre wide can weigh under half a kilogram.</p>
    <p>Why <b>eight</b> ribs? More ribs make the edge rounder, give each rib a smaller share of the wind, and leave shorter spans of unsupported cloth. But every extra rib adds a rib, a stretcher and three pins. Sixteen and twenty-four rib umbrellas are sturdier and heavier. Eight is the usual bargain.</p>
    <p>The cloth itself is closely woven polyester or nylon, often the plain weave called <b>pongee</b>. A sun umbrella's cloth may carry a <b>UPF</b> number. Under the Australian standard AS 4399, UPF 50 means the cloth let through one fiftieth of the sun's ultraviolet in the test, so it blocked 98%. The rating describes the cloth, not the light that reaches you from the sides.</p>
    <p class="tip"><b>Try it:</b> cut the cloth tighter and watch the ribs bow and the hem pull grow. Then go from 8 ribs to 24 and compare the weight.</p>`,
  terms: [
    { t: 'Tension', d: 'A pulling force along something. Cloth, rope and string can only carry tension.' },
    { t: 'Compression', d: 'A squeezing force along something. A rib pushed from both ends is in compression.' },
    { t: 'Bending', d: 'A bar loaded sideways curves: one face is stretched and the other squeezed.' },
    { t: 'Tension structure', d: 'A structure kept in shape by parts that are pulled tight, like a tent, a kite or an umbrella.' },
    { t: 'Hem', d: 'The outer edge of the canopy. It runs from rib tip to rib tip and limits how far they can spread.' },
    { t: 'UPF', d: 'Ultraviolet protection factor: how much the cloth cuts ultraviolet in a standard test. UPF 50 passes one fiftieth.' },
  ],
  defaults: { ribs: 8, tight: 7, arrows: true },
  controls: [
    { key: 'ribs', type: 'seg', label: 'Number of ribs', options: COUNTS.map((v) => ({ v, label: String(v) })) },
    { key: 'tight', type: 'range', label: 'How tight the cloth is cut', min: 0, max: 11, step: 0.1, ends: ['loose', 'drum tight'], fmt: (v, s) => frame(U.dOpen, { n: s.ribs, thT: thTof(s) }).delta.toFixed(0) + ' mm bow' },
    { key: 'arrows', type: 'toggle', label: 'Show the forces' },
  ],
  quiz: [
    { q: 'In an open umbrella, what is the cloth doing?', options: ['Pulling: it is in tension and holds the ribs bent', 'Resting loosely on the ribs', 'Pushing the ribs outwards', 'Nothing'], answer: 0, why: 'The cloth is cut slightly small. It pulls on the rib tips, and the bent ribs pull back. That is what makes it taut.' },
    { q: 'What do you gain with 16 ribs instead of 8?', options: ['A lighter umbrella', 'A smaller canopy', 'A rounder, sturdier canopy that weighs more', 'Nothing changes'], answer: 2, why: 'Each rib carries a smaller share and the cloth spans are shorter. The price is twice as many ribs and stretchers to carry.' },
    { q: 'A sun umbrella is labelled UPF 50. What does that tell you?', options: ['It is 50 cm wide', 'The cloth let through about 1/50 of the ultraviolet in the test', 'It lasts 50 years', 'It works for 50 minutes'], answer: 1, why: 'UPF is a test of the cloth. One fiftieth gets through, so 98% is blocked by the cloth itself.' },
  ],
  reel: [
    { ms: 5600, caption: 'The cloth is cut a little small, so the ribs bend like bows. Cloth pulls, ribs push, and the roof goes stiff.', set: { ribs: 8, arrows: true }, anim: { tight: [0, 10] }, view: { pos: [5.5, 10.2, 9.6], target: [0, 7.0, 0] }, spin: 0.5 },
  ],

  build({ stage }) {
    let um = null, n = 0;
    const hems = Array.from({ length: 8 }, () => force(COL.tension, 0.04, 0.24)), comps = Array.from({ length: 4 }, () => force(COL.push, 0.045, 0.26));
    stage.root.add(...hems, ...comps);
    const lb = { hem: stage.label('Hem pulls (tension)', [0, 0, 0], stage.root, 'hot'), rib: stage.label('Rib squeezed and bent', [0, 0, 0]) };
    const cur = { n: 8 };
    const chart = board(stage.root, 5.2, 3.44, 900, 595, (g, w, h) => {
      panelBg(g, w, h);
      g.fillStyle = '#e8eef8'; g.font = 'bold 30px sans-serif'; g.fillText('More ribs: rounder, stronger, heavier', 28, 46);
      const x0 = 70, bw = (w - 110) / 4, y0 = h - 64, ch = h - 190;
      COUNTS.forEach((c, i) => {
        const on = c === cur.n, x = x0 + i * bw, rd = roundness(c), mass = frameMass(c);
        g.globalAlpha = on ? 1 : 0.45;
        g.fillStyle = '#8ef0ff'; const h1 = ch * ((rd - 0.85) / 0.15); g.fillRect(x, y0 - h1, bw * 0.3, h1);
        g.fillStyle = '#ffb547'; const h2 = ch * (mass / 500); g.fillRect(x + bw * 0.36, y0 - h2, bw * 0.3, h2);
        g.font = 'bold 22px sans-serif'; g.fillStyle = '#8ef0ff'; g.fillText((rd * 100).toFixed(1) + '%', x - 6, y0 - h1 - 10);
        g.fillStyle = '#ffb547'; g.fillText(mass + ' g', x + bw * 0.36, y0 - h2 - 10);
        g.fillStyle = '#e8eef8'; g.font = (on ? 'bold ' : '') + '24px sans-serif'; g.fillText(c + ' ribs', x + 6, y0 + 34);
        g.globalAlpha = 1;
      });
      g.font = '21px sans-serif'; g.fillStyle = '#8ef0ff'; g.fillText('■ share of a full circle covered', 30, 84); g.fillStyle = '#ffb547'; g.fillText('■ ribs + stretchers (steel, estimate)', 30, 112);
    }, [4.6, 11.9, 0.5], -0.15);
    let key = '';
    return {
      update(dt, s) {
        dt = Math.max(0, dt);
        if (s.ribs !== n) { if (um) { stage.root.remove(um.g); um.g.traverse((o) => { o.geometry?.dispose(); }); } n = s.ribs; um = makeUmbrella({ n }); stage.root.add(um.g); }
        const thT = thTof(s), f = um.set({ d: U.dOpen, thT });
        const T = um.pts[15], J = um.pts[6], YN = U.YN, sn = Math.sin(Math.PI / n), cs = Math.cos(Math.PI / n);
        const hk = clamp(f.hem / 10, 0, 1) * 1.7, ck = clamp(f.comp / 8, 0, 1) * 1.6, step = n / 4;
        for (let q = 0; q < 4; q++) {
          const a = (q * step * 2 * Math.PI) / n + (n === 10 ? 0 : 0), a0 = (Math.round(q * step) * 2 * Math.PI) / n, cx = Math.cos(a0), sz = Math.sin(a0);
          const p = [T[0] * cx * S, (YN + T[1]) * S, T[0] * sz * S];
          // towards each neighbouring tip: rotate the tip by ±2π/n and take the difference
          for (const sg of [1, -1]) { const b = a0 + (sg * 2 * Math.PI) / n; hems[q * 2 + (sg > 0 ? 0 : 1)].aim(p, [Math.cos(b) - cx, 0, Math.sin(b) - sz], s.arrows ? hk : 0); }
          // squeeze along the outer rib, from the tip towards the joint
          const dr = J[0] - T[0], dy = J[1] - T[1];
          comps[q].aim(p, [dr * cx, dy, dr * sz], s.arrows ? ck : 0);
          void a; void sn; void cs;
        }
        lb.hem.position.set(T[0] * S * Math.cos(Math.PI / n) * 1.02, (YN + T[1]) * S - 0.35, T[0] * S * Math.sin(Math.PI / n) * 1.02);
        lb.rib.position.set(um.pts[10][0] * S, (YN + um.pts[10][1]) * S + 0.5, 0);
        
        const k2 = String(n);
        if (k2 !== key) { key = k2; cur.n = n; chart.redraw(); }
        chart.place([0, 12.6, 0], 1.2, 0);
        const narrow = fitNarrow(stage, [], -0.1);
        lb.hem.visible = s.arrows; lb.rib.visible = s.arrows && !narrow;
        chart.mesh.visible = !narrow;
      },
      readout: (s) => {
        const f = frame(U.dOpen, { n: s.ribs, thT: thTof(s) }), R = f.tipR / 1000;
        return rows(f.delta < 1 ? 'Loose cloth: it flaps' : `${s.ribs} ribs, each bowed ${f.delta.toFixed(0)} mm`, [
          ['Pull along the hem', fmtN(f.hem)],
          ['Squeeze along each outer rib', fmtN(f.comp)],
          ['Push needed to latch it', fmtN(f.push), f.push > 30 ? 'no' : ''],
          ['Cloth span between tips', Math.round(2 * R * Math.sin(Math.PI / s.ribs) * 1000) + ' mm'],
          ['Covered area', polyArea(s.ribs, R).toFixed(2) + ' m² (' + (roundness(s.ribs) * 100).toFixed(1) + '% of the circle)'],
          ['Ribs + stretchers (estimate)', frameMass(s.ribs) + ' g'],
        ], 3);
      },
    };
  },
};
