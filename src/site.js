/* AeroHome — page interactions */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* header + back to top */
  var head = $('#head'), totop = $('.totop');
  function onScroll() {
    var y = window.scrollY || 0;
    head.classList.toggle('scrolled', y > 8);
    totop.classList.toggle('show', y > 1200);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  totop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); });

  /* mobile menu */
  var menuBtn = $('.menu-btn');
  function setMenu(open) {
    if (open) document.documentElement.style.setProperty('--drawer-top', Math.max(0, head.getBoundingClientRect().bottom) + 'px');
    document.body.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    ['main', 'footer', '.ubar'].forEach(function (s) { var el = $(s); if (el) { if (open) el.setAttribute('inert', ''); else el.removeAttribute('inert'); } });
    if (open) setTimeout(function () { var f = $('#drawer a'); if (f) f.focus({ preventScroll: true }); }, 80);
  }
  menuBtn.addEventListener('click', function () { setMenu(!document.body.classList.contains('menu-open')); });
  $$('#drawer a').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = (a.getAttribute('href') || '').slice(1), t = id && document.getElementById(id);
      setMenu(false);
      if (!t) return;
      e.preventDefault();
      requestAnimationFrame(function () {
        t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
        if (history.replaceState) history.replaceState(null, '', '#' + id);
      });
    });
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  window.addEventListener('resize', function () { if (window.innerWidth > 1080) setMenu(false); });

  /* why: fixed cameras vs AeroHome */
  var why = $('#why'), cap = $('[data-cap]');
  var caps = {
    cams: 'Four fixed cameras, three blind spots, and an alarm that sounds after entry.',
    ah: 'One patrol covers every foot of the property line and meets intruders at the fence.'
  };
  $$('.seg button').forEach(function (b) {
    b.addEventListener('click', function () {
      var m = b.getAttribute('data-mode');
      why.classList.toggle('mode-cams', m === 'cams');
      why.classList.toggle('mode-ah', m === 'ah');
      $$('.seg button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      cap.textContent = caps[m];
    });
  });

  /* how: the response ladder */
  var tac = $('#tac');
  var stepBtns = $$('#steps button');
  var drone = $('#tac-drone'), guard = $('#tac-guard'), intr = $('#tac-intruder');
  var clockEl = $('[data-tac-clock]'), statusEl = $('[data-tac-status]');
  var STEP = [
    { c: '2:12:58 a.m.', s: 'Patrol. Sentinel is docked and Guardian is on its rounds.' },
    { c: '2:13:07 a.m.', s: 'A fence sensor on the east side trips.' },
    { c: '2:13:19 a.m.', s: 'Sentinel is on scene. Guardian moves to the entry.' },
    { c: '2:13:24 a.m.', s: 'On-device AI confirms a person.' },
    { c: '2:13:31 a.m.', s: 'Spotlight and voice challenge. The intruder turns back.' },
    { c: '2:13:33 a.m.', s: 'You and a monitoring agent see the live feed.' },
    { c: '2:15:41 a.m.', s: 'Evidence package sealed. All clear.' }
  ];
  var cur = 0;
  function setStep(n) {
    cur = n;
    $$('[data-s]', tac).forEach(function (el) {
      var from = +el.getAttribute('data-s');
      var until = el.hasAttribute('data-until') ? +el.getAttribute('data-until') : 99;
      el.style.opacity = (n >= from && n <= until) ? 1 : 0;
    });
    drone.style.transform = n >= 2 ? 'translate(398px, -6px)' : 'translate(0px, 0px)';
    guard.style.transform = n >= 2 ? 'translate(128px, 22px)' : 'translate(0px, 0px)';
    intr.style.transform = n >= 5 ? 'translate(30px, -42px)' : 'translate(0px, 0px)';
    intr.style.opacity = n >= 5 ? 0.3 : 1;
    clockEl.textContent = STEP[n].c;
    statusEl.textContent = STEP[n].s;
    stepBtns.forEach(function (b) {
      var on = +b.getAttribute('data-step') === n;
      b.parentNode.classList.toggle('on', on);
      b.setAttribute('aria-current', on ? 'step' : 'false');
    });
  }
  var timer = null, playBtn = $('#play');
  function stop() { clearTimeout(timer); timer = null; playBtn.textContent = 'Play a 2 a.m. event'; }
  function play() {
    if (timer) { stop(); return; }
    playBtn.textContent = 'Pause';
    var n = cur >= 6 ? 0 : cur;
    setStep(n);
    (function next() {
      if (n >= 6) { stop(); playBtn.textContent = 'Replay the event'; return; }
      timer = setTimeout(function () { n++; setStep(n); next(); }, n === 0 ? 700 : 2300);
    })();
  }
  playBtn.addEventListener('click', play);
  stepBtns.forEach(function (b) { b.addEventListener('click', function () { stop(); setStep(+b.getAttribute('data-step')); }); });
  setStep(0);
  // play once when the section first comes into view
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { io.disconnect(); if (cur === 0 && !timer) play(); }
    }, { threshold: 0.45 });
    io.observe(tac);
  }

  /* system tabs */
  var tabs = $$('.sys-tabs [role=tab]');
  function selectTab(t, focus) {
    tabs.forEach(function (x) {
      var on = x === t;
      x.setAttribute('aria-selected', String(on));
      x.tabIndex = on ? 0 : -1;
      document.getElementById(x.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) t.focus();
    var stage = $('.stage'); if (stage) stage.setAttribute('data-product', t.getAttribute('data-product'));
    document.dispatchEvent(new CustomEvent('aerohome:product', { detail: t.getAttribute('data-product') }));
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { selectTab(t); });
    t.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      selectTab(tabs[(i + d + tabs.length) % tabs.length], true);
    });
  });

  /* calculator */
  var fmt = function (n) { return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  var whole = function (n) { return '$' + Math.round(n).toLocaleString('en-US'); };
  var insNote = $('#ins-note');
  var prem = $('#prem'), disc = $('#disc'), discO = $('#disc-o'), ins = $('#ins');
  function out(k, v) { $('[data-o="' + k + '"]').textContent = v; }
  function calc() {
    var hw = +($('input[name=hw]:checked') || {}).value || 0;
    var pl = +($('input[name=pl]:checked') || {}).value || 0;
    var p = parseFloat(String(prem.value).replace(/[^0-9.]/g, '')) || 0;
    var d = +disc.value;
    discO.textContent = d + '%';
    var monitored = pl === 149;
    disc.disabled = !ins.checked || !monitored;
    insNote.hidden = monitored || !ins.checked;
    var save = (ins.checked && monitored) ? p * d / 100 : 0;
    out('hw', whole(hw));
    out('py', whole(pl * 12));
    out('fy', whole(hw + pl * 12));
    out('sv', save ? '−' + whole(save) : '$0');
    out('pm', fmt(Math.max(0, pl - save / 12)));
    out('fk', fmt(hw / 36) + '/mo');
    out('fp', fmt(hw / 36 + pl) + '/mo');
  }
  $$('#build input').forEach(function (i) { i.addEventListener('input', calc); i.addEventListener('change', calc); });
  prem.addEventListener('blur', function () {
    var p = parseFloat(String(prem.value).replace(/[^0-9.]/g, ''));
    prem.value = isNaN(p) ? '' : Math.round(p).toLocaleString('en-US');
    calc();
  });
  calc();

  /* plan buttons preselect the form */
  $$('[data-plan]').forEach(function (a) {
    a.addEventListener('click', function () { $('#f-plan').value = a.getAttribute('data-plan'); });
  });

  /* waitlist */
  var box = $('#wl-form'), form = $('form', box);
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var ok = true;
    var name = $('#f-name'), email = $('#f-email');
    var zip = $('#f-zip');
    var nOk = name.value.trim().length > 1;
    var eOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim());
    var zOk = !zip.value.trim() || /^\d{5}$/.test(zip.value.trim());
    [['name', nOk, name], ['email', eOk, email], ['zip', zOk, zip]].forEach(function (x) {
      $('[data-f=' + x[0] + ']').classList.toggle('bad', !x[1]);
      if (x[1]) x[2].removeAttribute('aria-invalid'); else x[2].setAttribute('aria-invalid', 'true');
    });
    if (!nOk) { name.focus(); ok = false; } else if (!eOk) { email.focus(); ok = false; } else if (!zOk) { zip.focus(); ok = false; }
    if (!ok) return;
    var f = new FormData(form);
    var body = [
      'Name: ' + f.get('name'),
      'Email: ' + f.get('email'),
      'ZIP code: ' + (f.get('zip') || ''),
      'Metro: ' + f.get('metro'),
      'Hardware: ' + f.get('hw'),
      'Plan: ' + f.get('plan')
    ].join('\n');
    window.location.href = 'mailto:info@aeroassist.us?subject=' + encodeURIComponent('AeroHome waitlist') + '&body=' + encodeURIComponent(body);
    box.classList.add('done');
    var sh = $('#sent-h'); if (sh) sh.focus();
  });
  ['#f-name', '#f-email', '#f-zip'].forEach(function (s) {
    $(s).addEventListener('input', function () { $(s).closest('.f').classList.remove('bad'); $(s).removeAttribute('aria-invalid'); });
  });

  /* load the 3D scenes once the page itself has finished loading */
  function loadScene() {
    var sc = document.createElement('script');
    sc.src = document.documentElement.getAttribute('data-scene');
    sc.async = true;
    document.body.appendChild(sc);
  }
  if (document.documentElement.getAttribute('data-scene')) {
    if (document.readyState === 'complete') setTimeout(loadScene, 300);
    else window.addEventListener('load', function () { setTimeout(loadScene, 300); });
  }
})();
