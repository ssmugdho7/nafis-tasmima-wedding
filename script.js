/* =====================================================================
   Tasmima & Nafis — Wedding website behaviour (vanilla JS, no build)
   ===================================================================== */
(function () {
  'use strict';

  /* ---------------- configuration ---------------- */
  // Add the family's WhatsApp number here (international format, digits only,
  // e.g. '8801XXXXXXXXX'). Left empty, the link opens WhatsApp's contact picker.
  var WHATSAPP_NUMBER = '';

  var EVENT = {
    title: "Nafis & Tasmima's Wedding",
    startUTC: '20261218T070000Z',          // 1:00 PM Bangladesh time (UTC+6, no DST)
    endUTC: '20261218T110000Z',
    startISO: '2026-12-18T07:00:00Z',
    venue: 'Naogaon Convention Center',
    address: 'Naogaon Convention Center, Baludanga Bus Stand, New Jail Khana Road, Chackpathuria, Naogaon, Bangladesh',
    description: 'Together with their families, Nafis Fuad Rafat & Mst. Tasmima Zaman Mou request the honour of your presence at their wedding.'
  };
  var STORE = { intro: 'nt-intro-seen', rsvp: 'nt-rsvp', wishes: 'nt-wishes' };

  var doc = document;
  var root = doc.documentElement;
  var $ = function (id) { return doc.getElementById(id); };
  var reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ---------------- safe storage ---------------- */
  function storeGet(area, key, fallback) {
    try { var v = window[area].getItem(key); return v === null ? fallback : JSON.parse(v); }
    catch (e) { return fallback; }
  }
  function storeSet(area, key, value) {
    try { window[area].setItem(key, JSON.stringify(value)); return true; }
    catch (e) { return false; }
  }

  /* ---------------- toast ---------------- */
  var toast = $('toast'), toastMsg = $('toastMsg'), toastTimer = null;
  function showToast(msg) {
    toastMsg.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 2600);
  }

  /* ---------------- garlands: tile the band to any width ---------------- */
  function fillGarlands() {
    var bands = doc.querySelectorAll('.garland');
    for (var i = 0; i < bands.length; i++) {
      var band = bands[i];
      var first = band.querySelector('svg');
      if (!first) continue;
      var w = first.getBoundingClientRect().width || 300;
      var need = Math.min(14, Math.ceil(band.clientWidth / w) + 2);
      var have = band.querySelectorAll('svg').length;
      for (var n = have; n < need; n++) band.appendChild(first.cloneNode(true));
    }
  }

  /* ---------------- reveal-on-scroll ---------------- */
  var revealStarted = false;
  function initReveal() {
    if (revealStarted) return;
    revealStarted = true;
    var els = doc.querySelectorAll('.reveal');
    if (reducedMotion || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('revealed'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------------- envelope intro ---------------- */
  var overlay = $('overlay'), doors = $('doors'), scene = $('scene'), flap = $('flap'),
      seal = $('seal'), ribbon = $('ribbon'), ribbonBand = $('ribbonBand'), openBtn = $('openBtn'), skipBtn = $('skipIntro');
  var opening = false;
  var lastFocus = null;

  function introActive() { return root.classList.contains('intro-on') && !overlay.classList.contains('removed'); }

  // While the envelope is showing, the rest of the page is inert so keyboard / screen-reader
  // users stay inside the dialog — without forcing a (visible) focus ring onto the envelope.
  var behindIntro = ['.skip-link', '#siteHeader', '.page', '#toTop'];
  function setPageInert(on) {
    behindIntro.forEach(function (sel) {
      var el = doc.querySelector(sel);
      if (!el) return;
      if (on) { el.setAttribute('inert', ''); el.setAttribute('aria-hidden', 'true'); }
      else { el.removeAttribute('inert'); el.removeAttribute('aria-hidden'); }
    });
  }

  function finishIntro() {
    overlay.classList.add('removed');
    overlay.classList.remove('opening');
    root.classList.remove('intro-on');
    root.classList.add('intro-skip');
    doc.body.classList.remove('locked');
    setPageInert(false);
    storeSet('sessionStorage', STORE.intro, 1);
    opening = false;
    initReveal();
    startParticles();
    // only move focus if it was inside the overlay (keyboard users); otherwise leave it alone
    var hadFocus = overlay.contains(doc.activeElement);
    var target = lastFocus && doc.contains(lastFocus) ? lastFocus : $('main');
    lastFocus = null;
    if (hadFocus || target !== $('main')) {
      try { target.focus({ preventScroll: true }); } catch (e) { target.focus(); }
    }
  }

  function openInvitation() {
    if (opening) return;
    opening = true;
    if (reducedMotion) { finishIntro(); return; }
    overlay.classList.add('opening');
    seal.classList.add('cracked');
    ribbon.classList.add('untied');
    ribbonBand.classList.add('untied');
    setTimeout(function () { flap.classList.add('folded'); }, 450);
    setTimeout(function () { scene.classList.add('fading'); }, 950);
    setTimeout(function () { doors.classList.add('open'); startParticles(); }, 1150);
    setTimeout(finishIntro, 2150);
  }

  function replayIntro() {
    lastFocus = doc.activeElement;
    [doors, scene, flap, seal, ribbon, ribbonBand].forEach(function (el) {
      el.classList.remove('open', 'fading', 'folded', 'cracked', 'untied');
    });
    overlay.classList.remove('removed', 'opening');
    root.classList.remove('intro-skip');
    root.classList.add('intro-on');
    opening = false;
    doc.body.classList.add('locked');
    setPageInert(true);
    window.scrollTo(0, 0);
    openBtn.focus({ preventScroll: true });
  }

  openBtn.addEventListener('click', openInvitation);
  skipBtn.addEventListener('click', function () { opening = true; finishIntro(); });
  doc.addEventListener('keydown', function (e) {
    if (!introActive()) return;
    if (e.key === 'Escape') { opening = true; finishIntro(); return; }
    if (e.key === 'Tab') { // keep focus inside the dialog (Tab from nowhere lands on the envelope)
      var f = [openBtn, skipBtn];
      var i = f.indexOf(doc.activeElement);
      e.preventDefault();
      f[i === -1 ? (e.shiftKey ? 1 : 0) : (i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  });
  $('replayBtn').addEventListener('click', function () {
    if (reducedMotion) { showToast('Animations are reduced on this device'); return; }
    replayIntro();
  });

  /* ---------------- header, nav & drawer ---------------- */
  var header = $('siteHeader'), toTop = $('toTop');
  var menuBtn = $('menuBtn'), drawer = $('drawer'), backdrop = $('drawerBackdrop'), drawerClose = $('drawerClose');
  var drawerOpen = false;

  var footerEl = doc.querySelector('.site-footer');
  var lastY = window.scrollY || 0, toTopIdle = 0;
  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    var vh = window.innerHeight;
    header.classList.toggle('scrolled', y > 24);
    // Show only after a real scroll (2 screens), never once the footer (which has its own
    // "Back to Top" button) is in view. On phones the text runs to the edge, so the button
    // only appears while the reader scrolls back up, then tucks away after a short pause —
    // it never rests on top of text during normal reading.
    var nearFooter = footerEl && footerEl.getBoundingClientRect().top < vh - 40;
    var eligible = y > vh * 2 && !nearFooter;
    var narrow = window.innerWidth < 600;
    var show = eligible && (!narrow || y < lastY - 2 || (toTop.classList.contains('show') && y <= lastY));
    if (narrow && toTop.contains(doc.activeElement)) show = eligible;   // keep it while focused
    toTop.classList.toggle('show', show);
    lastY = y;
    clearTimeout(toTopIdle);
    if (narrow && show) {
      toTopIdle = setTimeout(function () {
        if (!toTop.contains(doc.activeElement)) toTop.classList.remove('show');
      }, 2200);
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  function openDrawer() {
    drawerOpen = true;
    drawer.hidden = false; backdrop.hidden = false;
    // force layout so the transition runs
    void drawer.offsetWidth;
    drawer.classList.add('open'); backdrop.classList.add('open');
    menuBtn.setAttribute('aria-expanded', 'true');
    doc.body.classList.add('locked');
    drawerClose.focus();
  }
  function closeDrawer(returnFocus) {
    if (!drawerOpen) return;
    drawerOpen = false;
    drawer.classList.remove('open'); backdrop.classList.remove('open');
    menuBtn.setAttribute('aria-expanded', 'false');
    doc.body.classList.remove('locked');
    setTimeout(function () { if (!drawerOpen) { drawer.hidden = true; backdrop.hidden = true; } }, reducedMotion ? 0 : 400);
    if (returnFocus) menuBtn.focus();
  }
  menuBtn.addEventListener('click', openDrawer);
  drawerClose.addEventListener('click', function () { closeDrawer(true); });
  backdrop.addEventListener('click', function () { closeDrawer(true); });
  drawer.addEventListener('click', function (e) {
    if (e.target.closest('a')) closeDrawer(false);
  });
  doc.addEventListener('keydown', function (e) {
    if (!drawerOpen) return;
    if (e.key === 'Escape') { closeDrawer(true); return; }
    if (e.key === 'Tab') {
      var f = drawer.querySelectorAll('a, button');
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  window.addEventListener('resize', function () { if (window.innerWidth >= 1000) closeDrawer(false); });

  // active-section highlight
  var navAnchors = doc.querySelectorAll('.nav-links a, .drawer-links a');
  var sections = Array.prototype.map.call(doc.querySelectorAll('.nav-links a'), function (a) {
    return doc.querySelector(a.getAttribute('href'));
  }).filter(Boolean);
  function setActive(id) {
    navAnchors.forEach(function (a) {
      if (a.getAttribute('href') === '#' + id) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  }
  var activeTicking = false;
  function updateActive() {
    activeTicking = false;
    var line = window.innerHeight * 0.35;
    var current = sections[0];
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].getBoundingClientRect().top - line <= 0) current = sections[i];
    }
    // at the very bottom, the last section wins
    if (window.innerHeight + (window.scrollY || 0) >= doc.documentElement.scrollHeight - 4) current = sections[sections.length - 1];
    if (current) setActive(current.id);
  }
  window.addEventListener('scroll', function () {
    if (!activeTicking) { activeTicking = true; requestAnimationFrame(updateActive); }
  }, { passive: true });
  window.addEventListener('resize', updateActive);
  updateActive();

  // back to top
  function backToTop(e) {
    if (e) e.preventDefault();
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
    try { history.replaceState(null, '', location.pathname + location.search); } catch (err) {}
    var brand = doc.querySelector('.brand');
    try { brand.focus({ preventScroll: true }); } catch (err) { brand.focus(); }
  }
  toTop.addEventListener('click', backToTop);
  $('backTop').addEventListener('click', backToTop);

  /* ---------------- copy address ---------------- */
  var copyBtn = $('copyAddr');
  copyBtn.addEventListener('click', function () {
    function done() {
      showToast('Address copied to clipboard');
      copyBtn.classList.add('copied');
      setTimeout(function () { copyBtn.classList.remove('copied'); }, 1800);
    }
    function fallback() {
      var ta = doc.createElement('textarea');
      ta.value = EVENT.address;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
      doc.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = doc.execCommand('copy'); } catch (e) {}
      doc.body.removeChild(ta);
      copyBtn.focus();
      if (ok) done(); else showToast('Copy failed — please select the address manually');
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(EVENT.address).then(done, fallback);
    } else {
      fallback();
    }
  });

  /* ---------------- add to calendar ---------------- */
  function icsEscape(s) { return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n'); }
  $('icsBtn').addEventListener('click', function () {
    var stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    var ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Nafis and Tasmima Wedding//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:nafis-tasmima-wedding-20261218@invitation',
      'DTSTAMP:' + stamp,
      'DTSTART:' + EVENT.startUTC,
      'DTEND:' + EVENT.endUTC,
      'SUMMARY:' + icsEscape(EVENT.title),
      'LOCATION:' + icsEscape(EVENT.address),
      'DESCRIPTION:' + icsEscape(EVENT.description),
      'BEGIN:VALARM',
      'TRIGGER:-P1D',
      'ACTION:DISPLAY',
      'DESCRIPTION:' + icsEscape(EVENT.title) + ' is tomorrow',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
    try {
      var blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = doc.createElement('a');
      a.href = url;
      a.download = 'Nafis-Tasmima-Wedding.ics';
      doc.body.appendChild(a);
      a.click();
      doc.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      showToast('Calendar event downloaded');
    } catch (err) {
      showToast('Could not create the calendar file');
    }
  });
  $('gcalBtn').href = 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
    '&text=' + encodeURIComponent(EVENT.title) +
    '&dates=' + EVENT.startUTC + '/' + EVENT.endUTC +
    '&details=' + encodeURIComponent(EVENT.description) +
    '&location=' + encodeURIComponent(EVENT.address) +
    '&ctz=Asia/Dhaka';

  /* ---------------- countdown ---------------- */
  var target = new Date(EVENT.startISO).getTime();
  var cdEls = { d: $('cdDays'), h: $('cdHours'), m: $('cdMinutes'), s: $('cdSeconds') };
  var heroCd = $('heroCountdown');
  var cdTimer = null;
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function tick() {
    var diff = target - Date.now();
    if (diff <= 0) {
      clearInterval(cdTimer);
      $('cdGrid').hidden = true;
      $('cdSub').hidden = true;
      $('cdDone').hidden = false;
      // more than a day after the ceremony: the couple is married
      if (-diff > 864e5) {
        $('cdDoneTitle').textContent = 'Alhamdulillah, we\u2019re married!';
        $('cdDoneSub').textContent = 'Thank you for your love, prayers and duas.';
        heroCd.textContent = 'Alhamdulillah \u00b7 Married on 18 December 2026';
      } else {
        heroCd.textContent = 'Alhamdulillah \u00b7 The day has arrived';
      }
      return;
    }
    var t = Math.floor(diff / 1000);
    var d = Math.floor(t / 86400), h = Math.floor((t % 86400) / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
    cdEls.d.textContent = d < 100 ? pad2(d) : String(d);
    cdEls.h.textContent = pad2(h);
    cdEls.m.textContent = pad2(m);
    cdEls.s.textContent = pad2(s);
    heroCd.textContent = d > 0 ? d + (d === 1 ? ' day' : ' days') + ' to go' : 'Today \u00b7 in ' + h + 'h ' + m + 'm';
  }
  tick();
  cdTimer = setInterval(tick, 1000);

  /* ---------------- form helpers ---------------- */
  function setError(input, errEl, msg) {
    errEl.textContent = msg || '';
    if (input) {
      if (msg) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
    }
    return !msg;
  }
  function clean(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }

  /* ---------------- RSVP ---------------- */
  var form = $('rsvpForm'), thanks = $('rsvpThanks');
  var rName = $('rName'), rPhone = $('rPhone'), rGuests = $('rGuests'), rMsg = $('rMsg'), rShare = $('rShare');
  var guestsField = $('guestsField'), msgCount = $('rMsgCount');

  function attendingValue() {
    var c = form.querySelector('input[name="attending"]:checked');
    return c ? c.value : '';
  }
  function syncGuests() {
    var no = attendingValue() === 'no';
    guestsField.classList.toggle('is-disabled', no);
    rGuests.disabled = no;
    guestsField.querySelectorAll('.step-btn').forEach(function (b) { b.disabled = no; });
  }
  form.querySelectorAll('input[name="attending"]').forEach(function (r) {
    r.addEventListener('change', function () { syncGuests(); setError(null, $('rAttendErr'), ''); });
  });
  guestsField.querySelectorAll('.step-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      var v = parseInt(rGuests.value, 10) || 1;
      v = Math.max(1, Math.min(10, v + Number(b.getAttribute('data-step'))));
      rGuests.value = v;
      setError(rGuests, $('rGuestsErr'), '');
    });
  });
  rMsg.addEventListener('input', function () { msgCount.textContent = rMsg.value.length + ' / 500'; });

  function validateName() {
    var v = clean(rName.value);
    return setError(rName, $('rNameErr'), !v ? 'Please enter your name.' : v.length < 2 ? 'Please enter your full name.' : '');
  }
  function validatePhone() {
    var raw = rPhone.value.trim();
    var digits = raw.replace(/\D/g, '');
    var msg = '';
    if (!raw) msg = 'Please enter a phone number.';
    else if (!/^\+?[\d\s\-()]+$/.test(raw) || digits.length < 7 || digits.length > 15) msg = 'Please enter a valid phone number.';
    return setError(rPhone, $('rPhoneErr'), msg);
  }
  function validateAttend() {
    return setError(null, $('rAttendErr'), attendingValue() ? '' : 'Please let us know if you can attend.');
  }
  function validateGuests() {
    if (attendingValue() === 'no') return setError(rGuests, $('rGuestsErr'), '');
    var n = Number(rGuests.value);
    return setError(rGuests, $('rGuestsErr'), (!Number.isInteger(n) || n < 1 || n > 10) ? 'Please enter a number from 1 to 10.' : '');
  }
  rName.addEventListener('blur', function () { if (rName.value) validateName(); });
  rPhone.addEventListener('blur', function () { if (rPhone.value) validatePhone(); });
  rGuests.addEventListener('change', validateGuests);
  [rName, rPhone].forEach(function (el) {
    el.addEventListener('input', function () { if (el.getAttribute('aria-invalid')) (el === rName ? validateName : validatePhone)(); });
  });

  function waLink(text) {
    var num = String(WHATSAPP_NUMBER).replace(/\D/g, '');
    return 'https://wa.me/' + num + '?text=' + encodeURIComponent(text);
  }
  function rsvpText(r) {
    var lines = [
      'Assalamu Alaikum! RSVP for Tasmima & Nafis\u2019s wedding (Friday, 18 December 2026, Naogaon Convention Center).',
      '',
      'Name: ' + r.name,
      'Phone: ' + r.phone,
      'Attending: ' + (r.attending === 'yes' ? 'Yes, joyfully' : 'Sorry, unable to attend')
    ];
    if (r.attending === 'yes') lines.push('Guests: ' + r.guests);
    if (r.message) lines.push('', 'Message: ' + r.message);
    return lines.join('\n');
  }
  function showThanks(r, focus) {
    form.hidden = true;
    thanks.hidden = false;
    var first = r.name.split(' ')[0];
    $('thanksTitle').textContent = r.attending === 'yes' ? 'JazakAllahu khairan, ' + first + '!' : 'Thank you, ' + first + '.';
    $('thanksText').textContent = r.attending === 'yes'
      ? 'We\u2019ve noted ' + r.guests + (r.guests === 1 ? ' guest' : ' guests') + '. We can\u2019t wait to celebrate with you on Friday, 18 December.'
      : 'We\u2019ll miss you dearly. Please keep Tasmima & Nafis in your duas.';
    $('waBtn').href = waLink(rsvpText(r));
    if (focus) thanks.focus();
  }
  function fillForm(r) {
    rName.value = r.name || '';
    rPhone.value = r.phone || '';
    rGuests.value = r.guests || 1;
    rMsg.value = r.message || '';
    rShare.checked = r.share !== false;
    var radio = form.querySelector('input[name="attending"][value="' + (r.attending === 'no' ? 'no' : 'yes') + '"]');
    if (radio) radio.checked = true;
    msgCount.textContent = rMsg.value.length + ' / 500';
    syncGuests();
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var ok = [validateName(), validatePhone(), validateAttend(), validateGuests()];
    if (ok.indexOf(false) !== -1) {
      var firstBad = form.querySelector('[aria-invalid="true"]') ||
        (!attendingValue() ? form.querySelector('input[name="attending"]') : null);
      if (firstBad) firstBad.focus();
      showToast('Please check the highlighted fields');
      return;
    }
    var prev = storeGet('localStorage', STORE.rsvp, null);
    var r = {
      name: clean(rName.value),
      phone: rPhone.value.trim(),
      attending: attendingValue(),
      guests: attendingValue() === 'yes' ? Number(rGuests.value) : 0,
      message: rMsg.value.trim(),
      share: rShare.checked,
      at: new Date().toISOString(),
      wishId: prev && prev.wishId
    };
    // share the RSVP message on the wishes wall (update in place when editing)
    if (r.message && r.share) {
      r.wishId = upsertWish({ id: r.wishId, name: r.name, message: r.message });
    } else if (r.wishId) {
      removeWish(r.wishId); r.wishId = null;
    }
    if (!storeSet('localStorage', STORE.rsvp, r)) showToast('Saved for this visit only (storage unavailable)');
    showThanks(r, true);
  });
  $('editRsvp').addEventListener('click', function () {
    var r = storeGet('localStorage', STORE.rsvp, null);
    if (r) fillForm(r);
    thanks.hidden = true;
    form.hidden = false;
    rName.focus();
  });
  var saved = storeGet('localStorage', STORE.rsvp, null);
  if (saved && saved.name) { fillForm(saved); showThanks(saved, false); }

  /* ---------------- wishes wall ---------------- */
  var wall = $('wishWall'), wishEmpty = $('wishEmpty'), wishForm = $('wishForm');
  var wName = $('wName'), wMsg = $('wMsg');
  var dateFmt;
  try { dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { dateFmt = null; }

  function getWishes() {
    var list = storeGet('localStorage', STORE.wishes, []);
    return Array.isArray(list) ? list : [];
  }
  function saveWishes(list) { return storeSet('localStorage', STORE.wishes, list.slice(0, 200)); }
  function upsertWish(w) {
    var list = getWishes();
    var id = w.id || ('w' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6));
    var item = { id: id, name: w.name.slice(0, 60), message: w.message.slice(0, 500), at: new Date().toISOString() };
    var idx = -1;
    for (var i = 0; i < list.length; i++) if (list[i].id === id) idx = i;
    if (idx >= 0) list.splice(idx, 1);
    list.unshift(item);
    if (!saveWishes(list)) {
      showToast('Sorry \u2014 your wish couldn\u2019t be saved on this device');
      return null;
    }
    renderWishes();
    return id;
  }
  function removeWish(id) {
    saveWishes(getWishes().filter(function (w) { return w.id !== id; }));
    renderWishes();
  }
  function renderWishes() {
    var list = getWishes();
    wall.textContent = '';
    list.forEach(function (w) {
      if (!w || typeof w.message !== 'string') return;
      var li = doc.createElement('li'); li.className = 'wish';
      var msg = doc.createElement('p'); msg.className = 'wish-msg'; msg.textContent = w.message;
      var meta = doc.createElement('div'); meta.className = 'wish-meta';
      var name = doc.createElement('span'); name.className = 'wish-name'; name.textContent = String(w.name || 'A well-wisher');
      meta.appendChild(name);
      var d = new Date(w.at);
      if (!isNaN(d)) {
        var time = doc.createElement('time'); time.className = 'wish-date';
        time.dateTime = d.toISOString();
        time.textContent = dateFmt ? dateFmt.format(d) : d.toDateString();
        meta.appendChild(time);
      }
      li.appendChild(msg); li.appendChild(meta);
      wall.appendChild(li);
    });
    wishEmpty.hidden = wall.children.length > 0;
  }
  wishForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var n = clean(wName.value), m = wMsg.value.trim();
    var okN = setError(wName, $('wNameErr'), n ? '' : 'Please enter your name.');
    var okM = setError(wMsg, $('wMsgErr'), m.length >= 2 ? '' : 'Please write a short wish or dua.');
    if (!okN || !okM) { (okN ? wMsg : wName).focus(); return; }
    if (!upsertWish({ name: n, message: m })) return;   // keep the text so nothing is lost
    wishForm.reset();
    showToast('JazakAllahu khairan for your dua');
  });
  [wName, wMsg].forEach(function (el) {
    el.addEventListener('input', function () {
      if (el.getAttribute('aria-invalid')) setError(el, $(el.id + 'Err'), '');
    });
  });
  renderWishes();
  $('writeWish').addEventListener('click', function (e) {
    e.preventDefault();
    wishForm.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
    try { wName.focus({ preventScroll: true }); } catch (err) { wName.focus(); }
  });
  window.addEventListener('storage', function (e) { if (e.key === STORE.wishes) renderWishes(); });

  /* ---------------- map: tap to load ---------------- */
  var MAP_EMBED = 'https://www.google.com/maps?q=' +
    encodeURIComponent(EVENT.address).replace(/%20/g, '+') + '&output=embed';
  var mapFrame = $('mapFrame'), showMapBtn = $('showMap'), mapPlaceholder = $('mapPlaceholder');
  showMapBtn.addEventListener('click', function () {
    if (mapFrame.querySelector('iframe')) return;
    var hadFocus = doc.activeElement === showMapBtn;
    showMapBtn.disabled = true;
    showMapBtn.lastChild.textContent = 'Loading map\u2026';
    var iframe = doc.createElement('iframe');
    iframe.title = 'Map showing Naogaon Convention Center, Naogaon, Bangladesh';
    iframe.src = MAP_EMBED;
    iframe.loading = 'eager';
    iframe.referrerPolicy = 'no-referrer-when-downgrade';
    iframe.allowFullscreen = true;
    iframe.addEventListener('load', function () {
      mapFrame.classList.add('loaded');
      setTimeout(function () { mapPlaceholder.hidden = true; }, reducedMotion ? 0 : 450);
      if (hadFocus) iframe.focus();
    });
    mapFrame.classList.add('has-map');
    mapFrame.appendChild(iframe);
  });

  /* ---------------- pause decorative CSS animations while off-screen ---------------- */
  (function () {
    var els = doc.querySelectorAll('[data-anim]');
    if (!('IntersectionObserver' in window)) { els.forEach(function (el) { el.classList.add('in-view'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { en.target.classList.toggle('in-view', en.isIntersecting); });
    }, { rootMargin: '40px 0px' });
    els.forEach(function (el) { io.observe(el); });
  })();

  /* ---------------- particles: petals + gold sparkles ---------------- */
  var particlesStarted = false;
  function startParticles() {
    if (particlesStarted || reducedMotion) return;
    var canvas = $('particles');
    var ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx) return;
    particlesStarted = true;
    var W = 0, H = 0, dpr = 1;
    var parts = [];

    function targetCount() { return W < 640 ? 10 : W < 1100 ? 22 : 30; }
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var want = targetCount();
      while (parts.length < want) parts.push(make(true));
      if (parts.length > want) parts.length = want;
    }
    function make(initial) {
      var gold = Math.random() < 0.35;
      return {
        x: Math.random() * W,
        y: initial ? Math.random() * H : -20,
        r: gold ? 1.4 + Math.random() * 1.8 : 4.5 + Math.random() * 4.5,
        speed: 12 + Math.random() * 18,
        drift: (Math.random() * 2 - 1) * 14,
        phase: Math.random() * Math.PI * 2,
        freq: 0.4 + Math.random() * 0.5,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() * 2 - 1) * 0.6,
        gold: gold,
        tw: Math.random() * Math.PI * 2,
        alpha: gold ? 0.5 + Math.random() * 0.4 : 0.3 + Math.random() * 0.3,
        hue: Math.random() < 0.5 ? '#E8A598' : '#F2C3B8'
      };
    }
    function drawSparkle(p) {
      var r = p.r, a = p.alpha * (0.55 + 0.45 * Math.sin(p.tw));
      ctx.globalAlpha = Math.max(0, a);
      ctx.fillStyle = '#C5A059';
      ctx.beginPath();
      ctx.moveTo(0, -r * 2.4); ctx.lineTo(r * 0.5, -r * 0.5); ctx.lineTo(r * 2.4, 0); ctx.lineTo(r * 0.5, r * 0.5);
      ctx.lineTo(0, r * 2.4); ctx.lineTo(-r * 0.5, r * 0.5); ctx.lineTo(-r * 2.4, 0); ctx.lineTo(-r * 0.5, -r * 0.5);
      ctx.closePath(); ctx.fill();
    }
    function drawPetal(p) {
      var r = p.r;
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.hue;
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.bezierCurveTo(r * 0.9, -r * 0.7, r * 0.8, r * 0.6, 0, r);
      ctx.bezierCurveTo(-r * 0.8, r * 0.6, -r * 0.9, -r * 0.7, 0, -r);
      ctx.fill();
    }

    resize();
    var resizeTimer;
    window.addEventListener('resize', function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 150); });

    var last = performance.now();
    var rafId = 0;
    function frame(now) {
      var dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.y += p.speed * dt;
        p.phase += p.freq * dt;
        p.tw += 3 * dt;
        p.x += Math.sin(p.phase) * p.drift * dt;
        p.rot += p.rotSpeed * dt;
        if (p.y > H + 20 || p.x < -30 || p.x > W + 30) parts[i] = p = make(false);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        if (p.gold) drawSparkle(p); else drawPetal(p);
        ctx.restore();
      }
      rafId = requestAnimationFrame(frame);
    }
    // A gentle welcome, not a screensaver: the particles run while the hero is on screen,
    // for at most PARTICLE_BUDGET ms of visible time, then fade out and stop for good.
    var PARTICLE_BUDGET = window.innerWidth < 640 ? 10000 : 15000;
    var used = 0, runStart = 0, heroVisible = true, done = false, fadeTimer = 0, typing = false;
    function play() {
      if (rafId || done || doc.hidden || !heroVisible || typing) return;
      clearTimeout(fadeTimer);
      canvas.classList.remove('fade');
      last = runStart = performance.now();
      rafId = requestAnimationFrame(frame);
    }
    function pause(fade) {
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; used += performance.now() - runStart; }
      if (fade) canvas.classList.add('fade');
    }
    function finish() {
      if (done) return;
      done = true;
      canvas.classList.add('fade');
      // let the remaining petals drift while they fade, then stop and free the canvas
      fadeTimer = setTimeout(function () { pause(false); ctx.clearRect(0, 0, W, H); canvas.width = canvas.height = 0; }, 2100);
    }
    setInterval(function () {
      if (done) return;
      var total = used + (rafId ? performance.now() - runStart : 0);
      if (total >= PARTICLE_BUDGET) finish();
    }, 1000);
    doc.addEventListener('visibilitychange', function () { if (doc.hidden) pause(false); else play(); });
    // keep typing smooth: no animation frames while a form field has focus
    function isField(el) { return el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName); }
    doc.addEventListener('focusin', function (e) { if (isField(e.target)) { typing = true; pause(false); } });
    doc.addEventListener('focusout', function (e) {
      if (!isField(e.target)) return;
      setTimeout(function () { typing = isField(doc.activeElement); if (!typing) play(); }, 0);
    });
    var hero = $('home');
    if (hero && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        heroVisible = entries[0].isIntersecting;
        if (heroVisible) play(); else pause(true);
      }, { threshold: 0.15 }).observe(hero);
    }
    play();
  }

  /* ---------------- deep links: re-align after web fonts change the layout ---------------- */
  if (location.hash && location.hash.length > 1 && doc.fonts && doc.fonts.ready) {
    doc.fonts.ready.then(function () {
      var t;
      try { t = doc.querySelector(decodeURIComponent(location.hash)); } catch (e) { t = null; }
      if (t && t.id !== 'home' && window.scrollY > 0) t.scrollIntoView({ block: 'start' });
    });
  }

  /* ---------------- boot ---------------- */
  fillGarlands();
  window.addEventListener('resize', fillGarlands);
  if (introActive()) {
    doc.body.classList.add('locked');
    setPageInert(true);   // no programmatic focus: avoids a focus ring for mouse/touch users
  } else {
    if (root.classList.contains('intro-on')) root.classList.remove('intro-on');
    initReveal();
    startParticles();
  }
})();
