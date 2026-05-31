/* ============================================================
   SuchyHub – shared JavaScript utilities
   ============================================================ */

const SuchyHub = (function () {

    // ---- clipboard ----

    function copyToClipboard(text, btnElement) {
        if (!navigator.clipboard) {
            fallbackCopy(text);
            return;
        }
        navigator.clipboard.writeText(text).then(function () {
            showToast('Skopiowano!');
        }).catch(function () {
            fallbackCopy(text);
        });
    }

    function fallbackCopy(text) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); showToast('Skopiowano!'); } catch (e) { /* ignore */ }
        document.body.removeChild(ta);
    }

    // ---- toast ----

    function showToast(message) {
        var container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        var msg = document.createElement('div');
        msg.className = 'toast-msg';
        msg.textContent = message;
        container.appendChild(msg);
        setTimeout(function () {
            if (msg.parentNode) msg.parentNode.removeChild(msg);
        }, 2200);
    }

    // ---- download ----

    function downloadFile(text, filename) {
        var blob = new Blob([text], { type: 'text/plain' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // ---- escape -----

    function escapeCString(text) {
        return text
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t');
    }

    // ---- accordion lazy-load ----

    function initAccordion(collapseId, bodyId, fetchUrl) {
        var collapseEl = document.getElementById(collapseId);
        var bodyEl = document.getElementById(bodyId);
        if (!collapseEl || !bodyEl) return;
        var loaded = false;

        collapseEl.addEventListener('show.bs.collapse', function () {
            if (loaded) return;
            loaded = true;
            fetch(fetchUrl)
                .then(function (r) {
                    if (!r.ok) throw new Error('Błąd ' + r.status);
                    return r.text();
                })
                .then(function (text) {
                    bodyEl.textContent = text;
                })
                .catch(function (err) {
                    bodyEl.textContent = 'Nie udało się wczytać instrukcji: ' + err.message;
                });
        });
    }

    // ---- fetch + display ----

    function fetchAndDisplay(url, elementOrId) {
        var el = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
        if (!el) return;
        el.textContent = 'Wczytywanie pliku ' + url + '...';
        fetch(url, { cache: 'no-store' })
            .then(function (r) {
                if (!r.ok) throw new Error('Nie udało się pobrać ' + url);
                return r.text();
            })
            .then(function (text) {
                el.textContent = text;
                showWrapper(el);
            })
            .catch(function (err) {
                el.textContent = 'Błąd wczytywania kodu: ' + err.message;
            });
    }

    // ---- code block rendering ----

    function showWrapper(preElement) {
        var wrapper = preElement.closest('.code-block-wrapper');
        if (wrapper) wrapper.classList.add('visible');
    }

    function createCodeBlockElement(filename, content) {
        var section = document.createElement('div');

        var title = document.createElement('div');
        title.className = 'file-title';
        title.textContent = filename;
        section.appendChild(title);

        var wrapper = document.createElement('div');
        wrapper.className = 'code-block-wrapper visible';

        var btnGroup = document.createElement('div');
        btnGroup.className = 'btn-group';

        var copyBtn = document.createElement('button');
        copyBtn.className = 'action-btn';
        copyBtn.textContent = 'Kopiuj';
        copyBtn.addEventListener('click', function () {
            copyToClipboard(content, copyBtn);
        });
        btnGroup.appendChild(copyBtn);

        var dlBtn = document.createElement('button');
        dlBtn.className = 'action-btn';
        dlBtn.textContent = 'Pobierz';
        dlBtn.addEventListener('click', function () {
            downloadFile(content, filename);
        });
        btnGroup.appendChild(dlBtn);

        wrapper.appendChild(btnGroup);

        var pre = document.createElement('pre');
        pre.className = 'code-block';
        pre.textContent = content;
        wrapper.appendChild(pre);

        section.appendChild(wrapper);
        return section;
    }

    function renderCodeBlocks(containerId, files) {
        var container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';
        files.forEach(function (f) {
            container.appendChild(createCodeBlockElement(f.name, f.content));
        });
        container.classList.add('visible');
    }

    // ---- public API ----

    return {
        copyToClipboard: copyToClipboard,
        downloadFile: downloadFile,
        escapeCString: escapeCString,
        initAccordion: initAccordion,
        fetchAndDisplay: fetchAndDisplay,
        showWrapper: showWrapper,
        createCodeBlockElement: createCodeBlockElement,
        renderCodeBlocks: renderCodeBlocks
    };

})();
