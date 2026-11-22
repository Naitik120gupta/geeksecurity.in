// The hero phone: a real-looking handset in three.js whose screen is the Instagram profile
// drawn by screen.js. Renders only when something changed (the pointer tilting it, a resize),
// and stops while it is off screen.
import * as THREE from 'three';

const roundedRect = (w, h, r) => {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
};

export function startPhone(canvas, screen, { reduce = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  cam.position.set(0, 0.4, 14);
  cam.lookAt(0, -0.1, 0);

  // A small studio to reflect: one warm key panel, one cool-neutral rim, a dim room.
  const studio = new THREE.Scene();
  studio.background = new THREE.Color(0x0d0c0b);
  const panel = (w, h, color, power, pos) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(power), side: THREE.DoubleSide }));
    m.position.set(...pos); m.lookAt(0, 0, 0); studio.add(m);
  };
  panel(9, 9, 0xfff0dc, 7, [-9, 8, 7]);
  panel(4, 14, 0xf2f4ff, 3, [11, 1, 3]);
  panel(16, 3, 0xffffff, 1.2, [0, -9, 6]);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(studio, 0.035).texture;
  pmrem.dispose();

  const phone = new THREE.Group();
  const BW = 2.9, BH = 6.0, R = 0.46, D = 0.22, BEVEL = 0.05, FRONT = D / 2 + BEVEL;

  const bodyGeo = new THREE.ExtrudeGeometry(roundedRect(BW, BH, R), { depth: D, bevelEnabled: true, bevelThickness: BEVEL, bevelSize: BEVEL, bevelSegments: 6, curveSegments: 24 });
  bodyGeo.translate(0, 0, -D / 2);
  const frame = new THREE.MeshPhysicalMaterial({ color: 0x6a635a, metalness: 1, roughness: 0.34, envMapIntensity: 1.5 });
  phone.add(new THREE.Mesh(bodyGeo, frame));

  const bezel = new THREE.Mesh(new THREE.ShapeGeometry(roundedRect(BW, BH, R), 24),
    new THREE.MeshPhysicalMaterial({ color: 0x050505, metalness: 0, roughness: 0.12 }));
  bezel.position.z = FRONT + 0.001;
  phone.add(bezel);

  const SW = 2.72, SH = SW / screen.ratio, SR = 0.38;
  const screenGeo = new THREE.ShapeGeometry(roundedRect(SW, SH, SR), 24);
  const pos = screenGeo.attributes.position, uv = screenGeo.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / SW + 0.5, pos.getY(i) / SH + 0.5);
  const tex = new THREE.CanvasTexture(screen.canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const display = new THREE.Mesh(screenGeo, new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  display.position.z = FRONT + 0.002;
  phone.add(display);

  // Glass over the display: adds only what the studio reflects.
  const glass = new THREE.Mesh(screenGeo, new THREE.MeshStandardMaterial({
    color: 0x000000, metalness: 0, roughness: 0.06, envMapIntensity: 0.5,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  glass.position.z = FRONT + 0.003;
  phone.add(glass);

  const key = (h, y) => { const k = new THREE.Mesh(new THREE.BoxGeometry(0.06, h, 0.09), frame); k.position.set(BW / 2 + BEVEL + 0.012, y, 0); phone.add(k); };
  key(0.78, 0.9); key(0.42, 1.8);
  scene.add(phone);

  // Contact shadow on the surface the phone stands on.
  const sc = document.createElement('canvas'); sc.width = 256; sc.height = 64;
  const sg = sc.getContext('2d'), grad = sg.createRadialGradient(128, 32, 0, 128, 32, 128);
  grad.addColorStop(0, 'rgba(0,0,0,.6)'); grad.addColorStop(0.5, 'rgba(0,0,0,.22)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
  sg.setTransform(1, 0, 0, 0.25, 0, 24); sg.fillStyle = grad; sg.fillRect(0, -96, 256, 320);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 2.6),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false, toneMapped: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -BH / 2 - BEVEL - 0.01;
  scene.add(shadow);

  const light = new THREE.DirectionalLight(0xfff2e2, 1.4);
  light.position.set(-5, 6, 8);
  scene.add(light);

  const REST = { x: 0.03, y: -0.44 };
  let goal = { ...REST }, need = true, visible = true, raf = 0;
  phone.rotation.set(REST.x, reduce ? REST.y : REST.y - 0.5, 0.012);

  const host = canvas.parentElement;
  const resize = () => {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    cam.aspect = w / h;
    // keep the whole phone in view on narrow stages
    cam.position.z = Math.max(14, 6.4 / cam.aspect);
    cam.updateProjectionMatrix();
    need = true;
  };
  new ResizeObserver(resize).observe(host); resize();
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(host);

  if (!reduce && matchMedia('(hover:hover) and (pointer:fine)').matches) {
    const hero = host.closest('section') || host;
    hero.addEventListener('pointermove', e => {
      const r = host.getBoundingClientRect();
      const nx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / innerWidth * 2));
      const ny = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / innerHeight * 2));
      goal = { x: REST.x + ny * 0.06, y: REST.y + nx * 0.14 };
    });
    hero.addEventListener('pointerleave', () => { goal = { ...REST }; });
  }

  const frameLoop = now => {
    raf = requestAnimationFrame(frameLoop);
    if (!visible || document.hidden) return;
    const dx = goal.x - phone.rotation.x, dy = goal.y - phone.rotation.y;
    if (Math.abs(dx) > 1e-4 || Math.abs(dy) > 1e-4) {
      phone.rotation.x += dx * 0.07; phone.rotation.y += dy * 0.07; need = true;
    }
    if (need) { need = false; renderer.render(scene, cam); }
  };
  raf = requestAnimationFrame(frameLoop);
  return () => cancelAnimationFrame(raf);
}
