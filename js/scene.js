// The background scene: a particle globe with attack arcs that get blocked on arrival.
import * as THREE from 'three';

export function startScene(canvas) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = () => innerWidth < 900;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0, 7.2);

  const RED = new THREE.Color('#eb4425'), LIGHT = new THREE.Color('#f26a4d'), WARM = new THREE.Color('#f5e9e4'), OK = new THREE.Color('#3ecf8e');
  const R = 1.85;

  // soft round sprite for points
  const dot = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'); const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(.35, 'rgba(255,255,255,.8)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();

  const globe = new THREE.Group();
  scene.add(globe);

  // surface points on a fibonacci sphere
  const N = small() ? 1300 : 2400;
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
  const onSphere = (i, n, r, out) => {
    const y = 1 - (i / (n - 1)) * 2, rad = Math.sqrt(1 - y * y), th = i * Math.PI * (3 - Math.sqrt(5));
    return out.set(Math.cos(th) * rad * r, y * r, Math.sin(th) * rad * r);
  };
  const v = new THREE.Vector3();
  for (let i = 0; i < N; i++) {
    onSphere(i, N, R, v); pos.set([v.x, v.y, v.z], i * 3);
    const c = Math.random() < .14 ? LIGHT : WARM, k = .45 + Math.random() * .55;
    col.set([c.r * k, c.g * k, c.b * k], i * 3);
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  pg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const points = new THREE.Points(pg, new THREE.PointsMaterial({ size: .034, map: dot, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .95 }));
  globe.add(points);

  // inner core: the "shield"
  const core = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(R * .56, 1)),
    new THREE.LineBasicMaterial({ color: RED, transparent: true, opacity: .5, blending: THREE.AdditiveBlending }));
  globe.add(core);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color: RED, transparent: true, opacity: .32, blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.scale.setScalar(R * 2.6); globe.add(glow);

  // orbit rings
  const ring = (r, tiltX, tiltZ, op) => {
    const pts = []; for (let i = 0; i <= 128; i++) { const a = i / 128 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r)); }
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: WARM, transparent: true, opacity: op }));
    l.rotation.set(tiltX, 0, tiltZ); globe.add(l); return l;
  };
  const rings = [ring(R * 1.22, 1.15, .3, .16), ring(R * 1.4, 1.9, -.5, .1)];

  // attack arcs + impact pulses
  const SEG = 56, ARCS = small() ? 6 : 10;
  const arcs = [];
  const randOnSphere = (r) => { const u = Math.random() * 2 - 1, t = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u); return new THREE.Vector3(Math.cos(t) * s * r, u * r, Math.sin(t) * s * r); };
  const pulseGeo = new THREE.RingGeometry(.9, 1, 40);
  for (let i = 0; i < ARCS; i++) {
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((SEG + 1) * 3), 3));
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: RED, transparent: true, opacity: .95, blending: THREE.AdditiveBlending }));
    const head = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color: LIGHT, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    head.scale.setScalar(.16);
    const pulse = new THREE.Mesh(pulseGeo, new THREE.MeshBasicMaterial({ color: OK, transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    globe.add(line, head, pulse);
    const a = { line, head, pulse, t: -Math.random() * 3, dur: 2.2 + Math.random() * 1.6, curve: null, end: new THREE.Vector3() };
    arcs.push(a); aim(a);
  }
  function aim(a) {
    const from = randOnSphere(R * (2.4 + Math.random() * 1.2)), to = randOnSphere(R);
    const mid = from.clone().add(to).multiplyScalar(.5); mid.setLength(mid.length() + R * .9);
    a.curve = new THREE.QuadraticBezierCurve3(from, mid, to); a.end.copy(to);
    const p = a.line.geometry.attributes.position;
    a.curve.getPoints(SEG).forEach((pt, i) => p.setXYZ(i, pt.x, pt.y, pt.z)); p.needsUpdate = true;
    a.pulse.position.copy(to).multiplyScalar(1.01); a.pulse.lookAt(to.clone().multiplyScalar(2));
  }

  // far dust
  const DN = small() ? 220 : 480, dpos = new Float32Array(DN * 3);
  for (let i = 0; i < DN; i++) dpos.set([(Math.random() - .5) * 26, (Math.random() - .5) * 16, -3 - Math.random() * 12], i * 3);
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
  const dust = new THREE.Points(dg, new THREE.PointsMaterial({ size: .05, map: dot, color: WARM, transparent: true, opacity: .35, depthWrite: false }));
  scene.add(dust);

  // layout + input
  let pointer = { x: 0, y: 0 }, scroll = 0, W = 0, H = 0;
  function resize() {
    W = innerWidth; H = innerHeight;
    renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize, { passive: true }); resize();
  addEventListener('pointermove', e => { pointer.x = e.clientX / W * 2 - 1; pointer.y = e.clientY / H * 2 - 1; }, { passive: true });
  addEventListener('scroll', () => { scroll = scrollY / Math.max(1, H); if (reduced) draw(0); }, { passive: true });

  const clock = new THREE.Clock(); let running = true, rx = 0, ry = 0, time = 0;
  document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) { clock.getDelta(); loop(); } });

  function draw(dt) {
    time += dt;
    const s = Math.min(scroll, 4), mobile = small();
    // hero: globe sits right (desktop) or top (mobile); further down it drifts to the centre and recedes
    const k = Math.min(1, s), ease = k * k * (3 - 2 * k);
    const baseX = mobile ? 0 : W / H * 1.35, baseY = mobile ? 1.55 : 0, baseS = mobile ? .72 : 1;
    globe.position.x = baseX * (1 - ease);
    globe.position.y = baseY * (1 - ease) + ease * .2 + Math.sin(time * .5) * .05;
    globe.position.z = -ease * 3.2;
    globe.scale.setScalar(baseS + ease * (mobile ? .5 : .15));
    const fade = 1 - ease * .62;
    points.material.opacity = .95 * fade; core.material.opacity = .5 * fade; glow.material.opacity = .32 * fade;
    rings[0].material.opacity = .16 * fade; rings[1].material.opacity = .1 * fade;

    rx += (pointer.y * .25 - rx) * .04; ry += (pointer.x * .4 - ry) * .04;
    globe.rotation.x = rx + .18; globe.rotation.y = time * .09 + ry + s * .6;
    core.rotation.y = -time * .25; core.rotation.x = time * .12;
    rings[0].rotation.y = time * .12; rings[1].rotation.y = -time * .08;
    dust.rotation.y = time * .008; dust.position.y = s * .5;

    for (const a of arcs) {
      a.t += dt;
      const u = a.t / a.dur;
      if (u < 0) { a.line.geometry.setDrawRange(0, 0); a.head.visible = false; a.pulse.material.opacity = 0; continue; }
      if (u <= 1) {
        const headI = Math.floor(u * SEG), tail = Math.max(0, headI - 16);
        a.line.geometry.setDrawRange(tail, Math.max(1, headI - tail + 1));
        a.line.material.opacity = .9 * fade; a.head.visible = true; a.head.material.opacity = fade;
        a.head.position.copy(a.curve.getPoint(u));
        a.pulse.material.opacity = 0;
      } else {
        const h = (u - 1) * a.dur / .9; // blocked: green ring expands and fades
        a.line.geometry.setDrawRange(0, 0); a.head.visible = false;
        if (h < 1) { a.pulse.scale.setScalar(.06 + h * .34); a.pulse.material.opacity = (1 - h) * .9 * fade; }
        else { a.pulse.material.opacity = 0; a.t = -Math.random() * 2.4; a.dur = 2.2 + Math.random() * 1.6; aim(a); }
      }
    }
    renderer.render(scene, camera);
  }
  function loop() {
    if (!running) return;
    draw(Math.min(clock.getDelta(), .05));
    if (!reduced) requestAnimationFrame(loop);
  }
  if (reduced) { time = 4; for (const a of arcs) a.t = a.dur * Math.random(); draw(0); } else loop();
}
