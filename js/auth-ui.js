/**
 * auth-ui.js — أدوات واجهة مشتركة بين login.html وreset-password.html
 * (التحقق من الحقول، رسالة التنبيه، إظهار كلمة المرور، قائمة شروط كلمة المرور).
 *
 * لا يحتوي أي منطق مصادقة: العمليات الفعلية كلها في js/auth.js (PlatformAuth).
 * يُحمَّل قبل js/login.js وjs/reset-password.js.
 */
(function () {
    'use strict';

    if (window.AuthUI) return;

    var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    var PASSWORD_MIN = 8;
    var PASSWORD_MAX = 72; /* حدّ bcrypt في Supabase */

    /* =========================================
       التحقق
    ========================================= */
    function validateEmail(value) {
        var email = String(value || '').trim();
        return email.length <= 254 && EMAIL_RE.test(email);
    }

    /** شروط كلمة المرور عند إنشاء حساب أو تعيين كلمة جديدة. */
    function passwordChecks(value) {
        var pw = String(value || '');

        return {
            length: pw.length >= PASSWORD_MIN && pw.length <= PASSWORD_MAX,
            letter: /[A-Za-z؀-ۿ]/.test(pw),
            digit: /[0-9٠-٩]/.test(pw)
        };
    }

    function isPasswordValid(value) {
        var checks = passwordChecks(value);
        return checks.length && checks.letter && checks.digit;
    }

    /* =========================================
       أخطاء الحقول
    ========================================= */
    function setFieldError(input, errorEl, message) {
        if (!input) return;

        if (message) {
            input.classList.add('invalid');
            input.setAttribute('aria-invalid', 'true');

            if (errorEl) {
                errorEl.textContent = message;
                errorEl.classList.add('visible');
            }
        } else {
            input.classList.remove('invalid');
            input.setAttribute('aria-invalid', 'false');

            if (errorEl) errorEl.classList.remove('visible');
        }
    }

    /* =========================================
       رسالة التنبيه العامة
       العناصر المتوقعة: #loginAlert (الحاوية) و#alertIcon و#alertText و#alertActions (اختياري)
    ========================================= */
    function createAlert() {
        var box = document.getElementById('loginAlert');
        var icon = document.getElementById('alertIcon');
        var text = document.getElementById('alertText');
        var actions = document.getElementById('alertActions');

        function hide() {
            if (box) box.className = 'login-alert';
            if (text) text.textContent = '';

            if (actions) {
                actions.textContent = '';
                actions.hidden = true;
            }
        }

        /**
         * show('error' | 'success', 'الرسالة', [{ label, onClick }])
         * الرسالة تُكتب كنص (textContent) ولا تُفسَّر كـ HTML.
         */
        function show(type, message, buttons) {
            if (!box || !text) return;

            hide();

            box.className = 'login-alert visible ' + type;
            text.textContent = message;
            if (icon) icon.textContent = type === 'success' ? '✅' : '⚠️';

            if (actions && buttons && buttons.length) {
                buttons.forEach(function (item) {
                    var btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'auth-link-btn';
                    btn.textContent = item.label;
                    btn.addEventListener('click', item.onClick);
                    actions.appendChild(btn);
                });

                actions.hidden = false;
            }
        }

        return { show: show, hide: hide };
    }

    /* =========================================
       الأزرار
    ========================================= */
    function setLoading(button, isLoading) {
        if (!button) return;

        button.classList.toggle('loading', isLoading);
        button.disabled = isLoading;
        button.setAttribute('aria-busy', isLoading ? 'true' : 'false');
    }

    /** يربط كل زر يحمل data-toggle-password="idالحقل" بإظهار/إخفاء كلمة المرور. */
    function bindPasswordToggles(root) {
        var buttons = (root || document).querySelectorAll('[data-toggle-password]');

        Array.prototype.forEach.call(buttons, function (btn) {
            var input = document.getElementById(btn.getAttribute('data-toggle-password'));
            if (!input) return;

            btn.addEventListener('click', function () {
                var isText = input.type === 'text';

                input.type = isText ? 'password' : 'text';
                btn.textContent = isText ? '👁️' : '🙈';
                btn.setAttribute('aria-label', isText ? 'إظهار كلمة المرور' : 'إخفاء كلمة المرور');
            });
        });
    }

    /** يحدّث قائمة الشروط (li بسمة data-rule="length|letter|digit") أثناء الكتابة. */
    function bindPasswordRules(input, listEl) {
        if (!input || !listEl) return;

        function update() {
            var checks = passwordChecks(input.value);

            Array.prototype.forEach.call(listEl.querySelectorAll('li[data-rule]'), function (item) {
                item.classList.toggle('met', Boolean(checks[item.getAttribute('data-rule')]));
            });
        }

        input.addEventListener('input', update);
        update();
    }

    window.AuthUI = {
        PASSWORD_MIN: PASSWORD_MIN,
        PASSWORD_MAX: PASSWORD_MAX,
        validateEmail: validateEmail,
        passwordChecks: passwordChecks,
        isPasswordValid: isPasswordValid,
        setFieldError: setFieldError,
        createAlert: createAlert,
        setLoading: setLoading,
        bindPasswordToggles: bindPasswordToggles,
        bindPasswordRules: bindPasswordRules
    };
})();
