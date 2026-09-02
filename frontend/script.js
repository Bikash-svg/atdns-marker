// ===== MAIN SCRIPT with all new features =====
(function() {
  "use strict";

  // storage keys
  var STORAGE_KEY = 'attendanceData_v1';
  var THEME_KEY = 'attendanceTheme_v1';
  var SCHEME_KEY = 'attendanceScheme_v1';
  // Sunday-holiday and predict-mode are app preferences, not attendance data —
  // stored the same way as theme/scheme, deliberately separate from `state`
  // so they never touch the import/export logic at all.
  var SUNDAY_HOLIDAY_KEY = 'attendanceSundayHoliday_v1';
  var PREDICT_MODE_KEY = 'attendancePredictMode_v1';

  function loadData() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.schedule && parsed.records) {
          if (!parsed.extras) parsed.extras = {};
          if (!parsed.myClasses) parsed.myClasses = [];
          return parsed;
        }
      }
    } catch (e) {}
    return {
      schedule: [
        { dayOfWeek: 0, subjects: [] },
        { dayOfWeek: 1, subjects: [] },
        { dayOfWeek: 2, subjects: [] },
        { dayOfWeek: 3, subjects: [] },
        { dayOfWeek: 4, subjects: [] },
        { dayOfWeek: 5, subjects: [] },
        { dayOfWeek: 6, subjects: [] }
      ],
      records: [],
      extras: {},
      myClasses: [],
      startDate: isoDate(new Date())
    };
  }

  function saveData() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { showToast('Could not save — storage full?'); }
    if (window.AuthSync) window.AuthSync.queuePush(state);
  }

  var state = loadData();
  if (!state.startDate) state.startDate = isoDate(new Date());
  window.state = state;

  function isoDate(d) {
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function parseISO(s) {
    var parts = s.split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function todayISO() { return isoDate(new Date()); }

  function isFuture(iso) { return iso > todayISO(); }

  function startOfDay(d) { var n = new Date(d);
    n.setHours(0, 0, 0, 0); return n; }

  // ---- Sunday holiday + predict-mode preferences ----
  function getSundayHoliday() { return localStorage.getItem(SUNDAY_HOLIDAY_KEY) === '1'; }
  function setSundayHoliday(on) { localStorage.setItem(SUNDAY_HOLIDAY_KEY, on ? '1' : '0'); }

  function getPredictMode() { return localStorage.getItem(PREDICT_MODE_KEY) === '1'; }
  function setPredictMode(on) { localStorage.setItem(PREDICT_MODE_KEY, on ? '1' : '0'); }

  // The furthest future date the user has actually logged a record for while
  // predict mode is on — null if predict mode is off or nothing's logged yet.
  // Used to extend stats/calendar to include logged future predictions
  // without blanket-counting every remaining unmarked future class too.
  function latestPredictedDate() {
    if (!getPredictMode()) return null;
    var futureDates = state.records
      .filter(function(r) { return isFuture(r.date); })
      .map(function(r) { return r.date; })
      .sort();
    return futureDates.length ? futureDates[futureDates.length - 1] : null;
  }

  // ---- Color scheme logic ----
  var SCHEMES = [
    { id: 'chalkboard', label: 'Chalkboard' },
    { id: 'mango', label: 'Mango Smoothie' },
    { id: 'keys', label: 'Florida Keys' },
    { id: 'embroidery', label: 'Embroidery' },
    { id: 'springkiss', label: 'Spring Kiss' },
    { id: 'lavenderfields', label: 'Lavender Fields' },
    { id: 'mintteal', label: 'Mint Teal' },
    { id: 'royalindigo', label: 'Royal Indigo' },
    { id: 'warmsand', label: 'Warm Sand' },
    { id: 'cyberneon', label: 'Cyber Neon' },
    { id: 'deepocean', label: 'Deep Ocean' },
    { id: 'coralsunset', label: 'Coral Sunset' },
    { id: 'lavenderdream', label: 'Lavender Dream' },
    { id: 'roseblush', label: 'Rose Blush' },
    { id: 'midnightslate', label: 'Midnight Slate' },
    { id: 'obsidianpurple', label: 'Obsidian Purple' }
  ];

  // Swatch preview colors per scheme: [background, accent] — shown as a dot-in-ring
  var schemeColors = {
    chalkboard: ['#F4F2F6', '#6B5B87'],
    mango: ['#FDF4E8', '#E0742A'],
    keys: ['#EFFAF8', '#12897E'],
    embroidery: ['#F5F7EF', '#5B7A4A'],
    springkiss: ['#FDF1F4', '#C65C7C'],
    lavenderfields: ['#F5F1FA', '#7C5FA6'],
    mintteal: ['#F0F5F6', '#1C7A87'],
    royalindigo: ['#EFEDFB', '#5340E0'],
    warmsand: ['#FCF0E6', '#D65E00'],
    cyberneon: ['#05080D', '#A8E23E'],
    deepocean: ['#03181F', '#0FCAD1'],
    coralsunset: ['#FDF2EE', '#EA4B2F'],
    lavenderdream: ['#EEECF9', '#7451E8'],
    roseblush: ['#FEF3EE', '#D9456A'],
    midnightslate: ['#070911', '#7EA0C0'],
    obsidianpurple: ['#0A0714', '#8C6FE0']
  };

  function getStoredScheme() {
    return localStorage.getItem(SCHEME_KEY) || 'chalkboard';
  }

  function applyScheme(id) {
    var root = document.documentElement;
    SCHEMES.forEach(function(s) {
      root.classList.remove('scheme-' + s.id);
    });
    root.classList.add('scheme-' + id);
    renderSchemeSwatches(id);
    updateSchemeCurrentLabel(id);
    localStorage.setItem(SCHEME_KEY, id);
    syncNativeStatusBar();
  }

  // Keeps the phone's actual system status bar (clock/battery/signal area)
  // matching the app's current background + light/dark style, instead of
  // staying stuck in whatever it started in. No-ops in a plain browser.
  function syncNativeStatusBar() {
    if (!(window.CapBridge && window.CapBridge.isNative())) return;
    var isDark = document.documentElement.classList.contains('dark');
    var bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
    if (bg) window.CapBridge.syncStatusBar(bg, isDark);
  }

  function updateSchemeCurrentLabel(id) {
    var labelEl = document.getElementById('schemeCurrentLabel');
    if (!labelEl) return;
    var scheme = SCHEMES.filter(function(s) { return s.id === id; })[0];
    labelEl.textContent = scheme ? scheme.label : '';
  }

  function renderSchemeSwatches(activeId) {
    var grid = document.getElementById('schemeGrid');
    if (!grid) return;
    grid.innerHTML = SCHEMES.map(function(s) {
      var isActive = s.id === activeId;
      var colors = schemeColors[s.id] || schemeColors.chalkboard;
      var bgColor = colors[0], accentColor = colors[1];
      return '<div class="scheme-option">' +
        '<div class="scheme-swatch ' + (isActive ? 'active' : '') + '" data-scheme="' + s.id + '" title="' + s.label + '" aria-label="' + s.label + '">' +
        '<div class="scheme-swatch-inner" style="background:' + bgColor + ';">' +
        '<div class="scheme-swatch-accent" style="background:' + accentColor + ';"></div>' +
        '</div>' +
        '</div>' +
        '<div class="scheme-label' + (isActive ? ' active' : '') + '">' + s.label + '</div>' +
        '</div>';
    }).join('');

    grid.querySelectorAll('.scheme-swatch').forEach(function(el) {
      el.addEventListener('click', function() {
        applyScheme(this.dataset.scheme);
      });
    });
  }

  // ---- Color scheme collapsible toggle ----
  var schemeToggleBtn = document.getElementById('schemeToggle');
  if (schemeToggleBtn) {
    schemeToggleBtn.addEventListener('click', function() {
      var collapse = document.getElementById('schemeCollapse');
      var isOpen = collapse.classList.toggle('open');
      this.classList.toggle('open', isOpen);
      this.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  }

  //Theme
  function getStoredTheme() { return localStorage.getItem(THEME_KEY) || 'system'; }

  function applyTheme(mode) {
    var root = document.documentElement;
    var effective = mode;
    if (mode === 'system') {
      effective = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    root.classList.toggle('dark', effective === 'dark');
    renderThemeSeg(mode);
    renderThemeToggleIcon(effective);
    // re-apply scheme to adjust colors for dark/light
    applyScheme(getStoredScheme());
  }

  function renderThemeToggleIcon(effective) {
    var btn = document.getElementById('themeToggle');
    btn.innerHTML = effective === 'dark' ?
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path></svg>' :
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"></path></svg>';
  }

  function renderThemeSeg(mode) {
    document.querySelectorAll('#themeSeg .seg-btn').forEach(function(b) {
      b.classList.toggle('active', b.dataset.theme === mode);
    });
  }
  document.getElementById('themeToggle').addEventListener('click', function() {
    var current = getStoredTheme();
    var effective = current === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : current;
    var next = effective === 'dark' ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  });
  document.querySelectorAll('#themeSeg .seg-btn').forEach(function(b) {
    b.addEventListener('click', function() {
      localStorage.setItem(THEME_KEY, b.dataset.theme);
      applyTheme(b.dataset.theme);
    });
  });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function() {
    if (getStoredTheme() === 'system') applyTheme('system');
  });
  applyTheme(getStoredTheme());

  // ---- Initialize scheme ----
  applyScheme(getStoredScheme());

  // ---- Predict-mode toggle ----
  var predictModeSwitch = document.getElementById('predictModeSwitch');
  function refreshPredictModeSwitch() {
    if (!predictModeSwitch) return;
    predictModeSwitch.setAttribute('aria-checked', getPredictMode() ? 'true' : 'false');
  }
  if (predictModeSwitch) {
    predictModeSwitch.addEventListener('click', function() {
      var turningOn = !getPredictMode();
      if (!turningOn) {
        // Turning off: any future-dated records only exist because predict
        // mode let the user create them — erase them and lock the future
        // again, per how this feature is meant to work.
        var hadFuture = state.records.some(function(r) { return isFuture(r.date); });
        if (hadFuture) {
          var proceed = confirm('Turning this off will erase any future dates you\'ve marked, and the percentage will go back to counting only through today. Continue?');
          if (!proceed) return;
          state.records = state.records.filter(function(r) { return !isFuture(r.date); });
          saveData();
        }
      }
      setPredictMode(turningOn);
      refreshPredictModeSwitch();
      renderAll(false);
    });
    refreshPredictModeSwitch();
  }

  // ---- Initialize native status bar (no-op outside the APK) ----
  if (window.CapBridge && window.CapBridge.isNative()) {
    window.CapBridge.initStatusBar();
  }

  //Navigation
  var views = ['today', 'subjects', 'schedule', 'settings'];

  function showView(name) {
    views.forEach(function(v) {
      document.getElementById('view-' + v).classList.toggle('active', v === name);
    });
    document.querySelectorAll('.nav-btn').forEach(function(b) {
      b.classList.toggle('active', b.dataset.view === name);
    });
    document.getElementById('main').scrollTop = 0;
  }
  document.querySelectorAll('.nav-btn').forEach(function(b) {
    b.addEventListener('click', function() { showView(b.dataset.view); });
  });
  document.getElementById('main').addEventListener('scroll', function() {
    document.getElementById('topbar').classList.toggle('scrolled', this.scrollTop > 4);
  });

  //Core data helpers 
  function dayOfWeekIndex(date) { return date.getDay(); }

  function scheduledSubjectsForDate(iso) {
    var d = parseISO(iso);
    var dow = dayOfWeekIndex(d);
    var entry = state.schedule.find(function(s) { return s.dayOfWeek === dow; });
    var regular = entry ? entry.subjects.slice() : [];
    var extras = state.extras && state.extras[iso] ? state.extras[iso].slice() : [];
    return regular.concat(extras);
  }

  function extrasForDate(iso) {
    return state.extras && state.extras[iso] ? state.extras[iso].slice() : [];
  }

  // All unique subject names scheduled anywhere across the week (any day).
  // Used to power the "pick an existing class" suggestions when adding an
  // extra class, so the user doesn't have to retype something already
  // in their weekly schedule.
  function allWeekSubjects() {
    var seen = {};
    var out = [];
    state.schedule.forEach(function(day) {
      day.subjects.forEach(function(s) {
        var key = s.toLowerCase();
        if (!seen[key]) { seen[key] = true; out.push(s); }
      });
    });
    return out;
  }

  function refreshSubjectsDatalist() {
    var list = document.getElementById('allSubjectsDatalist');
    if (!list) return;
    list.innerHTML = allWeekSubjects().map(function(s) {
      return '<option value="' + escapeAttr(s) + '"></option>';
    }).join('');
  }

  function isExtraSubject(iso, subject) {
    var extras = state.extras && state.extras[iso] ? state.extras[iso] : [];
    return extras.indexOf(subject) > -1;
  }

  // Returns every class scheduled for `iso` as an occurrence object:
  // { subject, occ, isExtra, extraIdx }. `occ` is a 0-based counter that's
  // per subject-name-per-day (regular subjects first, in schedule order,
  // then extras in the order they were added) — so if "Math" appears twice
  // on the same day, the first gets occ:0 and the second occ:1. This lets
  // duplicate subjects be marked/tracked independently instead of both
  // sharing one record just because they have the same name.
  function occurrencesForDate(iso) {
    var d = parseISO(iso);
    var dow = dayOfWeekIndex(d);

    // Sunday holiday: when enabled, Sunday has no classes at all, regardless
    // of what's actually scheduled — this cascades to every place that reads
    // occurrencesForDate (today's card, day modal, calendar, stats).
    if (dow === 0 && getSundayHoliday()) return [];

    var entry = state.schedule.find(function(s) { return s.dayOfWeek === dow; });
    var regular = entry ? entry.subjects : [];
    var extras = state.extras && state.extras[iso] ? state.extras[iso] : [];
    var seen = {};
    var out = [];

    regular.forEach(function(s) {
      var key = s.toLowerCase();
      var occ = seen[key] || 0;
      seen[key] = occ + 1;
      out.push({ subject: s, occ: occ, isExtra: false });
    });
    extras.forEach(function(s, i) {
      var key = s.toLowerCase();
      var occ = seen[key] || 0;
      seen[key] = occ + 1;
      out.push({ subject: s, occ: occ, isExtra: true, extraIdx: i });
    });
    return out;
  }

  // Adds `subject` as an extra (unscheduled) class for `iso`. If it's
  // already scheduled/extra that day, asks for confirmation before adding
  // it again — duplicates are allowed on purpose, not by accident.
  function addExtraClass(iso, subject) {
    if (!state.extras) state.extras = {};
    if (!state.extras[iso]) state.extras[iso] = [];
    var existing = scheduledSubjectsForDate(iso);
    var isDuplicate = existing.some(function(s) { return s.toLowerCase() === subject.toLowerCase(); });
    if (isDuplicate) {
      var proceed = confirm('"' + subject + '" is already on that day. Add it again anyway?');
      if (!proceed) return false;
    }
    state.extras[iso].push(subject);
    saveData();
    return true;
  }

  // Removes the extra class at `extraIdx` within that date's extras list
  // (not just "the first one with this name"), so removing one duplicate
  // doesn't touch another. Any later occurrence of the same subject that
  // day has its record's occurrence index shifted down so it keeps its
  // own attendance instead of appearing to disappear.
  function removeExtraClass(iso, extraIdx) {
    if (!state.extras || !state.extras[iso] || !state.extras[iso][extraIdx]) return;
    var occs = occurrencesForDate(iso);
    var target = occs.filter(function(o) { return o.isExtra; })[extraIdx];
    var subject = state.extras[iso][extraIdx];
    var removedOcc = target ? target.occ : 0;

    state.extras[iso].splice(extraIdx, 1);
    if (state.extras[iso].length === 0) delete state.extras[iso];

    clearStatus(iso, subject, removedOcc);
    state.records.forEach(function(r) {
      if (r.date === iso && r.subject === subject && (r.occ || 0) > removedOcc) {
        r.occ = (r.occ || 0) - 1;
      }
    });
    saveData();
  }

  // `occ` distinguishes duplicate same-day, same-name subjects from each
  // other (see occurrencesForDate). Records saved before this existed have
  // no `occ` field, which is treated as 0 — i.e. they belong to the first
  // occurrence of that subject that day.
  function recordFor(iso, subject, occ) {
    occ = occ || 0;
    return state.records.find(function(r) { return r.date === iso && r.subject === subject &&
      (r.occ || 0) === occ; });
  }

  function setStatus(iso, subject, status, occ) {
    occ = occ || 0;
    var rec = recordFor(iso, subject, occ);
    if (rec) {
      rec.status = status;
      delete rec.attended;
    } else {
      state.records.push({
        id: 'r_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        subject: subject,
        date: iso,
        occ: occ,
        status: status,
        createdAt: new Date().toISOString()
      });
    }
    saveData();
  }

  function clearStatus(iso, subject, occ) {
    occ = occ || 0;
    var idx = state.records.findIndex(function(r) { return r.date === iso && r.subject === subject &&
      (r.occ || 0) === occ; });
    if (idx > -1) state.records.splice(idx, 1);
    saveData();
  }

  function statusOf(rec) {
    if (!rec) return null;
    if (rec.status) return rec.status;
    if (typeof rec.attended === 'boolean') return rec.attended ? 'attended' : 'absent';
    return null;
  }

  function allScheduledOccurrences() {
    var occ = [];
    var start = startOfDay(parseISO(state.startDate));
    var end = startOfDay(new Date());

    // Predict mode: if the user has logged attendance on a future date,
    // extend the range through that date so the projected percentage
    // includes it — but only as far as they've actually logged, not the
    // whole remaining month.
    var predicted = latestPredictedDate();
    if (predicted) {
      var predictedEnd = startOfDay(parseISO(predicted));
      if (predictedEnd > end) end = predictedEnd;
    }

    if (start > end) return occ;
    var cur = new Date(start);
    while (cur <= end) {
      var iso = isoDate(cur);
      occurrencesForDate(iso).forEach(function(o) {
        occ.push({ date: iso, subject: o.subject, occ: o.occ });
      });
      cur.setDate(cur.getDate() + 1);
    }
    return occ;
  }

  function computeStats() {
    var occ = allScheduledOccurrences();
    var bySubject = {};
    var totalScheduled = 0;
    var totalAttended = 0;
    var totalDismissed = 0;

    occ.forEach(function(o) {
      var rec = recordFor(o.date, o.subject, o.occ);
      var status = statusOf(rec);

      if (status === 'dismissed') {
        totalDismissed++;
        return;
      }

      if (!bySubject[o.subject]) bySubject[o.subject] = { name: o.subject, scheduled: 0, attended: 0 };
      bySubject[o.subject].scheduled++;
      totalScheduled++;
      if (status === 'attended') {
        bySubject[o.subject].attended++;
        totalAttended++;
      }
    });

    var subjects = Object.keys(bySubject).map(function(k) {
      var s = bySubject[k];
      s.pct = s.scheduled > 0 ? (s.attended / s.scheduled) * 100 : 0;
      return s;
    });

    return {
      totalScheduled: totalScheduled,
      totalAttended: totalAttended,
      totalMissed: totalScheduled - totalAttended,
      totalDismissed: totalDismissed,
      overallPct: totalScheduled > 0 ? (totalAttended / totalScheduled) * 100 : 0,
      subjects: subjects
    };
  }

  function colorForPct(pct) {
    if (pct >= 75) return 'good';
    if (pct >= 50) return 'warn';
    return 'bad';
  }

  function cssVarFor(tier) {
    return tier === 'good' ? 'var(--good)' : tier === 'warn' ? 'var(--warn)' : 'var(--bad)';
  }

  /* ================= Render: Hero / ring ================= */
  var RING_R = 72,
    RING_C = 2 * Math.PI * RING_R;
  document.getElementById('ringProgress').style.strokeDasharray = RING_C;

  function renderHero() {
    var stats = computeStats();
    var pct = stats.overallPct;
    var tier = colorForPct(pct);
    var hasData = stats.totalScheduled > 0;

    document.getElementById('ringPct').textContent = hasData ? Math.round(pct) + '%' : '—';
    var ring = document.getElementById('ringProgress');
    ring.style.stroke = hasData ? cssVarFor(tier) : 'var(--ink-faint)';
    var offset = hasData ? RING_C - (pct / 100) * RING_C : RING_C;
    ring.style.strokeDashoffset = offset;

    var pill = document.getElementById('statusPill');
    pill.className = 'status-pill';
    if (!hasData) {
      pill.textContent = 'No data yet';
      pill.classList.add('status-warn');
    } else {
      pill.classList.add('status-' + tier);
      pill.textContent = tier === 'good' ? 'On track' : tier === 'warn' ? 'Borderline' : 'At risk';
    }

    document.getElementById('statAttended').textContent = stats.totalAttended;
    document.getElementById('statScheduled').textContent = stats.totalScheduled;
    document.getElementById('statMissed').textContent = stats.totalMissed;
  }

  /* ================= Render: Today's class ================= */
  function renderTodayCard() {
    var iso = todayISO();
    var today = new Date();
    renderMarkHolidayBtn(iso);
    document.getElementById('todayCardDate').textContent = today.toLocaleDateString(undefined, { weekday: 'short',
      month: 'short', day: 'numeric' });

    var titleEl = document.getElementById('todayCardTitle');
    var scrollEl = document.getElementById('todayScroll');

    // Sunday holiday: show a dedicated message instead of the usual
    // "nothing scheduled" empty state.
    if (today.getDay() === 0 && getSundayHoliday()) {
      titleEl.textContent = 'Sunday';
      scrollEl.innerHTML = '<div class="today-card-empty holiday-msg">🎉 Today is Sunday — no classes, enjoy!</div>';
      return;
    }

    var occs = occurrencesForDate(iso);

    if (occs.length === 0) {
      titleEl.textContent = 'Nothing scheduled';
      scrollEl.innerHTML =
        '<div class="today-card-empty">No classes today. <a id="goToSchedule">Add some to your schedule</a>.</div>';
      var goLink = document.getElementById('goToSchedule');
      if (goLink) goLink.addEventListener('click', function() { showView('schedule'); });
      return;
    }

    titleEl.textContent = occs.length + ' class' + (occs.length > 1 ? 'es' : '') + ' today';

    scrollEl.innerHTML = occs.map(function(o) {
      var s = o.subject;
      var rec = recordFor(iso, s, o.occ);
      var status = statusOf(rec);

      return '<div class="today-pill-card">' +
        '<div class="today-pill-name-row">' +
        '<div class="today-pill-name">' + escapeHtml(s) + (o.isExtra ?
          '<span class="extra-tag">extra</span>' : '') + '</div>' +
        (o.isExtra ?
          '<button class="today-pill-remove" data-remove-extra-idx="' + o.extraIdx +
          '" aria-label="Remove extra class">×</button>' : '') +
        '</div>' +
        '<div class="today-pill-actions">' +
        '<button class="today-mark-btn attended-btn' + (status === 'attended' ? ' selected' : '') +
        '" data-subject="' + escapeAttr(s) + '" data-occ="' + o.occ + '" data-mark="attended">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' +
        'Attended</button>' +
        '<button class="today-mark-btn absent-btn' + (status === 'absent' ? ' selected' : '') +
        '" data-subject="' + escapeAttr(s) + '" data-occ="' + o.occ + '" data-mark="absent">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>' +
        'Absent</button>' +
        '<button class="today-mark-btn dismissed-btn' + (status === 'dismissed' ? ' selected' : '') +
        '" data-subject="' + escapeAttr(s) + '" data-occ="' + o.occ + '" data-mark="dismissed">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><line x1="9" y1="9" x2="15" y2="15"></line></svg>' +
        'Dismissed</button>' +
        '</div></div>';
    }).join('');

    scrollEl.querySelectorAll('.today-mark-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var subject = this.dataset.subject;
        var occ = Number(this.dataset.occ);
        var markStatus = this.dataset.mark;
        var rec = recordFor(iso, subject, occ);
        var current = statusOf(rec);

        if (current === markStatus) {
          clearStatus(iso, subject, occ);
        } else {
          setStatus(iso, subject, markStatus, occ);
        }
        renderAll(false);
      });
    });

    scrollEl.querySelectorAll('[data-remove-extra-idx]').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        removeExtraClass(iso, Number(this.dataset.removeExtraIdx));
        renderAll(false);
        showToast('Extra class removed');
      });
    });
  }

  //Add extra class (today) — opens the shared Add-extra-class popup
  document.getElementById('addExtraTrigger').addEventListener('click', function() {
    openAddExtraModal(todayISO());
  });

  // True only when every class scheduled today is currently Dismissed —
  // i.e. the day was marked a holiday via the button below (or happens to
  // have been dismissed one-by-one, which is treated the same way).
  function isDayFullyDismissed(iso) {
    var occs = occurrencesForDate(iso);
    if (!occs.length) return false;
    return occs.every(function(o) {
      return statusOf(recordFor(iso, o.subject, o.occ)) === 'dismissed';
    });
  }

  var HOLIDAY_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
  var UNDO_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>';

  function renderMarkHolidayBtn(iso) {
    var btn = document.getElementById('markHolidayBtn');
    if (!btn) return;
    var active = isDayFullyDismissed(iso);
    btn.classList.toggle('holiday-active', active);
    btn.innerHTML = active ? (UNDO_ICON + 'No holiday') : (HOLIDAY_ICON + 'Mark day holiday');
  }

  // Toggle: marks every class today as Dismissed (with a confirm, since it
  // overwrites existing marks), or — if the day's already fully dismissed —
  // reverts back to unmarked (not attended/absent/dismissed) instead.
  function toggleWholeDayHoliday(iso) {
    var occs = occurrencesForDate(iso);
    if (!occs.length) {
      showToast('Nothing scheduled today');
      return;
    }

    if (isDayFullyDismissed(iso)) {
      occs.forEach(function(o) { clearStatus(iso, o.subject, o.occ); });
      renderAll(false);
      showToast('Holiday undone');
      return;
    }

    var proceed = confirm('Mark all ' + occs.length + ' class' + (occs.length > 1 ? 'es' : '') +
      ' today as Dismissed (holiday)?');
    if (!proceed) return;
    occs.forEach(function(o) { setStatus(iso, o.subject, 'dismissed', o.occ); });
    renderAll(false);
    showToast('Today marked as a holiday');
  }

  var markHolidayBtn = document.getElementById('markHolidayBtn');
  if (markHolidayBtn) {
    markHolidayBtn.addEventListener('click', function() {
      toggleWholeDayHoliday(todayISO());
    });
  }

  //Render: Calendar
  var calCursor = startOfDay(new Date());
  calCursor.setDate(1);
  var DOW_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  function renderCalDow() {
    var el = document.getElementById('calDow');
    el.innerHTML = DOW_LABELS.map(function(l) { return '<div class="cal-dow">' + l + '</div>'; }).join('');
  }

  function renderCalGrid() {
    var year = calCursor.getFullYear(),
      month = calCursor.getMonth();
    document.getElementById('monthLabel').textContent = calCursor.toLocaleString(undefined, { month: 'long',
      year: 'numeric' });

    var firstDay = new Date(year, month, 1);
    var startOffset = firstDay.getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();

    var cells = [];
    for (var i = 0; i < startOffset; i++) cells.push(null);
    for (var d = 1; d <= daysInMonth; d++) cells.push(d);

    var html = '';
    cells.forEach(function(d) {
      if (d === null) { html += '<div class="cal-day empty"></div>'; return; }
      var dateObj = new Date(year, month, d);
      var iso = isoDate(dateObj);
      var future = isFuture(iso);
      var predictOn = getPredictMode();
      var occs = occurrencesForDate(iso);
      var isToday = iso === todayISO();

      var cls = ['cal-day'];
      if (isToday) cls.push('today');
      if (future) cls.push('future');
      if (future && predictOn) cls.push('predict-unlocked');

      var dotsHtml = '';
      if (occs.length > 0) {
        cls.push('has-class');
        if (!future || predictOn) {
          var countable = occs.filter(function(o) {
            var r = recordFor(iso, o.subject, o.occ);
            return statusOf(r) !== 'dismissed';
          });
          var attendedCount = countable.filter(function(o) {
            var r = recordFor(iso, o.subject, o.occ);
            return statusOf(r) === 'attended';
          }).length;

          if (countable.length === 0) {
            // all dismissed
          } else if (attendedCount === countable.length) cls.push('full-attend');
          else if (attendedCount === 0) cls.push('none-attend');
          else cls.push('partial-attend');

          dotsHtml = '<div class="cal-dots">' + occs.slice(0, 5).map(function(o) {
            var r = recordFor(iso, o.subject, o.occ);
            var status = statusOf(r);
            var dotCls = status === 'attended' ? 'on' : status === 'dismissed' ?
              'dismissed' : 'off';
            return '<span class="cal-dot ' + dotCls + '"></span>';
          }).join('') + '</div>';
        } else {
          dotsHtml = '<div class="cal-dots">' + occs.slice(0, 5).map(function() {
            return '<span class="cal-dot"></span>';
          }).join('') + '</div>';
        }
      } else {
        cls.push('no-class');
      }

      // Check for extras
      var hasExtra = state.extras && state.extras[iso] && state.extras[iso].length > 0;
      if (hasExtra) cls.push('has-extra');

      html += '<div class="' + cls.join(' ') + '" data-date="' + iso + '">' +
        '<span>' + d + '</span>' +
        (hasExtra ? '<span class="extra-indicator">✦</span>' : '') +
        dotsHtml +
        '</div>';
    });

    document.getElementById('calGrid').innerHTML = html;

    document.querySelectorAll('.cal-day[data-date]').forEach(function(cell) {
      cell.addEventListener('click', function() {
        var iso = this.dataset.date;
        // Allow past and today always; future only when predict mode is on
        if (isFuture(iso) && !getPredictMode()) return;
        openDayModal(iso);
      });
    });
  }

  document.getElementById('prevMonth').addEventListener('click', function() {
    calCursor.setMonth(calCursor.getMonth() - 1);
    renderCalGrid();
  });
  document.getElementById('nextMonth').addEventListener('click', function() {
    calCursor.setMonth(calCursor.getMonth() + 1);
    renderCalGrid();
  });

  // swipe support
  (function() {
    var startX = null;
    var grid = document.getElementById('calGrid');
    grid.addEventListener('touchstart', function(e) { startX = e.touches[0].clientX; }, { passive: true });
    grid.addEventListener('touchend', function(e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) {
        calCursor.setMonth(calCursor.getMonth() + (dx < 0 ? 1 : -1));
        renderCalGrid();
      }
      startX = null;
    }, { passive: true });
  })();

  //Day modal (mark attendance)
  var overlay = document.getElementById('dayModalOverlay');
  var activeModalDate = null;

  function openDayModal(iso) {
    activeModalDate = iso;
    var d = parseISO(iso);
    document.getElementById('dayModalTitle').textContent = d.toLocaleDateString(undefined, { weekday: 'long',
      month: 'long', day: 'numeric' });
    var occs = occurrencesForDate(iso);
    document.getElementById('dayModalSub').textContent = occs.length ?
      occs.length + ' class' + (occs.length > 1 ? 'es' : '') + ' scheduled' :
      'Nothing scheduled this day';

    var body = document.getElementById('dayModalBody');
    if (occs.length === 0) {
      body.innerHTML =
        '<div class="modal-empty">No subjects scheduled for this day.<br>Add some in the Schedule tab, or use "Add extra class" below.</div>';
    } else {
      body.innerHTML = occs.map(function(o) {
        var s = o.subject;
        var rec = recordFor(iso, s, o.occ);
        var status = statusOf(rec);
        return '<div class="modal-subj-row">' +
          '<div class="modal-subj-row-head">' +
          '<div class="toggle-row-name">' + escapeHtml(s) + (o.isExtra ?
            '<span class="extra-tag">extra</span>' : '') + '</div>' +
          (o.isExtra ?
            '<button class="modal-remove-extra" data-modal-remove-extra-idx="' + o.extraIdx +
            '" aria-label="Remove extra class">×</button>' : '') +
          '</div>' +
          '<div class="modal-mark-row">' +
          '<button class="modal-mark-btn attended-btn' + (status === 'attended' ?
            ' selected' : '') + '" data-subject="' + escapeAttr(s) +
          '" data-occ="' + o.occ + '" data-mark="attended">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' +
          'Attended</button>' +
          '<button class="modal-mark-btn absent-btn' + (status === 'absent' ? ' selected' :
            '') + '" data-subject="' + escapeAttr(s) + '" data-occ="' + o.occ + '" data-mark="absent">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>' +
          'Absent</button>' +
          '<button class="modal-mark-btn dismissed-btn' + (status === 'dismissed' ?
            ' selected' : '') + '" data-subject="' + escapeAttr(s) +
          '" data-occ="' + o.occ + '" data-mark="dismissed">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><line x1="9" y1="9" x2="15" y2="15"></line></svg>' +
          'Dismissed</button>' +
          '</div></div>';
      }).join('');

      body.querySelectorAll('.modal-mark-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var subject = this.dataset.subject;
          var occ = Number(this.dataset.occ);
          var markStatus = this.dataset.mark;
          var rec = recordFor(activeModalDate, subject, occ);
          var current = statusOf(rec);

          if (current === markStatus) {
            clearStatus(activeModalDate, subject, occ);
          } else {
            setStatus(activeModalDate, subject, markStatus, occ);
          }

          renderAll(false);
          openDayModal(activeModalDate);
        });
      });

      body.querySelectorAll('[data-modal-remove-extra-idx]').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          removeExtraClass(activeModalDate, Number(this.dataset.modalRemoveExtraIdx));
          renderAll(false);
          openDayModal(activeModalDate);
          showToast('Extra class removed');
        });
      });
    }
    overlay.classList.add('show');
  }

  // ---- Modal close behavior ----
  (function() {
    function closeModal() {
      overlay.classList.remove('show');
    }

    // Close on overlay click (tap outside the dialog) and close button
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeModal();
    });
    document.getElementById('dayModalClose').addEventListener('click', closeModal);
  })();

  //Add extra class (from within the day modal) — opens the shared popup
  document.getElementById('modalAddExtraTrigger').addEventListener('click', function() {
    if (activeModalDate) openAddExtraModal(activeModalDate, true);
  });

  // ---- Add-extra-class popup (shared by Today's card and the day modal) ----
  var activeExtraModalDate = null;
  var extraModalOpenedFromDayModal = false;
  var addExtraModalOverlay = document.getElementById('addExtraModalOverlay');
  var addExtraWriteInput = document.getElementById('addExtraWriteInput');

  function formatModalDate(iso) {
    var d = parseISO(iso);
    return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  }

  function openAddExtraModal(iso, fromDayModal) {
    activeExtraModalDate = iso;
    extraModalOpenedFromDayModal = !!fromDayModal;
    refreshSubjectsDatalist();
    var subEl = document.getElementById('addExtraModalSub');
    if (subEl) subEl.textContent = formatModalDate(iso);
    renderAddExtraChips();
    if (addExtraWriteInput) addExtraWriteInput.value = '';
    if (addExtraModalOverlay) addExtraModalOverlay.classList.add('show');
  }

  function closeAddExtraModal() {
    if (addExtraModalOverlay) addExtraModalOverlay.classList.remove('show');
    activeExtraModalDate = null;
  }

  function renderAddExtraChips() {
    var chipList = document.getElementById('addExtraChipList');
    if (!chipList) return;
    var classes = state.myClasses || [];
    chipList.innerHTML = classes.length ?
      classes.map(function(name) {
        return '<button class="chip chip-pick" data-pick-extra="' + escapeAttr(name) + '">' +
          escapeHtml(name) + '</button>';
      }).join('') :
      '<span class="chip-empty">No classes added yet — write one below, or add some from the My Classes list on the Schedule page.</span>';

    chipList.querySelectorAll('[data-pick-extra]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        submitExtraForDate(this.dataset.pickExtra);
      });
    });
  }

  function submitExtraForDate(val) {
    val = (val || '').trim();
    if (!val || !activeExtraModalDate) return;
    var iso = activeExtraModalDate;
    var reopenDayModal = extraModalOpenedFromDayModal;
    var added = addExtraClass(iso, val);
    if (added) {
      closeAddExtraModal();
      renderAll(false);
      if (reopenDayModal) openDayModal(iso);
      showToast('Added "' + val + '"');
    }
  }

  function submitWrittenExtra() {
    if (!addExtraWriteInput) return;
    var val = addExtraWriteInput.value.trim();
    if (!val) return;
    if (addToMyClasses(val)) renderMyClasses(); // available to pick next time too
    submitExtraForDate(val);
  }

  var addExtraModalClose = document.getElementById('addExtraModalClose');
  if (addExtraModalClose) addExtraModalClose.addEventListener('click', closeAddExtraModal);
  if (addExtraModalOverlay) {
    addExtraModalOverlay.addEventListener('click', function(e) {
      if (e.target === addExtraModalOverlay) closeAddExtraModal();
    });
  }
  var addExtraWriteBtn = document.getElementById('addExtraWriteBtn');
  if (addExtraWriteBtn) addExtraWriteBtn.addEventListener('click', submitWrittenExtra);
  if (addExtraWriteInput) {
    addExtraWriteInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') submitWrittenExtra();
    });
  }

  //Render: Subjects
  var currentSort = 'name';
  var sortDir = 1;

  function renderSubjects() {
    var stats = computeStats();
    var list = stats.subjects.slice();

    list.sort(function(a, b) {
      var av, bv;
      if (currentSort === 'name') { av = a.name.toLowerCase();
        bv = b.name.toLowerCase(); } else if (currentSort === 'pct') { av = a.pct;
        bv = b.pct; } else if (currentSort === 'attended') { av = a.attended;
        bv = b.attended; } else { av = a.scheduled;
        bv = b.scheduled; }
      if (av < bv) return -1 * sortDir;
      if (av > bv) return 1 * sortDir;
      return 0;
    });

    var container = document.getElementById('subjectList');
    if (list.length === 0) {
      container.innerHTML = '<div class="empty-state">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 3v18h18"></path><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"></path></svg>' +
        '<div class="empty-state-title">No attendance data yet</div>' +
        '<div class="empty-state-sub">Add subjects to your weekly schedule, then mark<br>attendance from the calendar.</div></div>';
      return;
    }

    container.innerHTML = list.map(function(s) {
      var tier = colorForPct(s.pct);
      return '<div class="subject-card">' +
        '<div class="subject-card-top"><span class="subject-name">' + escapeHtml(s.name) +
        '</span>' +
        '<span class="subject-pct" style="color:' + cssVarFor(tier) + '">' + Math.round(s
          .pct) + '%</span></div>' +
        '<div class="subject-meta">' + s.attended + ' attended of ' + s.scheduled +
        ' scheduled</div>' +
        '<div class="bar-track"><div class="bar-fill" style="width:' + s.pct +
        '%; background:' + cssVarFor(tier) + ';"></div></div>' +
        '</div>';
    }).join('');
  }

  document.querySelectorAll('.sort-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var key = btn.dataset.sort;
      if (currentSort === key) { sortDir *= -1; } else { currentSort = key;
        sortDir = 1; }
      document.querySelectorAll('.sort-btn').forEach(function(b) { b.classList.toggle('active',
          b === btn); });
      renderSubjects();
    });
  });

  //Render: Schedule editor
  var DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  function renderSchedule() {
    renderMyClasses();
    var html = state.schedule
      .slice()
      .sort(function(a, b) { return a.dayOfWeek - b.dayOfWeek; })
      .map(function(day) {
        var subs = day.subjects;
        var chips = subs.length ?
          subs.map(function(s, idx) {
            return '<span class="chip">' + escapeHtml(s) +
              '<button data-day="' + day.dayOfWeek + '" data-idx="' + idx +
              '" class="remove-subj" aria-label="Remove">×</button></span>';
          }).join('') :
          '<span class="chip-empty">No classes scheduled</span>';

        var isSunday = day.dayOfWeek === 0;
        var sundayHolidayOn = isSunday && getSundayHoliday();
        var sundayToggle = isSunday ?
          '<span class="sunday-toggle-label">Holiday</span>' +
          '<button class="pill-switch pill-switch-sm" data-sunday-holiday-switch role="switch" aria-checked="' +
          (sundayHolidayOn ? 'true' : 'false') + '" aria-label="Sunday holiday"><span class="pill-switch-knob"></span></button>' :
          '';

        var addRow = sundayHolidayOn ? '' :
          '<div class="add-row">' +
          '<button class="btn btn-secondary add-class-trigger" data-day-open="' + day.dayOfWeek + '">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>' +
          ' Add class' +
          '</button>' +
          '</div>';

        return '<div class="day-block">' +
          '<div class="day-block-title">' + DAY_NAMES[day.dayOfWeek] +
          '<span class="day-title-right">' + sundayToggle +
          '<span class="count">' + subs.length + ' subject' + (subs.length === 1 ? '' :
            's') + '</span></span></div>' +
          '<div class="chip-row">' + chips + '</div>' +
          addRow +
          '</div>';
      }).join('');

    document.getElementById('scheduleList').innerHTML = html;

    var sundaySwitch = document.querySelector('[data-sunday-holiday-switch]');
    if (sundaySwitch) {
      sundaySwitch.addEventListener('click', function(e) {
        e.stopPropagation();
        var next = !getSundayHoliday();
        setSundayHoliday(next);
        renderAll(false);
        showToast(next ? 'Sundays marked as a holiday' : 'Sundays back to normal');
      });
    }

    document.querySelectorAll('.remove-subj').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var dow = Number(this.dataset.day);
        var idx = Number(this.dataset.idx);
        var entry = state.schedule.find(function(s) { return s.dayOfWeek === dow; });
        if (entry) {
          entry.subjects.splice(idx, 1);
          saveData();
          renderAll(false);
        }
      });
    });

    document.querySelectorAll('[data-day-open]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        openAddSubjectModal(Number(this.dataset.dayOpen));
      });
    });
  }

  // Adds `val` to the given day's schedule. If it's already scheduled that
  // day, asks for confirmation before adding it again (duplicates are
  // allowed — e.g. a subject that meets twice in one day — but only on
  // purpose, not by accident).
  function addSubjectToDay(dow, val) {
    val = (val || '').trim();
    if (!val) return false;
    var entry = state.schedule.find(function(s) { return s.dayOfWeek === dow; });
    if (!entry) return false;

    var isDuplicate = entry.subjects.some(function(s) { return s.toLowerCase() === val.toLowerCase(); });
    if (isDuplicate) {
      var proceed = confirm('"' + val + '" is already scheduled on ' + DAY_NAMES[dow] + '. Add it again anyway?');
      if (!proceed) return false;
    }

    entry.subjects.push(val);
    saveData();
    renderAll(false);
    showToast('Added to ' + DAY_NAMES[dow]);
    return true;
  }

  // ---- My Classes catalog (a reusable list, separate from any day) ----
  function renderMyClasses() {
    var list = document.getElementById('myClassesList');
    if (!list) return;
    var classes = state.myClasses || [];
    list.innerHTML = classes.length ?
      classes.map(function(name, idx) {
        return '<span class="chip">' + escapeHtml(name) +
          '<button data-myclass-idx="' + idx + '" class="remove-subj" aria-label="Remove">×</button></span>';
      }).join('') :
      '<span class="chip-empty">No classes added yet</span>';

    list.querySelectorAll('[data-myclass-idx]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        state.myClasses.splice(Number(this.dataset.myclassIdx), 1);
        saveData();
        renderMyClasses();
      });
    });
  }

  function addToMyClasses(val) {
    val = (val || '').trim();
    if (!val) return false;
    if (!state.myClasses) state.myClasses = [];
    var exists = state.myClasses.some(function(s) { return s.toLowerCase() === val.toLowerCase(); });
    if (exists) return false;
    state.myClasses.push(val);
    saveData();
    return true;
  }

  var myClassesToggleBtn = document.getElementById('myClassesToggle');
  if (myClassesToggleBtn) {
    myClassesToggleBtn.addEventListener('click', function() {
      var collapse = document.getElementById('myClassesCollapse');
      var isOpen = collapse.classList.toggle('open');
      this.classList.toggle('open', isOpen);
      this.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  }

  var myClassInput = document.getElementById('myClassInput');
  function submitMyClass() {
    if (!myClassInput) return;
    var val = myClassInput.value.trim();
    if (!val) return;
    var added = addToMyClasses(val);
    myClassInput.value = '';
    if (added) {
      renderMyClasses();
      showToast('Added "' + val + '" to your classes');
    } else {
      showToast('Already in your classes');
    }
  }
  var myClassAddBtn = document.getElementById('myClassAddBtn');
  if (myClassAddBtn) myClassAddBtn.addEventListener('click', submitMyClass);
  if (myClassInput) {
    myClassInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') submitMyClass();
    });
  }

  // ---- Add-subject popup (opened by tapping "Add class" on a day) ----
  var activeAddSubjectDay = null;
  var addSubjectModalOverlay = document.getElementById('addSubjectModalOverlay');
  var addSubjectWriteInput = document.getElementById('addSubjectWriteInput');

  function openAddSubjectModal(dow) {
    activeAddSubjectDay = dow;
    document.getElementById('addSubjectModalSub').textContent = 'to ' + DAY_NAMES[dow];
    renderAddSubjectChips();
    if (addSubjectWriteInput) addSubjectWriteInput.value = '';
    if (addSubjectModalOverlay) addSubjectModalOverlay.classList.add('show');
  }

  function closeAddSubjectModal() {
    if (addSubjectModalOverlay) addSubjectModalOverlay.classList.remove('show');
    activeAddSubjectDay = null;
  }

  function renderAddSubjectChips() {
    var chipList = document.getElementById('addSubjectChipList');
    if (!chipList) return;
    var classes = state.myClasses || [];
    chipList.innerHTML = classes.length ?
      classes.map(function(name) {
        return '<button class="chip chip-pick" data-pick-class="' + escapeAttr(name) + '">' +
          escapeHtml(name) + '</button>';
      }).join('') :
      '<span class="chip-empty">No classes added yet — write one below, or add some from the My Classes list on this page.</span>';

    chipList.querySelectorAll('[data-pick-class]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        if (activeAddSubjectDay === null) return;
        var added = addSubjectToDay(activeAddSubjectDay, this.dataset.pickClass);
        if (added) closeAddSubjectModal();
      });
    });
  }

  function submitWrittenSubject() {
    if (activeAddSubjectDay === null || !addSubjectWriteInput) return;
    var val = addSubjectWriteInput.value.trim();
    if (!val) return;
    var added = addSubjectToDay(activeAddSubjectDay, val);
    if (added) {
      addToMyClasses(val); // so it's available to pick next time too
      renderMyClasses();
      closeAddSubjectModal();
    }
  }

  var addSubjectModalClose = document.getElementById('addSubjectModalClose');
  if (addSubjectModalClose) addSubjectModalClose.addEventListener('click', closeAddSubjectModal);
  if (addSubjectModalOverlay) {
    addSubjectModalOverlay.addEventListener('click', function(e) {
      if (e.target === addSubjectModalOverlay) closeAddSubjectModal();
    });
  }
  var addSubjectWriteBtn = document.getElementById('addSubjectWriteBtn');
  if (addSubjectWriteBtn) addSubjectWriteBtn.addEventListener('click', submitWrittenSubject);
  if (addSubjectWriteInput) {
    addSubjectWriteInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') submitWrittenSubject();
    });
  }

  //Settings: start date, export, reset
  var startInput = document.getElementById('startDateInput');
  startInput.value = state.startDate;
  startInput.addEventListener('change', function() {
    var v = this.value;
    if (v) {
      // date input returns YYYY-MM-DD, which is valid
      state.startDate = v;
      saveData();
      renderAll(false);
      showToast('Start date updated');
    } else {
      // if cleared, revert to stored value
      this.value = state.startDate;
      showToast('Please pick a date');
    }
  });

  var lastExportBlob = null;
  var lastExportJSON = '';
  var lastExportFilename = '';
  var lastExportUri = '';

  function isNativeApp() {
    return !!(window.CapBridge && window.CapBridge.isNative());
  }

  document.getElementById('exportBtn').addEventListener('click', function() {
    var jsonString = JSON.stringify(state, null, 2);
    var filename = 'attendance-backup-' + todayISO() + '.json';
    lastExportJSON = jsonString;
    lastExportFilename = filename;

    if (isNativeApp()) {
      // Inside the APK: write the file immediately to the phone's public
      // Documents folder, so it shows up in the file manager right away —
      // Share (below) just re-shares this same file, no re-writing needed.
      window.CapBridge.writeBackup(jsonString, filename).then(function(uri) {
        lastExportUri = uri;
        showToast('Exported to Documents');
        document.getElementById('ioShareRow').classList.add('show');
        var pathEl = document.getElementById('exportSavedPath');
        if (pathEl) {
          pathEl.textContent = 'Saved to: ' + uri;
          pathEl.classList.add('show');
        }
      }).catch(function(err) {
        showToast('Could not save the file');
      });
      return;
    }

    // Plain browser (desktop testing): fall back to a normal file download.
    var blob = new Blob([jsonString], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Exported');

    lastExportBlob = blob;
    document.getElementById('ioShareRow').classList.add('show');
  });

  document.getElementById('shareExportBtn').addEventListener('click', function() {
    if (isNativeApp()) {
      if (!lastExportUri) return;
      window.CapBridge.shareUri(lastExportUri).catch(function(err) {
        showToast('Could not share the file');
      });
      return;
    }

    // Browser fallback: try the Web Share API, otherwise explain the file
    // was already downloaded.
    if (!lastExportBlob) return;
    var file = new File([lastExportBlob], lastExportFilename, { type: 'application/json' });
    var canShareFiles = !!(navigator.share && navigator.canShare && navigator.canShare({ files: [file] }));
    if (canShareFiles) {
      navigator.share({
        files: [file],
        title: 'Attendance backup',
        text: 'Attendance Calculator backup — ' + todayISO()
      }).catch(function(err) {
        // AbortError just means the user cancelled the share sheet — nothing to do
        if (err && err.name !== 'AbortError') showToast('Could not share the file');
      });
    } else {
      showToast('Sharing isn\'t available in this browser — the file was already downloaded');
    }
  });

  document.getElementById('importBtn').addEventListener('click', function() {
    document.getElementById('importFileInput').click();
  });

  document.getElementById('importFileInput').addEventListener('change', function(e) {
    var file = e.target.files && e.target.files[0];
    this.value = '';
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function() {
      var parsed;
      try {
        parsed = JSON.parse(reader.result);
      } catch (err) {
        showToast('That file isn\'t valid JSON');
        return;
      }

      var validSchedule = Array.isArray(parsed.schedule) && parsed.schedule.length === 7 &&
        parsed.schedule.every(function(d) { return d && typeof d.dayOfWeek === 'number' &&
          Array.isArray(d.subjects); });
      var validRecords = Array.isArray(parsed.records);
      var validStartDate = typeof parsed.startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(
        parsed.startDate);

      if (!validSchedule || !validRecords || !validStartDate) {
        showToast('This doesn\'t look like a valid backup file');
        return;
      }

      if (!confirm(
          'Importing will replace all current schedule, attendance, and extra-class data with the contents of this backup. Continue?'
          )) {
        return;
      }

      state = {
        schedule: parsed.schedule,
        records: parsed.records,
        extras: (parsed.extras && typeof parsed.extras === 'object') ? parsed.extras : {},
        myClasses: Array.isArray(parsed.myClasses) ? parsed.myClasses : [],
        startDate: parsed.startDate
      };
      saveData();
      startInput.value = state.startDate;
      renderAll(true);
      showToast('Data imported');
    };
    reader.onerror = function() { showToast('Could not read that file'); };
    reader.readAsText(file);
  });

  document.getElementById('resetBtn').addEventListener('click', function() {
    if (confirm('This will permanently delete your schedule and all attendance records. Continue?')) {
      state = {
        schedule: [0, 1, 2, 3, 4, 5, 6].map(function(n) { return { dayOfWeek: n,
          subjects: [] }; }),
        records: [],
        startDate: todayISO()
      };
      saveData();
      startInput.value = state.startDate;
      renderAll(true);
      showToast('All data cleared');
    }
  });

  //Toast
  var toastTimer = null;

  function showToast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function() { t.classList.remove('show'); }, 1800);
  }

  //Utils
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function(c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } [c];
    });
  }

  function escapeAttr(s) { return escapeHtml(s).replace(/"/g, '&quot;'); }

  // ---- IO dropdown toggle ----
  document.getElementById('ioDropdownToggle').addEventListener('click', function() {
    var content = document.getElementById('ioDropdownContent');
    var isOpen = content.classList.toggle('open');
    this.classList.toggle('open', isOpen);
  });

  // ---- How-it-works dropdown toggle ----
  document.getElementById('howItWorksToggle').addEventListener('click', function() {
    var content = document.getElementById('howItWorksContent');
    var isOpen = content.classList.toggle('open');
    this.classList.toggle('open', isOpen);
  });

  //Master render
  function renderAll(resetCalendar) {
    renderHero();
    renderTodayCard();
    renderCalDow();
    if (resetCalendar) { calCursor = startOfDay(new Date());
      calCursor.setDate(1); }
    renderCalGrid();
    renderSubjects();
    renderSchedule();
  }

  renderAll(true);

  // Expose hooks for auth.js so a server-side sync pull can refresh the UI
  window.renderAll = renderAll;
  window.replaceState = function(newData) {
    if (!newData || !newData.schedule || !newData.records) return;
    if (!newData.extras) newData.extras = {};
    if (!newData.myClasses) newData.myClasses = [];
    if (!newData.startDate) newData.startDate = isoDate(new Date());
    state = newData;
    window.state = state;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
    renderAll(true);
  };

  // If a user is already logged in, try to pull their latest data from the server
  if (window.AuthSync) window.AuthSync.trySyncOnLoad();
})();