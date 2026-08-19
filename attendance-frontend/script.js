// ===== MAIN SCRIPT with all new features =====
(function() {
  "use strict";

  // storage keys
  var STORAGE_KEY = 'attendanceData_v1';
  var THEME_KEY = 'attendanceTheme_v1';
  var SCHEME_KEY = 'attendanceScheme_v1';

  function loadData() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.schedule && parsed.records) {
          if (!parsed.extras) parsed.extras = {};
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

  // ---- Color scheme logic ----
  var SCHEMES = [
    { id: 'chalkboard', label: 'Chalkboard' },
    { id: 'mango', label: 'Mango Smoothie' },
    { id: 'keys', label: 'Florida Keys' },
    { id: 'embroidery', label: 'Embroidery' },
    { id: 'springkiss', label: 'Spring Kiss' },
    { id: 'lavenderfields', label: 'Lavender Fields' },
    { id: 'oceanmist', label: 'Ocean Mist' },
    { id: 'terracotta', label: 'Terracotta' },
    { id: 'goldenwheat', label: 'Golden Wheat' },
    { id: 'stormgrey', label: 'Storm Grey' }
  ];

  // Swatch preview colors per scheme: [background, accent] — shown as a dot-in-ring
  var schemeColors = {
    chalkboard: ['#F4F2F6', '#6B5B87'],
    mango: ['#FDF4E8', '#E0742A'],
    keys: ['#EFFAF8', '#12897E'],
    embroidery: ['#F5F7EF', '#5B7A4A'],
    springkiss: ['#FDF1F4', '#C65C7C'],
    lavenderfields: ['#F5F1FA', '#7C5FA6'],
    oceanmist: ['#EEF4FA', '#2A6FA8'],
    terracotta: ['#FBF1EC', '#B85333'],
    goldenwheat: ['#FBF6E9', '#A87F1E'],
    stormgrey: ['#F2F3F5', '#43505F']
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
    localStorage.setItem(SCHEME_KEY, id);
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

  function isExtraSubject(iso, subject) {
    var extras = state.extras && state.extras[iso] ? state.extras[iso] : [];
    return extras.indexOf(subject) > -1;
  }

  function addExtraClass(iso, subject) {
    if (!state.extras) state.extras = {};
    if (!state.extras[iso]) state.extras[iso] = [];
    var existing = scheduledSubjectsForDate(iso);
    if (existing.some(function(s) { return s.toLowerCase() === subject.toLowerCase(); })) {
      return false;
    }
    state.extras[iso].push(subject);
    saveData();
    return true;
  }

  function removeExtraClass(iso, subject) {
    if (!state.extras || !state.extras[iso]) return;
    var idx = state.extras[iso].indexOf(subject);
    if (idx > -1) state.extras[iso].splice(idx, 1);
    if (state.extras[iso].length === 0) delete state.extras[iso];
    clearStatus(iso, subject);
  }

  function recordFor(iso, subject) {
    return state.records.find(function(r) { return r.date === iso && r.subject === subject; });
  }

  function setStatus(iso, subject, status) {
    var rec = recordFor(iso, subject);
    if (rec) {
      rec.status = status;
      delete rec.attended;
    } else {
      state.records.push({
        id: 'r_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        subject: subject,
        date: iso,
        status: status,
        createdAt: new Date().toISOString()
      });
    }
    saveData();
  }

  function clearStatus(iso, subject) {
    var idx = state.records.findIndex(function(r) { return r.date === iso && r.subject === subject; });
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
    if (start > end) return occ;
    var cur = new Date(start);
    while (cur <= end) {
      var iso = isoDate(cur);
      var subs = scheduledSubjectsForDate(iso);
      subs.forEach(function(s) { occ.push({ date: iso, subject: s }); });
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
      var rec = recordFor(o.date, o.subject);
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
    document.getElementById('todayCardDate').textContent = today.toLocaleDateString(undefined, { weekday: 'short',
      month: 'short', day: 'numeric' });

    var subs = scheduledSubjectsForDate(iso);
    var titleEl = document.getElementById('todayCardTitle');
    var scrollEl = document.getElementById('todayScroll');

    if (subs.length === 0) {
      titleEl.textContent = 'Nothing scheduled';
      scrollEl.innerHTML =
        '<div class="today-card-empty">No classes today. <a id="goToSchedule">Add some to your schedule</a>.</div>';
      var goLink = document.getElementById('goToSchedule');
      if (goLink) goLink.addEventListener('click', function() { showView('schedule'); });
      return;
    }

    titleEl.textContent = subs.length + ' class' + (subs.length > 1 ? 'es' : '') + ' today';

    scrollEl.innerHTML = subs.map(function(s) {
      var rec = recordFor(iso, s);
      var status = statusOf(rec);
      var isExtra = isExtraSubject(iso, s);

      return '<div class="today-pill-card">' +
        '<div class="today-pill-name-row">' +
        '<div class="today-pill-name">' + escapeHtml(s) + (isExtra ?
          '<span class="extra-tag">extra</span>' : '') + '</div>' +
        (isExtra ?
          '<button class="today-pill-remove" data-remove-extra="' + escapeAttr(s) +
          '" aria-label="Remove extra class">×</button>' : '') +
        '</div>' +
        '<div class="today-pill-actions">' +
        '<button class="today-mark-btn attended-btn' + (status === 'attended' ? ' selected' : '') +
        '" data-subject="' + escapeAttr(s) + '" data-mark="attended">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' +
        'Attended</button>' +
        '<button class="today-mark-btn absent-btn' + (status === 'absent' ? ' selected' : '') +
        '" data-subject="' + escapeAttr(s) + '" data-mark="absent">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>' +
        'Absent</button>' +
        '<button class="today-mark-btn dismissed-btn' + (status === 'dismissed' ? ' selected' : '') +
        '" data-subject="' + escapeAttr(s) + '" data-mark="dismissed">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><line x1="9" y1="9" x2="15" y2="15"></line></svg>' +
        'Dismissed</button>' +
        '</div></div>';
    }).join('');

    scrollEl.querySelectorAll('.today-mark-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var subject = this.dataset.subject;
        var markStatus = this.dataset.mark;
        var rec = recordFor(iso, subject);
        var current = statusOf(rec);

        if (current === markStatus) {
          clearStatus(iso, subject);
        } else {
          setStatus(iso, subject, markStatus);
        }
        renderAll(false);
      });
    });

    scrollEl.querySelectorAll('[data-remove-extra]').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        removeExtraClass(iso, this.dataset.removeExtra);
        saveData();
        renderAll(false);
        showToast('Extra class removed');
      });
    });
  }

  //Add extra class (today)
  var addExtraRow = document.getElementById('addExtraRow');
  var addExtraTrigger = document.getElementById('addExtraTrigger');
  var extraSubjectInput = document.getElementById('extraSubjectInput');

  function openExtraForm() {
    addExtraRow.classList.add('open');
    extraSubjectInput.value = '';
    extraSubjectInput.focus();
  }

  function closeExtraForm() {
    addExtraRow.classList.remove('open');
    extraSubjectInput.value = '';
  }

  function submitExtraClass() {
    var val = extraSubjectInput.value.trim();
    if (!val) { closeExtraForm(); return; }
    var iso = todayISO();
    var added = addExtraClass(iso, val);
    if (added) {
      closeExtraForm();
      renderAll(false);
      showToast('Added "' + val + '" for today');
    } else {
      showToast('Already scheduled today');
    }
  }

  addExtraTrigger.addEventListener('click', openExtraForm);
  document.getElementById('extraAddBtn').addEventListener('click', submitExtraClass);
  document.getElementById('extraCancelBtn').addEventListener('click', closeExtraForm);
  extraSubjectInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') submitExtraClass();
    if (e.key === 'Escape') closeExtraForm();
  });

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
      var subs = scheduledSubjectsForDate(iso);
      var isToday = iso === todayISO();

      var cls = ['cal-day'];
      if (isToday) cls.push('today');
      if (future) cls.push('future');

      var dotsHtml = '';
      if (subs.length > 0) {
        cls.push('has-class');
        if (!future) {
          var countable = subs.filter(function(s) {
            var r = recordFor(iso, s);
            return statusOf(r) !== 'dismissed';
          });
          var attendedCount = countable.filter(function(s) {
            var r = recordFor(iso, s);
            return statusOf(r) === 'attended';
          }).length;

          if (countable.length === 0) {
            // all dismissed
          } else if (attendedCount === countable.length) cls.push('full-attend');
          else if (attendedCount === 0) cls.push('none-attend');
          else cls.push('partial-attend');

          dotsHtml = '<div class="cal-dots">' + subs.slice(0, 5).map(function(s) {
            var r = recordFor(iso, s);
            var status = statusOf(r);
            var dotCls = status === 'attended' ? 'on' : status === 'dismissed' ?
              'dismissed' : 'off';
            return '<span class="cal-dot ' + dotCls + '"></span>';
          }).join('') + '</div>';
        } else {
          dotsHtml = '<div class="cal-dots">' + subs.slice(0, 5).map(function() {
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
        // Allow past and today, not future
        if (isFuture(iso)) return;
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
    var subs = scheduledSubjectsForDate(iso);
    document.getElementById('dayModalSub').textContent = subs.length ?
      subs.length + ' class' + (subs.length > 1 ? 'es' : '') + ' scheduled' :
      'Nothing scheduled this day';

    var body = document.getElementById('dayModalBody');
    if (subs.length === 0) {
      body.innerHTML =
        '<div class="modal-empty">No subjects scheduled for this day.<br>Add some in the Schedule tab, or use "Add extra class" below.</div>';
    } else {
      body.innerHTML = subs.map(function(s) {
        var rec = recordFor(iso, s);
        var status = statusOf(rec);
        var isExtra = isExtraSubject(iso, s);
        return '<div class="modal-subj-row">' +
          '<div class="modal-subj-row-head">' +
          '<div class="toggle-row-name">' + escapeHtml(s) + (isExtra ?
            '<span class="extra-tag">extra</span>' : '') + '</div>' +
          (isExtra ?
            '<button class="modal-remove-extra" data-modal-remove-extra="' + escapeAttr(
              s) + '" aria-label="Remove extra class">×</button>' : '') +
          '</div>' +
          '<div class="modal-mark-row">' +
          '<button class="modal-mark-btn attended-btn' + (status === 'attended' ?
            ' selected' : '') + '" data-subject="' + escapeAttr(s) +
          '" data-mark="attended">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' +
          'Attended</button>' +
          '<button class="modal-mark-btn absent-btn' + (status === 'absent' ? ' selected' :
            '') + '" data-subject="' + escapeAttr(s) + '" data-mark="absent">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>' +
          'Absent</button>' +
          '<button class="modal-mark-btn dismissed-btn' + (status === 'dismissed' ?
            ' selected' : '') + '" data-subject="' + escapeAttr(s) +
          '" data-mark="dismissed">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><line x1="9" y1="9" x2="15" y2="15"></line></svg>' +
          'Dismissed</button>' +
          '</div></div>';
      }).join('');

      body.querySelectorAll('.modal-mark-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var subject = this.dataset.subject;
          var markStatus = this.dataset.mark;
          var rec = recordFor(activeModalDate, subject);
          var current = statusOf(rec);

          if (current === markStatus) {
            clearStatus(activeModalDate, subject);
          } else {
            setStatus(activeModalDate, subject, markStatus);
          }

          renderAll(false);
          openDayModal(activeModalDate);
        });
      });

      body.querySelectorAll('[data-modal-remove-extra]').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          removeExtraClass(activeModalDate, this.dataset.modalRemoveExtra);
          saveData();
          renderAll(false);
          openDayModal(activeModalDate);
          showToast('Extra class removed');
        });
      });
    }
    closeModalExtraForm();
    overlay.classList.add('show');
    // reset sheet transform
    var sheet = document.getElementById('modalSheet');
    if (sheet) {
      sheet.style.transform = '';
      sheet.style.opacity = '';
      sheet.style.transition = '';
    }
  }

  // ---- Modal swipe-to-close ----
  (function() {
    var sheet = document.getElementById('modalSheet');
    var handle = document.getElementById('modalHandle');
    var startY = 0,
      currentY = 0,
      isDragging = false;

    function closeModal() {
      overlay.classList.remove('show');
      if (sheet) {
        sheet.style.transform = '';
        sheet.style.opacity = '';
        sheet.style.transition = '';
      }
    }

    function onTouchStart(e) {
      if (!overlay.classList.contains('show')) return;
      var touch = e.touches[0];
      startY = touch.clientY;
      currentY = startY;
      isDragging = true;
      if (sheet) sheet.style.transition = 'none';
    }

    function onTouchMove(e) {
      if (!isDragging) return;
      var touch = e.touches[0];
      currentY = touch.clientY;
      var delta = currentY - startY;
      if (delta > 0) {
        if (sheet) {
          sheet.style.transform = 'translateY(' + delta + 'px)';
          sheet.style.opacity = 1 - (delta / 500);
        }
      }
    }

    function onTouchEnd(e) {
      if (!isDragging) return;
      isDragging = false;
      var delta = currentY - startY;
      if (sheet) {
        sheet.style.transition = 'transform 0.25s cubic-bezier(.2,.8,.2,1), opacity 0.25s ease';
      }
      if (delta > 100) {
        if (sheet) {
          sheet.style.transform = 'translateY(100%)';
          sheet.style.opacity = '0';
        }
        setTimeout(closeModal, 250);
      } else {
        if (sheet) {
          sheet.style.transform = '';
          sheet.style.opacity = '';
        }
      }
    }

    var elements = [handle, sheet];
    elements.forEach(function(el) {
      if (!el) return;
      el.addEventListener('touchstart', onTouchStart, { passive: true });
      el.addEventListener('touchmove', onTouchMove, { passive: true });
      el.addEventListener('touchend', onTouchEnd, { passive: true });
    });

    // Close on overlay click and close button
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeModal();
    });
    document.getElementById('dayModalClose').addEventListener('click', closeModal);
  })();

  //Add extra class (from within the day modal)
  var modalAddExtraRow = document.getElementById('modalAddExtraRow');
  var modalAddExtraTrigger = document.getElementById('modalAddExtraTrigger');
  var modalExtraSubjectInput = document.getElementById('modalExtraSubjectInput');

  function openModalExtraForm() {
    modalAddExtraRow.classList.add('open');
    modalExtraSubjectInput.value = '';
    modalExtraSubjectInput.focus();
  }

  function closeModalExtraForm() {
    modalAddExtraRow.classList.remove('open');
    modalExtraSubjectInput.value = '';
  }

  function submitModalExtraClass() {
    var val = modalExtraSubjectInput.value.trim();
    if (!val) { closeModalExtraForm(); return; }
    if (!activeModalDate) return;
    var added = addExtraClass(activeModalDate, val);
    if (added) {
      closeModalExtraForm();
      renderAll(false);
      openDayModal(activeModalDate);
      showToast('Added "' + val + '"');
    } else {
      showToast('Already scheduled this day');
    }
  }
  modalAddExtraTrigger.addEventListener('click', openModalExtraForm);
  document.getElementById('modalExtraAddBtn').addEventListener('click', submitModalExtraClass);
  document.getElementById('modalExtraCancelBtn').addEventListener('click', closeModalExtraForm);
  modalExtraSubjectInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') submitModalExtraClass();
    if (e.key === 'Escape') closeModalExtraForm();
  });

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

        return '<div class="day-block">' +
          '<div class="day-block-title">' + DAY_NAMES[day.dayOfWeek] +
          '<span class="count">' + subs.length + ' subject' + (subs.length === 1 ? '' :
            's') + '</span></div>' +
          '<div class="chip-row">' + chips + '</div>' +
          '<div class="add-row">' +
          '<input type="text" placeholder="Add subject…" data-day-input="' + day
          .dayOfWeek + '" maxlength="40">' +
          '<button class="btn btn-primary" data-day-add="' + day.dayOfWeek +
          '">Add</button>' +
          '</div></div>';
      }).join('');

    document.getElementById('scheduleList').innerHTML = html;

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

    document.querySelectorAll('[data-day-add]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        addSubjectToDay(Number(this.dataset.dayAdd));
      });
    });
    document.querySelectorAll('[data-day-input]').forEach(function(input) {
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          addSubjectToDay(Number(this.dataset.dayInput));
        }
      });
    });
  }

  function addSubjectToDay(dow) {
    var input = document.querySelector('[data-day-input="' + dow + '"]');
    var val = input.value.trim();
    if (!val) return;
    var entry = state.schedule.find(function(s) { return s.dayOfWeek === dow; });
    if (entry) {
      if (entry.subjects.some(function(s) { return s.toLowerCase() === val.toLowerCase(); })) {
        showToast('Already added to ' + DAY_NAMES[dow]);
        input.value = '';
        return;
      }
      entry.subjects.push(val);
      saveData();
      input.value = '';
      renderAll(false);
      showToast('Added to ' + DAY_NAMES[dow]);
    }
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

  function isNativeApp() {
    return !!(window.CapBridge && window.CapBridge.isNative());
  }

  document.getElementById('exportBtn').addEventListener('click', function() {
    var jsonString = JSON.stringify(state, null, 2);
    var filename = 'attendance-backup-' + todayISO() + '.json';
    lastExportJSON = jsonString;
    lastExportFilename = filename;

    if (isNativeApp()) {
      // Inside the APK: just remember the data — the actual file write happens
      // when the user taps Share, straight into the native share sheet.
      showToast('Exported');
      document.getElementById('ioShareRow').classList.add('show');
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
    if (!lastExportJSON) return;

    if (isNativeApp()) {
      window.CapBridge.shareJSON(lastExportJSON, lastExportFilename).catch(function(err) {
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
    state = newData;
    window.state = state;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
    renderAll(true);
  };

  // If a user is already logged in, try to pull their latest data from the server
  if (window.AuthSync) window.AuthSync.trySyncOnLoad();
})();