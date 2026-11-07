/**
 * app.js — إقلاع لوحة الإدارة وبناء الهيكل (Shell)
 *
 * الدخول: هو دخول المنصة الأصلي (login.html). لا توجد صفحة دخول للإدارة.
 * الترتيب: التحقق من الإعداد ← جلسة المنصة (بلا جلسة = تحويل لصفحة دخول المنصة والعودة هنا) ←
 *          is_admin() من قاعدة البيانات ← رسم الهيكل ← الراوتر.
 * الهيدر والفوتر وتبديل الثيم وتسجيل الخروج كلها من المنصة (header.js / auth.js).
 */
(function () {
    'use strict';

    var D = window.AdminDom, html = D.html, UI = window.AdminUI;
    var root = document.getElementById('admRoot');

    function fatal(icon, title, message, extra) {
        D.mount(root, html`<div class="adm-fatal"><div class="adm-card adm-state adm-state--error" role="alert">
            <div class="adm-state__icon" aria-hidden="true">${icon}</div>
            <h3>${title}</h3><p>${message}</p>${extra || ''}</div></div>`);
    }

    function accessDenied(access) {
        var titles = { 'not-admin': 'لا تملك صلاحية الإدارة', 'not-installed': 'نظام الإدارة غير مُثبَّت بعد', error: 'تعذر التحقق من الصلاحيات' };

        fatal('⛔', titles[access.status] || 'تعذر الدخول', access.message, html`
            <p class="adm-sub">الحساب: <span dir="ltr">${access.email}</span></p>
            <a class="adm-btn adm-btn--ghost" href="../index.html">← العودة إلى المنصة</a>`);
    }

    function navHtml() {
        var groups = [], byGroup = {};

        window.AdminRouter.list().forEach(function (m) {
            if (!byGroup[m.group]) { byGroup[m.group] = []; groups.push(m.group); }
            byGroup[m.group].push(m);
        });

        return html`${groups.map(function (g) {
            return html`<div class="adm-nav__group"><div class="adm-nav__title">${g}</div>
                ${byGroup[g].map(function (m) {
                    return html`<a class="adm-nav__link" href="#/${m.id}" data-nav="${m.id}"><span aria-hidden="true">${m.icon}</span>${m.title}</a>`;
                })}</div>`;
        })}`;
    }

    function renderShell(user) {
        D.mount(root, html`
        <div class="adm-shell">
            <aside class="adm-sidebar" id="admSidebar" aria-label="أقسام لوحة الإدارة">
                <div class="adm-brand"><span class="adm-brand__icon" aria-hidden="true">🛡️</span>
                    <div>لوحة الإدارة<small>${user.email || ''}</small></div></div>
                <nav>${navHtml()}</nav>
            </aside>
            <section class="adm-main">
                <div class="adm-pagehead">
                    <button type="button" class="adm-btn adm-btn--ghost adm-menu-btn" id="admMenuBtn" aria-label="فتح أقسام اللوحة" aria-expanded="false" aria-controls="admSidebar">☰ الأقسام</button>
                    <h1 class="section-title" id="admTitle">الرئيسية</h1>
                </div>
                <div class="adm-view" id="admView" tabindex="-1"></div>
            </section>
        </div>`);

        var sidebar = document.getElementById('admSidebar');
        var menuBtn = document.getElementById('admMenuBtn');
        var scrim = null;

        function setMenu(open) {
            sidebar.classList.toggle('is-open', open);
            menuBtn.setAttribute('aria-expanded', String(open));
            if (open && !scrim) {
                scrim = document.createElement('div');
                scrim.className = 'adm-scrim';
                scrim.addEventListener('click', function () { setMenu(false); });
                document.body.appendChild(scrim);
            } else if (!open && scrim) { scrim.remove(); scrim = null; }
        }

        menuBtn.addEventListener('click', function () { setMenu(!sidebar.classList.contains('is-open')); });
        sidebar.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

        var view = document.getElementById('admView');

        window.AdminRouter.start(view, function (meta) {
            document.getElementById('admTitle').textContent = meta ? meta.title : 'غير موجود';
            document.title = (meta ? meta.title + ' — ' : '') + 'لوحة الإدارة | منصة الهندسة الزراعية';
            sidebar.querySelectorAll('[data-nav]').forEach(function (a) {
                var on = !!meta && a.getAttribute('data-nav') === meta.id;
                a.classList.toggle('is-active', on);
                if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
            });
        });
    }

    function boot() {
        var Auth = window.PlatformAuth;

        if (window.SUPABASE_CONFIG_ERROR) {
            fatal('⚙️', 'إعداد قاعدة البيانات غير مكتمل', window.SUPABASE_CONFIG_ERROR);
            return;
        }

        if (!Auth || !Auth.getClient()) {
            fatal('📡', 'خدمة الحساب غير متاحة', 'تعذر تحميل مكتبة Supabase. تحقق من الاتصال بالإنترنت وأعد تحميل الصفحة.');
            return;
        }

        D.mount(root, UI.loadingState('جاري التحقق من الحساب...'));

        Auth.getSession().then(function (r) {
            if (r.error) { fatal('⚠️', 'تعذر التحقق من الجلسة', window.AdminData.friendlyError(r.error)); return; }

            if (!r.session) {
                /* دخول المنصة الأصلي ثم العودة إلى هذه الصفحة */
                window.location.replace(Auth.loginUrl(window.location.href));
                return;
            }

            window.AdminAccess.load(r.session.user).then(function (access) {
                if (access.status !== 'ready') { accessDenied(access); return; }

                renderShell(r.session.user);

                /* تسجيل الخروج من أي تبويب: لا يبقى أي شيء إداري معروضًا */
                Auth.onChange(function (event) {
                    if (event === 'SIGNED_OUT') window.location.replace('../index.html');
                });
            });
        });
    }

    boot();
})();
