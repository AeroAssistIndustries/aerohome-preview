import { initHero } from './hero.js';
import { initViewer } from './viewer.js';

function webglOK() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) { return false; }
}

function start() {
  if (!webglOK()) { document.documentElement.classList.add('no-webgl'); return; }

  const heroCanvas = document.getElementById('hero-canvas');
  if (heroCanvas) {
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
      requestAnimationFrame(() => document.documentElement.classList.add('hero-live'));
    } catch (e) {
      document.documentElement.classList.add('no-webgl');
    }
  }

  const vCanvas = document.getElementById('viewer-canvas');
  if (vCanvas) {
    try {
      const viewer = initViewer(vCanvas);
      document.addEventListener('aerohome:product', (e) => viewer.show(e.detail));
    } catch (e) { /* the static spec list still works */ }
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
