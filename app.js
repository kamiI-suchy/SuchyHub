/* ═══════════════════════════════════════════
   SuchyHub — shared JS
   ═══════════════════════════════════════════ */

const Suchy = {

    /* copy text, show toast */
    async copy(text) {
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            const t = document.createElement('textarea');
            t.value = text; t.style.cssText = 'position:fixed;left:-9999px';
            document.body.append(t); t.select();
            document.execCommand('copy'); t.remove();
        }
        this._toast('Skopiowano!');
    },

    /* download text as file */
    download(text, name) {
        const url = URL.createObjectURL(new Blob([text], { type: 'text/octet-stream' }));
        const a = document.createElement('a');
        a.href = url; a.download = name;
        document.body.append(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
    },

    /* escape for C string literal */
    escapeC(s) {
        return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
                .replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
    },

    /* fetch text from url */
    async _fetch(url) {
        const r = await fetch(url, { cache: 'no-store' });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
    },

    /* show code block */
    _show(el) {
        const w = el.closest('.code-wrap');
        if (w) w.classList.add('show');
    },

    /* render a single code block into container */
    _block(container, label, content, fname) {
        const d = document.createElement('div');

        const lbl = document.createElement('div');
        lbl.className = 'file-label'; lbl.textContent = label;
        d.append(lbl);

        const wrap = document.createElement('div');
        wrap.className = 'code-wrap show';

        const acts = document.createElement('div');
        acts.className = 'code-actions';
        const copyBtn = document.createElement('button');
        copyBtn.textContent = 'Kopiuj';
        copyBtn.onclick = () => Suchy.copy(content);
        const dlBtn = document.createElement('button');
        dlBtn.textContent = 'Pobierz';
        dlBtn.onclick = () => Suchy.download(content, fname);
        acts.append(copyBtn, dlBtn);
        wrap.append(acts);

        const pre = document.createElement('pre');
        pre.className = 'code'; pre.textContent = content;
        wrap.append(pre);
        d.append(wrap);
        container.append(d);
    },

    /* render multiple file blocks */
    renderFiles(containerId, files) {
        const c = document.getElementById(containerId);
        if (!c) return;
        c.innerHTML = '';
        files.forEach(f => this._block(c, f.name, f.content, f.name));
        c.classList.add('show');
    },

    /* init accordion (native <details>) with lazy fetch */
    accordion(detailsId, bodyId, url) {
        const det = document.getElementById(detailsId);
        const body = document.getElementById(bodyId);
        if (!det || !body) return;
        let done = false;
        det.addEventListener('toggle', async () => {
            if (done || !det.open) return;
            done = true;
            try {
                const text = await Suchy._fetch(url);
                body.textContent = text;
            } catch (e) {
                body.textContent = 'Nie udało się wczytać: ' + e.message;
            }
        });
    },

    /* fetch file and display in element */
    async load(url, elOrId) {
        const el = typeof elOrId === 'string' ? document.getElementById(elOrId) : elOrId;
        if (!el) return;
        el.textContent = 'Wczytywanie ' + url + '...';
        try {
            el.textContent = await Suchy._fetch(url);
            Suchy._show(el);
        } catch (e) {
            el.textContent = 'Blad: ' + e.message;
        }
    },

    /* toast helper */
    _toast(msg) {
        let bar = document.querySelector('.toast-bar');
        if (!bar) { bar = document.createElement('div'); bar.className = 'toast-bar'; document.body.append(bar); }
        const el = document.createElement('div');
        el.className = 'toast-msg'; el.textContent = msg;
        bar.append(el);
        setTimeout(() => el.remove(), 2100);
    }

};
