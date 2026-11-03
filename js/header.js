/**
 * header.js — منطق الهيدر الموحد (الهمبرجر + درج الموبايل + الوضع الليلي/النهاري)
 * يُحمَّل في <head> جميع صفحات المنصة التي تستخدم الهيدر الرئيسي.
 *
 * الثيم: هذا الملف هو المصدر الوحيد له. لا تضف toggleTheme أو استعادة ثيم في أي ملف آخر.
 *   - المفتاح: localStorage['theme'] ('light' أو 'dark')، ويُستخدم لتفضيل الثيم فقط.
 *   - الصنف light-mode يوضع على <html> فورًا (قبل رسم الصفحة = بلا وميض) وعلى <body> عند جاهزيته.
 *   - الزر: أي عنصر بالصنف .theme-toggle (أو #themeToggle / #theme-toggle) يتحدّث تلقائيًا،
 *     وغيابه من صفحة لا يسبب خطأ. الزر يستدعي toggleTheme() من onclick في HTML.
 *
 * تسجيل الدخول/الخروج: منطقه كله في auth.js (لا يوجد هنا).
 */
(function () {
    'use strict';

    var THEME_KEY = 'theme';

    function readTheme() {
        try {
            return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
        } catch (e) {
            return 'dark';
        }
    }

    function syncThemeButtons(isLight) {
        var buttons = document.querySelectorAll('.theme-toggle, #themeToggle, #theme-toggle');

        for (var i = 0; i < buttons.length; i++) {
            var btn = buttons[i];
            btn.textContent = isLight ? '☀️' : '🌙';
            btn.setAttribute('aria-label', isLight ? 'تفعيل الوضع الليلي' : 'تفعيل الوضع النهاري');
            btn.setAttribute('title', isLight ? 'الوضع الليلي' : 'الوضع النهاري');
        }
    }

    function applyTheme(theme) {
        var isLight = theme === 'light';

        document.documentElement.classList.toggle('light-mode', isLight);
        if (document.body) document.body.classList.toggle('light-mode', isLight);

        syncThemeButtons(isLight);
    }

    /* تطبيق مبكر على <html> — يمنع وميض الثيم الخاطئ (متغيرات الألوان معرّفة على html.light-mode) */
    applyTheme(readTheme());

    /* تبديل الثيم: دالة وحيدة تُستدعى من onclick="toggleTheme()" في كل الصفحات */
    window.toggleTheme = function () {
        var isLight = !document.documentElement.classList.contains('light-mode');

        try { localStorage.setItem(THEME_KEY, isLight ? 'light' : 'dark'); } catch (e) {}

        applyTheme(isLight ? 'light' : 'dark');
    };

    /* مزامنة ما بعد تحميل DOM، وتغيّر الثيم من تبويب آخر، والعودة من bfcache */
    document.addEventListener('DOMContentLoaded', function () {
        applyTheme(readTheme());
    });

    window.addEventListener('storage', function (event) {
        if (event.key === THEME_KEY) applyTheme(readTheme());
    });

    window.addEventListener('pageshow', function (event) {
        if (event.persisted) applyTheme(readTheme());
    });

    /* ينتظر تحميل DOM */
    document.addEventListener('DOMContentLoaded', function () {

        var hamburger = document.getElementById('hamburgerBtn');
        var drawer    = document.getElementById('mobileNavDrawer');
        var overlay   = document.getElementById('navOverlay');
        var closeBtn  = document.getElementById('drawerCloseBtn');

        if (!hamburger || !drawer || !overlay) return;

        function openDrawer() {
            drawer.classList.add('open');
            overlay.classList.add('open');
            hamburger.setAttribute('aria-expanded', 'true');
            document.body.style.overflow = 'hidden';
            /* تركيز أول رابط داخل الدرج لتحسين الوصول */
            var firstLink = drawer.querySelector('a, button');
            if (firstLink) firstLink.focus();
        }

        function closeDrawer() {
            drawer.classList.remove('open');
            overlay.classList.remove('open');
            hamburger.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = '';
            hamburger.focus();
        }

        hamburger.addEventListener('click', function () {
            var isOpen = drawer.classList.contains('open');
            isOpen ? closeDrawer() : openDrawer();
        });

        overlay.addEventListener('click', closeDrawer);

        if (closeBtn) closeBtn.addEventListener('click', closeDrawer);

        /* إغلاق بـ Escape */
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && drawer.classList.contains('open')) {
                closeDrawer();
            }
        });

        /* إغلاق عند اختيار رابط */
        drawer.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', function () {
                closeDrawer();
            });
        });

        /* مزامنة الحجم: أعد فتح الدرج إذا كان مفتوحًا وتغيّر الحجم للكمبيوتر */
        window.addEventListener('resize', function () {
            if (window.innerWidth > 700 && drawer.classList.contains('open')) {
                closeDrawer();
            }
        });

    });
})();
