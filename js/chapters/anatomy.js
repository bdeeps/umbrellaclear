// Chapter 1: the parts of a stick umbrella, with an explode slider and a see-through canopy.
import { makeUmbrella, U, dOfU, rows, fitNarrow, DEPTH } from '../umbrella.js';

export default {
  id: 'anatomy',
  short: 'Anatomy',
  title: 'A folding roof on a stick',
  subtitle: 'Eight ribs, eight stretchers, one sliding runner and a sheet of cloth.',
  view: { pos: [8.2, 9.6, 12.6], target: [-0.4, 6.4, 0] },
  learn: `<p>An umbrella is a small roof that folds flat against its own pole. Take away the cloth and you find a <b>frame</b> of thin metal: a <b>shaft</b> down the middle, and eight <b>ribs</b> hinged to a ring at the top called the <b>top notch</b>.</p>
    <p>Each rib is pushed out by a shorter bar, a <b>stretcher</b>. All eight stretchers hinge on one sliding sleeve, the <b>runner</b>. Push the runner up the shaft and every rib swings out together. Two little sprung wedges in the shaft hold it: the <b>top spring</b> keeps the umbrella open and the <b>bottom spring</b> keeps it shut.</p>
    <p>The cloth, the <b>canopy</b>, is sewn from eight wedge-shaped panels called <b>gores</b>. It is tied to the tip of every rib and pinned at the top under a small cap. The pointed end above it is the <b>ferrule</b>. The big black gents' umbrella of an Indian monsoon and a child's bright one are built the same way.</p>
    <p class="tip"><b>Try it:</b> pull the parts apart, then make the cloth see-through and slide the runner to watch all eight ribs move as one.</p>`,
  terms: [
    { t: 'Rib', d: 'One of the long thin bars that hold the cloth out. It hinges on the top notch.' },
    { t: 'Stretcher', d: 'The shorter bar from the runner to the middle of a rib. It pushes the rib out.' },
    { t: 'Runner', d: 'The sleeve that slides on the shaft and carries all the stretchers.' },
    { t: 'Top notch', d: 'The ring at the top of the shaft where every rib is hinged. Also called the crown.' },
    { t: 'Gore', d: 'One wedge-shaped panel of the canopy. Eight ribs need eight gores.' },
    { t: 'Ferrule', d: 'The pointed cap on top of the shaft, above the cloth.' },
  ],
  defaults: { explode: 0, run: 1, cloth: true },
  controls: [
    { key: 'explode', type: 'range', label: 'Pull it apart', min: 0, max: 1, step: 0.01, ends: ['together', 'apart'], fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'run', type: 'range', label: 'Runner', min: 0, max: 1, step: 0.005, ends: ['shut', 'open'], fmt: (v) => Math.round(v * U.travel) + ' mm up' },
    { key: 'cloth', type: 'toggle', label: 'Solid cloth', hint: 'Turn it off to see the frame through the canopy.' },
  ],
  quiz: [
    { q: 'What pushes each rib outwards when you open an umbrella?', options: ['The cloth', 'A stretcher from the runner', 'The handle', 'The ferrule'], answer: 1, why: 'Each rib has its own stretcher. All the stretchers hinge on the runner, so one push moves them all.' },
    { q: 'What holds an open umbrella open?', options: ['Your thumb', 'The wind', 'The top spring, a sprung catch in the shaft', 'Glue'], answer: 2, why: 'The runner slides over the top spring, which pops out under it. Press the spring in and the runner can slide down again.' },
    { q: 'An umbrella has eight ribs. How many cloth panels (gores) does it have?', options: ['One', 'Four', 'Eight', 'Sixteen'], answer: 2, why: 'There is one gore between each pair of neighbouring ribs, so the numbers match.' },
  ],
  reel: [
    { ms: 5200, caption: 'An umbrella is a folding roof: eight ribs, eight stretchers and one sliding runner under a sheet of cloth.', set: { run: 1, cloth: true }, anim: { explode: [0, 1] }, view: { pos: [6.0, 8.6, 10.4], target: [0, 6.0, 0] }, spin: 0.6 },
  ],

  build({ stage }) {
    const um = makeUmbrella({ opacity: 1 });
    stage.root.add(um.g);
    const L = (t, p, cls) => stage.label(t, p, um.g, cls);
    const lb = {
      canopy: L('Canopy (8 gores)', [330, 760, 0], 'hot'), rib: L('Rib', [420, 620, 0]), str: L('Stretcher', [140, 690, 0]),
      runner: L('Runner', [-60, 640, 0], 'hot'), notch: L('Top notch', [-70, 800, 0]), ferrule: L('Ferrule', [0, 905, 0]),
      shaft: L('Shaft', [-50, 380, 0]), handle: L('Handle', [-120, 40, 0]), top: L('Top spring', [70, 610, 0]), bot: L('Bottom spring', [80, 320, 0]), tip: L('Tip', [560, 540, 0]),
    };
    let op = 1;
    return {
      update(dt, s) {
        dt = Math.max(0, dt);
        const ex = s.explode, d = dOfU(s.run);
        const f = um.set({ d, ex });
        op += ((s.cloth ? 1 : 0.22) - op) * Math.min(1, dt * 8); um.fade(op);
        const YN = U.YN, J = um.pts[6], T = um.pts[15], mid = um.pts[11];
        lb.canopy.position.set(mid[0] * 0.5, YN + mid[1] + 60 + ex * 220, -mid[0] * 0.6);
        lb.rib.position.set(mid[0], YN + mid[1] - 34 + ex * 20, 0);
        lb.str.position.set(0, YN - ex * 120 + (J[1] - d) / 2 - 26, (J[0] + U.rr) / 2);
        lb.runner.position.set(-110, YN - d - ex * 260 - 14, 0);
        lb.top.position.set(120, YN - U.dOpen - 70, 0); lb.bot.position.set(110, YN - U.dClosed + 18, 0);
        lb.notch.position.set(-95, YN + 20 + ex * 20, 0); lb.ferrule.position.set(0, YN + 118 + ex * 340, 0);
        lb.handle.position.set(-150, 40 - ex * 120, 0); lb.tip.position.set(T[0] + 30, YN + T[1] - 34 + ex * 20, 0);
        lb.shaft.position.set(-80, 420, 0);
        const inside = s.cloth && ex < 0.25 && f.u > 0.5;       // hidden under solid cloth
        lb.runner.visible = lb.top.visible = !inside;
        lb.rib.visible = lb.tip.visible = f.u > 0.25; lb.str.visible = f.u > 0.25 && !inside;
        if (stage.host.clientWidth < 560) lb.top.visible = lb.bot.visible = lb.tip.visible = lb.shaft.visible = lb.notch.visible = lb.str.visible = false;
        fitNarrow(stage, [], -0.1, 0.06);
      },
      readout: (s) => {
        const f = um.f;
        return rows(f.u > 0.995 ? 'Open and latched' : f.u < 0.005 ? 'Shut' : 'Opening', [
          ['Ribs and stretchers', '8 + 8'],
          ['Rib length (a “23 inch” umbrella)', U.L + ' mm'],
          ['Span across when open', (2 * f.tipR / 1000).toFixed(2) + ' m'],
          ['Runner travel', Math.round(U.travel) + ' mm'],
          ['Depth of the dome', Math.round(DEPTH) + ' mm'],
        ], 2);
      },
    };
  },
};
