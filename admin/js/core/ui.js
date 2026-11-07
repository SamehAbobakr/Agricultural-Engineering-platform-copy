/**
 * ui.js — مكونات واجهة مشتركة: Toast / Dialog (تأكيد) / حالات (Loading, Empty, Error)
 * لا تعرف شيئًا عن Supabase أو الصلاحيات (طبقة UI فقط).
 */
(function () {
    'use strict';

    var D = window.AdminDom;
    var html = D.html;

    /* ---------- Toasts ---------- */
    function toastHost() {
        var host = document.getElementById('admToasts');
        if (!host) {
            host = document.createElement('div');
            host.id = 'admToasts';
            host.className = 'adm-toasts';
            host.setAttribute('role', 'status');
            host.setAttribute('aria-live', 'polite');
            document.body.appendChild(host);
        }
        return host;
    }

    function toast(message, type, ms) {
        var el = document.createElement('div');
        el.className = 'adm-toast adm-toast--' + (type || 'info');
        el.textContent = String(message || '');
        toastHost().appendChild(el);
        setTimeout(function () { el.remove(); }, ms || (type === 'error' ? 7000 : 4000));
    }

    /* ---------- Modal / Dialog ---------- */
    var modalStack = [];

    /**
     * modal({ title, body (SafeHtml|Node), actions:[{label, kind, onClick, keepOpen}], size, onClose })
     * يُرجع { close, root, body }.
     */
    function modal(opts) {
        var previouslyFocused = document.activeElement;
        var overlay = document.createElement('div');
        overlay.className = 'adm-overlay';

        var dialog = document.createElement('div');
        dialog.className = 'adm-modal' + (opts.size ? ' adm-modal--' + opts.size : '');
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');

        var titleId = 'admModalTitle' + (modalStack.length + 1);
        dialog.setAttribute('aria-labelledby', titleId);

        var head = document.createElement('div');
        head.className = 'adm-modal__head';
        var h2 = document.createElement('h2');
        h2.id = titleId;
        h2.textContent = opts.title || '';
        var closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'adm-icon-btn';
        closeBtn.setAttribute('aria-label', 'إغلاق');
        closeBtn.textContent = '✕';
        head.appendChild(h2);
        head.appendChild(closeBtn);

        var body = document.createElement('div');
        body.className = 'adm-modal__body';
        if (opts.body instanceof Node) body.appendChild(opts.body);
        else D.mount(body, opts.body || '');

        var foot = document.createElement('div');
        foot.className = 'adm-modal__foot';

        dialog.appendChild(head);
        dialog.appendChild(body);
        dialog.appendChild(foot);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        document.body.classList.add('adm-no-scroll');

        var api = { root: dialog, body: body, close: close, setBusy: setBusy, buttons: [] };
        modalStack.push(api);

        function setBusy(busy) {
            api.buttons.forEach(function (b) { b.disabled = !!busy; });
            dialog.classList.toggle('is-busy', !!busy);
        }

        function close() {
            var i = modalStack.indexOf(api);
            if (i === -1) return;
            modalStack.splice(i, 1);
            overlay.remove();
            if (!modalStack.length) document.body.classList.remove('adm-no-scroll');
            document.removeEventListener('keydown', onKey, true);
            if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
            if (opts.onClose) opts.onClose();
        }

        function onKey(e) {
            if (modalStack[modalStack.length - 1] !== api) return;
            if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
            if (e.key === 'Tab') {
                var f = dialog.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
                if (!f.length) return;
                var first = f[0], last = f[f.length - 1];
                if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
                else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        }

        (opts.actions || []).forEach(function (a) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'adm-btn adm-btn--' + (a.kind || 'ghost');
            b.textContent = a.label;
            b.addEventListener('click', function () {
                Promise.resolve(a.onClick ? a.onClick(api) : null).then(function (res) {
                    if (!a.keepOpen && res !== false) close();
                });
            });
            foot.appendChild(b);
            api.buttons.push(b);
        });

        closeBtn.addEventListener('click', close);
        overlay.addEventListener('mousedown', function (e) { if (e.target === overlay) close(); });
        document.addEventListener('keydown', onKey, true);

        var focusTarget = dialog.querySelector('[autofocus], input, select, textarea') || foot.querySelector('button') || closeBtn;
        setTimeout(function () { focusTarget.focus(); }, 0);

        return api;
    }

    /**
     * confirm({ title, message, confirmLabel, danger, requireText })
     * requireText: نص يجب على المسؤول كتابته حرفيًا (للحذف النهائي).
     * يُرجع Promise<boolean>.
     */
    function confirm(opts) {
        return new Promise(function (resolve) {
            var settled = false;
            function done(v) { if (!settled) { settled = true; resolve(v); } }

            var content = html`
                <p class="adm-confirm__msg">${opts.message || ''}</p>
                ${opts.requireText ? html`
                    <label class="adm-field">
                        <span>اكتب «${opts.requireText}» للتأكيد</span>
                        <input type="text" class="adm-input" id="admConfirmInput" autocomplete="off" autofocus>
                    </label>` : ''}`;

            var m = modal({
                title: opts.title || 'تأكيد العملية',
                body: content,
                size: 'sm',
                onClose: function () { done(false); },
                actions: [
                    { label: 'إلغاء', kind: 'ghost', onClick: function () { done(false); } },
                    {
                        label: opts.confirmLabel || 'تأكيد',
                        kind: opts.danger ? 'danger' : 'primary',
                        keepOpen: true,
                        onClick: function (api) {
                            if (opts.requireText) {
                                var input = api.body.querySelector('#admConfirmInput');
                                if (!input || input.value.trim() !== opts.requireText) {
                                    toast('النص المكتوب لا يطابق نص التأكيد.', 'error');
                                    return false;
                                }
                            }
                            done(true);
                            api.close();
                        }
                    }
                ]
            });
            return m;
        });
    }

    /* ---------- حالات العرض ---------- */
    function loadingState(text) {
        return html`<div class="adm-state" role="status"><div class="adm-spinner" aria-hidden="true"></div><p>${text || 'جاري التحميل...'}</p></div>`;
    }

    function emptyState(title, hint) {
        return html`<div class="adm-state"><div class="adm-state__icon" aria-hidden="true">📭</div><h3>${title || 'لا توجد بيانات'}</h3>${hint ? html`<p>${hint}</p>` : ''}</div>`;
    }

    function errorState(message, retryId) {
        return html`<div class="adm-state adm-state--error" role="alert"><div class="adm-state__icon" aria-hidden="true">⚠️</div><h3>تعذر إتمام العملية</h3><p>${message}</p>${retryId ? html`<button type="button" class="adm-btn adm-btn--ghost" id="${retryId}">إعادة المحاولة</button>` : ''}</div>`;
    }

    window.AdminUI = { toast: toast, modal: modal, confirm: confirm,
        loadingState: loadingState, emptyState: emptyState, errorState: errorState };
})();
