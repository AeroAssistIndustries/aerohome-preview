import { initHero } from './hero.js';
import { initViewer } from './viewer.js';

// Decide whether this device should run the live 3D scenes.
// Software-rendered WebGL, data-saver mode and very low-memory phones keep the still images instead.
function gpuOK() {
  const force = /[?&]3d=1\b/.test(location.search);
  if (/[?&]3d=0\b/.test(location.search)) return false;
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return false;
    if (force) return true;
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const r = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
    if (/swiftshader|llvmpipe|softpipe|software|basic render/i.test(r)) return false;
    const conn = navigator.connection;
    if (conn && conn.saveData) return false;
    if (navigator.deviceMemory && navigator.deviceMemory <= 2) return false;
    return true;
  } catch (e) { return false; }
}

const idle = (fn) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 1200 }) : setTimeout(fn, 200));

function startHero() {
  const heroCanvas = document.getElementById('hero-canvas');
  if (!heroCanvas) return;
  const pct = document.querySelector('[data-sweep-pct]');
  const bar = document.querySelector('[data-sweep-bar]');
  const alt = document.querySelector('[data-sweep-alt]');
  let last = -1;
  try {
    initHero(heroCanvas, {
      onTick({ progress, altitudeFt }) {
        const p = Math.floor(progress * 100);
        if (p === last) return;
        last = p;
        if (pct) pct.textContent = p + '%';
        if (bar) bar.style.transform = `scaleX(${progress})`;
        if (alt) alt.textContent = altitudeFt + ' ft';
      },
    });
    requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.add('hero-live')));
  } catch (e) { /* the still image stays */ }
}

function startViewer() {
  const vCanvas = document.getElementById('viewer-canvas');
  if (!vCanvas) return;
  const go = () => {
    try {
      const viewer = initViewer(vCanvas);
      const sel = document.querySelector('.sys-tabs [aria-selected="true"]');
      if (sel) viewer.show(sel.getAttribute('data-product'));
      document.addEventListener('aerohome:product', (e) => viewer.show(e.detail));
      document.documentElement.classList.add('viewer-live');
    } catch (e) { /* the still images stay */ }
  };
  if (!('IntersectionObserver' in window)) return go();
  const io = new IntersectionObserver((es) => {
    if (es.some((x) => x.isIntersecting)) { io.disconnect(); go(); }
  }, { rootMargin: '600px 0px' });
  io.observe(vCanvas);
}

function start() {
  if (window.__ahScene) return;
  window.__ahScene = true;
  if (!gpuOK()) { document.documentElement.classList.add('no-webgl'); return; }
  idle(startHero);
  startViewer();
}

if (document.readyState === 'complete') start();
else window.addEventListener('load', start);
