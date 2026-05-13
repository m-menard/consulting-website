(function () {
  'use strict';

  var BASE_URL = (function () {
    var scripts = document.querySelectorAll('script[data-token]');
    if (scripts.length > 0) {
      var src = scripts[scripts.length - 1].src;
      var m = src.match(/^(https?:\/\/[^\/]+)/);
      if (m) return m[1];
    }
    var allScripts = document.querySelectorAll('script[src]');
    for (var i = 0; i < allScripts.length; i++) {
      var s = allScripts[i].src;
      if (s.indexOf('/hiring-widget/embed.js') !== -1) {
        var m2 = s.match(/^(https?:\/\/[^\/]+)/);
        if (m2) return m2[1];
      }
    }
    return '';
  })();

  function getToken() {
    var scripts = document.querySelectorAll('script[data-token]');
    if (scripts.length > 0) return scripts[scripts.length - 1].getAttribute('data-token');
    var inlines = document.querySelectorAll('[data-hiring-widget]');
    if (inlines.length > 0) return inlines[0].getAttribute('data-token');
    return null;
  }

  function getMode() {
    var inlines = document.querySelectorAll('[data-hiring-widget]');
    if (inlines.length > 0) return inlines[0].getAttribute('data-mode') || 'floating';
    return 'floating';
  }

  var TOKEN = getToken();
  var MODE = getMode();

  // Steps: 1=Details, 2=Browse Jobs, 3=CV Upload, 4=AI Analysis, 5=Results, 6=Schedule, 7=Success
  var TOTAL_STEPS = 7;

  var config = {
    companyName: 'Careers',
    primaryColor: '#4f46e5',
    welcomeText: 'Find your next opportunity',
    logoUrl: null,
    instantCallEnabled: false,
    allowSkipCV: true,
    launcherIcon: 'briefcase',
  };

  var state = {
    step: 1,
    details: { fullName: '', phone: '', email: '', gdpr: false },
    jobs: [],
    jobsLoaded: false,
    browseSelectedJob: null,
    aiMatchMode: false,
    cvFile: null,
    matches: [],
    topMatch: null,
    candidateId: null,
    applicationId: null,
    selectedJob: null,
    selectedDate: null,
    selectedTime: null,
    sessionId: null,
    isOpen: false,
    _error: null,
    _statusIdx: 0,
    _statusTimer: null,
    _immediate: false,
    _confirmationSent: false,
  };

  function hex2rgb(hex) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return r + ',' + g + ',' + b;
  }

  var CSS = '';
  function buildCSS(primary) {
    var rgb = hex2rgb(primary);
    CSS = [
      '.hw-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:2147483640;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box}',
      '.hw-modal{background:#fff;border-radius:16px;width:100%;max-width:560px;max-height:90vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 25px 60px rgba(0,0,0,0.25);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
      '.hw-header{padding:20px 24px 0;flex-shrink:0}',
      '.hw-brand{display:flex;align-items:center;gap:10px;margin-bottom:14px}',
      '.hw-brand-logo{width:36px;height:36px;border-radius:8px;object-fit:cover}',
      '.hw-brand-name{font-size:16px;font-weight:700;color:#111827}',
      '.hw-progress{display:flex;gap:4px;margin-bottom:0}',
      '.hw-step-dot{flex:1;height:3px;border-radius:3px;background:#e5e7eb;transition:background 0.3s}',
      '.hw-step-dot.active{background:' + primary + '}',
      '.hw-step-dot.done{background:' + primary + ';opacity:0.4}',
      '.hw-close{position:absolute;top:16px;right:16px;background:none;border:none;cursor:pointer;color:#9ca3af;font-size:22px;line-height:1;padding:4px;border-radius:6px}',
      '.hw-close:hover{color:#374151;background:#f3f4f6}',
      '.hw-body{padding:24px;overflow-y:auto;flex:1}',
      '.hw-title{font-size:19px;font-weight:700;color:#111827;margin:0 0 5px}',
      '.hw-sub{font-size:14px;color:#6b7280;margin:0 0 18px}',
      '.hw-field{margin-bottom:13px}',
      '.hw-label{display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:5px}',
      '.hw-input{width:100%;padding:10px 12px;border:1.5px solid #d1d5db;border-radius:8px;font-size:14px;color:#111827;box-sizing:border-box;outline:none;transition:border-color 0.2s}',
      '.hw-input:focus{border-color:' + primary + ';box-shadow:0 0 0 3px rgba(' + rgb + ',0.15)}',
      '.hw-gdpr{display:flex;align-items:flex-start;gap:10px;margin-top:6px}',
      '.hw-gdpr input[type=checkbox]{margin-top:2px;accent-color:' + primary + ';cursor:pointer;width:16px;height:16px;flex-shrink:0}',
      '.hw-gdpr-text{font-size:12px;color:#6b7280;line-height:1.5}',
      '.hw-job-card{border:2px solid #e5e7eb;border-radius:12px;padding:14px 16px;margin-bottom:10px;cursor:pointer;transition:border-color 0.2s,box-shadow 0.2s,background 0.2s;position:relative}',
      '.hw-job-card:hover{border-color:' + primary + ';box-shadow:0 2px 12px rgba(' + rgb + ',0.12)}',
      '.hw-job-card.selected{border-color:' + primary + ';background:rgba(' + rgb + ',0.04)}',
      '.hw-job-card.selected::after{content:"Selected";position:absolute;top:12px;right:12px;background:' + primary + ';color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;letter-spacing:0.5px}',
      '.hw-job-card.ai-recommended{border-color:#10b981}',
      '.hw-job-card.ai-recommended::before{content:"AI Recommended";position:absolute;top:12px;right:12px;background:#d1fae5;color:#059669;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;letter-spacing:0.5px}',
      '.hw-job-card.ai-recommended.selected::before{display:none}',
      '.hw-job-title{font-size:15px;font-weight:700;color:#111827;margin:0 0 3px;padding-right:80px}',
      '.hw-job-meta{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px}',
      '.hw-job-pill{font-size:11px;font-weight:500;color:#6b7280;background:#f3f4f6;padding:2px 8px;border-radius:20px}',
      '.hw-job-salary{font-size:12px;font-weight:600;color:#374151;margin-top:4px}',
      '.hw-job-desc{font-size:12px;color:#6b7280;margin-top:6px;line-height:1.5}',
      '.hw-score-badge{display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:700;padding:3px 10px;border-radius:20px;margin-top:6px}',
      '.hw-browse-ctas{display:flex;gap:10px;margin-top:20px;flex-wrap:wrap}',
      '.hw-drop{border:2px dashed #d1d5db;border-radius:12px;padding:28px 20px;text-align:center;cursor:pointer;transition:border-color 0.2s,background 0.2s;background:#fafafa}',
      '.hw-drop:hover,.hw-drop.dragover{border-color:' + primary + ';background:rgba(' + rgb + ',0.04)}',
      '.hw-drop-icon{font-size:34px;margin-bottom:8px;color:#9ca3af}',
      '.hw-drop-text{font-size:14px;color:#6b7280}',
      '.hw-drop-hint{font-size:11px;color:#9ca3af;margin-top:4px}',
      '.hw-file-picked{display:flex;align-items:center;gap:10px;margin-top:12px;padding:10px 14px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px}',
      '.hw-file-picked-name{font-size:13px;font-weight:600;color:#0369a1;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.hw-file-picked-size{font-size:11px;color:#0284c7;white-space:nowrap}',
      '.hw-skip-cv{text-align:center;margin-top:14px}',
      '.hw-skip-link{font-size:13px;color:' + primary + ';cursor:pointer;text-decoration:underline;background:none;border:none;padding:0}',
      '.hw-skip-link:hover{opacity:0.8}',
      '.hw-loader{text-align:center;padding:24px 0}',
      '.hw-loader-ring{width:56px;height:56px;border:5px solid #e5e7eb;border-top-color:' + primary + ';border-radius:50%;animation:hw-spin 0.9s linear infinite;margin:0 auto 18px}',
      '@keyframes hw-spin{to{transform:rotate(360deg)}}',
      '.hw-loader-status{font-size:14px;color:#6b7280;min-height:22px}',
      '.hw-bullets{margin:10px 0 0;padding:0;list-style:none}',
      '.hw-bullet{font-size:12px;padding:2px 0;display:flex;align-items:flex-start;gap:6px}',
      '.hw-bullet-check{color:#10b981;flex-shrink:0;margin-top:1px}',
      '.hw-bullet-warn{color:#f59e0b;flex-shrink:0;margin-top:1px}',
      '.hw-bullet-text{color:#374151}',
      '.hw-confirm-card{border:2px solid ' + primary + ';border-radius:12px;padding:18px;background:rgba(' + rgb + ',0.04);margin-bottom:16px}',
      '.hw-confirm-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:' + primary + ';margin-bottom:6px}',
      '.hw-confirm-job-title{font-size:17px;font-weight:700;color:#111827;margin-bottom:4px}',
      '.hw-ctas{display:flex;gap:10px;margin-top:18px}',
      '.hw-btn{flex:1;padding:12px 18px;border-radius:9px;font-size:14px;font-weight:600;cursor:pointer;border:none;transition:opacity 0.2s,transform 0.1s;text-align:center}',
      '.hw-btn:active{transform:scale(0.98)}',
      '.hw-btn-primary{background:' + primary + ';color:#fff}',
      '.hw-btn-primary:hover{opacity:0.9}',
      '.hw-btn-primary:disabled{opacity:0.45;cursor:not-allowed}',
      '.hw-btn-outline{background:#fff;color:' + primary + ';border:2px solid ' + primary + '}',
      '.hw-btn-outline:hover{background:rgba(' + rgb + ',0.06)}',
      '.hw-btn-ghost{background:none;color:#6b7280;border:1.5px solid #e5e7eb;flex:none;padding:10px 16px}',
      '.hw-btn-ghost:hover{background:#f3f4f6}',
      '.hw-calendar{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-bottom:16px}',
      '.hw-cal-header{grid-column:span 7;display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-bottom:4px}',
      '.hw-cal-day-name{text-align:center;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase}',
      '.hw-cal-day{aspect-ratio:1;display:flex;align-items:center;justify-content:center;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;border:none;background:none;color:#374151;transition:background 0.15s}',
      '.hw-cal-day:hover:not(:disabled){background:rgba(' + rgb + ',0.1);color:' + primary + '}',
      '.hw-cal-day.selected{background:' + primary + ';color:#fff}',
      '.hw-cal-day:disabled{color:#d1d5db;cursor:not-allowed}',
      '.hw-cal-day.empty{cursor:default}',
      '.hw-times{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:20px}',
      '.hw-time-btn{padding:9px;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;border:1.5px solid #e5e7eb;background:#fff;color:#374151;transition:border-color 0.15s,background 0.15s}',
      '.hw-time-btn:hover{border-color:' + primary + ';color:' + primary + '}',
      '.hw-time-btn.selected{background:' + primary + ';color:#fff;border-color:' + primary + '}',
      '.hw-success{text-align:center;padding:12px 0}',
      '.hw-success-check{width:64px;height:64px;background:#d1fae5;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:30px}',
      '.hw-success-title{font-size:22px;font-weight:700;color:#111827;margin-bottom:8px}',
      '.hw-success-detail{font-size:14px;color:#6b7280;margin-bottom:6px}',
      '.hw-footer{padding:14px 24px;border-top:1px solid #f3f4f6;flex-shrink:0}',
      '.hw-nav{display:flex;justify-content:space-between;align-items:center;gap:10px}',
      '.hw-launch-btn{position:fixed;bottom:24px;right:24px;z-index:2147483630;background:' + primary + ';color:#fff;border:none;border-radius:28px;padding:14px 22px;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 4px 20px rgba(' + rgb + ',0.45);display:flex;align-items:center;gap:8px;transition:transform 0.2s,box-shadow 0.2s;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
      '.hw-launch-btn:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(' + rgb + ',0.5)}',
      '.hw-error{background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px 14px;font-size:13px;color:#dc2626;margin-bottom:14px}',
      '.hw-no-match{text-align:center;padding:20px 0}',
      '.hw-no-match-icon{font-size:44px;margin-bottom:10px}',
      '.hw-no-match-title{font-size:18px;font-weight:700;color:#111827;margin-bottom:6px}',
      '.hw-no-match-text{font-size:13px;color:#6b7280}',
      '.hw-empty-jobs{text-align:center;padding:32px 16px}',
      '.hw-empty-jobs-icon{font-size:48px;margin-bottom:12px}',
      '.hw-empty-jobs-text{font-size:14px;color:#6b7280}',
      '.hw-jobs-loading{text-align:center;padding:32px;color:#9ca3af;font-size:14px}',
      '@media(max-width:480px){.hw-modal{max-height:100vh;border-radius:0}.hw-overlay{padding:0}.hw-launch-btn{bottom:16px;right:16px}}',
    ].join('\n');
    return CSS;
  }

  function injectCSS() {
    if (document.getElementById('hw-styles')) return;
    var style = document.createElement('style');
    style.id = 'hw-styles';
    style.textContent = buildCSS(config.primaryColor);
    document.head.appendChild(style);
  }

  function updateCSS() {
    var el = document.getElementById('hw-styles');
    if (el) el.textContent = buildCSS(config.primaryColor);
  }

  function scoreColor(score) {
    if (score >= 70) return '#10b981';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function formatSalary(min, max) {
    if (!min && !max) return '';
    var fmt = function (n) {
      if (n >= 1000) return '$' + (n / 1000).toFixed(0) + 'k';
      return '$' + n;
    };
    if (min && max) return fmt(min) + ' – ' + fmt(max);
    if (min) return 'From ' + fmt(min);
    return 'Up to ' + fmt(max);
  }

  function getNext14Dates() {
    var dates = [];
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var d = new Date(today);
    d.setDate(d.getDate() + 1);
    while (dates.length < 14) {
      if (d.getDay() !== 0 && d.getDay() !== 6) dates.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return dates;
  }

  var TIME_SLOTS = ['9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'];
  var DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function esc(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function getLauncherIconHtml(icon) {
    var icons = { briefcase: '&#128188;', star: '&#11088;', rocket: '&#128640;', sparkle: '&#10024;', none: '' };
    var key = icon || 'briefcase';
    return icons[key] !== undefined ? icons[key] : icons.briefcase;
  }

  // ─── Render ────────────────────────────────────────────────

  function renderModal() {
    var el = document.getElementById('hw-modal-root');
    if (!el) return;
    el.innerHTML = buildModalHTML();
    attachEvents();
  }

  function buildModalHTML() {
    var dots = '';
    for (var i = 1; i <= TOTAL_STEPS; i++) {
      var cls = i < state.step ? 'done' : i === state.step ? 'active' : '';
      dots += '<div class="hw-step-dot ' + cls + '"></div>';
    }

    var brandHTML = '';
    if (config.logoUrl) brandHTML += '<img src="' + config.logoUrl + '" class="hw-brand-logo" alt="logo">';
    brandHTML += '<span class="hw-brand-name">' + esc(config.companyName) + '</span>';

    var bodyHTML = '';
    if (state.step === 1) bodyHTML = buildStep1();
    else if (state.step === 2) bodyHTML = buildStep2();
    else if (state.step === 3) bodyHTML = buildStep3();
    else if (state.step === 4) bodyHTML = buildStep4();
    else if (state.step === 5) bodyHTML = buildStep5();
    else if (state.step === 6) bodyHTML = buildStep6();
    else if (state.step === 7) bodyHTML = buildStep7();

    var footerHTML = buildFooter();

    return [
      '<div class="hw-overlay" id="hw-overlay">',
      '<div class="hw-modal" role="dialog" aria-modal="true">',
      '<button class="hw-close" id="hw-close-btn" aria-label="Close">&times;</button>',
      '<div class="hw-header">',
      '<div class="hw-brand">' + brandHTML + '</div>',
      '<div class="hw-progress">' + dots + '</div>',
      '</div>',
      '<div class="hw-body" id="hw-body">' + bodyHTML + '</div>',
      '<div class="hw-footer">' + footerHTML + '</div>',
      '</div>',
      '</div>',
    ].join('');
  }

  // Step 1 – Personal details
  function buildStep1() {
    return [
      '<h2 class="hw-title">Tell us about yourself</h2>',
      '<p class="hw-sub">Enter your details to explore open roles and schedule an interview.</p>',
      state._error ? '<div class="hw-error">' + esc(state._error) + '</div>' : '',
      '<div class="hw-field">',
      '<label class="hw-label">Full Name <span style="color:#ef4444">*</span></label>',
      '<input class="hw-input" id="hw-fullname" type="text" placeholder="e.g. Jane Smith" value="' + esc(state.details.fullName) + '" autocomplete="name">',
      '</div>',
      '<div class="hw-field">',
      '<label class="hw-label">Mobile Number <span style="color:#ef4444">*</span></label>',
      '<input class="hw-input" id="hw-phone" type="tel" placeholder="+1 555 000 0000" value="' + esc(state.details.phone) + '" autocomplete="tel">',
      '</div>',
      '<div class="hw-field">',
      '<label class="hw-label">Email Address <span style="color:#ef4444">*</span></label>',
      '<input class="hw-input" id="hw-email" type="email" placeholder="jane@example.com" value="' + esc(state.details.email) + '" autocomplete="email">',
      '</div>',
      '<div class="hw-gdpr">',
      '<input type="checkbox" id="hw-gdpr" ' + (state.details.gdpr ? 'checked' : '') + '>',
      '<label for="hw-gdpr" class="hw-gdpr-text">I agree to my CV and personal details being analyzed by AI to assess my fit for open roles.</label>',
      '</div>',
    ].join('');
  }

  // Step 2 – Browse all positions
  function buildStep2() {
    if (!state.jobsLoaded) {
      return [
        '<h2 class="hw-title">Open Positions</h2>',
        '<p class="hw-sub">Loading available roles\u2026</p>',
        '<div class="hw-jobs-loading"><div class="hw-loader-ring" style="margin:0 auto"></div></div>',
      ].join('');
    }

    if (state.jobs.length === 0) {
      return [
        '<h2 class="hw-title">Open Positions</h2>',
        '<div class="hw-empty-jobs">',
        '<div class="hw-empty-jobs-icon">&#128218;</div>',
        '<p class="hw-empty-jobs-text">No open positions at the moment.<br>Check back soon!</p>',
        '</div>',
      ].join('');
    }

    var cards = state.jobs.map(function (job) {
      var isSelected = state.browseSelectedJob && state.browseSelectedJob.id === job.id;
      var salary = formatSalary(job.salaryMin, job.salaryMax);
      var pills = '';
      if (job.location) pills += '<span class="hw-job-pill">&#128205; ' + esc(job.location) + '</span>';
      if (job.department) pills += '<span class="hw-job-pill">&#128188; ' + esc(job.department) + '</span>';
      if (job.employmentType) pills += '<span class="hw-job-pill">' + esc(job.employmentType) + '</span>';

      return [
        '<div class="hw-job-card' + (isSelected ? ' selected' : '') + '" data-jobid="' + esc(job.id) + '" data-jobtitle="' + esc(job.title) + '">',
        '<p class="hw-job-title">' + esc(job.title) + '</p>',
        pills ? '<div class="hw-job-meta">' + pills + '</div>' : '',
        salary ? '<div class="hw-job-salary">' + esc(salary) + '</div>' : '',
        job.description ? '<div class="hw-job-desc">' + esc(job.description) + (job.description.length >= 200 ? '&hellip;' : '') + '</div>' : '',
        '</div>',
      ].join('');
    }).join('');

    var applyLabel = state.browseSelectedJob ? 'Apply for ' + esc(state.browseSelectedJob.title) : 'Select a role above';

    return [
      '<h2 class="hw-title">Open Positions</h2>',
      '<p class="hw-sub">Select a role to apply, or let AI match you from your CV.</p>',
      state._error ? '<div class="hw-error">' + esc(state._error) + '</div>' : '',
      cards,
      '<div class="hw-browse-ctas">',
      '<button class="hw-btn hw-btn-primary" id="hw-apply-selected-btn"' + (!state.browseSelectedJob ? ' disabled' : '') + '>' + applyLabel + '</button>',
      '<button class="hw-btn hw-btn-outline" id="hw-ai-match-btn">&#129302; Let AI Match Me</button>',
      '</div>',
    ].join('');
  }

  // Step 3 – CV Upload
  function buildStep3() {
    var required = state.aiMatchMode;
    var subtitle = required
      ? 'Upload your CV so AI can find your best match across all open roles.'
      : 'Attach your CV to strengthen your application for <strong>' + esc(state.browseSelectedJob ? state.browseSelectedJob.title : '') + '</strong>.';

    var fileInfo = '';
    if (state.cvFile) {
      fileInfo = '<div class="hw-file-picked"><span style="font-size:20px">&#128196;</span><span class="hw-file-picked-name">' + esc(state.cvFile.name) + '</span><span class="hw-file-picked-size">' + formatBytes(state.cvFile.size) + '</span></div>';
    }

    var skipBtn = (!required && config.allowSkipCV !== false)
      ? '<div class="hw-skip-cv"><button class="hw-skip-link" id="hw-skip-cv-btn">Skip — proceed without CV</button></div>'
      : '';

    return [
      '<h2 class="hw-title">Upload your CV</h2>',
      '<p class="hw-sub">' + subtitle + (required ? ' <strong>(Required)</strong>' : '') + '</p>',
      state._error ? '<div class="hw-error">' + esc(state._error) + '</div>' : '',
      '<div class="hw-drop" id="hw-drop-zone">',
      '<div class="hw-drop-icon">&#128196;</div>',
      '<div class="hw-drop-text">' + (state.cvFile ? 'Replace file' : 'Drop your CV here, or <strong>browse</strong>') + '</div>',
      '<div class="hw-drop-hint">PDF or DOCX &nbsp;&bull;&nbsp; Max 5 MB</div>',
      '<input type="file" id="hw-file-input" accept=".pdf,.doc,.docx" style="display:none">',
      '</div>',
      fileInfo,
      skipBtn,
    ].join('');
  }

  // Step 4 – AI Analysis loading
  function buildStep4() {
    var statuses = ['Reading your CV\u2026', 'Identifying your skills\u2026', 'Matching to open roles\u2026', 'Calculating your fit scores\u2026'];
    var idx = state._statusIdx || 0;
    return [
      '<div class="hw-loader">',
      '<div class="hw-loader-ring"></div>',
      '<p style="font-size:17px;font-weight:700;color:#111827;margin-bottom:8px">AI is analyzing your CV</p>',
      '<p class="hw-loader-status" id="hw-status-msg">' + statuses[idx % statuses.length] + '</p>',
      '</div>',
    ].join('');
  }

  // Step 5 – Results / Confirm selection
  function buildStep5() {
    // No CV uploaded path: just confirm the selected job
    if (!state.cvFile && state.browseSelectedJob && (!state.matches || state.matches.length === 0)) {
      return [
        '<h2 class="hw-title">Confirm Your Application</h2>',
        '<p class="hw-sub">You\'re applying for the following position:</p>',
        '<div class="hw-confirm-card">',
        '<div class="hw-confirm-label">Position</div>',
        '<div class="hw-confirm-job-title">' + esc(state.browseSelectedJob.title) + '</div>',
        state.browseSelectedJob.department ? '<div style="font-size:13px;color:#6b7280">' + esc(state.browseSelectedJob.department) + '</div>' : '',
        '</div>',
        '<div class="hw-ctas">',
        '<button class="hw-btn hw-btn-primary" id="hw-schedule-btn">Schedule Interview &rarr;</button>',
        config.instantCallEnabled ? '<button class="hw-btn hw-btn-outline" id="hw-instant-btn">Talk to AI Now</button>' : '',
        '</div>',
      ].join('');
    }

    // CV analyzed path
    if (!state.matches || state.matches.length === 0) {
      return [
        '<div class="hw-no-match">',
        '<div class="hw-no-match-icon">&#128203;</div>',
        '<h3 class="hw-no-match-title">Profile saved!</h3>',
        '<p class="hw-no-match-text">We\'ve saved your profile. We\'ll reach out when a suitable role opens up.</p>',
        '</div>',
      ].join('');
    }

    var topMatchJobId = state.matches.length > 0 ? state.matches[0].jobId : null;

    var cards = state.matches.map(function (m, idx) {
      var color = scoreColor(m.score);
      var isSelected = state.selectedJob && state.selectedJob.jobId === m.jobId;
      var isAiTop = idx === 0;
      var isPreferred = state.browseSelectedJob && state.browseSelectedJob.id === m.jobId;

      var extraClass = '';
      if (isSelected) extraClass += ' selected';
      if (isAiTop && !isPreferred) extraClass += ' ai-recommended';

      var strengths = (m.strengths || []).slice(0, 3).map(function (s) {
        return '<li class="hw-bullet"><span class="hw-bullet-check">&#10003;</span><span class="hw-bullet-text">' + esc(s) + '</span></li>';
      }).join('');
      var gaps = (m.gaps || []).slice(0, 2).map(function (g) {
        return '<li class="hw-bullet"><span class="hw-bullet-warn">&#9651;</span><span class="hw-bullet-text">' + esc(g) + '</span></li>';
      }).join('');

      var preferredBadge = isPreferred ? '<span style="font-size:11px;font-weight:700;background:#ede9fe;color:#7c3aed;padding:2px 8px;border-radius:20px;margin-left:8px">Your Choice</span>' : '';

      return [
        '<div class="hw-job-card' + extraClass + '" data-jobid="' + esc(m.jobId) + '" data-jobtitle="' + esc(m.jobTitle) + '">',
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">',
        '<div style="flex:1">',
        '<p class="hw-job-title" style="padding-right:0">' + esc(m.jobTitle) + preferredBadge + '</p>',
        m.department ? '<p style="font-size:12px;color:#6b7280;margin:2px 0 0">' + esc(m.department) + '</p>' : '',
        '</div>',
        '<div style="text-align:center;flex-shrink:0">',
        '<div style="font-size:22px;font-weight:800;color:' + color + ';line-height:1">' + m.score + '%</div>',
        '<div style="font-size:10px;color:#6b7280;margin-top:2px">Match</div>',
        '</div>',
        '</div>',
        strengths || gaps ? '<ul class="hw-bullets">' + strengths + gaps + '</ul>' : '',
        '</div>',
      ].join('');
    }).join('');

    var ctaSection = '';
    if (state.selectedJob) {
      ctaSection = [
        '<div class="hw-ctas">',
        '<button class="hw-btn hw-btn-primary" id="hw-schedule-btn">Schedule Interview &rarr;</button>',
        config.instantCallEnabled ? '<button class="hw-btn hw-btn-outline" id="hw-instant-btn">Talk to AI Now</button>' : '',
        '</div>',
      ].join('');
    } else {
      ctaSection = '<p style="font-size:13px;color:#6b7280;margin-top:12px;text-align:center">&#128070; Select a role above to continue</p>';
    }

    return [
      '<h2 class="hw-title">AI Job Matches</h2>',
      '<p class="hw-sub">Select your preferred role to schedule an interview.</p>',
      cards,
      ctaSection,
    ].join('');
  }

  // Step 6 – Schedule
  function buildStep6() {
    var dates = getNext14Dates();

    var firstDay = dates[0].getDay();
    var calHeader = '<div class="hw-cal-header">' + DAY_NAMES.map(function (d) { return '<div class="hw-cal-day-name">' + d + '</div>'; }).join('') + '</div>';

    var empties = '';
    for (var e = 0; e < firstDay; e++) empties += '<div class="hw-cal-day empty"></div>';

    var dayCells = dates.map(function (d) {
      var label = d.getDate();
      var dateStr = d.toISOString().slice(0, 10);
      var isSelected = state.selectedDate === dateStr;
      return '<button class="hw-cal-day' + (isSelected ? ' selected' : '') + '" data-date="' + dateStr + '">' + label + '</button>';
    }).join('');

    var monthLabel = '';
    if (dates.length > 0) {
      monthLabel = '<p style="font-size:13px;font-weight:600;color:#374151;margin-bottom:8px">' + MONTH_NAMES[dates[0].getMonth()] + ' ' + dates[0].getFullYear() + '</p>';
    }

    var timeButtons = TIME_SLOTS.map(function (t) {
      var isSelected = state.selectedTime === t;
      return '<button class="hw-time-btn' + (isSelected ? ' selected' : '') + '" data-time="' + t + '">' + t + '</button>';
    }).join('');

    var jobLabel = state.selectedJob ? state.selectedJob.jobTitle || state.selectedJob.title : '';

    return [
      '<h2 class="hw-title">Pick a time slot</h2>',
      jobLabel ? '<p class="hw-sub">Scheduling interview for <strong>' + esc(jobLabel) + '</strong></p>' : '<p class="hw-sub">Choose your preferred interview date and time.</p>',
      state._error ? '<div class="hw-error">' + esc(state._error) + '</div>' : '',
      monthLabel,
      '<div class="hw-calendar">' + calHeader + empties + dayCells + '</div>',
      '<p style="font-size:13px;font-weight:600;color:#374151;margin-bottom:8px">Available times</p>',
      '<div class="hw-times">' + timeButtons + '</div>',
    ].join('');
  }

  // Step 7 – Success
  function buildStep7() {
    var isImmediate = state._immediate;
    var dateStr = '';
    if (state.selectedDate && state.selectedTime) {
      var d = new Date(state.selectedDate);
      dateStr = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) + ' at ' + state.selectedTime;
    }

    return [
      '<div class="hw-success">',
      '<div class="hw-success-check">&#10003;</div>',
      '<h2 class="hw-success-title">' + (isImmediate ? 'Connecting your call\u2026' : 'Interview Scheduled!') + '</h2>',
      isImmediate
        ? '<p class="hw-success-detail">Your AI interview is being connected. Please answer when you receive a call on <strong>' + esc(state.details.phone) + '</strong>.</p>'
        : [
          dateStr ? '<p class="hw-success-detail"><strong>' + esc(dateStr) + '</strong></p>' : '',
          '<p class="hw-success-detail">We\'ll call you at <strong>' + esc(state.details.phone) + '</strong></p>',
          state._confirmationSent ? '<p class="hw-success-detail" style="color:#10b981">&#10003; Confirmation sent to ' + esc(state.details.email) + '</p>' : '',
        ].join(''),
      '</div>',
    ].join('');
  }

  function buildFooter() {
    if (state.step === 1) {
      return '<div class="hw-nav"><span></span><button class="hw-btn hw-btn-primary" id="hw-next-btn" style="max-width:140px">Next &rarr;</button></div>';
    }
    if (state.step === 2) {
      return '<div class="hw-nav"><button class="hw-btn hw-btn-ghost" id="hw-back-btn">&larr; Back</button><span style="font-size:12px;color:#9ca3af">Select a role or let AI match</span></div>';
    }
    if (state.step === 3) {
      var nextDisabled = state.aiMatchMode && !state.cvFile;
      return '<div class="hw-nav"><button class="hw-btn hw-btn-ghost" id="hw-back-btn">&larr; Back</button><button class="hw-btn hw-btn-primary" id="hw-next-btn" style="max-width:180px"' + (nextDisabled ? ' disabled' : '') + '>' + (state.cvFile ? 'Analyze CV &rarr;' : (state.aiMatchMode ? 'Upload CV first' : 'Continue &rarr;')) + '</button></div>';
    }
    if (state.step === 4) {
      return '<div class="hw-nav"><span style="font-size:12px;color:#9ca3af">This may take 15&ndash;30 seconds&hellip;</span></div>';
    }
    if (state.step === 5) {
      if (!state.matches || state.matches.length === 0) {
        return '<div class="hw-nav"><span></span><button class="hw-btn hw-btn-primary" id="hw-done-btn" style="max-width:140px">Close</button></div>';
      }
      return '<div class="hw-nav"><button class="hw-btn hw-btn-ghost" id="hw-back-btn">&larr; Back</button><span></span></div>';
    }
    if (state.step === 6) {
      return '<div class="hw-nav"><button class="hw-btn hw-btn-ghost" id="hw-back-btn">&larr; Back</button><button class="hw-btn hw-btn-primary" id="hw-confirm-btn" style="max-width:180px"' + (!state.selectedDate || !state.selectedTime ? ' disabled' : '') + '>Confirm Slot &#10003;</button></div>';
    }
    if (state.step === 7) {
      return '<div class="hw-nav"><span></span><button class="hw-btn hw-btn-primary" id="hw-done-btn" style="max-width:140px">Done</button></div>';
    }
    return '';
  }

  // ─── Events ────────────────────────────────────────────────

  function attachEvents() {
    var overlay = document.getElementById('hw-overlay');
    if (overlay) overlay.addEventListener('click', function (e) { if (e.target === overlay) closeWidget(); });

    var closeBtn = document.getElementById('hw-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', closeWidget);

    var nextBtn = document.getElementById('hw-next-btn');
    if (nextBtn) nextBtn.addEventListener('click', handleNext);

    var backBtn = document.getElementById('hw-back-btn');
    if (backBtn) backBtn.addEventListener('click', function () {
      state._error = null;
      if (state.step === 3) {
        state.step = 2;
      } else if (state.step === 5) {
        // back from results: go back to CV upload
        state.step = 3;
        state.matches = [];
        state.selectedJob = null;
      } else if (state.step === 6) {
        state.step = 5;
      } else {
        state.step--;
      }
      renderModal();
    });

    var confirmBtn = document.getElementById('hw-confirm-btn');
    if (confirmBtn) confirmBtn.addEventListener('click', handleConfirmSlot);

    var doneBtn = document.getElementById('hw-done-btn');
    if (doneBtn) doneBtn.addEventListener('click', closeWidget);

    var scheduleBtn = document.getElementById('hw-schedule-btn');
    if (scheduleBtn) scheduleBtn.addEventListener('click', function () {
      // Set selectedJob if not already set (no CV path)
      if (!state.selectedJob && state.browseSelectedJob) {
        state.selectedJob = {
          jobId: state.browseSelectedJob.id,
          jobTitle: state.browseSelectedJob.title,
        };
      }
      state.step = 6;
      renderModal();
    });

    var instantBtn = document.getElementById('hw-instant-btn');
    if (instantBtn) instantBtn.addEventListener('click', function () {
      if (!state.selectedJob && state.browseSelectedJob) {
        state.selectedJob = {
          jobId: state.browseSelectedJob.id,
          jobTitle: state.browseSelectedJob.title,
        };
      }
      handleInstantCall();
    });

    // Step 2: Browse job cards
    var jobCards = document.querySelectorAll('.hw-job-card[data-jobid]');
    jobCards.forEach(function (card) {
      card.addEventListener('click', function () {
        var jobId = card.getAttribute('data-jobid');
        var jobTitle = card.getAttribute('data-jobtitle');
        if (state.browseSelectedJob && state.browseSelectedJob.id === jobId) {
          // Deselect
          state.browseSelectedJob = null;
        } else {
          state.browseSelectedJob = { id: jobId, title: jobTitle };
        }
        state._error = null;
        renderModal();
      });
    });

    // Step 2: Apply for selected job
    var applySelectedBtn = document.getElementById('hw-apply-selected-btn');
    if (applySelectedBtn) applySelectedBtn.addEventListener('click', function () {
      if (!state.browseSelectedJob) return;
      state.aiMatchMode = false;
      state._error = null;
      state.step = 3;
      renderModal();
    });

    // Step 2: Let AI Match Me
    var aiMatchBtn = document.getElementById('hw-ai-match-btn');
    if (aiMatchBtn) aiMatchBtn.addEventListener('click', function () {
      state.aiMatchMode = true;
      state.browseSelectedJob = null;
      state._error = null;
      state.step = 3;
      renderModal();
    });

    // Step 3: Skip CV
    var skipCvBtn = document.getElementById('hw-skip-cv-btn');
    if (skipCvBtn) skipCvBtn.addEventListener('click', function () {
      state.cvFile = null;
      state._error = null;
      // Go straight to step 5 (confirm) with no matches
      state.matches = [];
      state.selectedJob = null;
      state.step = 5;
      renderModal();
    });

    // Step 3: Drop zone
    var dropZone = document.getElementById('hw-drop-zone');
    var fileInput = document.getElementById('hw-file-input');
    if (dropZone && fileInput) {
      dropZone.addEventListener('click', function () { fileInput.click(); });
      dropZone.addEventListener('dragover', function (e) { e.preventDefault(); dropZone.classList.add('dragover'); });
      dropZone.addEventListener('dragleave', function () { dropZone.classList.remove('dragover'); });
      dropZone.addEventListener('drop', function (e) {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        var file = e.dataTransfer.files[0];
        if (file) pickFile(file);
      });
      fileInput.addEventListener('change', function () {
        if (fileInput.files && fileInput.files[0]) pickFile(fileInput.files[0]);
      });
    }

    // Step 5: Result job card selection
    if (state.step === 5 && state.matches && state.matches.length > 0) {
      var resultCards = document.querySelectorAll('.hw-job-card[data-jobid]');
      resultCards.forEach(function (card) {
        card.addEventListener('click', function () {
          var jobId = card.getAttribute('data-jobid');
          var jobTitle = card.getAttribute('data-jobtitle');
          state.selectedJob = { jobId: jobId, jobTitle: jobTitle };
          state._error = null;
          renderModal();
        });
      });
    }

    // Step 6: Date selection
    var calDays = document.querySelectorAll('.hw-cal-day[data-date]');
    calDays.forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.selectedDate = btn.getAttribute('data-date');
        renderModal();
      });
    });

    // Step 6: Time selection
    var timeBtns = document.querySelectorAll('.hw-time-btn[data-time]');
    timeBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.selectedTime = btn.getAttribute('data-time');
        renderModal();
      });
    });
  }

  function pickFile(file) {
    var validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    var validExt = /\.(pdf|doc|docx)$/i.test(file.name);
    if (!validTypes.includes(file.type) && !validExt) {
      state._error = 'Please upload a PDF or DOCX file.';
      renderModal();
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      state._error = 'File must be 5 MB or smaller.';
      renderModal();
      return;
    }
    state.cvFile = file;
    state._error = null;
    renderModal();
  }

  // ─── Navigation ────────────────────────────────────────────

  function handleNext() {
    if (state.step === 1) {
      var fullName = (document.getElementById('hw-fullname') || {}).value || '';
      var phone = (document.getElementById('hw-phone') || {}).value || '';
      var email = (document.getElementById('hw-email') || {}).value || '';
      var gdpr = (document.getElementById('hw-gdpr') || {}).checked || false;

      if (!fullName.trim()) { state._error = 'Please enter your full name.'; renderModal(); return; }
      if (!phone.trim()) { state._error = 'Please enter your phone number.'; renderModal(); return; }
      if (!email.trim() || !email.includes('@')) { state._error = 'Please enter a valid email address.'; renderModal(); return; }
      if (!gdpr) { state._error = 'Please accept the consent checkbox to continue.'; renderModal(); return; }

      state.details = { fullName: fullName.trim(), phone: phone.trim(), email: email.trim(), gdpr: true };
      state._error = null;
      state.step = 2;

      // Load jobs if not yet loaded
      if (!state.jobsLoaded) {
        renderModal();
        loadJobs();
        return;
      }
      renderModal();
      return;
    }

    if (state.step === 3) {
      if (state.aiMatchMode && !state.cvFile) {
        state._error = 'Please upload your CV so AI can find your best match.';
        renderModal();
        return;
      }
      if (state.cvFile) {
        state._error = null;
        state.step = 4;
        renderModal();
        startAnalysis();
      } else {
        // No CV, specific job selected — go to confirm step
        state.matches = [];
        state.selectedJob = null;
        state._error = null;
        state.step = 5;
        renderModal();
      }
    }
  }

  function loadJobs() {
    fetch(BASE_URL + '/api/public/hr/widget/jobs?token=' + encodeURIComponent(TOKEN))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        state.jobs = Array.isArray(data) ? data : [];
        state.jobsLoaded = true;
        renderModal();
      })
      .catch(function () {
        state.jobs = [];
        state.jobsLoaded = true;
        renderModal();
      });
  }

  function startAnalysis() {
    state._statusIdx = 0;
    if (state._statusTimer) clearInterval(state._statusTimer);
    state._statusTimer = setInterval(function () {
      state._statusIdx = (state._statusIdx || 0) + 1;
      var el = document.getElementById('hw-status-msg');
      if (el) {
        var statuses = ['Reading your CV\u2026', 'Identifying your skills\u2026', 'Matching to open roles\u2026', 'Calculating your fit scores\u2026'];
        el.textContent = statuses[state._statusIdx % statuses.length];
      }
    }, 2200);

    var formData = new FormData();
    formData.append('embedToken', TOKEN);
    formData.append('firstName', state.details.fullName.split(' ')[0]);
    formData.append('lastName', state.details.fullName.split(' ').slice(1).join(' ') || '');
    formData.append('email', state.details.email);
    formData.append('phone', state.details.phone);
    formData.append('file', state.cvFile);
    if (state.browseSelectedJob) {
      formData.append('preferredJobId', state.browseSelectedJob.id);
    }

    fetch(BASE_URL + '/api/public/hr/widget/screen', {
      method: 'POST',
      body: formData,
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        clearInterval(state._statusTimer);
        state.candidateId = data.candidateId;
        state.applicationId = data.applicationId;
        state.matches = data.matches || [];
        state.topMatch = data.topMatch || null;

        // If user pre-selected a job, put it first in matches list
        if (state.browseSelectedJob && state.matches.length > 0) {
          var prefIdx = state.matches.findIndex(function (m) { return m.jobId === state.browseSelectedJob.id; });
          if (prefIdx > 0) {
            var pref = state.matches.splice(prefIdx, 1)[0];
            state.matches.unshift(pref);
          }
        }

        state.step = 5;
        renderModal();
      })
      .catch(function () {
        clearInterval(state._statusTimer);
        state._error = 'Something went wrong. Please try again.';
        state.step = 3;
        renderModal();
      });
  }

  function handleConfirmSlot() {
    if (!state.selectedDate || !state.selectedTime) return;

    var confirmBtn = document.getElementById('hw-confirm-btn');
    if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.textContent = 'Confirming\u2026'; }

    var parts = state.selectedDate.split('-');
    var timeStr = state.selectedTime;
    var isPM = timeStr.indexOf('PM') !== -1;
    var timeNums = timeStr.replace(/ AM| PM/g, '').split(':');
    var hours = parseInt(timeNums[0]);
    var minutes = parseInt(timeNums[1]);
    if (isPM && hours !== 12) hours += 12;
    if (!isPM && hours === 12) hours = 0;
    var scheduledAt = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), hours, minutes).toISOString();

    var jobId = state.selectedJob ? state.selectedJob.jobId : (state.browseSelectedJob ? state.browseSelectedJob.id : null);

    fetch(BASE_URL + '/api/public/hr/widget/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidateId: state.candidateId,
        jobId: jobId,
        applicationId: state.applicationId,
        scheduledAt: scheduledAt,
        phone: state.details.phone,
        email: state.details.email,
        firstName: state.details.fullName.split(' ')[0],
        immediate: false,
        companyName: config.companyName,
      }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        state._confirmationSent = data.confirmationSent || false;
        state.sessionId = data.sessionId;
        state._immediate = false;
        trackWidgetEvent('application');
        state.step = 7;
        renderModal();
      })
      .catch(function () {
        state._error = 'Failed to schedule. Please try again.';
        renderModal();
      });
  }

  function handleInstantCall() {
    var jobId = state.selectedJob ? state.selectedJob.jobId : (state.browseSelectedJob ? state.browseSelectedJob.id : null);

    fetch(BASE_URL + '/api/public/hr/widget/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidateId: state.candidateId,
        jobId: jobId,
        applicationId: state.applicationId,
        scheduledAt: new Date().toISOString(),
        phone: state.details.phone,
        email: state.details.email,
        firstName: state.details.fullName.split(' ')[0],
        immediate: true,
        companyName: config.companyName,
      }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        state._confirmationSent = data.confirmationSent || false;
        state.sessionId = data.sessionId;
        state._immediate = true;
        trackWidgetEvent('application');
        state.step = 7;
        renderModal();
      })
      .catch(function () {
        state._error = 'Failed to connect. Please try again.';
        renderModal();
      });
  }

  // ─── Open / Close ──────────────────────────────────────────

  function trackWidgetEvent(event) {
    if (!TOKEN) return;
    fetch(BASE_URL + '/api/public/hr/widget/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: TOKEN, event: event })
    }).catch(function () {});
  }

  function openWidget() {
    trackWidgetEvent('view');
    if (state.isOpen) return;
    state.isOpen = true;

    var root = document.createElement('div');
    root.id = 'hw-modal-root';
    document.body.appendChild(root);

    renderModal();

    // Pre-load jobs in background
    if (!state.jobsLoaded) {
      fetch(BASE_URL + '/api/public/hr/widget/jobs?token=' + encodeURIComponent(TOKEN))
        .then(function (r) { return r.json(); })
        .then(function (data) {
          state.jobs = Array.isArray(data) ? data : [];
          state.jobsLoaded = true;
          // Re-render only if currently on step 2
          if (state.step === 2) renderModal();
        })
        .catch(function () {
          state.jobs = [];
          state.jobsLoaded = true;
        });
    }
  }

  function closeWidget() {
    state.isOpen = false;
    if (state._statusTimer) clearInterval(state._statusTimer);
    // Reset state for next open
    state.step = 1;
    state.details = { fullName: '', phone: '', email: '', gdpr: false };
    state.cvFile = null;
    state.matches = [];
    state.topMatch = null;
    state.candidateId = null;
    state.applicationId = null;
    state.selectedJob = null;
    state.browseSelectedJob = null;
    state.aiMatchMode = false;
    state.selectedDate = null;
    state.selectedTime = null;
    state.sessionId = null;
    state._error = null;
    state._immediate = false;
    state._confirmationSent = false;

    var root = document.getElementById('hw-modal-root');
    if (root) root.remove();
  }

  // ─── Init ─────────────────────────────────────────────────

  function init() {
    if (!TOKEN) {
      console.warn('[HiringWidget] No embed token found.');
      return;
    }

    fetch(BASE_URL + '/api/public/hr/widget/config?token=' + encodeURIComponent(TOKEN))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        config.companyName = data.companyName || 'Careers';
        config.primaryColor = data.primaryColor || '#4f46e5';
        config.welcomeText = data.welcomeText || 'Find your next opportunity';
        config.launcherText = data.launcherText || data.welcomeText || 'Apply Now';
        config.launcherPosition = data.launcherPosition || 'bottom-right';
        config.allowSkipCV = data.allowSkipCV !== false;
        config.launcherIcon = data.launcherIcon || 'briefcase';
        config.logoUrl = data.logoUrl || null;
        config.instantCallEnabled = data.instantCallEnabled || false;

        injectCSS();

        if (MODE === 'inline') {
          var container = document.querySelector('[data-hiring-widget]');
          if (container) {
            var btn = document.createElement('button');
            btn.className = 'hw-launch-btn';
            btn.style.position = 'relative';
            btn.style.bottom = 'auto';
            btn.style.right = 'auto';
            btn.style.boxSizing = 'border-box';
            btn.textContent = config.welcomeText;
            btn.addEventListener('click', openWidget);
            container.appendChild(btn);
          }
        } else {
          var launchBtn = document.createElement('button');
          launchBtn.className = 'hw-launch-btn';
          launchBtn.id = 'hw-launch';
          var iconHtml = getLauncherIconHtml(config.launcherIcon);
          launchBtn.innerHTML = (iconHtml ? iconHtml + ' ' : '') + esc(config.launcherText || config.welcomeText);
          launchBtn.addEventListener('click', openWidget);
          var pos = config.launcherPosition || 'bottom-right';
          if (pos === 'bottom-left') { launchBtn.style.bottom = '24px'; launchBtn.style.right = 'auto'; launchBtn.style.left = '24px'; }
          else if (pos === 'top-right') { launchBtn.style.bottom = 'auto'; launchBtn.style.top = '24px'; launchBtn.style.right = '24px'; }
          else if (pos === 'top-left') { launchBtn.style.bottom = 'auto'; launchBtn.style.top = '24px'; launchBtn.style.right = 'auto'; launchBtn.style.left = '24px'; }
          document.body.appendChild(launchBtn);
        }
      })
      .catch(function () {
        console.warn('[HiringWidget] Failed to load config.');
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
