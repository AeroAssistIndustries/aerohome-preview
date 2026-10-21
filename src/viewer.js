// Product viewer: drag to turn Sentinel, Guardian and Hub.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { makeSentinel, makeGuardian, makeHub } from './models.js';

export function initViewer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const key = new THREE.DirectionalLight(0xfff4e6, 2.2);
  key.position.set(3, 6, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3 });
  key.shadow.radius = 6;
  key.shadow.bias = -0.0006;
  key.shadow.normalBias = 0.03;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x8fb6ff, 1.4);
  rim.position.set(-4, 3, -5);
  scene.add(rim);

  const floor = new THREE.Mesh(new THREE.CircleGeometry(4, 64), new THREE.ShadowMaterial({ opacity: 0.35 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const models = {
    sentinel: { obj: makeSentinel(), y: 0.95, scale: 1.15, cam: [4.6, 2.3, 4.4], target: [0, 0.7, 0] },
    guardian: { obj: makeGuardian(), y: 0, scale: 1.55, cam: [3.6, 2.0, 3.8], target: [0, 0.95, 0] },
    hub: { obj: makeHub(), y: 0, scale: 1.25, cam: [3.4, 1.9, 3.5], target: [0, 0.8, 0] },
  };
  Object.values(models).forEach((m) => {
    m.obj.scale.setScalar(m.scale);
    m.obj.position.y = m.y;
    m.obj.visible = false;
    scene.add(m.obj);
  });

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  const controls = new OrbitControls(camera, canvas);
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.minPolarAngle = 0.6;
  controls.maxPolarAngle = 1.45;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  controls.autoRotate = !reduce;
  controls.autoRotateSpeed = 1.1;

  let current = null, swapT = 1;
  function show(name) {
    const m = models[name];
    if (!m || current === m) return;
    if (current) current.obj.visible = false;
    current = m;
    m.obj.visible = true;
    camera.position.set(...m.cam);
    controls.target.set(...m.target);
    controls.update();
    swapT = reduce ? 1 : 0;
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    renderer.setSize(Math.max(1, r.width), Math.max(1, r.height), false);
    camera.aspect = r.width / Math.max(1, r.height);
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  const t00 = performance.now();
  const clock = { getElapsedTime: () => (performance.now() - t00) / 1000 };
  let visible = false;
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 });
  io.observe(canvas);

  function loop() {
    requestAnimationFrame(loop);
    if (!visible || document.hidden || !current) return;
    const t = clock.getElapsedTime();
    if (swapT < 1) {
      swapT = Math.min(1, swapT + 0.045);
      const e = 1 - Math.pow(1 - swapT, 3);
      current.obj.scale.setScalar(current.scale * (0.92 + 0.08 * e));
      current.obj.rotation.y = (1 - e) * -0.6;
    }
    if (current === models.sentinel) current.obj.position.y = current.y + Math.sin(t * 1.6) * 0.04;
    current.obj.userData.tick(t);
    controls.update();
    renderer.render(scene, camera);
  }
  show('sentinel');
  loop();
  // first paint even before scrolled into view
  renderer.render(scene, camera);
  return { show };
}
