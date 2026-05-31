const MORSE = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.',
  G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..',
  M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.',
  S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-',
  Y: '-.--', Z: '--..'
};

const DEFAULTS = { fullName: 'Jan Kowalski', albumNumber: '60000', initials: 'JK' };

function getQueryParam(name) {
  return new URL(window.location.href).searchParams.get(name);
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, function(c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function highlightC(code) {
  var html = code;
  html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  html = html.replace(/(\/\*[\s\S]*?\*\/|\/\/[^\n]*)/g, '<span class="c-cmt">$1</span>');
  html = html.replace(/'((?:[^'\\]|\\.)*)'/g, '<span class="c-str">$&</span>');
  html = html.replace(/#\s*(include|define|undef|ifdef|ifndef|if|else|elif|endif|pragma|error|line)\b/g, '<span class="c-pp">$&</span>');
  html = html.replace(/\b(static|extern|const|volatile|struct|enum|union|typedef|sizeof|return|if|else|for|while|do|switch|case|break|continue|goto|default|void|char|int|long|short|float|double|signed|unsigned|auto|register|bool|true|false|NULL|__init|__exit|__maybe_unused|__user|__iomem)\b/g, '<span class="c-kw">$&</span>');
  html = html.replace(/\b(u8|u16|u32|u64|s8|s16|s32|s64|size_t|ssize_t|loff_t|sector_t|dev_t|irqreturn_t|blk_status_t)\b/g, '<span class="c-type">$&</span>');
  html = html.replace(/\b([A-Z_][A-Z0-9_]{2,})\b/g, '<span class="c-type">$1</span>');
  html = html.replace(/\b([a-zA-Z_]\w*)\s*\(/g, '<span class="c-func">$1</span>(');
  html = html.replace(/\b(\d+\.?\d*(?:[eE][+-]?\d+)?)\b/g, '<span class="c-num">$1</span>');
  return html;
}

function createCodeBlock(code, filename, containerId) {
  var id = containerId || 'code-' + Math.random().toString(36).slice(2, 8);
  var wrapper = document.createElement('div');
  wrapper.className = 'code-wrap accordion open';
  wrapper.id = id;
  wrapper.innerHTML =
    '<div class="acc-hdr code-top" onclick="toggleAccordion(\'' + id + '\')">' +
    '<span class="code-name">' + escapeHtml(filename) + '</span>' +
    '<span class="code-acts" onclick="event.stopPropagation()">' +
    '<button class="code-btn" onclick="copyCode(\'' + id + '\')">Kopiuj</button>' +
    '<button class="code-btn btn-dl" onclick="downloadCode(\'' + id + '\', \'' + escapeHtml(filename).replace(/'/g, "\\'") + '\')">Pobierz</button>' +
    '</span></div>' +
    '<div class="acc-body"><div class="code-inner"><pre>' + highlightC(code) + '</pre></div></div>';
  wrapper._rawCode = code;
  var body = wrapper.querySelector('.acc-body');
  if (body) body.style.maxHeight = 'none';
  return wrapper;
}

function toggleAccordion(id) {
  var el = document.getElementById(id);
  if (!el) return;
  var body = el.querySelector('.acc-body');
  if (el.classList.contains('open')) {
    body.style.maxHeight = body.scrollHeight + 'px';
    body.offsetHeight;
    body.style.maxHeight = '0px';
    el.classList.remove('open');
  } else {
    body.style.maxHeight = body.scrollHeight + 'px';
    body.addEventListener('transitionend', function handler() {
      body.style.maxHeight = 'none';
      body.removeEventListener('transitionend', handler);
    });
    el.classList.add('open');
  }
}

function copyCode(blockId) {
  var block = document.getElementById(blockId);
  if (!block || !block._rawCode) return;
  navigator.clipboard.writeText(block._rawCode).then(function() {
    var btn = block.querySelector('.code-btn');
    if (btn) { var orig = btn.textContent; btn.textContent = 'Skopiowano!'; setTimeout(function() { btn.textContent = orig; }, 1500); }
  }).catch(function() {});
}

function downloadCode(blockId, filename) {
  var block = document.getElementById(blockId);
  if (!block || !block._rawCode) return;
  var blob = new Blob([block._rawCode], { type: 'text/x-c' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = filename || 'code.c'; a.click();
  URL.revokeObjectURL(url);
}

function morseLoop(initials, useSafe) {
  var letters = initials.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);
  if (letters.length < 2) letters = letters[0] + 'A';
  var fn = useSafe ? 'safe_usleep' : 'usleep';
  var cond = useSafe ? 'while (keep_running) {' : 'while(1) {';
  var lines = ['\t' + cond];
  for (var li = 0; li < 2; li++) {
    var ch = letters[li], pattern = MORSE[ch] || '..';
    var symbols = pattern.split('');
    for (var si = 0; si < symbols.length; si++) {
      var dur = symbols[si] === '.' ? '500000' : '1500000';
      var comment = (li === 0 && si === 0) ? '  // ' + letters[0] + ': ' + pattern : (li === 1 && si === 0) ? '  // ' + letters[1] + ': ' + pattern : '';
      lines.push('\t\tfprintf(brightness, "1\\n"); fflush(brightness); ' + fn + '(' + dur + ');' + comment);
      lines.push('\t\tfprintf(brightness, "0\\n"); fflush(brightness); ' + fn + '(500000);');
    }
    if (li === 0) lines.push('\t\t' + fn + '(1000000);');
  }
  lines.push('\t\t' + fn + '(3000000);\n\t}');
  return lines.join('\n');
}

function applyMorse(code, initials, type) {
  var regex = type === 'short' ? /while\s*\(\s*1\s*\)\s*\{[\s\S]*?\n\t\}/ : /while\s*\(\s*keep_running\s*\)\s*\{[\s\S]*?\n\t\}/;
  return code.replace(regex, morseLoop(initials, type !== 'short'));
}

function applySubs(code, subs, fields) {
  if (!subs) return code;
  subs.forEach(function(s) {
    var val = '';
    if (s.to === 'fullName' && fields.fullName) val = fields.fullName;
    else if (s.to === 'albumNumber' && fields.albumNumber) val = fields.albumNumber;
    else if (s.to === 'initial1' && fields.initials && fields.initials.length >= 1) val = "'" + fields.initials[0] + "'";
    else if (s.to === 'initial2' && fields.initials && fields.initials.length >= 2) val = "'" + fields.initials[1] + "'";
    if (val) code = code.split(s.from).join(val);
  });
  return code;
}

function getFormValues(formId) {
  var form = document.getElementById(formId);
  if (!form) return { fullName: DEFAULTS.fullName, albumNumber: DEFAULTS.albumNumber, initials: DEFAULTS.initials };
  var nameInput = form.querySelector('[name="fullName"]');
  var albumInput = form.querySelector('[name="albumNumber"]');
  var initialsInput = form.querySelector('[name="initials"]');
  return {
    fullName: nameInput ? (nameInput.value.trim() || DEFAULTS.fullName) : DEFAULTS.fullName,
    albumNumber: albumInput ? (albumInput.value.trim() || DEFAULTS.albumNumber) : DEFAULTS.albumNumber,
    initials: initialsInput ? (initialsInput.value.trim().toUpperCase() || DEFAULTS.initials) : DEFAULTS.initials
  };
}

function validateFields(formId, needs) {
  if (!needs) return [];
  var missing = [];
  var form = document.getElementById(formId);
  if (needs.fullName) {
    var v = form ? form.querySelector('[name="fullName"]').value.trim() : '';
    if (!v) missing.push('imię i nazwisko');
  }
  if (needs.albumNumber) {
    var v = form ? form.querySelector('[name="albumNumber"]').value.trim() : '';
    if (!v) missing.push('numer albumu');
  }
  if (needs.initials) {
    var v = form ? form.querySelector('[name="initials"]').value.trim() : '';
    if (!v || v.length < 2) missing.push('inicjały (2 litery)');
  }
  return missing;
}

function renderIndex() {
  var container = document.getElementById('task-list');
  if (!container) return;
  var html = '';
  TASKS.forEach(function(task) {
    html += '<a class="task-card" href="zadanie.html?task=' + task.id + '">' +
              '<div class="num">Zadanie ' + task.id + '</div>' +
              '<div class="title">' + escapeHtml(task.title) + '</div>' +
            '</a>';
  });
  container.innerHTML = html;
}

function renderTask() {
  var taskId = parseInt(getQueryParam('task'), 10);
  var task = TASKS.find(function(t) { return t.id === taskId; });
  var container = document.getElementById('task-page');
  if (!container) return;
  if (!task) {
    container.innerHTML = '<div class="container"><p>Nie znaleziono zadania.</p><a class="back" href="index.html">Powrót</a></div>';
    return;
  }

  document.title = 'Zadanie ' + task.id + ' – ' + task.title + ' – SuchyHub';
  var html = '<div class="container">';
  html += '<a class="back" href="index.html">Powrót</a>';
  html += '<div class="task-header"><div class="lbl">Zadanie ' + task.id + '</div><h1>' + escapeHtml(task.title) + '</h1><p class="desc">' + escapeHtml(task.desc) + '</p></div>';
  html += '<a class="pdf-link" href="' + task.pdf + '" target="_blank"><svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>Instrukcja PDF</a>';

  if (task.uruchomienie) {
    html += '<div class="accordion" id="acc-uruch"><button class="acc-hdr" onclick="toggleAccordion(\'acc-uruch\')">Instrukcja uruchomienia</button><div class="acc-body"><div class="acc-inner" id="uruch-content">Ładowanie...</div></div></div>';
  }

  var fieldsId = 'fields-' + task.id;
  var hasFields = task.needsFields && (task.needsFields.fullName || task.needsFields.albumNumber || task.needsFields.initials);

  if (hasFields) {
    html += '<div class="form-box" id="' + fieldsId + '"><h3>Wprowadź dane</h3><div class="form-row">';
    if (task.needsFields.fullName) html += '<div class="form-g"><label for="fn-' + task.id + '">Imię i nazwisko</label><input type="text" name="fullName" id="fn-' + task.id + '" placeholder="Jan Kowalski"></div>';
    if (task.needsFields.albumNumber) html += '<div class="form-g"><label for="an-' + task.id + '">Numer albumu</label><input type="text" name="albumNumber" id="an-' + task.id + '" placeholder="60000" maxlength="6"></div>';
    if (task.needsFields.initials) html += '<div class="form-g"><label for="in-' + task.id + '">Inicjały (2 litery)</label><input type="text" name="initials" id="in-' + task.id + '" placeholder="JK" maxlength="2"></div>';
    html += '</div></div>';
  }

  if (task.files && task.files.length > 0) {
    if (hasFields) {
      html += '<div class="multi-btns" id="gen-btns-' + task.id + '">';
      task.files.forEach(function(file, idx) {
        html += '<button class="btn btn-p" onclick="generateFile(' + task.id + ', ' + idx + ', \'' + fieldsId + '\')">Generuj ' + escapeHtml(file.name) + '</button>';
      });
      html += '</div>';
    }
    html += '<div id="code-area-' + task.id + '"></div>';
  }

  if (task.downloads && task.downloads.length > 0) {
    html += '<div class="dl-section"><h3>Archiwa do pobrania</h3>';
    task.downloads.forEach(function(dl) {
      html += '<div class="dl-item"><span class="dl-name">' + escapeHtml(dl.name) + '</span><a class="dl-btn" href="' + dl.path + '" download>Pobierz</a></div>';
    });
    html += '</div>';
  }

  html += '</div>';
  container.innerHTML = html;

  if (!hasFields && task.files && task.files.length > 0) {
    generateAllFiles(task, {}, 'code-area-' + task.id);
  }

  if (task.uruchomienie) {
    fetch(task.uruchomienie, { cache: 'no-cache' })
      .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then(function(text) { var el = document.getElementById('uruch-content'); if (el) el.textContent = text; })
      .catch(function() { var el = document.getElementById('uruch-content'); if (el) el.textContent = 'Nie mozna wczytac pliku ' + task.uruchomienie; });
  }
}

function generateAllFiles(task, fields, areaId) {
  var area = document.getElementById(areaId);
  if (!area) return;
  area.innerHTML = '';
  task.files.forEach(function(file, idx) {
    fetch(file.path, { cache: 'no-cache' })
      .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then(function(code) {
        if (file.morse) code = applyMorse(code, fields.initials || DEFAULTS.initials, file.morse);
        if (file.subs) code = applySubs(code, file.subs, fields);
        var cid = 'code-block-' + task.id + '-' + idx;
        area.appendChild(createCodeBlock(code, file.name, cid));
      })
      .catch(function() {
        var cid = 'code-block-' + task.id + '-' + idx;
        area.appendChild(createCodeBlock('/* Nie mozna wczytac pliku ' + file.path + ' */', file.name, cid));
      });
  });
}

function generateFile(taskId, fileIdx, fieldsId) {
  var task = TASKS.find(function(t) { return t.id === taskId; });
  if (!task) return;
  var file = task.files[fileIdx];
  if (!file) return;

  if (task.needsFields) {
    var missing = validateFields(fieldsId, task.needsFields);
    if (missing.length > 0) { alert('Uzupełnij pole: ' + missing.join(', ')); return; }
  }

  var fields = getFormValues(fieldsId);
  var area = document.getElementById('code-area-' + taskId);
  if (!area) return;

  fetch(file.path, { cache: 'no-cache' })
    .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
    .then(function(code) {
      if (file.morse) code = applyMorse(code, fields.initials, file.morse);
      if (file.subs) code = applySubs(code, file.subs, fields);
      var cid = 'code-block-' + taskId + '-' + fileIdx;
      var existing = document.getElementById(cid);
      if (existing) existing.remove();
      var block = createCodeBlock(code, file.name, cid);
      area.appendChild(block);
      block.scrollIntoView({ behavior: 'smooth', block: 'start' });
    })
    .catch(function() { alert('Nie mozna wczytac pliku ' + file.path); });
}
