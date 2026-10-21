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
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && document.body.classList.contains('menu-open')) { setMenu(false); menuBtn.focus(); } });
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
    var f = new FormData(form), payload = {};
    f.forEach(function (v, k) { payload[k] = String(v).trim(); });
    payload.source = location.hostname;
    var submit = $('button[type=submit]', form), err = $('#wl-err');
    submit.disabled = true; submit.setAttribute('aria-busy', 'true'); err.hidden = true;
    var label = submit.firstChild.textContent; submit.firstChild.textContent = 'Sending…';
    fetch(form.getAttribute('data-endpoint'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || 'failed'); return j; }); })
      .then(function () {
        box.classList.add('done');
        var sh = $('#sent-h'); if (sh) sh.focus();
      })
      .catch(function (e) {
        var known = e && /ZIP|email|name|Too many/i.test(e.message);
        err.textContent = known ? e.message : 'We couldn\u2019t save your request just now. Please try again in a minute, or email info@aeroassist.us with \u201cAeroHome waitlist\u201d in the subject.';
        if (e && /ZIP/i.test(e.message)) { $('[data-f=zip]').classList.add('bad'); fz.setAttribute('aria-invalid', 'true'); }
        err.hidden = false; err.focus();
      })
      .then(function () { submit.disabled = false; submit.removeAttribute('aria-busy'); submit.firstChild.textContent = label; });
  });
  var fz = $('#f-zip');
  fz.addEventListener('input', function () { var d = fz.value.replace(/\D/g, '').slice(0, 5); if (d !== fz.value) fz.value = d; });
  fz.addEventListener('change', function () { if (/^\d{5}$/.test(fz.value)) $('#f-metro').value = areaFor(fz.value) || 'Elsewhere, notify me'; });
  $('#zc-in').addEventListener('input', function () { var el = $('#zc-in'), d = el.value.replace(/\D/g, '').slice(0, 5); if (d !== el.value) el.value = d; });
  ['#f-name', '#f-email', '#f-zip'].forEach(function (s) {
    $(s).addEventListener('input', function () { $(s).closest('.f').classList.remove('bad'); $(s).removeAttribute('aria-invalid'); });
  });

  /* ---------- setup finder ---------- */
  var KITS = { out: ['Sentinel Kit', 1499], 'in': ['Guardian Kit', 999], both: ['AeroHome Complete', 2299] };
  var PLANS = { me: ['Essential', 49], auto: ['Plus', 89], agents: ['Total', 149] };
  var finder = $('#finder'), rec = null;
  function finderUpdate() {
    var c = ($('input[name=q-cover]:checked') || {}).value, r = ($('input[name=q-resp]:checked') || {}).value, f = ($('input[name=q-fam]:checked') || {}).value;
    if (!c || !r || !f) return;
    var kitKey = c, planKey = r, why = [];
    if (c === 'out' && f === 'yes') kitKey = 'both';
    var kit = KITS[kitKey];
    if (c === 'out' && f === 'no') why.push('Sentinel patrols the property line and meets intruders at the fence.');
    if (c === 'in') why.push('Guardian checks every door and window and patrols the rooms inside.');
    if (c === 'both') why.push('Sentinel covers the property line and Guardian covers the inside, for less than buying both kits.');
    if (c === 'out' && f === 'yes') why.push('We added Guardian, because pet check-ins and Elder Watch happen inside the home. Complete costs less than buying both kits.');
    var deter = kitKey === 'in' ? 'siren, strobe and voice' : 'spotlight and voice';
    if (r === 'me' && f === 'yes') { planKey = 'auto'; why.push('Plus keeps every response in your hands and adds arrival alerts, pet check-ins and Elder Watch.'); }
    else if (r === 'me') why.push('Essential gives you verified alerts and live control, and you decide what happens next.');
    if (r === 'auto') why.push('Plus runs ' + deter + ' deterrence automatically, with you kept in the loop.');
    if (r === 'agents') why.push('Total adds 24/7 professional monitoring, which most insurers require for a monitored-system discount.');
    if (f === 'yes' && r !== 'me') why.push('Your plan includes arrival alerts, pet check-ins and Elder Watch.');
    var plan = PLANS[planKey];
    rec = { kit: kit[0], hw: kit[1], plan: plan[0], mo: plan[1] };
    $('[data-r=kit]', finder).textContent = rec.kit;
    $('[data-r=plan]', finder).textContent = rec.plan;
    $('[data-r=hw]', finder).textContent = '$' + rec.hw.toLocaleString('en-US');
    $('[data-r=mo]', finder).textContent = '$' + rec.mo;
    var ul = $('[data-r=why]', finder); ul.textContent = '';
    why.forEach(function (w) { var li = document.createElement('li'); li.textContent = w; ul.appendChild(li); });
    var first = $('.fo-res', finder).hidden;
    $('.fo-empty', finder).hidden = true; $('.fo-res', finder).hidden = false;
    if (first && window.innerWidth <= 980) {
      var res = $('.finder-out', finder), r0 = res.getBoundingClientRect();
      if (r0.top > window.innerHeight * 0.5) res.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    }
  }
  if (finder) {
    $$('input[type=radio]', finder).forEach(function (i) { i.addEventListener('change', finderUpdate); });
    $('[data-act=cost]', finder).addEventListener('click', function () {
      if (!rec) return;
      var hw = $('#build input[name=hw][value="' + rec.hw + '"]'), pl = $('#build input[name=pl][value="' + rec.mo + '"]');
      if (hw) hw.checked = true; if (pl) pl.checked = true; calc();
    });
    $('[data-act=join]', finder).addEventListener('click', function () {
      if (!rec) return;
      $('#f-hw').value = rec.kit; $('#f-plan').value = rec.plan;
      setTimeout(function () { $('#f-name').focus({ preventScroll: true }); }, 450);
    });
  }

  /* ---------- ZIP check for the pilot areas ---------- */
  function areaFor(zip) {
    var z = +zip, p3 = Math.floor(z / 100);
    // Phoenix metro: 850, 852 and most of 853, plus Apache Junction, Gold Canyon, Maricopa, San Tan Valley and Queen Creek.
    // Far western and outlying 853 towns (Yuma, Parker, Ajo, Wickenburg and others) are outside the pilot.
    var PHX_NO = [85320, 85321, 85324, 85325, 85328, 85332, 85333, 85334, 85336, 85337, 85341, 85342, 85344, 85346, 85347, 85348, 85349, 85350, 85352, 85356, 85357, 85358, 85359, 85360, 85362, 85364, 85365, 85366, 85367, 85369, 85371, 85390];
    // Dallas–Fort Worth: 750–753 and 760–762, without outlying towns such as Sherman, Denison, Corsicana and Gainesville.
    var DFW_NO = [75020, 75021, 75090, 75091, 75092, 75110, 75148, 76240, 76241];
    if (p3 === 850 || p3 === 852 || (p3 === 853 && PHX_NO.indexOf(z) < 0) || (z >= 85118 && z <= 85120) || (z >= 85138 && z <= 85143)) return 'Phoenix, AZ';
    if (((p3 >= 750 && p3 <= 753) || (p3 >= 760 && p3 <= 762)) && DFW_NO.indexOf(z) < 0) return 'Dallas–Fort Worth, TX';
    return null;
  }
  var zc = $('#zipcheck');
  if (zc) zc.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = $('#zc-in').value.replace(/\D/g, ''), out = $('#zc-out');
    out.className = 'zc-out';
    if (!/^\d{5}$/.test(v)) { out.textContent = 'Enter a 5-digit ZIP code.'; out.classList.add('bad'); return; }
    var area = areaFor(v);
    $('#f-zip').value = v;
    if (area) {
      $('#f-metro').value = area;
      out.textContent = v + ' is in our ' + (area.indexOf('Phoenix') === 0 ? 'Phoenix' : 'Dallas–Fort Worth') + ' pilot area. We’ve added your ZIP code and metro to the form.';
      out.classList.add('good');
    } else {
      $('#f-metro').value = 'Elsewhere, notify me';
      out.textContent = v + ' isn’t in a 2026 pilot area yet. We’ve set the form to “Elsewhere, notify me,” and we’ll tell you when AeroHome reaches you.';
    }
  });

  /* ---------- share after sign-up ---------- */
  var shareBtn = $('#share');
  if (shareBtn) shareBtn.addEventListener('click', function () {
    var url = location.origin + location.pathname, note = $('#share-note');
    var data = { title: 'AeroHome', text: 'AeroHome is opening a 2026 pilot for drone and robot home security in Phoenix and Dallas–Fort Worth.', url: url };
    if (navigator.share) { navigator.share(data).catch(function () {}); return; }
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(function () { note.textContent = 'Link copied. Paste it in a text or email.'; }, function () { note.textContent = 'Copy this link: ' + url; });
  });

  /* ---------- active section in the menu ---------- */
  var navLinks = $$('.nav a[href^="#"]');
  if ('IntersectionObserver' in window && navLinks.length) {
    var map = {}; navLinks.forEach(function (a) { var t = document.getElementById(a.getAttribute('href').slice(1)); if (t) map[t.id] = a; });
    var spy = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        var a = map[en.target.id]; if (!a) return;
        if (en.isIntersecting) { navLinks.forEach(function (x) { x.removeAttribute('aria-current'); }); a.setAttribute('aria-current', 'true'); }
        else if (a.getAttribute('aria-current')) a.removeAttribute('aria-current');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(map).forEach(function (id) { spy.observe(document.getElementById(id)); });
  }

  /* ---------- phone bar: shows between the hero and the waitlist ---------- */
  var mbar = $('#mbar');
  if (mbar && 'IntersectionObserver' in window) {
    var seen = {};
    var mo = new IntersectionObserver(function (es) {
      es.forEach(function (en) { seen[en.target.id || en.target.tagName] = en.isIntersecting; });
      var show = !seen.top && !seen.waitlist && !seen.FOOTER && !document.body.classList.contains('menu-open');
      mbar.classList.toggle('show', show);
    }, { threshold: 0 });
    ['#top', '#waitlist', 'footer'].forEach(function (s) { var el = $(s); if (el) mo.observe(el); });
  }

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
