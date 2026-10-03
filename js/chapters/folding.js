// Chapter 6: the pocket umbrella. A telescopic shaft, and ribs in three sections that fold into
// a Z, driven by two extra linkages on every rib (solved in umbrella.js, not tweened).
import { clamp } from '../kit.js';
import { makeFolding, F3, F3S, U, f3frame, rows, fitNarrow, fmtN, D2R, inReel } from '../umbrella.js';

const TELE = 0.35;                                     // the first part of the slider pulls the shaft out
const pose = (s) => ({ tele: clamp(s.open / TELE, 0, 1), u: clamp((s.open - TELE) / (1 - TELE), 0, 1) });
// An automatic umbrella's opening spring. Design example, not a maker's figure: it must still push
// harder than the cloth pulls back at the top (about 16 N in chapter 2), so 25 N there, with a
// rate of 150 N/m over the runner's travel.
const SPR = { F1: 25, k: 150 };
const springF = (u) => SPR.F1 + SPR.k * ((1 - u) * F3.travel) / 1000;
const springE = () => ((springF(0) + springF(1)) / 2) * (F3.travel / 1000);
const STICK = U.YN + 88;                                // mm, a stick umbrella from handle to ferrule

export default {
  id: 'folding',
  short: 'Folding kinds',
  title: 'The umbrella that fits in a bag',
  subtitle: 'A telescopic shaft and ribs that fold in three, like a Z.',
  view: { pos: [6.3, 3.4, 10.4], target: [-0.2, 5.0, 0] },
  learn: `<p>A stick umbrella is as long as its ribs. To fit one in a bag, two things must shrink: the shaft and the ribs.</p>
    <p>The shaft is easy. It is made of tubes that slide inside each other, a <b>telescopic shaft</b>. The ribs are the clever part. Each rib is cut into <b>three sections</b> joined by hinges, and they fold back on themselves like the letter Z.</p>
    <p>Loose hinges would just flop, so every hinge is steered by a small linkage. The <b>top rib</b> and its stretcher work as before. A short <b>link</b> from the stretcher pulls a little lever on the <b>middle rib</b>, so the middle rib swings open as the stretcher spreads. A long thin <b>wire</b> beside the middle rib ties the <b>end rib</b> back to the top rib, so the end rib always stays parallel to the top rib. Push the runner up and all three sections unfold in step, on all eight ribs.</p>
    <p>That is nine hinges on every rib instead of three. More hinges mean more places to wear and bend, which is why a pocket umbrella is handier but less sturdy than a stick one.</p>
    <p>An <b>automatic</b> umbrella adds a long spring. Closing it squeezes the spring, and a catch in the handle holds it. Press the button and the spring throws the runner up the shaft for you.</p>
    <p class="tip"><b>Try it:</b> drag the slider slowly from packed to open. Watch the shaft pull out first, then follow one rib as its three sections unfold.</p>`,
  terms: [
    { t: 'Telescopic shaft', d: 'A shaft made of tubes that slide inside each other, so it can be pulled out or pushed short.' },
    { t: 'Jointed rib', d: 'A rib made of two or three sections hinged end to end so that it can fold.' },
    { t: 'Four-bar linkage', d: 'Four bars joined in a loop by four hinges. Turning one bar turns the others in a fixed way.' },
    { t: 'Parallelogram linkage', d: 'A four-bar linkage with equal opposite sides. Its opposite bars always stay parallel.' },
    { t: 'Three-fold', d: 'An umbrella whose ribs fold in three. It packs to about a third of its rib length.' },
    { t: 'Automatic umbrella', d: 'One with a spring that opens it when you press a button.' },
  ],
  defaults: { open: 1, auto: false },
  controls: [
    { key: 'open', type: 'range', label: 'Unpack and open', min: 0, max: 1, step: 0.002, ends: ['packed', 'open'], fmt: (v) => (v < 0.01 ? 'packed' : v < TELE ? 'pulling the shaft out' : v < 0.995 ? 'runner going up' : 'open') },
    { key: 'auto', type: 'toggle', label: 'Automatic: show the spring', hint: 'A coil spring between the handle and the runner. Closing the umbrella squeezes it.' },
  ],
  quiz: [
    { q: 'Why does the end rib of a three-fold umbrella stay parallel to the top rib?', options: ['It is glued', 'A wire ties them into a parallelogram linkage', 'Gravity', 'The cloth holds it'], answer: 1, why: 'A parallelogram linkage keeps its opposite bars parallel, so the end rib copies the top rib as the middle one swings.' },
    { q: 'What lets the shaft of a pocket umbrella get shorter?', options: ['It is made of tubes that slide inside each other', 'It bends', 'It is cut off', 'It melts'], answer: 0, why: 'A telescopic shaft: thinner tubes slide into wider ones.' },
    { q: 'Why is a pocket umbrella usually less sturdy than a stick umbrella?', options: ['It has thinner cloth', 'It has fewer ribs', 'Each rib has many more hinges and thinner sections', 'It is too light'], answer: 2, why: 'Three hinges per rib become nine. Each is a place to wear, loosen or bend in a gust.' },
  ],
  reel: [
    { ms: 6400, caption: 'A pocket umbrella has a telescopic shaft and ribs in three sections. Little links unfold all three in step.', set: { auto: false }, anim: { open: [0, 1] }, view: { pos: [5.6, 2.2, 9.7], target: [0, 2.7, 0] }, spin: 0.4 },
    { ms: 4200, caption: 'It packs to under a third of a stick umbrella. The price is nine hinges on every rib instead of three.', set: { auto: false }, anim: { open: [1, 0] }, view: { pos: [5.6, 2.2, 9.7], target: [0, 2.7, 0] }, spin: 0.4 },
  ],

  build({ stage }) {
    const fm = makeFolding(); stage.root.add(fm.g);
    const L = (t, cls) => stage.label(t, [0, 0, 0], fm.g, cls);
    const lb = { top: L('Top rib'), mid: L('Middle rib', 'hot'), end: L('End rib', 'hot'), str: L('Stretcher'), link: L('Link'), wire: L('Wire'), shaft: L('Telescopic shaft') };
    const mid = (A, B, yN, dy = 0) => [(A[0] + B[0]) / 2, yN + (A[1] + B[1]) / 2 + dy, 0];
    return {
      update(dt, s) {
        dt = Math.max(0, dt);
        const p = pose(s), f = fm.set({ ...p, spring: s.auto }), yN = fm.yN;
        lb.top.position.set(...mid(f.N, f.B, yN, 36)); lb.mid.position.set(...mid(f.B, f.C, yN, 40)); lb.end.position.set(...mid(f.C, f.T, yN, 40));
        lb.str.position.set(-(f.R[0] + f.J[0]) / 2 - 30, yN + (f.R[1] + f.J[1]) / 2 - 40, 0); lb.link.position.set(-f.K[0] - 40, yN + f.K[1] - 95, 0); lb.wire.position.set(...mid(f.Q, f.W, yN, -38));
        lb.shaft.position.set(-70, (F3S.h0 + yN) / 2 - 40, 0);
        const openish = p.u > 0.55;
        lb.top.visible = lb.mid.visible = lb.end.visible = lb.str.visible = openish; lb.link.visible = lb.wire.visible = p.u > 0.8;
        lb.shaft.visible = p.tele > 0.5;
        if (stage.host.clientWidth < 560) lb.link.visible = lb.wire.visible = lb.str.visible = false;
        fitNarrow(stage, [], -0.1, 0.04);
        // In the video frame, zoom in as it packs down so the small bundle still fills the picture.
        const zoom = inReel() ? 1 + 1.3 * (1 - p.tele) : 1;
        if (stage.camera.zoom !== zoom) { stage.camera.zoom = zoom; stage.camera.updateProjectionMatrix(); }
      },
      dispose() { stage.camera.zoom = 1; stage.camera.updateProjectionMatrix(); },
      readout: (s) => {
        const p = pose(s), f = f3frame(p.u), len = F3S.packed + p.tele * 2 * F3S.tube;
        const list = [
          ['Length now', (len / 10).toFixed(0) + ' cm'],
          ['A stick umbrella of the same span', (STICK / 10).toFixed(0) + ' cm'],
          ['Span across the tips', (2 * f.T[0] / 1000).toFixed(2) + ' m'],
          ['Top / middle rib angle from the shaft', Math.round(f.th1 / D2R) + '° / ' + Math.round(f.th2 / D2R) + '°'],
          ['Hinges per rib (stick umbrella: 3)', '9'],
        ];
        if (s.auto) list.splice(2, 0, ['Spring push on the runner (example)', fmtN(springF(p.u))], ['Energy it gives back on opening', springE().toFixed(1) + ' J']);
        return rows(s.open < 0.01 ? `Packed: ${(F3S.packed / 10).toFixed(0)} cm long` : p.u >= 0.995 ? 'Open' : p.u > 0 ? 'Three sections unfolding together' : 'Pulling out the telescopic shaft', list, 3);
      },
    };
  },
};
