/**
 * support-widget.js — مكوّن «الدعم والتواصل» الموحد (زر الشخصية + القائمة + نافذة دعم المنصة)
 *
 * الاستخدام: سطر واحد فقط في كل صفحة، قبل </body>:
 *     <script src="js/support-widget.js"></script>         (من الجذر)
 *     <script src="../js/support-widget.js"></script>      (من مجلد فرعي)
 *
 * - هذا الملف هو المصدر الوحيد لمحتوى الزر والنافذة؛ لا تنسخ الـ HTML في الصفحات.
 * - يحمّل css/support-widget.css ويحدد مسار الصورة تلقائيًا بالنسبة لمكان هذا الملف،
 *   فلا يعتمد على أي عنصر أو سكربت آخر في الصفحة، ولا يضيف إلا عنصرين بمعرّفات sw*.
 * - رقم واتساب ورقم فودافون كاش في الثابتين أدناه.
 */
(function () {
    'use strict';

    if (window.__supportWidgetLoaded) return;
    window.__supportWidgetLoaded = true;

    var WHATSAPP_URL = 'https://wa.me/201551743249';
    var CASH_NUMBER = '01554850896';

    /* ---------- مسارات الملفات بالنسبة لمكان هذا السكربت (يعمل على المسار الفرعي لـ GitHub Pages) ---------- */

    var scriptEl = document.currentScript || document.querySelector('script[src$="support-widget.js"]');
    var rootUrl = scriptEl && scriptEl.src ? new URL('../', scriptEl.src).href : '';
    var CSS_URL = rootUrl + 'css/support-widget.css';
    var MASCOT_URL = rootUrl + 'assets/images/support-mascot.png';

    var WHATSAPP_SVG =
        '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
        '<path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.15h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.22-8.23 8.22zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.1-.23-.17-.48-.29z"/>' +
        '</svg>';

    /* ---------- المحتوى (نص ثابت من المنصة نفسها، لا بيانات قادمة من قاعدة البيانات) ---------- */

    var LAUNCHER_HTML =
        '<div class="sw-launcher" id="swLauncher">' +
            '<div class="sw-menu" id="swMenu">' +
                '<button type="button" class="sw-card" id="swSupportOpen">' +
                    '<span class="sw-card-icon sw-card-icon--support" aria-hidden="true">❤️</span>' +
                    '<span class="sw-card-text">' +
                        '<span class="sw-card-title">دعم المنصة</span>' +
                        '<span class="sw-card-desc">يمكنك المساهمة في استمرار الخدمة وتطوير المنصة.</span>' +
                    '</span>' +
                '</button>' +
                '<a class="sw-card" id="swWhatsapp" href="' + WHATSAPP_URL + '" target="_blank" rel="noopener noreferrer">' +
                    '<span class="sw-card-icon sw-card-icon--whatsapp">' + WHATSAPP_SVG + '</span>' +
                    '<span class="sw-card-text">' +
                        '<span class="sw-card-title">تواصل معنا</span>' +
                        '<span class="sw-card-desc">للمشاكل والملاحظات والاستفسارات.</span>' +
                    '</span>' +
                '</a>' +
            '</div>' +
            '<button type="button" class="sw-toggle" id="swToggle" aria-label="الدعم والتواصل"' +
                ' aria-haspopup="true" aria-expanded="false" aria-controls="swMenu">' +
                '<img class="sw-toggle-img" src="' + MASCOT_URL + '" alt="" width="60" height="60" decoding="async">' +
            '</button>' +
        '</div>';

    
var MODAL_HTML =
    '<div class="sw-modal" id="swModal" aria-hidden="true">' +
        '<div class="sw-dialog" id="swDialog" role="dialog" aria-modal="true" aria-labelledby="swDialogTitle" tabindex="-1">' +
            '<button type="button" class="sw-close" id="swClose" aria-label="إغلاق">×</button>' +

            '<div class="sw-dialog-icon" aria-hidden="true">💚</div>' +
            '<h3 class="sw-dialog-title" id="swDialogTitle">خلّينا نكمّل الرحلة معًا</h3>' +
            '<p class="sw-intro">دعمك يساعدنا نحافظ على المنصة ونطوّر محتواها لخدمة الطلاب.</p>' +

            '<div class="sw-benefits">' +
                '<span>📚 محتوى أفضل</span>' +
                '<span>⚙️ تطوير مستمر</span>' +
                '<span>🌱 استمرار الخدمة</span>' +
            '</div>' +

            '<div class="sw-cash">' +
                '<span class="sw-cash-label">Vodafone Cash · رقم التحويل</span>' +
                '<strong class="sw-cash-number" id="swCashNumber" dir="ltr">' + CASH_NUMBER + '</strong>' +
                '<button type="button" class="sw-copy" id="swCopy">📋 نسخ رقم التحويل</button>' +
                '<p class="sw-cash-note">أي مساهمة، مهما كانت بسيطة، تصنع فرقًا.</p>' +
            '</div>' +

            '<div class="sw-share">' +
                '<strong>مش قادر تدعم ماديًا؟</strong>' +
                '<p>مشاركة المنصة مع زملائك دعم مهم يساعدنا نوصل لطلاب أكثر.</p>' +
                '<button type="button" class="sw-share-btn" id="swShare">🔗 نسخ رابط المنصة</button>' +
            '</div>' +

        '</div>' +
    '</div>';


    /* ---------- السلوك ---------- */

    function init() {
        if (document.getElementById('swLauncher')) return; // حماية من التكرار

        var holder = document.createElement('div');
        holder.innerHTML = LAUNCHER_HTML + MODAL_HTML;
        while (holder.firstChild) document.body.appendChild(holder.firstChild);

        var toggle = document.getElementById('swToggle');
        var menu = document.getElementById('swMenu');
        var launcher = document.getElementById('swLauncher');
        var supportOpen = document.getElementById('swSupportOpen');
        var whatsapp = document.getElementById('swWhatsapp');
        var modal = document.getElementById('swModal');
        var dialog = document.getElementById('swDialog');
        var closeBtn = document.getElementById('swClose');
        var copyBtn = document.getElementById('swCopy');
        var shareBtn = document.getElementById('swShare');
        var cashNumber = document.getElementById('swCashNumber');

        var copyTimer = null;

        function isMenuOpen() { return menu.classList.contains('is-open'); }
        function isModalOpen() { return modal.classList.contains('is-open'); }

        function openMenu() {
            menu.classList.add('is-open');
            toggle.setAttribute('aria-expanded', 'true');
        }

        function closeMenu() {
            menu.classList.remove('is-open');
            toggle.setAttribute('aria-expanded', 'false');
        }

        function openModal() {
            closeMenu();
            modal.classList.add('is-open');
            modal.setAttribute('aria-hidden', 'false');
            document.documentElement.style.overflow = 'hidden';
            dialog.focus({ preventScroll: true });
        }

        function closeModal(restoreFocus) {
            if (!isModalOpen()) return;
            modal.classList.remove('is-open');
            modal.setAttribute('aria-hidden', 'true');
            document.documentElement.style.overflow = '';
            if (restoreFocus) toggle.focus({ preventScroll: true });
        }

        /* عند ظهور الفوتر في أسفل الشاشة يرتفع الزر بمقدار الجزء الظاهر منه كي لا يغطي نصه.
           لا نعدّل الفوتر نفسه؛ والصفحات بلا فوتر (مثل study-timer) لا ترفع شيئًا. */
        var footer = document.querySelector('.main-footer');
        var liftQueued = false;

        function updateLift() {
            liftQueued = false;
            var lift = 0;
            if (footer) {
                lift = Math.max(0, Math.round(window.innerHeight - footer.getBoundingClientRect().top));
                if (lift > window.innerHeight * 0.5) lift = 0; // حماية من قياس غير منطقي
            }
            launcher.style.setProperty('--sw-lift', lift + 'px');
        }

        function queueLift() {
            if (liftQueued) return;
            liftQueued = true;
            window.requestAnimationFrame(updateLift);
        }

        if (footer) {
            window.addEventListener('scroll', queueLift, { passive: true });
            window.addEventListener('resize', queueLift);
            window.addEventListener('load', queueLift);
            updateLift();
        }

        /* الزر: فتح/إغلاق القائمة */
        toggle.addEventListener('click', function () {
            if (isMenuOpen()) closeMenu(); else openMenu();
        });

        /* دعم المنصة: يغلق القائمة ويفتح النافذة */
        supportOpen.addEventListener('click', openModal);

        /* تواصل معنا: الرابط يفتح في تبويب جديد، والقائمة لا تبقى مفتوحة */
        whatsapp.addEventListener('click', closeMenu);

        /* إغلاق القائمة بالضغط خارجها */
        document.addEventListener('click', function (event) {
            if (isMenuOpen() && !launcher.contains(event.target)) closeMenu();
        });

        /* إغلاق النافذة: زر الإغلاق أو الضغط على الخلفية */
        closeBtn.addEventListener('click', function () { closeModal(true); });
        modal.addEventListener('click', function (event) {
            if (event.target === modal) closeModal(true);
        });

        /* Escape + حصر Tab داخل النافذة */
        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') {
                if (isModalOpen()) {
                    closeModal(true);
                } else if (isMenuOpen()) {
                    closeMenu();
                    toggle.focus({ preventScroll: true });
                }
                return;
            }

            if (event.key === 'Tab' && isModalOpen()) {
                var focusable = [closeBtn, copyBtn];
                var first = focusable[0];
                var last = focusable[focusable.length - 1];

                if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
                    event.preventDefault();
                    last.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
            }
        });

        /* نسخ رقم فودافون كاش */
        function showCopyState(text) {
            copyBtn.textContent = text;
            clearTimeout(copyTimer);
            copyTimer = setTimeout(function () { copyBtn.textContent = 'نسخ الرقم'; }, 2000);
        }

        function legacyCopy(text) {
            var area = document.createElement('textarea');
            area.value = text;
            area.setAttribute('readonly', '');
            area.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none;';
            document.body.appendChild(area);
            area.select();
            var ok = false;
            try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
            document.body.removeChild(area);
            return ok;
        }

        copyBtn.addEventListener('click', function () {
            var number = cashNumber.textContent.trim();

            function fail() { showCopyState('تعذر النسخ، انسخه يدويًا'); }

            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(number).then(
                    function () { showCopyState('تم نسخ الرقم ✓'); },
                    function () { if (legacyCopy(number)) showCopyState('تم نسخ الرقم ✓'); else fail(); }
                );
            } else if (legacyCopy(number)) {
                showCopyState('تم نسخ الرقم ✓');
            } else {
                fail();
            }
        });
        
        /* نسخ رابط المنصة */
        var shareTimer = null;

        shareBtn.addEventListener('click', function () {
            var url = window.location.href;

            function showShareState(text) {
                shareBtn.textContent = text;
                clearTimeout(shareTimer);

                shareTimer = setTimeout(function () {
                    shareBtn.textContent = '🔗 نسخ رابط المنصة';
                }, 2000);
            }

            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(url).then(
                    function () {
                        showShareState('تم نسخ الرابط ✓');
                    },
                    function () {
                        if (legacyCopy(url)) {
                            showShareState('تم نسخ الرابط ✓');
                        } else {
                            showShareState('تعذر النسخ، انسخ الرابط يدويًا');
                        }
                    }
                );
            } else if (legacyCopy(url)) {
                showShareState('تم نسخ الرابط ✓');
            } else {
                showShareState('تعذر النسخ، انسخ الرابط يدويًا');
            }
        });

    }

    /* نحمّل التنسيق أولًا ثم نضيف العناصر، فلا يظهر الزر بلا تنسيق ولو لحظة */
    function start() {
        var done = false;

        function go() {
            if (done) return;
            done = true;
            init();
        }

        if (!CSS_URL || document.querySelector('link[href="' + CSS_URL + '"]')) {
            go();
            return;
        }

        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = CSS_URL;
        link.onload = go;
        link.onerror = go;
        document.head.appendChild(link);
        setTimeout(go, 3000);
    }

    if (document.body) start();
    else document.addEventListener('DOMContentLoaded', start);
})();
