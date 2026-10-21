// AeroHome product models, built from simple solids so they load instantly.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export const C = {
  graphite: 0x262b33,
  graphiteLight: 0x3a414c,
  brass: 0xc8a15a,
  bone: 0xe4e1da,
  glass: 0x0b1220,
  teal: 0x4fd1c5,
  rubber: 0x15171b,
};

const mat = {
  graphite: () => new THREE.MeshStandardMaterial({ color: C.graphite, metalness: 0.55, roughness: 0.38 }),
  graphiteMatte: () => new THREE.MeshStandardMaterial({ color: C.graphite, metalness: 0.2, roughness: 0.75 }),
  graphiteLight: () => new THREE.MeshStandardMaterial({ color: C.graphiteLight, metalness: 0.5, roughness: 0.4 }),
  brass: () => new THREE.MeshStandardMaterial({ color: C.brass, metalness: 1, roughness: 0.28 }),
  bone: () => new THREE.MeshStandardMaterial({ color: 0xcfcbc2, metalness: 0.05, roughness: 0.5 }),
  glass: () => new THREE.MeshStandardMaterial({ color: C.glass, metalness: 0.9, roughness: 0.08 }),
  rubber: () => new THREE.MeshStandardMaterial({ color: C.rubber, metalness: 0, roughness: 0.9 }),
  emissive: (c, i = 2) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: i, roughness: 0.4 }),
  fabric: () => new THREE.MeshStandardMaterial({ color: 0x1d2128, metalness: 0, roughness: 1 }),
};

function add(parent, mesh, x = 0, y = 0, z = 0) {
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

/* ---------------- Sentinel: outdoor patrol drone ---------------- */
export function makeSentinel({ detail = true } = {}) {
  const g = new THREE.Group();
  g.name = 'sentinel';
  const seg = detail ? 4 : 2;

  const shell = add(g, new THREE.Mesh(new THREE.SphereGeometry(0.5, detail ? 48 : 16, detail ? 32 : 10), mat.graphite()), 0, 0.02, 0);
  shell.scale.set(1.35, 0.42, 0.9);
  add(g, new THREE.Mesh(new RoundedBoxGeometry(1.1, 0.16, 0.7, seg, 0.07), mat.graphiteMatte()), 0, -0.1, 0);
  const canopy = add(g, new THREE.Mesh(new THREE.SphereGeometry(0.3, detail ? 40 : 12, detail ? 20 : 8), mat.graphiteLight()), 0.08, 0.15, 0);
  canopy.scale.set(1.5, 0.32, 0.95);
  // brass spine
  const band = add(g, new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.012, 6, 64), mat.brass()), 0, 0.03, 0);
  band.rotation.x = Math.PI / 2; band.scale.set(1.09, 0.73, 1);

  const props = [];
  const armMat = mat.graphiteMatte();
  const ductMat = new THREE.MeshStandardMaterial({ color: 0x14171c, metalness: 0.3, roughness: 0.6 });
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0x0b0c0f, metalness: 0.1, roughness: 0.7 });
  const discMat = new THREE.MeshBasicMaterial({ color: 0x9aa4b2, transparent: true, opacity: 0.07, depthWrite: false });
  [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([sx, sz]) => {
    const ax = sx * 0.95, az = sz * 0.78;
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 1.0, detail ? 12 : 6), armMat);
    arm.rotation.z = Math.PI / 2;
    arm.rotation.y = Math.atan2(-az, ax);
    add(g, arm, ax / 2, 0.05, az / 2);
    add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.16, detail ? 20 : 8), mat.graphite()), ax, 0.08, az);
    add(g, new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.032, detail ? 10 : 4, detail ? 48 : 16), ductMat), ax, 0.15, az).rotation.x = Math.PI / 2;
    const prop = new THREE.Group();
    prop.position.set(ax, 0.18, az);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.012, 0.07), bladeMat);
    prop.add(blade);
    const blade2 = blade.clone(); blade2.rotation.y = Math.PI / 2; prop.add(blade2);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.41, 32), discMat);
    disc.rotation.x = -Math.PI / 2; disc.position.y = 0.01; prop.add(disc);
    g.add(prop);
    props.push(prop);
  });

  // gimbal camera (front, underneath)
  const gimbal = new THREE.Group();
  gimbal.position.set(0.5, -0.24, 0);
  g.add(gimbal);
  add(gimbal, new THREE.Mesh(new THREE.SphereGeometry(0.15, detail ? 32 : 12, detail ? 24 : 8), mat.graphiteLight()));
  const lens = add(gimbal, new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.08, 0.06, 24), mat.glass()), 0.13, 0, 0.03);
  lens.rotation.z = Math.PI / 2;
  const lens2 = add(gimbal, new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.04, 16), mat.glass()), 0.14, 0.02, -0.07);
  lens2.rotation.z = Math.PI / 2;
  add(gimbal, new THREE.Mesh(new THREE.TorusGeometry(0.078, 0.008, 6, 24), mat.brass()), 0.16, 0, 0.03).rotation.y = Math.PI / 2;

  // spotlight (rear, underneath)
  add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.06, 24), mat.graphite()), -0.32, -0.2, 0);
  add(g, new THREE.Mesh(new THREE.CircleGeometry(0.105, 24), mat.emissive(0xfff3dc, 1.4)), -0.32, -0.232, 0).rotation.x = Math.PI / 2;

  // landing skids
  const skidMat = mat.graphiteMatte();
  [-0.28, 0.28].forEach((z) => {
    const bar = add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.95, 8), skidMat), 0, -0.42, z);
    bar.rotation.z = Math.PI / 2;
    [-0.25, 0.25].forEach((x) => add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.26, 6), skidMat), x, -0.3, z));
  });

  // nav lights
  const red = add(g, new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), mat.emissive(0xff3b30, 4)), 0.95, 0.12, 0.78);
  const green = add(g, new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), mat.emissive(0x34c759, 4)), 0.95, 0.12, -0.78);
  const strobe = add(g, new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), mat.emissive(0xffffff, 6)), -0.55, 0.22, 0);
  red.castShadow = green.castShadow = strobe.castShadow = false;

  g.userData = {
    props, strobe, gimbal,
    tick(t) {
      props.forEach((p, i) => (p.rotation.y = t * 38 * (i % 2 ? 1 : -1)));
      strobe.visible = (t % 1.2) < 0.08;
    },
  };
  return g;
}

/* ---------------- Guardian: indoor safety robot ---------------- */
export function makeGuardian() {
  const g = new THREE.Group();
  g.name = 'guardian';
  add(g, new THREE.Mesh(new RoundedBoxGeometry(1.0, 0.46, 0.7, 5, 0.2), mat.bone()), 0, 0.42, 0);
  add(g, new THREE.Mesh(new RoundedBoxGeometry(1.02, 0.14, 0.72, 4, 0.06), mat.graphiteMatte()), 0, 0.2, 0);
  // front sensor face
  add(g, new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.24, 0.5, 3, 0.03), mat.glass()), 0.5, 0.44, 0);
  add(g, new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.018, 0.36), mat.emissive(C.teal, 3)), 0.535, 0.36, 0);
  // wheels
  [0.37, -0.37].forEach((z) => {
    const w = add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.09, 40), mat.rubber()), 0.05, 0.21, z);
    w.rotation.x = Math.PI / 2;
    const cap = add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.02, 32), mat.brass()), 0.05, 0.21, z + Math.sign(z) * 0.05);
    cap.rotation.x = Math.PI / 2;
  });
  add(g, new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), mat.rubber()), -0.38, 0.06, 0);
  // mast
  add(g, new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.018, 8, 40), mat.emissive(C.teal, 2.4)), -0.2, 0.66, 0).rotation.x = Math.PI / 2;
  add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.08, 32), mat.graphite()), -0.2, 0.68, 0);
  const mast = add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.5, 20), mat.graphiteLight()), -0.2, 0.95, 0);
  const head = new THREE.Group();
  head.position.set(-0.2, 1.24, 0);
  g.add(head);
  add(head, new THREE.Mesh(new RoundedBoxGeometry(0.26, 0.17, 0.22, 4, 0.06), mat.graphite()));
  const l = add(head, new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.03, 24), mat.glass()), 0.13, 0.005, 0);
  l.rotation.z = Math.PI / 2;
  // privacy shutter, half drawn
  add(head, new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.05, 0.12), mat.brass()), 0.142, 0.045, 0);
  g.userData = {
    head, mast,
    tick(t) { head.rotation.y = Math.sin(t * 0.7) * 0.5; },
  };
  return g;
}

/* ---------------- Hub: the brain ---------------- */
export function makeHub() {
  const g = new THREE.Group();
  g.name = 'hub';
  const pts = [
    [0, 0], [0.42, 0], [0.44, 0.02], [0.44, 0.08], [0.4, 0.1], [0.38, 0.14],
    [0.36, 1.1], [0.35, 1.18], [0.32, 1.22], [0, 1.22],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  add(g, new THREE.Mesh(new THREE.LatheGeometry(pts, 72), mat.graphite()));
  // fabric acoustic band
  const fab = add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.367, 0.375, 0.62, 72, 1, true), mat.fabric()), 0, 0.55, 0);
  fab.castShadow = false; fab.receiveShadow = false;
  // brass base band
  add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.385, 0.39, 0.035, 72, 1, true), mat.brass()), 0, 0.16, 0);
  // status ring
  add(g, new THREE.Mesh(new THREE.TorusGeometry(0.352, 0.02, 10, 96), mat.emissive(C.teal, 4)), 0, 1.0, 0).rotation.x = Math.PI / 2;
  // glass cap
  add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.33, 0.03, 64), new THREE.MeshStandardMaterial({ color: 0x1b2433, metalness: 0.7, roughness: 0.12 })), 0, 1.23, 0);
  add(g, new THREE.Mesh(new THREE.CircleGeometry(0.05, 32), mat.emissive(C.brass, 0.6)), 0, 1.247, 0).rotation.x = -Math.PI / 2;
  add(g, new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.008, 6, 72), mat.brass()), 0, 1.235, 0).rotation.x = Math.PI / 2;
  g.userData = { tick() {} };
  return g;
}
