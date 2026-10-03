// Chapter 5: wind. Drag on the canopy (F = ½ ρ v² Cd A), and why it turns inside out: when the
// wind gets into the cup the load on the ribs reverses, and past the cloth's preload they snap up.
import { THREE, M, clamp, sphere } from '../kit.js';
import { makeUmbrella, U, DEPTH, windLoad, beaufort, CD, segs, force, board, panelBg, rows, fitNarrow, fmtN, COL, D2R, S, inReel } from '../umbrella.js';

const opts = (s) => ({ vented: s.canopy === 'vented', EI: s.ribs === 'glass' ? U.EI_FG : U.EI });
const VMAX = 90, FMAX = 150;

export default {
  id: 'wind',
  short: 'Wind',
  title: 'Why it turns inside out',
  subtitle: 'Drag grows with the square of the wind. Let the wind into the cup and the ribs snap up.',
  view: { pos: [0.6, 7.4, 16.6], target: [0.3, 6.9, 0] },
  learn: `<p>Moving air pushes on anything in its way. The push is called <b>drag</b>, and for a shape like a canopy it follows one rule: <b>F = ½ × air density × speed² × drag coefficient × area</b> (<a href="https://glassbox.how/forceclear/">ForceClear</a> and <a href="https://glassbox.how/bernoulliclear/">BernoulliClear</a> explain the pieces). The <b>speed²</b> is the part that hurts. Double the wind and the force is four times bigger.</p>
    <p>The shape matters just as much. With its round top facing the wind, an umbrella is fairly slippery: air slides around the dome. Turn the hollow side to the wind and it becomes a <b>cup</b> that catches the air, like a parachute. The same canopy now has nearly four times the drag.</p>
    <p>That is also how it <b>turns inside out</b>. The tight cloth holds every rib tip down with a small, fixed pull. Wind in the cup pushes the cloth, and the outer ribs, up. When that upward push beats the cloth's hold, the load on the ribs reverses. The hem cannot stretch, so each rib bows and then <b>snaps</b> through to the other side.</p>
    <p>Designers fight back in two ways. A <b>vented double canopy</b> has an overlapping gap that lets trapped air spill out. <b>Fibreglass ribs</b> bend a long way and spring back, where thin steel ribs kink for good. On the wind scale used by weather services, Beaufort force 6 (39 to 49 km/h) is described as “umbrellas used with difficulty”. For bigger winds see <a href="https://glassbox.how/stormclear/">StormClear</a> and <a href="https://glassbox.how/cycloneclear/">CycloneClear</a>.</p>
    <p class="tip"><b>Try it:</b> set 40 km/h and tilt the umbrella back so the wind gets under it. Find the speed where it flips, then try the vented canopy.</p>`,
  terms: [
    { t: 'Drag', d: 'The force of moving air (or water) on an object, pushing it downwind.' },
    { t: 'Drag coefficient', d: 'A number for how much a shape catches the flow. About 0.4 for a dome facing the wind, about 1.4 for a cup.' },
    { t: 'Dynamic pressure', d: '½ × density × speed². The pressure a flow can press with. It grows with the square of the speed.' },
    { t: 'Snap-through', d: 'A sudden jump of a bent part from one curved shape to the opposite one.' },
    { t: 'Vented canopy', d: 'Two overlapping layers of cloth with a gap that lets air from underneath escape.' },
    { t: 'Beaufort scale', d: 'A 0 to 12 scale of wind strength, described by what the wind does to things around you.' },
  ],
  defaults: { wind: 25, tilt: 20, canopy: 'plain', ribs: 'steel' },
  controls: [
    { key: 'wind', type: 'range', label: 'Wind speed', min: 0, max: VMAX, step: 1, ends: ['calm', 'storm'], fmt: (v) => Math.round(v) + ' km/h' },
    { key: 'tilt', type: 'range', label: 'How you hold it', min: -60, max: 60, step: 1, ends: ['wind gets under', 'top into the wind'], fmt: (v) => (v > 2 ? Math.round(v) + '° into the wind' : v < -2 ? Math.round(-v) + '° tipped back' : 'upright') },
    { key: 'canopy', type: 'seg', label: 'Canopy', options: [{ v: 'plain', label: 'Single' }, { v: 'vented', label: 'Vented double' }] },
    { key: 'ribs', type: 'seg', label: 'Ribs', options: [{ v: 'steel', label: 'Steel' }, { v: 'glass', label: 'Fibreglass' }] },
    { key: 'fix', type: 'buttons', label: 'After a flip', items: [{ label: 'Push it back into shape', act: (s, inst) => inst.fix?.() }] },
  ],
  quiz: [
    { q: 'The wind doubles from 20 to 40 km/h. What happens to the drag on your umbrella?', options: ['It doubles', 'It halves', 'It stays the same', 'It is four times bigger'], answer: 3, why: 'Drag depends on speed squared. Two times the speed gives 2 × 2 = 4 times the force.' },
    { q: 'Why does an umbrella turn inside out?', options: ['The cloth shrinks', 'Wind in the cup pushes the outer ribs up harder than the cloth holds them down', 'The handle is too heavy', 'The runner slips'], answer: 1, why: 'The load on the ribs reverses. Once it beats the cloth\'s hold, the ribs bow and snap through.' },
    { q: 'How does a vented double canopy help?', options: ['It is heavier', 'It blocks more rain', 'Air trapped underneath can escape through the overlap, so the lift is smaller', 'It makes the ribs shorter'], answer: 2, why: 'Letting some air through lowers the pressure that builds up in the cup.' },
  ],
  reel: [
    { ms: 5600, caption: 'Drag grows with the square of the wind speed. Twice the wind pushes four times as hard.', set: { tilt: 25, canopy: 'plain', ribs: 'glass' }, act: (s, inst) => inst.fix?.(), anim: { wind: [5, 60] }, view: { pos: [1.9, 6.8, 13.4], target: [1.5, 6.6, 0] }, spin: 0 },
    { ms: 6000, caption: 'Let the wind into the cup and it lifts the ribs. Past the cloth\'s hold they snap, and the umbrella turns inside out.', set: { wind: 45, canopy: 'plain', ribs: 'glass' }, anim: { tilt: [25, -60] }, view: { pos: [4.9, 6.8, 13.4], target: [4.5, 6.6, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const PX = 1.8, PY = 2.6, SC = 0.72;
    const pivot = new THREE.Group(); pivot.position.set(PX, PY, 0); pivot.scale.setScalar(SC); stage.root.add(pivot);
    const ums = { plain: makeUmbrella(), vented: makeUmbrella({ vented: true }) };
    Object.values(ums).forEach((u) => { u.g.position.y = -0.6; pivot.add(u.g); });
    const hand = sphere(0.34, M.matte(0xe9d3b0)); hand.scale.set(1, 1.25, 1); pivot.add(hand);
    const NS = 260, air = segs(NS, M.glow(0x9fd0ff, { transparent: true, opacity: 0.55 }), 4); stage.root.add(air);
    const seed = Array.from({ length: NS }, () => [Math.random(), Math.random(), Math.random()]);
    const drag = force(COL.push, 0.07, 0.42), lift = force(COL.bad, 0.06, 0.36); stage.root.add(drag, lift);
    const lb = { drag: stage.label('Drag', [0, 0, 0], stage.root, 'hot'), lift: stage.label('Lift into the cup', [0, 0, 0]), wind: stage.label('Wind →', [-7.5, 1.2, 0]), state: stage.label('', [0, 0, 0], stage.root, 'hot') };
    const cur = { s: null };
    const chart = board(stage.root, 5.4, 3.52, 920, 600, (g, w, h) => {
      panelBg(g, w, h);
      g.fillStyle = '#e8eef8'; g.font = 'bold 30px sans-serif'; g.fillText('Force on the umbrella', 28, 46);
      const s = cur.s; if (!s) return;
      const x0 = 96, y0 = h - 70, cw = w - 136, ch = h - 160, X = (v) => x0 + (cw * v) / VMAX, Y = (F) => y0 - (ch * Math.min(F, FMAX)) / FMAX;
      g.lineWidth = 2; g.font = '20px sans-serif';
      for (const F of [0, 50, 100, 150]) { g.strokeStyle = 'rgba(255,255,255,.13)'; g.beginPath(); g.moveTo(x0, Y(F)); g.lineTo(x0 + cw, Y(F)); g.stroke(); g.fillStyle = 'rgba(255,255,255,.65)'; g.fillText(F + ' N', x0 - 66, Y(F) + 7); }
      for (const v of [0, 30, 60, 90]) g.fillText(v + '', X(v) - 10, y0 + 28);
      g.fillText('wind speed (km/h)', x0 + cw / 2 - 80, y0 + 56);
      const curve = (tilt, col, wd) => { g.strokeStyle = col; g.lineWidth = wd; g.beginPath(); let on = false; for (let v = 0; v <= VMAX; v += 2) { const F = windLoad(v / 3.6, tilt, opts(s)).F; if (F > FMAX) break; on ? g.lineTo(X(v), Y(F)) : g.moveTo(X(v), Y(F)); on = true; } g.stroke(); };
      curve(90, 'rgba(142,240,255,.5)', 3); curve(-90, 'rgba(255,90,138,.55)', 3); curve(s.tilt, '#ffb547', 6);
      g.font = '20px sans-serif'; g.fillStyle = 'rgba(142,240,255,.9)'; g.fillText('round top to the wind', X(52), Y(windLoad(60 / 3.6, 90, opts(s)).F) + 30);
      g.fillStyle = 'rgba(255,90,138,.95)'; g.fillText('cup to the wind', X(20), Y(120));
      const F = windLoad(s.wind / 3.6, s.tilt, opts(s)).F;
      g.fillStyle = '#ffb547'; g.beginPath(); g.arc(X(s.wind), Y(F), 12, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 3; g.stroke();
      g.font = 'bold 22px sans-serif'; g.fillText('now: ' + fmtN(F), Math.min(X(s.wind) + 18, w - 170), Math.max(84, Y(F) - 14));
    }, [5.2, 12.0, 0], 0);

    let inv = 0, flipped = false, bent = false, T = 0, key = '';
    const inst = {
      fix() { flipped = false; bent = false; inv = 0; },
      update(dt, s) {
        dt = Math.max(0, dt); T += dt;
        const v = s.wind / 3.6, w = windLoad(v, s.tilt, opts(s));
        if (!flipped && w.ratio >= 1) { flipped = true; bent = s.ribs === 'steel'; }
        if (flipped && !bent && w.ratio < 0.35) flipped = false;       // fibreglass springs back when the load drops
        inv = clamp(inv + (flipped ? 5 : -2.5) * dt, 0, 1);
        inst.w = w; inst.flipped = flipped; inst.bent = bent;
        const tau = s.tilt * D2R; pivot.rotation.z = tau;
        const which = s.canopy === 'vented' ? 'vented' : 'plain';
        ums.plain.g.visible = which === 'plain'; ums.vented.g.visible = which === 'vented';
        const um = ums[which]; um.set({ d: U.dOpen, inv, EI: opts(s).EI });
        // canopy centre (rim plane) in the world
        const ax = [-Math.sin(tau), Math.cos(tau)], Lc = (U.YN - DEPTH * 0.5 - 60) * S * SC, C = [PX + ax[0] * Lc, PY + ax[1] * Lc, 0], Rr = um.f.tipR * S * SC;
        // air streaks blow along +x and are hidden where the canopy blocks them
        const speed = 1.2 + v * 0.9, span = 26;
        for (let i = 0; i < NS; i++) {
          const [a, b, c] = seed[i], x = -13 + ((a * span + T * speed) % span), y = 0.5 + b * 10.5, z = -5.5 + c * 11;
          const dx = x - C[0], dy = y - C[1], along = dx * ax[0] + dy * ax[1], rad = Math.hypot(dx - along * ax[0], dy - along * ax[1], z);
          const hide = v < 0.3 || (rad < Rr * 0.95 && Math.abs(along) < 1.6 + (dx > 0 ? 2.5 : 0));
          const len = 0.25 + v * 0.05;
          air.seg(i, x, y, z, x + len, y, z, hide ? 0 : 0.02);
        }
        air.done();
        const fk = clamp(w.F / FMAX, 0, 1) * 5, lk = clamp(w.lift / FMAX, 0, 1) * 5;
        drag.aim(C, [1, 0, 0], fk); lift.aim([C[0], C[1], 0.6], [ax[0], ax[1], 0], lk);
        lb.drag.position.set(C[0] + fk + 0.6, C[1] + 0.5, 0); lb.drag.visible = fk > 0.3;
        lb.lift.position.set(C[0] + ax[0] * (lk + 0.5), C[1] + ax[1] * (lk + 0.5), 0.6); lb.lift.visible = lk > 0.4;
        lb.state.element.textContent = flipped ? (bent ? 'Inside out: steel ribs kinked' : 'Inside out') : ''; lb.state.visible = flipped;
        lb.state.position.set(C[0], C[1] - 2.2, 0);
        const k2 = [s.wind, s.tilt, s.canopy, s.ribs].join();
        if (k2 !== key) { key = k2; cur.s = { ...s }; chart.redraw(); }
        chart.place([3, 13.6, 0], 1.25, 0);
        const narrow = fitNarrow(stage, [lb.wind], -0.1); if (narrow) lb.lift.visible = false;
        chart.mesh.visible = !narrow;
        void inReel;
      },
      readout: (s) => {
        const w = inst.w || windLoad(s.wind / 3.6, s.tilt, opts(s)), b = beaufort(s.wind), pc = Math.round(w.ratio * 100);
        return rows(flipped ? (bent ? 'Inside out, and the steel ribs are bent' : 'Inside out. It will spring back') : `${fmtN(w.F)} of drag`, [
          ['Like holding up', (w.F / 9.81).toFixed(1) + ' kg'],
          ['Lift on ribs, of what flips it', pc + '%', pc >= 100 ? 'no' : pc < 60 ? 'ok' : ''],
          ['Beaufort scale', b.force + ', ' + b.name.toLowerCase()],
          ['Wind pressure ½ρv²', w.q.toFixed(0) + ' Pa'],
          ['Drag area Cd × A', w.CdA.toFixed(2) + ' m²'],
          ['Cd: round top / cup', CD.round + ' / ' + (s.canopy === 'vented' ? (CD.cup * CD.vent).toFixed(2) : CD.cup)],
        ], 3);
      },
    };
    return inst;
  },
};
