/**
 * header.js — منطق الهيدر الموحد (القوائم المنسدلة + درج الموبايل + الوضع الليلي/النهاري)
 * يُحمَّل في <head> جميع صفحات المنصة التي تستخدم الهيدر الرئيسي.
 *
 * الثيم: هذا الملف هو المصدر الوحيد له. لا تضف toggleTheme أو استعادة ثيم في أي ملف آخر.
 *   - المفتاح: localStorage['theme'] ('light' أو 'dark')، ويُستخدم لتفضيل الثيم فقط.
 *   - الصنف light-mode يوضع على <html> فورًا (قبل رسم الصفحة = بلا وميض) وعلى <body> عند جاهزيته.
 *   - الزر: أي عنصر بالصنف .theme-toggle (أو #themeToggle / #theme-toggle) يتحدّث تلقائيًا،
 *     وغيابه من صفحة لا يسبب خطأ. الزر يستدعي toggleTheme() من onclick في HTML.
 *
 * الكمبيوتر: قائمتان منسدلتان (.nav-group) — زر .nav-group-trigger ولوحة .nav-dropdown.
 *   فتح/إغلاق بالنقر، وبالأسهم (↑ ↓ Home End)، وEscape، والنقر خارجها، والخروج بـ Tab.
 * الموبايل: درج جانبي (#mobileNavDrawer) فيه تصنيفان قابلان للطي (.drawer-group).
 * الصفحة النشطة: تُقرأ من .main-nav .nav-link.active (تضبطها الصفحة أو js/ui.js) ثم
 *   تُنسخ تلقائيًا إلى درج الموبايل وإلى زر التصنيف الذي يحويها.
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

    /* =========================================
       القوائم المنسدلة (الكمبيوتر)
    ========================================= */
    function toArray(list) {
        return Array.prototype.slice.call(list);
    }

    function initDropdowns() {
        var nav = document.querySelector('.main-header .main-nav');
        if (!nav) return;

        var groups = toArray(nav.querySelectorAll('.nav-group'));
        if (!groups.length) return;

        function triggerOf(group) { return group.querySelector('.nav-group-trigger'); }
        function itemsOf(group)   { return toArray(group.querySelectorAll('.nav-dropdown a')); }

        function setOpen(group, open) {
            var trigger = triggerOf(group);
            if (!trigger) return;
            group.classList.toggle('open', open);
            trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
        }

        function closeAll(except) {
            groups.forEach(function (g) {
                if (g !== except && g.classList.contains('open')) setOpen(g, false);
            });
        }

        function openGroup(group, which) {
            closeAll(group);
            setOpen(group, true);

            if (which) {
                var items = itemsOf(group);
                var target = which === 'last' ? items[items.length - 1] : items[0];
                if (target) target.focus();
            }
        }

        groups.forEach(function (group) {
            var trigger = triggerOf(group);
            if (!trigger) return;

            trigger.addEventListener('click', function () {
                if (group.classList.contains('open')) setOpen(group, false);
                else openGroup(group);
            });

            trigger.addEventListener('keydown', function (e) {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    openGroup(group, 'first');
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    openGroup(group, 'last');
                }
            });

            /* التنقل بين عناصر اللوحة */
            group.addEventListener('keydown', function (e) {
                /* حدث عالجه زر القائمة (↑ ↓) لا يُعالَج مرتين عند صعوده للمجموعة */
                if (e.defaultPrevented || !group.classList.contains('open')) return;

                var items = itemsOf(group);
                var index = items.indexOf(document.activeElement);

                if (e.key === 'Escape') {
                    e.preventDefault();
                    setOpen(group, false);
                    trigger.focus();
                } else if (index !== -1 && e.key === 'ArrowDown') {
                    e.preventDefault();
                    items[(index + 1) % items.length].focus();
                } else if (index !== -1 && e.key === 'ArrowUp') {
                    e.preventDefault();
                    items[(index - 1 + items.length) % items.length].focus();
                } else if (index !== -1 && e.key === 'Home') {
                    e.preventDefault();
                    items[0].focus();
                } else if (index !== -1 && e.key === 'End') {
                    e.preventDefault();
                    items[items.length - 1].focus();
                }
            });

            /* الخروج من المجموعة بـ Tab يغلقها */
            group.addEventListener('focusout', function (e) {
                var next = e.relatedTarget;
                if (next && !group.contains(next)) setOpen(group, false);
            });

            /* اختيار صفحة يغلق اللوحة (يشمل الروابط التي تفتح في نافذة جديدة) */
            group.addEventListener('click', function (e) {
                if (e.target.closest && e.target.closest('.nav-dropdown a')) setOpen(group, false);
            });
        });

        /* النقر خارج القوائم */
        document.addEventListener('click', function (e) {
            if (!e.target.closest || !e.target.closest('.nav-group')) closeAll();
        });

        /* الانتقال إلى عرض الموبايل */
        var mq = window.matchMedia('(min-width: 861px)');
        function onMq() { if (!mq.matches) closeAll(); }
        if (mq.addEventListener) mq.addEventListener('change', onMq);
        else if (mq.addListener) mq.addListener(onMq);
    }

    /* =========================================
       درج الموبايل + التصنيفات القابلة للطي
    ========================================= */
    function initDrawer() {
        var hamburger = document.getElementById('hamburgerBtn');
        var drawer    = document.getElementById('mobileNavDrawer');
        var overlay   = document.getElementById('navOverlay');
        var closeBtn  = document.getElementById('drawerCloseBtn');

        if (!hamburger || !drawer || !overlay) return;

        function isOpen() { return drawer.classList.contains('open'); }

        function openDrawer() {
            drawer.classList.add('open');
            overlay.classList.add('open');
            hamburger.setAttribute('aria-expanded', 'true');
            document.body.style.overflow = 'hidden';

            /* تركيز زر الإغلاق (بعد أن يصبح الدرج مرئيًا) */
            window.requestAnimationFrame(function () {
                if (closeBtn) closeBtn.focus();
            });
        }

        function closeDrawer(restoreFocus) {
            if (!isOpen()) return;

            drawer.classList.remove('open');
            overlay.classList.remove('open');
            hamburger.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = '';

            if (restoreFocus !== false) hamburger.focus();
        }

        hamburger.addEventListener('click', function () {
            if (isOpen()) closeDrawer();
            else openDrawer();
        });

        overlay.addEventListener('click', function () { closeDrawer(); });
        if (closeBtn) closeBtn.addEventListener('click', function () { closeDrawer(); });

        /* إغلاق عند اختيار أي رابط (تشمل روابط تُضاف لاحقًا مثل «لوحة الإدارة») */
        drawer.addEventListener('click', function (e) {
            if (e.target.closest && e.target.closest('a')) closeDrawer(false);
        });

        /* التصنيفات القابلة للطي: كل تصنيف مستقل */
        toArray(drawer.querySelectorAll('.drawer-group')).forEach(function (group) {
            var trigger = group.querySelector('.drawer-group-trigger');
            var panel   = group.querySelector('.drawer-group-panel');
            if (!trigger || !panel) return;

            trigger.addEventListener('click', function () {
                var expand = trigger.getAttribute('aria-expanded') !== 'true';
                trigger.setAttribute('aria-expanded', expand ? 'true' : 'false');
                panel.classList.toggle('open', expand);
            });
        });

        /* Escape + حبس التركيز داخل الدرج وهو مفتوح */
        document.addEventListener('keydown', function (e) {
            if (!isOpen()) return;

            if (e.key === 'Escape') {
                closeDrawer();
                return;
            }

            if (e.key !== 'Tab') return;

            var focusables = toArray(drawer.querySelectorAll('a[href], button:not([disabled])')).filter(function (el) {
                return window.getComputedStyle(el).visibility !== 'hidden';
            });
            if (!focusables.length) return;

            var first = focusables[0];
            var last  = focusables[focusables.length - 1];

            if (e.shiftKey && (document.activeElement === first || !drawer.contains(document.activeElement))) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        });

        /* الانتقال إلى عرض الكمبيوتر يغلق الدرج (نفس نقطة التحويل في CSS: 861px) */
        var mq = window.matchMedia('(min-width: 861px)');
        function onMq() { if (mq.matches) closeDrawer(false); }
        if (mq.addEventListener) mq.addEventListener('change', onMq);
        else if (mq.addListener) mq.addListener(onMq);
    }

    /* =========================================
       الصفحة النشطة: تُنسخ من .main-nav إلى الدرج وإلى زر التصنيف
    ========================================= */
    function initActiveSync() {
        var nav    = document.querySelector('.main-header .main-nav');
        var drawer = document.getElementById('mobileNavDrawer');
        var firstRun = true;

        function activeKey() {
            var link = nav && nav.querySelector('.nav-link.active, .nav-link[aria-current="page"]');
            return link ? link.getAttribute('data-nav') : null;
        }

        function setClass(el, name, on) {
            if (el.classList.contains(name) !== on) el.classList.toggle(name, on);
        }

        function sync() {
            var key = activeKey();

            /* الكمبيوتر: تمييز زر التصنيف الذي يحوي الصفحة الحالية */
            if (nav) {
                toArray(nav.querySelectorAll('.nav-group')).forEach(function (group) {
                    setClass(group, 'has-active', Boolean(group.querySelector('.nav-link.active')));
                });
            }

            if (!drawer) return;

            /* الموبايل: نسخ الصفحة النشطة إلى روابط الدرج (إن عُرفت) */
            if (key) {
                toArray(drawer.querySelectorAll('.drawer-nav-link')).forEach(function (link) {
                    var on = link.getAttribute('data-nav') === key;
                    setClass(link, 'active', on);

                    if (on && link.getAttribute('aria-current') !== 'page') link.setAttribute('aria-current', 'page');
                    if (!on && link.hasAttribute('aria-current')) link.removeAttribute('aria-current');
                });
            }

            var anyOpen = false;

            toArray(drawer.querySelectorAll('.drawer-group')).forEach(function (group) {
                var trigger = group.querySelector('.drawer-group-trigger');
                var panel   = group.querySelector('.drawer-group-panel');
                var has     = Boolean(group.querySelector('.drawer-nav-link.active'));

                setClass(group, 'has-active', has);

                /* عند أول تشغيل: افتح التصنيف الذي يحوي الصفحة الحالية */
                if (firstRun && has && trigger && panel) {
                    trigger.setAttribute('aria-expanded', 'true');
                    panel.classList.add('open');
                }

                if (trigger && trigger.getAttribute('aria-expanded') === 'true') anyOpen = true;
            });

            /* لا صفحة نشطة (الدخول/الإدارة…): افتح أول تصنيف حتى لا تظهر القائمة فارغة */
            if (firstRun && !anyOpen) {
                var first = drawer.querySelector('.drawer-group');
                var t = first && first.querySelector('.drawer-group-trigger');
                var p = first && first.querySelector('.drawer-group-panel');
                if (t && p) {
                    t.setAttribute('aria-expanded', 'true');
                    p.classList.add('open');
                }
            }

            firstRun = false;
        }

        sync();

        /* js/ui.js وصفحة المجتمع يعدّلان .active بعد التحميل */
        if (nav && window.MutationObserver) {
            new MutationObserver(function (mutations) {
                for (var i = 0; i < mutations.length; i++) {
                    var t = mutations[i].target;
                    if (t.classList && t.classList.contains('nav-link')) { sync(); return; }
                }
            }).observe(nav, { attributes: true, attributeFilter: ['class', 'aria-current'], subtree: true });
        }
    }

    /* ينتظر تحميل DOM */
    document.addEventListener('DOMContentLoaded', function () {
        initDropdowns();
        initDrawer();
        initActiveSync();
    });
})();
