const MORSE = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.',
  G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..',
  M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.',
  S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-',
  Y: '-.--', Z: '--..'
};

const DEFAULTS = { fullName: 'Jan Kowalski', albumNumber: '60000', initials: 'JK' };

function getQueryParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

function escapeHtml(str) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return str.replace(/[&<>"']/g, c => map[c]);
}

function highlightC(code) {
  var html = code;

  html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  html = html.replace(/(\/\*[\s\S]*?\*\/|\/\/[^\n]*)/g, '<span class="c-cmt">$1</span>');

  html = html.replace(/'((?:[^'\\]|\\.)*)'/g, '<span class="c-str">$&</span>');

  html = html.replace(/#\s*(include|define|undef|ifdef|ifndef|if|else|elif|endif|pragma|error|line)\b/g,
    '<span class="c-pp">$&</span>');

  html = html.replace(/\b(static|extern|const|volatile|struct|enum|union|typedef|sizeof|return|if|else|for|while|do|switch|case|break|continue|goto|default|void|char|int|long|short|float|double|signed|unsigned|auto|register|bool|true|false|NULL|__init|__exit|__maybe_unused|__user|__iomem)\b/g,
    '<span class="c-kw">$&</span>');

  html = html.replace(/\b(u8|u16|u32|u64|s8|s16|s32|s64|size_t|ssize_t|loff_t|sector_t|dev_t|irqreturn_t|blk_status_t)\b/g,
    '<span class="c-type">$&</span>');

  html = html.replace(/\b([A-Z_][A-Z0-9_]{2,})\b/g, '<span class="c-type">$1</span>');

  html = html.replace(/\b([a-zA-Z_]\w*)\s*\(/g, '<span class="c-func">$1</span>(');

  html = html.replace(/\b(\d+\.?\d*(?:[eE][+-]?\d+)?)\b/g, '<span class="c-num">$1</span>');

  return html;
}

function createCodeBlock(code, filename, containerId) {
  const id = containerId || 'code-' + Math.random().toString(36).slice(2, 8);
  const wrapper = document.createElement('div');
  wrapper.className = 'code-wrap accordion open';
  wrapper.id = id;
  wrapper.innerHTML =
    '<button class="acc-hdr code-top" onclick="toggleAccordion(\'' + id + '\')">' +
    '<span class="code-name">' + escapeHtml(filename) + '</span>' +
    '<span class="code-acts" onclick="event.stopPropagation()">' +
    '<button class="code-btn" onclick="copyCode(\'' + id + '\')">Kopiuj</button>' +
    '<button class="code-btn" onclick="downloadCode(\'' + id + '\', \'' + escapeHtml(filename).replace(/'/g, "\\'") + '\')">Pobierz</button>' +
    '</span></button>' +
    '<div class="acc-body"><div class="code-inner"><pre>' + highlightC(code) + '</pre></div></div>';
  wrapper._rawCode = code;
  return wrapper;
}

function toggleAccordion(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.toggle('open');
}

function copyCode(blockId) {
  const block = document.getElementById(blockId);
  if (!block || !block._rawCode) return;
  navigator.clipboard.writeText(block._rawCode).then(() => {
    const btn = block.querySelector('.code-btn');
    if (btn) { const orig = btn.textContent; btn.textContent = 'Skopiowano!'; setTimeout(() => btn.textContent = orig, 1500); }
  }).catch(() => {});
}

function downloadCode(blockId, filename) {
  const block = document.getElementById(blockId);
  if (!block || !block._rawCode) return;
  const blob = new Blob([block._rawCode], { type: 'text/x-c' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename || 'code.c'; a.click();
  URL.revokeObjectURL(url);
}

function generateMorseBody(initials) {
  const letters = initials.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);
  if (letters.length < 2) letters.push('A');
  
  const lines = [];
  lines.push('\twhile (keep_running) {');
  
  for (let li = 0; li < 2; li++) {
    const ch = letters[li];
    const pattern = MORSE[ch] || '..';
    const symbols = pattern.split('');
    
    for (let si = 0; si < symbols.length; si++) {
      const dur = symbols[si] === '.' ? '500000' : '1500000';
      const comment = (li === 0 && si === 0) ? '  // ' + letters[0] + ': ' + pattern :
                      (li === 1 && si === 0) ? '  // ' + letters[1] + ': ' + pattern : '';
      lines.push('\t\tfprintf(brightness, "1\\n"); fflush(brightness); safe_usleep(' + dur + ');' + comment);
      lines.push('\t\tfprintf(brightness, "0\\n"); fflush(brightness); safe_usleep(500000);');
    }

    if (li === 0) {
      lines.push('\t\tsafe_usleep(1000000);');
    }
  }

  lines.push('\t\tsafe_usleep(3000000);');
  lines.push('\t}');

  return lines.join('\n');
}

function generateMorseBodyShort(initials) {
  const letters = initials.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);
  if (letters.length < 2) letters.push('A');
  
  const lines = [];
  lines.push('\twhile(1) {');
  
  for (let li = 0; li < 2; li++) {
    const ch = letters[li];
    const pattern = MORSE[ch] || '..';
    const symbols = pattern.split('');
    
    for (let si = 0; si < symbols.length; si++) {
      const dur = symbols[si] === '.' ? '500000' : '1500000';
      const comment = (li === 0 && si === 0) ? '  // ' + letters[0] + ': ' + pattern :
                      (li === 1 && si === 0) ? '  // ' + letters[1] + ': ' + pattern : '';
      lines.push('\t\tfprintf(brightness, "1\\n"); fflush(brightness); usleep(' + dur + ');' + comment);
      lines.push('\t\tfprintf(brightness, "0\\n"); fflush(brightness); usleep(500000);');
    }
    
    if (li === 0) {
      lines.push('\t\tusleep(1000000);');
    }
  }
  
  lines.push('\t\tusleep(3000000);');
  lines.push('\t}');
  
  return lines.join('\n');
}

function substituteCode(template, fields) {
  let code = template;
  if (fields.fullName) code = code.replace(/__NAME__/g, fields.fullName);
  if (fields.albumNumber) code = code.replace(/__ALBUM__/g, fields.albumNumber);
  if (fields.initials && fields.initials.length >= 2) {
    code = code.replace(/__INITIAL1__/g, fields.initials[0].toUpperCase());
    code = code.replace(/__INITIAL2__/g, fields.initials[1].toUpperCase());
  }
  if (fields.initials && fields.initials.length >= 2) {
    code = code.replace(/__MORSE_LOOP_FULL__/g, generateMorseBody(fields.initials));
    code = code.replace(/__MORSE_LOOP_SHORT__/g, generateMorseBodyShort(fields.initials));
  } else {
    code = code.replace(/__MORSE_LOOP_FULL__/g, generateMorseBody(DEFAULTS.initials));
    code = code.replace(/__MORSE_LOOP_SHORT__/g, generateMorseBodyShort(DEFAULTS.initials));
  }
  return code;
}

function getFormValues(formId) {
  const form = document.getElementById(formId);
  if (!form) return { fullName: DEFAULTS.fullName, albumNumber: DEFAULTS.albumNumber, initials: DEFAULTS.initials };
  const nameInput = form.querySelector('[name="fullName"]');
  const albumInput = form.querySelector('[name="albumNumber"]');
  const initialsInput = form.querySelector('[name="initials"]');
  return {
    fullName: nameInput ? (nameInput.value.trim() || DEFAULTS.fullName) : DEFAULTS.fullName,
    albumNumber: albumInput ? (albumInput.value.trim() || DEFAULTS.albumNumber) : DEFAULTS.albumNumber,
    initials: initialsInput ? (initialsInput.value.trim().toUpperCase() || DEFAULTS.initials) : DEFAULTS.initials
  };
}

function renderIndex() {
  const container = document.getElementById('task-list');
  if (!container) return;
  let html = '';
  TASKS.forEach(task => {
    html += '<a class="task-card" href="zadanie.html?task=' + task.id + '">' +
              '<div class="num">Zadanie ' + task.id + '</div>' +
              '<div class="title">' + escapeHtml(task.title) + '</div>' +
            '</a>';
  });
  container.innerHTML = html;
}

function renderTask() {
  const taskId = parseInt(getQueryParam('task'), 10);
  const task = TASKS.find(t => t.id === taskId);
  const container = document.getElementById('task-page');
  if (!container) return;
  if (!task) {
    container.innerHTML = '<div class="container"><p>Zadanie nie znalezione.</p><a class="back-link back" href="index.html">Powrot</a></div>';
    return;
  }

  document.title = 'Zadanie ' + task.id + ' – ' + task.title + ' – SuchyHub';

  let html = '<div class="container">';

  // back link
  html += '<a class="back" href="index.html">Powrot</a>';

  // header
  html += '<div class="task-header">' +
            '<div class="lbl">Zadanie ' + task.id + '</div>' +
            '<h1>' + escapeHtml(task.title) + '</h1>' +
            '<p class="desc">' + escapeHtml(task.desc) + '</p>' +
          '</div>';

  // pdf link
  html += '<a class="pdf-link" href="' + task.pdf + '" target="_blank">Instrukcja PDF</a>';

  // uruchomienie accordion – loads from file
  if (task.uruchomienie) {
    html += '<div class="accordion" id="acc-uruch">' +
              '<button class="acc-hdr" onclick="toggleAccordion(\'acc-uruch\')">Instrukcja uruchomienia</button>' +
              '<div class="acc-body"><div class="acc-inner" id="uruch-content">Ladowanie...</div></div>' +
            '</div>';
  }

  const fieldsId = 'fields-' + task.id;

  // form fields if needed
  if (task.needsFields && (task.needsFields.fullName || task.needsFields.albumNumber || task.needsFields.initials)) {
    html += '<div class="form-box" id="' + fieldsId + '">' +
              '<h3>Wprowadz dane</h3>' +
              '<div class="form-row">';
    if (task.needsFields.fullName) {
      html += '<div class="form-g"><label for="fn-' + task.id + '">Imie i nazwisko</label>' +
              '<input type="text" name="fullName" id="fn-' + task.id + '" placeholder="Jan Kowalski"></div>';
    }
    if (task.needsFields.albumNumber) {
      html += '<div class="form-g"><label for="an-' + task.id + '">Numer albumu</label>' +
              '<input type="text" name="albumNumber" id="an-' + task.id + '" placeholder="60000" maxlength="6"></div>';
    }
    if (task.needsFields.initials) {
      html += '<div class="form-g"><label for="in-' + task.id + '">Inicjaly (2 litery)</label>' +
              '<input type="text" name="initials" id="in-' + task.id + '" placeholder="JK" maxlength="2"></div>';
    }
    html += '</div></div>';
  }

  // generate buttons or auto-generate code
  var hasFields = task.needsFields && (task.needsFields.fullName || task.needsFields.albumNumber || task.needsFields.initials);
  if (task.files && task.files.length > 0) {
    if (hasFields) {
      html += '<div class="multi-btns" id="gen-btns-' + task.id + '">';
      task.files.forEach((file, idx) => {
        const btnId = 'gen-' + task.id + '-' + idx;
        html += '<button class="btn btn-p" id="' + btnId + '" onclick="generateFile(' + task.id + ', ' + idx + ', \'' + fieldsId + '\')">Generuj ' + escapeHtml(file.name) + '</button>';
      });
      html += '</div>';
    }
    html += '<div id="code-area-' + task.id + '"></div>';
  }

  // downloads section
  if (task.downloads && task.downloads.length > 0) {
    html += '<div class="dl-section"><h3>Archiwa do pobrania</h3>';
    task.downloads.forEach(dl => {
      html += '<div class="dl-item">' +
                '<span class="dl-name">' + escapeHtml(dl.name) + '</span>' +
                '<a class="dl-btn" href="' + dl.path + '" download>Pobierz</a>' +
              '</div>';
    });
    html += '</div>';
  }

  // back button
  html += '<a class="btn btn-o btn-back" href="index.html">Powrot do listy zadan</a>';

  html += '</div>';
  container.innerHTML = html;

  // auto-generate code for tasks without fields
  if (!hasFields && task.files && task.files.length > 0) {
    generateAllFiles(task, {}, 'code-area-' + task.id);
  }

  // load uruchomienie.txt from file
  if (task.uruchomienie) {
    fetch(task.uruchomienie)
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then(text => { const el = document.getElementById('uruch-content'); if (el) el.textContent = text; })
      .catch(() => { const el = document.getElementById('uruch-content'); if (el) el.textContent = 'Nie mozna wczytac pliku ' + task.uruchomienie; });
  }
}

function generateAllFiles(task, fields, areaId) {
  const area = document.getElementById(areaId);
  if (!area) return;
  area.innerHTML = '';
  task.files.forEach((file, idx) => {
    const code = substituteCode(file.template, fields);
    const containerId = 'code-block-' + task.id + '-' + idx;
    const block = createCodeBlock(code, file.name, containerId);
    area.appendChild(block);
  });
}

function validateFields(formId, needs) {
  var missing = [];
  var form = document.getElementById(formId);
  if (needs.fullName) {
    var v = form ? form.querySelector('[name="fullName"]').value.trim() : '';
    if (!v) missing.push('imie i nazwisko');
  }
  if (needs.albumNumber) {
    var v = form ? form.querySelector('[name="albumNumber"]').value.trim() : '';
    if (!v) missing.push('numer albumu');
  }
  if (needs.initials) {
    var v = form ? form.querySelector('[name="initials"]').value.trim() : '';
    if (!v || v.length < 2) missing.push('inicjaly (2 litery)');
  }
  return missing;
}

function generateFile(taskId, fileIdx, fieldsId) {
  var task = TASKS.find(function(t) { return t.id === taskId; });
  if (!task) return;
  var file = task.files[fileIdx];
  if (!file) return;

  if (task.needsFields) {
    var missing = validateFields(fieldsId, task.needsFields);
    if (missing.length > 0) {
      alert('Uzupelnij pole: ' + missing.join(', '));
      return;
    }
  }

  var fields = getFormValues(fieldsId);
  var code = substituteCode(file.template, fields);
  const area = document.getElementById('code-area-' + taskId);
  if (!area) return;
  // remove existing block for this file
  const existingId = 'code-block-' + taskId + '-' + fileIdx;
  const existing = document.getElementById(existingId);
  if (existing) existing.remove();
  const block = createCodeBlock(code, file.name, existingId);
  area.appendChild(block);
  // scroll to it
  block.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
