/**
 * reset-password.js — واجهة صفحة reset-password.html (تعيين كلمة مرور جديدة)
 *
 * تُفتح الصفحة من رابط «استعادة كلمة المرور» في البريد. مكتبة Supabase تحوّل الرابط إلى جلسة استعادة،
 * وهذا الملف يتأكد منها قبل إظهار النموذج، ويعالج الروابط المنتهية أو غير الصحيحة.
 *
 * هذا الملف واجهة فقط: تعيين كلمة المرور نفسه عبر PlatformAuth.updatePassword (js/auth.js).
 *
 * الحالات: checking → form | invalid → done
 */
(function () {
    'use strict';

    var Auth = window.PlatformAuth;
    var UI = window.AuthUI;

    /* علامة مؤقتة (للتبويب الحالي) تسمح بتحديث الصفحة بعد أن مسحت المكتبة معاملات الرابط */
    var READY_FLAG = 'agri_recovery_ready';

    function $(id) { return document.getElementById(id); }

    var alertBox = UI ? UI.createAlert() : null;

    var views = {
        checking: $('viewChecking'),
        form: $('viewForm'),
        invalid: $('viewInvalid'),
        done: $('viewDone')
    };

    var state = 'checking';
    var busy = false;

    function setFlag(isSet) {
        try {
            if (isSet) window.sessionStorage.setItem(READY_FLAG, '1');
            else window.sessionStorage.removeItem(READY_FLAG);
        } catch (e) { /* التخزين غير متاح */ }
    }

    function hasFlag() {
        try { return window.sessionStorage.getItem(READY_FLAG) === '1'; } catch (e) { return false; }
    }

    function show(next) {
        state = next;

        Object.keys(views).forEach(function (key) {
            views[key].hidden = key !== next;
        });

        /* الشرح تحت العنوان يناسب النموذج فقط */
        $('resetSubtitle').hidden = next !== 'form';
    }

    function showInvalid(message) {
        setFlag(false);
        alertBox.hide();
        $('invalidText').textContent = message;
        show('invalid');
    }

    function showForm() {
        setFlag(true);
        alertBox.hide();
        show('form');
    }

    /* =========================================
       الحفظ
    ========================================= */
    function isSessionError(error) {
        var code = String((error && error.code) || '').toLowerCase();
        var text = String((error && error.message) || '').toLowerCase();

        return code === 'session_not_found' || code === 'session_expired' || code === 'bad_jwt' ||
            text.indexOf('auth session missing') !== -1;
    }

    function submit(event) {
        event.preventDefault();
        if (busy) return;

        alertBox.hide();

        var passIn = $('newPassword'), confirmIn = $('confirmPassword');
        var valid = true;

        if (!UI.isPasswordValid(passIn.value)) {
            UI.setFieldError(passIn, $('newPasswordError'), 'كلمة المرور يجب أن تكون 8 أحرف على الأقل وتجمع بين الحروف والأرقام.');
            valid = false;
        } else {
            UI.setFieldError(passIn, $('newPasswordError'), '');
        }

        if (confirmIn.value !== passIn.value) {
            UI.setFieldError(confirmIn, $('confirmPasswordError'), 'كلمتا المرور غير متطابقتين.');
            valid = false;
        } else {
            UI.setFieldError(confirmIn, $('confirmPasswordError'), '');
        }

        if (!valid) {
            var bad = $('resetForm').querySelector('.invalid');
            if (bad) bad.focus();
            return;
        }

        busy = true;
        UI.setLoading($('resetBtn'), true);

        Auth.updatePassword(passIn.value).then(function (result) {
            busy = false;
            UI.setLoading($('resetBtn'), false);

            if (result.ok) {
                passIn.value = '';
                confirmIn.value = '';
                setFlag(false);
                show('done');
                $('doneContinue').focus();

                window.setTimeout(goOn, 2500);
                return;
            }

            if (isSessionError(result.error)) {
                showInvalid(Auth.errorMessage({ code: 'session_not_found' }));
                return;
            }

            alertBox.show('error', result.message);
        });
    }

    var leaving = false;

    function goOn() {
        if (leaving) return;
        leaving = true;

        window.location.replace(Auth.consumeReturnTo() || Auth.pageUrl('index.html'));
    }

    /* =========================================
       التشغيل
    ========================================= */
    function init() {
        if (!Auth || !UI || !alertBox) {
            console.error('تعذر تحميل js/auth.js أو js/auth-ui.js');
            return;
        }

        UI.bindPasswordToggles(document);
        UI.bindPasswordRules($('newPassword'), $('newPasswordRules'));

        $('resetForm').addEventListener('submit', submit);
        $('doneContinue').addEventListener('click', goOn);

        ['newPassword', 'confirmPassword'].forEach(function (id) {
            $(id).addEventListener('input', function () {
                UI.setFieldError($(id), $(id === 'newPassword' ? 'newPasswordError' : 'confirmPasswordError'), '');
                alertBox.hide();
            });
        });

        show('checking');

        if (!Auth.getClient()) {
            showInvalid('تعذر تحميل خدمة الحساب. تحقق من اتصال الإنترنت وأعد تحميل الصفحة.');
            return;
        }

        var cb = Auth.callback;

        /* الرابط جاء بخطأ (منتهي الصلاحية، مستخدم من قبل...) */
        if (cb.error || cb.errorCode) {
            showInvalid(Auth.callbackErrorMessage());
            return;
        }

        /* لا يُعرض النموذج إلا لمن وصل من رابط استعادة (أو حدّث الصفحة بعد وصوله منه) */
        var fromRecoveryLink = cb.type === 'recovery' || cb.hasCode || hasFlag();

        Auth.onChange(function (event) {
            if (event === 'PASSWORD_RECOVERY' && state === 'checking') {
                showForm();
            } else if (event === 'SIGNED_OUT' && state === 'form') {
                showInvalid(Auth.errorMessage({ code: 'session_not_found' }));
            }
        });

        if (!fromRecoveryLink) {
            showInvalid('تُفتح هذه الصفحة من رابط استعادة كلمة المرور المرسل إلى بريدك الإلكتروني. اطلب رابطًا جديدًا إن احتجت.');
            return;
        }

        /* getSession تنتظر انتهاء تهيئة المكتبة (قراءة الرابط وإنشاء جلسة الاستعادة) */
        Auth.getSession().then(function (result) {
            if (state !== 'checking') return;

            if (result.error) {
                showInvalid(Auth.errorMessage(result.error));
            } else if (!result.session) {
                showInvalid(Auth.errorMessage({ code: 'otp_expired' }));
            } else {
                showForm();
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
