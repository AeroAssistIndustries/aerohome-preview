// Hero: a modern Arizona desert home at dusk, with Sentinel flying its perimeter.
import * as THREE from 'three';
import { makeSentinel } from './models.js';

const LOT = { x: 17, z: 14 };            // perimeter wall half-extents (m)
const PATH = { x: 15.2, z: 12.2, r: 3.2, h: 7.5, speed: 4.2 };

function roundedRectPath({ x, z, r }) {
  const p = new THREE.Path();
  p.moveTo(-x + r, z);
  p.lineTo(x - r, z); p.quadraticCurveTo(x, z, x, z - r);
  p.lineTo(x, -z + r); p.quadraticCurveTo(x, -z, x - r, -z);
  p.lineTo(-x + r, -z); p.quadraticCurveTo(-x, -z, -x, -z + r);
  p.lineTo(-x, z - r); p.quadraticCurveTo(-x, z, -x + r, z);
  return p;
}

function ribbonFromPath(path, width, y, samples = 400) {
  const pts = path.getSpacedPoints(samples);
  const pos = [], uv = [], idx = [];
  let len = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length], prev = pts[(i - 1 + pts.length) % pts.length];
    const tx = b.x - prev.x, tz = b.y - prev.y;
    const tl = Math.hypot(tx, tz) || 1;
    const nx = -tz / tl, nz = tx / tl;
    if (i > 0) len += Math.hypot(a.x - pts[i - 1].x, a.y - pts[i - 1].y);
    pos.push(a.x + nx * width / 2, y, a.y + nz * width / 2, a.x - nx * width / 2, y, a.y - nz * width / 2);
    uv.push(len, 0, len, 1);
    if (i < pts.length - 1) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  return { geo, length: len };
}

function skyDome() {
  const geo = new THREE.SphereGeometry(900, 48, 24);
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {},
    vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `varying vec3 vP;
      void main(){
        float h = vP.y;
        vec3 horizon = vec3(0.98,0.52,0.27);
        vec3 rose = vec3(0.52,0.25,0.42);
        vec3 dusk = vec3(0.13,0.15,0.34);
        vec3 night = vec3(0.035,0.05,0.12);
        vec3 c = mix(horizon, rose, smoothstep(-0.02, 0.07, h));
        c = mix(c, dusk, smoothstep(0.06, 0.26, h));
        c = mix(c, night, smoothstep(0.24, 0.75, h));
        // warmer where the sun went down
        float az = atan(vP.z, vP.x);
        float glow = pow(max(0., cos(az - 2.4)), 6.) * (1. - smoothstep(0., 0.2, h));
        c += vec3(0.35,0.16,0.04) * glow;
        c = mix(vec3(0.16,0.12,0.16), c, smoothstep(-0.12, 0.0, h));
        gl_FragColor = vec4(c,1.);
      }`,
  });
  return new THREE.Mesh(geo, m);
}

function stars(n = 900) {
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = Math.random() * Math.PI * 2, v = 0.18 + Math.random() * 0.82;
    const r = 850;
    pos[i * 3] = Math.cos(u) * Math.sqrt(1 - v * v) * r;
    pos[i * 3 + 1] = v * r;
    pos[i * 3 + 2] = Math.sin(u) * Math.sqrt(1 - v * v) * r;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({ color: 0xdfe6ff, size: 1.4, sizeAttenuation: false, transparent: true, opacity: 0.75, fog: false }));
}

function cityLights(n = 5200) {
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  const warm = new THREE.Color(0xffc887), white = new THREE.Color(0xdfe8ff), amber = new THREE.Color(0xff9c4a);
  for (let i = 0; i < n; i++) {
    // grid-aligned like Phoenix streets
    const grid = Math.random() < 0.7;
    let x = (Math.random() - 0.5) * 900, z = (Math.random() - 0.5) * 900;
    if (grid) { if (Math.random() < 0.5) x = Math.round(x / 40) * 40 + (Math.random() - 0.5) * 2; else z = Math.round(z / 40) * 40 + (Math.random() - 0.5) * 2; }
    if (Math.hypot(x, z) < 70) { i--; continue; }
    pos[i * 3] = x; pos[i * 3 + 1] = 0.3; pos[i * 3 + 2] = z;
    const c = Math.random() < 0.55 ? warm : Math.random() < 0.5 ? white : amber;
    col.set([c.r, c.g, c.b], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({ size: 1.8, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.85 }));
}

function mountains() {
  // continuous ridgeline around the valley, like the ranges ringing Phoenix
  const N = 720, R = 560;
  const pos = [], idx = [];
  const n = (a) => Math.sin(a * 3.1) * 0.5 + Math.sin(a * 7.3 + 1.7) * 0.28 + Math.sin(a * 17.9 + 0.4) * 0.12 + Math.sin(a * 41.3 + 2.2) * 0.05;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    let h = 6 + Math.max(0, n(a) + 0.35) * 24;
    if (Math.cos(a - 2.4) > 0.7) h *= 0.55;              // lower where the sun set
    const r = R + Math.sin(a * 5.0) * 40;
    pos.push(Math.cos(a) * r, -2, Math.sin(a) * r, Math.cos(a) * r, h, Math.sin(a) * r);
    if (i < N) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  const m = new THREE.MeshBasicMaterial({ color: 0x3a2a48, side: THREE.DoubleSide, fog: false });
  const far = new THREE.Mesh(g, m);
  const near = far.clone();
  near.material = new THREE.MeshBasicMaterial({ color: 0x271d33, side: THREE.DoubleSide, fog: false });
  near.scale.set(0.86, 0.42, 0.86); near.rotation.y = 1.3;
  const grp = new THREE.Group(); grp.add(far, near);
  return grp;
}

function scrub(n = 900) {
  const geo = new THREE.IcosahedronGeometry(0.6, 0);
  const m = new THREE.MeshStandardMaterial({ color: 0x4d5534, roughness: 1, flatShading: true });
  const inst = new THREE.InstancedMesh(geo, m, n);
  const o = new THREE.Object3D();
  for (let i = 0; i < n; i++) {
    let x, z;
    do { x = (Math.random() - 0.5) * 360; z = (Math.random() - 0.5) * 360; }
    while ((Math.abs(x) < LOT.x + 2 && Math.abs(z) < LOT.z + 2) || Math.abs(z - (LOT.z + 9)) < 7);
    o.position.set(x, 0.2, z);
    o.scale.setScalar(0.5 + Math.random() * 1.1);
    o.scale.y *= 0.6;
    o.rotation.y = Math.random() * 6;
    o.updateMatrix();
    inst.setMatrixAt(i, o.matrix);
  }
  inst.receiveShadow = true;
  return inst;
}

function buildHome(scene) {
  const S = (c, r = 0.85, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0, ...extra });
  const stucco = S(0xcdbda3), stucco2 = S(0xd9ccb6), slab = S(0x2b2a2a, 0.7), stone = S(0x7d6f5f, 0.95), wall = S(0x8c7c68, 0.95);
  const glassWarm = new THREE.MeshStandardMaterial({ color: 0x2a1a0e, emissive: 0xffb36b, emissiveIntensity: 1.25, roughness: 0.2 });
  const glassDim = new THREE.MeshStandardMaterial({ color: 0x0e1420, emissive: 0xffb36b, emissiveIntensity: 0.32, roughness: 0.15, metalness: 0.6 });
  const box = (w, h, d, m, x, y, z, shadow = true) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z); mesh.castShadow = shadow; mesh.receiveShadow = true; scene.add(mesh); return mesh;
  };
  const plane = (w, h, m, x, y, z, ry = 0) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
    mesh.position.set(x, y, z); mesh.rotation.y = ry; scene.add(mesh); return mesh;
  };

  // ground + lot
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), S(0x3a3028, 1));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const lot = new THREE.Mesh(new THREE.PlaneGeometry(LOT.x * 2, LOT.z * 2), S(0x4a3f33, 1));
  lot.rotation.x = -Math.PI / 2; lot.position.y = 0.02; lot.receiveShadow = true; scene.add(lot);
  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(18, 7), S(0x3c4a2e, 1));
  lawn.rotation.x = -Math.PI / 2; lawn.position.set(-4, 0.03, -9.4); lawn.receiveShadow = true; scene.add(lawn);

  // street in front
  const street = new THREE.Mesh(new THREE.PlaneGeometry(400, 12), S(0x1d1c1e, 0.9));
  street.rotation.x = -Math.PI / 2; street.position.set(0, 0.025, LOT.z + 9); street.receiveShadow = true; scene.add(street);

  // plinth + volumes
  box(21, 0.4, 13, stone, 0, 0.2, 0.3);
  box(16, 3.2, 9, stucco, 0, 2.0, 0);
  box(9.5, 3.0, 7.2, stucco2, -2.6, 5.1, -0.6);
  box(18.6, 0.36, 10.8, slab, 0.2, 3.78, 0.5);            // ground-floor roof, deep overhang
  box(11.4, 0.34, 8.6, slab, -2.4, 6.77, -0.3);           // upper roof
  box(1.7, 7.6, 1.7, stone, 5.2, 3.8, -3.4);              // stone core
  box(0.7, 3.4, 6.5, stone, 8.4, 2.1, 0.9);               // fin wall
  box(6.4, 3.1, 7, stucco, 12.0, 1.95, -0.6);             // garage
  box(7.2, 0.32, 7.8, slab, 12.0, 3.66, -0.4);
  plane(5.2, 2.5, S(0x3b3631, 0.6, { metalness: 0.4 }), 12.0, 1.65, 2.91);

  // glazing
  plane(10.5, 2.55, glassWarm, -1.6, 1.85, 4.52);
  plane(6.6, 2.1, glassWarm, -2.9, 5.05, 3.02);
  plane(10.5, 2.55, glassDim, -1.6, 1.85, -4.52, Math.PI);
  plane(7.5, 2.1, glassWarm, -2.6, 5.05, -4.22, Math.PI);
  plane(5.0, 2.5, glassDim, -8.02, 1.85, 0, -Math.PI / 2);
  plane(0.6, 2.6, glassWarm, 4.0, 1.85, 4.52);
  const mull = S(0x1c1b1a, 0.6, { metalness: 0.5 });
  for (let x = -6.85; x <= 3.65; x += 2.1) box(0.08, 2.55, 0.08, mull, x, 1.85, 4.56, false);
  for (let x = -6.2; x <= 0.4; x += 2.2) box(0.07, 2.1, 0.07, mull, x, 5.05, 3.06, false);
  // window light spilling out
  [[-1.6, 1.6, 6.2], [-2.6, 4.6, -5.6]].forEach(([x, y, z]) => {
    const l = new THREE.PointLight(0xffa860, 60, 18, 2); l.position.set(x, y, z); scene.add(l);
  });

  // pool (rear)
  box(10.6, 0.12, 4.8, stone, -3.5, 0.08, -9.6, false);
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 3.8), new THREE.MeshStandardMaterial({ color: 0x063a46, emissive: 0x19c2d6, emissiveIntensity: 0.9, roughness: 0.1, metalness: 0.3 }));
  pool.rotation.x = -Math.PI / 2; pool.position.set(-3.5, 0.15, -9.6); scene.add(pool);
  const poolLight = new THREE.PointLight(0x37d4e6, 25, 10, 2); poolLight.position.set(-3.5, 1.2, -9.6); scene.add(poolLight);

  // driveway + path lights
  const drive = new THREE.Mesh(new THREE.PlaneGeometry(6, LOT.z - 3), S(0x5b554e, 0.9));
  drive.rotation.x = -Math.PI / 2; drive.position.set(12, 0.04, (LOT.z + 3) / 2 + 0.2); drive.receiveShadow = true; scene.add(drive);
  const lampMat = new THREE.MeshStandardMaterial({ color: 0x332211, emissive: 0xffc27a, emissiveIntensity: 3 });
  for (let z = 5; z <= 13; z += 2.6) [8.6, 15.4].forEach((x) => box(0.18, 0.5, 0.18, lampMat, x, 0.25, z, false));

  // perimeter wall with a gap for the drive
  const wh = 1.0, wt = 0.35;
  box(LOT.x * 2, wh, wt, wall, 0, wh / 2, -LOT.z);
  box(wt, wh, LOT.z * 2, wall, -LOT.x, wh / 2, 0);
  box(wt, wh, LOT.z * 2, wall, LOT.x, wh / 2, 0);
  box(LOT.x + 8.5, wh, wt, wall, -LOT.x + (LOT.x + 8.5) / 2, wh / 2, LOT.z);
  box(1.2, wh, wt, wall, LOT.x - 0.6, wh / 2, LOT.z);

  // desert planting
  const cactus = S(0x3e5a3c, 0.9), tree = S(0x6c7a3e, 1), trunk = S(0x5a4632, 1);
  const saguaro = (x, z, h) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, h, 4, 10), cactus); body.position.y = h / 2 + 0.28; g.add(body);
    [[0.55, h * 0.55, 1], [-0.55, h * 0.4, -1]].forEach(([ox, oy, s]) => {
      const a = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 1.1, 4, 8), cactus); a.position.set(ox, oy + 0.6, 0); g.add(a);
      const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.4, 4, 8), cactus); b.rotation.z = Math.PI / 2; b.position.set(ox / 2, oy, 0); g.add(b);
    });
    g.traverse((o) => { o.castShadow = true; });
    g.position.set(x, 0, z); g.rotation.y = Math.random() * 3; scene.add(g);
  };
  const paloVerde = (x, z, s) => {
    const g = new THREE.Group();
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 2.2 * s, 6), trunk); t.position.y = 1.1 * s; g.add(t);
    for (let i = 0; i < 6; i++) {
      const c = new THREE.Mesh(new THREE.IcosahedronGeometry((0.9 + Math.random() * 0.7) * s, 0), tree);
      c.position.set((Math.random() - 0.5) * 2.4 * s, (2.3 + Math.random() * 0.9) * s, (Math.random() - 0.5) * 2.4 * s);
      g.add(c);
    }
    g.traverse((o) => { o.castShadow = true; });
    g.position.set(x, 0, z); scene.add(g);
  };
  saguaro(-12.5, 8.5, 3.4); saguaro(-14, -4, 4.2); saguaro(4.5, 9.8, 2.6); saguaro(14.5, -10.5, 3.8);
  paloVerde(-9, 10.5, 1.1); paloVerde(9.5, -9.5, 1.2); paloVerde(-13.5, -11, 1.0); paloVerde(1, 11.2, 0.8);
  // uplights at the planting
  const up = new THREE.MeshStandardMaterial({ color: 0x221a10, emissive: 0xffd08a, emissiveIntensity: 4 });
  [[-12.5, 8.5], [-9, 10.5], [4.5, 9.8], [1, 11.2]].forEach(([x, z]) => box(0.22, 0.12, 0.22, up, x + 0.6, 0.08, z + 0.6, false));

  // neighbors
  const nWin = new THREE.MeshStandardMaterial({ color: 0x1a120a, emissive: 0xffb36b, emissiveIntensity: 0.9 });
  const nMat = [S(0x8f8270), S(0x9c8f7c), S(0x7f7465)];
  const spots = [0, 0.8, 1.55, 2.3, 3.1, 3.9, 4.7, 5.5].map((a, i) => [Math.round(Math.cos(a) * (96 + (i % 3) * 14)), Math.round(Math.sin(a) * (96 + (i % 3) * 14))]);
  spots.forEach(([x, z], i) => {
    const w = 13 + (i % 3) * 3, d = 9 + (i % 2) * 3;
    box(w, 3.4, d, nMat[i % 3], x, 1.7, z);
    box(w + 1.6, 0.3, d + 1.6, slab, x, 3.55, z);
    if (i % 2) { box(w * 0.55, 2.8, d * 0.7, nMat[(i + 1) % 3], x - w * 0.15, 4.9, z); box(w * 0.55 + 1, 0.28, d * 0.7 + 1, slab, x - w * 0.15, 6.4, z); }
    plane(w * 0.45, 1.7, nWin, x - w * 0.1, 1.7, z + (z < 0 ? -d / 2 - 0.02 : d / 2 + 0.02), z < 0 ? Math.PI : 0);
  });
  // street lights
  for (let x = -90; x <= 90; x += 30) {
    if (Math.abs(x) < 25) continue;
    box(0.15, 5, 0.15, slab, x, 2.5, LOT.z + 3.4);
    box(0.5, 0.12, 0.3, lampMat, x, 5, LOT.z + 3.6, false);
  }
}

export function initHero(canvas, { onTick } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x2a2036, 90, 620);
  scene.add(skyDome(), stars(), cityLights(), mountains(), scrub());

  scene.add(new THREE.HemisphereLight(0x7d8cc8, 0x4a3626, 2.4));
  const moon = new THREE.DirectionalLight(0xb8c4ff, 2.2);
  moon.position.set(-40, 60, 30);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  Object.assign(moon.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 10, far: 160 });
  moon.shadow.bias = -0.0004;
  scene.add(moon);
  const dusk = new THREE.DirectionalLight(0xff9a5a, 1.6);
  dusk.position.set(-80, 10, -60);
  scene.add(dusk);

  buildHome(scene);

  // geofence: flowing dashed line + soft glow band
  const fencePath = roundedRectPath({ x: LOT.x - 0.9, z: LOT.z - 0.9, r: 2.4 });
  const { geo: lineGeo, length: fenceLen } = ribbonFromPath(fencePath, 0.22, 0.07);
  const { geo: glowGeo } = ribbonFromPath(fencePath, 2.0, 0.06);
  const fenceU = { uT: { value: 0 } };
  const lineMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, uniforms: fenceU,
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float uT; varying vec2 vUv;
      void main(){ float d = step(0.45, fract(vUv.x*0.42 - uT*0.6)); vec3 c = vec3(0.31,0.82,0.77);
        gl_FragColor = vec4(c*1.6, 0.25 + 0.75*d); }`,
  });
  const glowMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, uniforms: fenceU,
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `varying vec2 vUv; void main(){ float a = 1.0 - abs(vUv.y-0.5)*2.0; gl_FragColor = vec4(vec3(0.31,0.82,0.77), pow(a,2.2)*0.28); }`,
  });
  scene.add(new THREE.Mesh(glowGeo, glowMat), new THREE.Mesh(lineGeo, lineMat));

  // Sentinel
  const flight = roundedRectPath(PATH);
  const flightPts = flight.getSpacedPoints(600);
  const flightLen = flight.getLength();
  const drone = makeSentinel({ detail: false });
  drone.scale.setScalar(2.1);
  scene.add(drone);

  const spot = new THREE.SpotLight(0xfff1d8, 2600, 40, 0.42, 0.55, 1.6);
  spot.castShadow = false;
  scene.add(spot, spot.target);
  const coneGeo = new THREE.ConeGeometry(1, 1, 40, 1, true);
  coneGeo.translate(0, -0.5, 0);
  const coneMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: `varying float vY; void main(){ vY = position.y; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `varying float vY; void main(){ float a = smoothstep(-1.0, 0.0, vY) * 0.16; gl_FragColor = vec4(vec3(1.0,0.95,0.85), a); }`,
  });
  const cone = new THREE.Mesh(coneGeo, coneMat);
  scene.add(cone);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshBasicMaterial({ color: 0xfff0d6, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false }));
  pool.rotation.x = -Math.PI / 2;
  scene.add(pool);

  const camera = new THREE.PerspectiveCamera(32, 1, 0.5, 2000);
  const look = new THREE.Vector3(0, 3.2, 0);
  let w = 0, h = 0, wide = true;
  function resize() {
    const r = canvas.getBoundingClientRect();
    w = Math.max(1, r.width); h = Math.max(1, r.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    wide = w / h > 1.15;
    if (wide) camera.setViewOffset(w, h, -w * (w > 1200 ? 0.27 : 0.2), h * 0.03, w, h);
    else camera.setViewOffset(w, h, 0, h * 0.04, w, h);
    camera.fov = wide ? 30 : 42;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const t00 = performance.now();
  const clock = { getElapsedTime: () => (performance.now() - t00) / 1000 };
  let running = true, visible = true, t0 = 7.2;
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

  function frame(t) {
    const ang = 0.75 + t * 0.028;
    const R = wide ? 64 : 60;
    camera.position.set(Math.cos(ang) * R, wide ? 15 : 19, Math.sin(ang) * R);
    camera.lookAt(look);

    fenceU.uT.value = t;
    const s = ((t * PATH.speed) % flightLen) / flightLen;
    const i = Math.floor(s * (flightPts.length - 1));
    const a = flightPts[i], b = flightPts[(i + 3) % flightPts.length];
    const bob = Math.sin(t * 1.7) * 0.15;
    drone.position.set(a.x, PATH.h + bob, a.y);
    const yaw = Math.atan2(-(b.y - a.y), b.x - a.x);
    drone.rotation.set(0, yaw, -0.08);
    drone.userData.tick(t);

    // spotlight sweeps toward the wall, ahead and outward
    const fx = b.x - a.x, fz = b.y - a.y, fl = Math.hypot(fx, fz) || 1;
    const ox = -fz / fl, oz = fx / fl; // outward normal
    const sweep = Math.sin(t * 0.9) * 2.2;
    tmp.set(a.x + (fx / fl) * 5 + ox * (2.2 + sweep), 0.1, a.y + (fz / fl) * 5 + oz * (2.2 + sweep));
    spot.position.set(drone.position.x, drone.position.y - 0.5, drone.position.z);
    spot.target.position.copy(tmp);
    // visible beam
    tmp2.copy(tmp).sub(spot.position);
    const L = tmp2.length();
    cone.position.copy(spot.position);
    cone.scale.set(Math.tan(0.36) * L, L, Math.tan(0.36) * L);
    cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), tmp2.normalize());
    pool.position.set(tmp.x, 0.08, tmp.z);
    pool.scale.setScalar(Math.tan(0.4) * L);

    renderer.render(scene, camera);
    if (onTick) onTick({ progress: s, altitudeFt: Math.round((PATH.h + bob) * 3.281), t });
  }

  function loop() {
    if (!running) return;
    if (visible && !document.hidden) frame(t0 + clock.getElapsedTime());
    requestAnimationFrame(loop);
  }
  if (reduce) { frame(t0 + 9); }
  else loop();

  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 });
  io.observe(canvas);
  return { renderer, dispose() { running = false; io.disconnect(); renderer.dispose(); } };
}
