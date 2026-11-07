/**
 * router.js — توجيه بالـ hash (#/module) + تحميل كسول للوحدات (Module Pattern)
 *
 * تعريف الوحدات الوصفي في modules/registry.js، وكود كل وحدة في ملفها وتسجّل نفسها:
 *   AdminModules.define('dashboard', { mount(ctx) { ...; return cleanupFn; } });
 * ctx = { root, params, meta, data: AdminData, ui: AdminUI, dom: AdminDom, access: AdminAccess }
 */
(function () {
    'use strict';

    var registry = [];
    var defined = {};
    var current = null;     // { id, cleanup }
    var viewEl = null;
    var token = 0;          // يلغي نتائج تنقّل قديم إن تغيّر المسار أثناء التحميل
    var onRoute = function () {};

    function register(list) { registry = list.slice(); }
    function list() { return registry.slice(); }

    function define(id, impl) { defined[id] = impl; }

    function parseHash() {
        var h = String(window.location.hash || '').replace(/^#\/?/, '');
        var parts = h.split('?');
        var id = (parts[0] || '').split('/')[0] || 'dashboard';
        var params = {};
        new URLSearchParams(parts[1] || '').forEach(function (v, k) { params[k] = v; });
        return { id: id, params: params };
    }

    function loadScript(src) {
        return new Promise(function (resolve, reject) {
            var s = document.createElement('script');
            s.src = src;
            s.onload = resolve;
            s.onerror = function () { reject(new Error('تعذر تحميل الوحدة')); };
            document.body.appendChild(s);
        });
    }

    function teardown() {
        if (current && typeof current.cleanup === 'function') {
            try { current.cleanup(); } catch (e) { console.error(e); }
        }
        current = null;
    }

    function navigate() {
        var route = parseHash();
        var meta = registry.filter(function (m) { return m.id === route.id; })[0];
        var my = ++token;
        var UI = window.AdminUI, D = window.AdminDom;

        teardown();
        onRoute(meta || null);

        if (!meta) {
            D.mount(viewEl, UI.errorState('الصفحة المطلوبة غير موجودة.'));
            return;
        }

        D.mount(viewEl, UI.loadingState());

        var ensure = defined[meta.id] ? Promise.resolve() : loadScript('js/modules/' + meta.script);

        ensure.then(function () {
            if (my !== token) return;
            var impl = defined[meta.id];
            if (!impl) throw new Error('الوحدة لم تسجّل نفسها: ' + meta.id);

            viewEl.innerHTML = '';
            var cleanup = impl.mount({
                root: viewEl, params: route.params, meta: meta,
                data: window.AdminData, ui: UI, dom: D, access: window.AdminAccess
            });
            current = { id: meta.id, cleanup: cleanup };
        }).catch(function (err) {
            console.error(err);
            if (my === token) D.mount(viewEl, UI.errorState('تعذر تحميل هذه الصفحة.'));
        });
    }

    function start(el, routeCallback) {
        viewEl = el;
        onRoute = routeCallback || onRoute;
        window.addEventListener('hashchange', navigate);
        navigate();
    }

    window.AdminModules = { define: define };
    window.AdminRouter = { register: register, list: list, start: start, navigate: navigate };
})();
