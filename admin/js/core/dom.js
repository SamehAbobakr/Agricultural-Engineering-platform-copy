/**
 * dom.js — أدوات آمنة لبناء HTML (طبقة UI)
 *
 * القاعدة: كل قيمة تُدرج داخل قالب html`...` تُهرَّب تلقائيًا ما لم تكن SafeHtml.
 * هكذا لا يوجد مسار لحقن XSS من بيانات قاعدة البيانات دون قصد.
 *   html`<td>${row.title}</td>`          ← title مهرَّب تلقائيًا
 *   html`<ul>${rows.map(r => html`<li>${r}</li>`)}</ul>`  ← المصفوفات تُدمج
 *   raw('<b>ثابت</b>')                    ← فقط لنصوص ثابتة مكتوبة في الكود
 */
(function () {
    'use strict';

    function SafeHtml(value) { this.value = value; }
    SafeHtml.prototype.toString = function () { return this.value; };

    function escapeHtml(text) {
        if (text === null || text === undefined) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function part(value) {
        if (value instanceof SafeHtml) return value.value;
        if (Array.isArray(value)) return value.map(part).join('');
        if (value === null || value === undefined || value === false) return '';
        return escapeHtml(value);
    }

    function html(strings) {
        var out = strings[0];
        for (var i = 1; i < strings.length; i++) {
            out += part(arguments[i]) + strings[i];
        }
        return new SafeHtml(out);
    }

    function raw(text) { return new SafeHtml(String(text)); }

    /** http/https فقط (يمنع javascript: وdata:) */
    function safeUrl(url) {
        if (typeof url !== 'string') return '';
        var trimmed = url.trim();
        if (!trimmed) return '';
        try {
            var parsed = new URL(trimmed, window.location.href);
            return (parsed.protocol === 'http:' || parsed.protocol === 'https:') ? trimmed : '';
        } catch (e) {
            return '';
        }
    }

    function mount(element, content) {
        if (!element) return;
        element.innerHTML = content instanceof SafeHtml ? content.value : escapeHtml(content);
    }

    function formatDate(value) {
        if (!value) return '—';
        var d = new Date(value);
        if (isNaN(d.getTime())) return '—';
        return d.toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });
    }

    function debounce(fn, ms) {
        var t;
        return function () {
            var args = arguments, ctx = this;
            clearTimeout(t);
            t = setTimeout(function () { fn.apply(ctx, args); }, ms);
        };
    }

    window.AdminDom = { html: html, raw: raw, escapeHtml: escapeHtml, safeUrl: safeUrl, mount: mount,
        formatDate: formatDate, debounce: debounce, SafeHtml: SafeHtml };
})();
