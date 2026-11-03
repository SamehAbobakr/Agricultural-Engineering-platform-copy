/**
 * login.js — واجهة صفحة login.html (دخول / إنشاء حساب / نسيت كلمة المرور / تحقق من البريد)
 *
 * هذا الملف واجهة فقط. كل عمليات الحساب تنفَّذ عبر PlatformAuth في js/auth.js،
 * وأدوات التحقق والتنبيهات في js/auth-ui.js. لا تنشئ عميل Supabase هنا.
 *
 * الأوضاع: login | signup | forgot | notice | signedin
 * روابط مباشرة: login.html?mode=signup أو ?mode=forgot
 * العودة بعد الدخول: login.html?returnTo=<رابط من نفس الموقع> (يُتحقق منه في PlatformAuth.safeReturnUrl)
 */
(function () {
    'use strict';

    var Auth = window.PlatformAuth;
    var UI = window.AuthUI;

    var RESEND_SECONDS = 60;

    var HEADERS = {
        login:  ['أهلاً بعودتك', 'سجّل دخولك لحفظ تقدّمك ومتابعته من أي جهاز'],
        signup: ['إنشاء حساب جديد', 'حساب واحد لحفظ تقدّمك وإنجازاتك على المنصة'],
        forgot: ['استعادة كلمة المرور', 'أدخل بريدك الإلكتروني وسنرسل لك رابطًا لتعيين كلمة مرور جديدة'],
        notice: ['', ''],
        signedin: ['', '']
    };

    function $(id) { return document.getElementById(id); }

    var alertBox = UI ? UI.createAlert() : null;

    var views = {
        login: $('viewLogin'),
        signup: $('viewSignup'),
        forgot: $('viewForgot'),
        notice: $('viewNotice'),
        signedin: $('viewSignedIn')
    };

    var currentMode = 'login';
    var busy = false;          // عملية قيد التنفيذ (تمنع الإرسال المزدوج وتتجاهل أحداث الجلسة)
    var redirecting = false;   // دخول ناجح والصفحة في طريقها للمغادرة
    var returnTarget = null;   // وجهة العودة من ?returnTo=
    var notice = { kind: '', email: '' };
    var cooldownTimer = null;

    /* =========================================
       عرض الأوضاع
    ========================================= */
    function showView(mode, options) {
        options = options || {};
        currentMode = mode;

        Object.keys(views).forEach(function (key) {
            views[key].hidden = key !== mode;
        });

        var isTabbed = mode === 'login' || mode === 'signup';

        $('authTabs').hidden = !isTabbed;
        $('socialBlock').hidden = !isTabbed;

        [$('tabLogin'), $('tabSignup')].forEach(function (tab) {
            var selected = tab.getAttribute('data-mode') === mode;
            tab.setAttribute('aria-selected', selected ? 'true' : 'false');
            tab.tabIndex = selected ? 0 : -1;
        });

        var header = HEADERS[mode] || ['', ''];
        $('authTitle').textContent = header[0];
        $('authTitle').hidden = !header[0];
        $('authSubtitle').textContent = header[1];
        $('authSubtitle').hidden = !header[1];

        if (mode !== 'notice') stopCooldown();
        if (!options.keepAlert && alertBox) alertBox.hide();

        if (options.focus) {
            var first = views[mode].querySelector('input, button');
            if (first) first.focus();
        }
    }

    /** ينقل البريد المكتوب بين نماذج الأوضاع المختلفة حتى لا يعيد الطالب كتابته. */
    function carryEmail(fromId, toId) {
        var from = $(fromId), to = $(toId);
        if (from && to && from.value && !to.value) to.value = from.value;
    }

    /* =========================================
       بعد الدخول
    ========================================= */
    function targetAfterLogin() {
        var stored = Auth.consumeReturnTo();
        return returnTarget || stored || Auth.pageUrl('index.html');
    }

    function onSignedIn(message) {
        redirecting = true;
        busy = true;

        alertBox.show('success', message);

        window.setTimeout(function () {
            window.location.replace(targetAfterLogin());
        }, 800);
    }

    function showSignedIn(session) {
        $('signedInEmail').textContent = (session && session.user && session.user.email) || '';
        showView('signedin', { keepAlert: true });
    }

    /* =========================================
       شاشة «تحقق من بريدك» + إعادة الإرسال بعد مهلة
    ========================================= */
    function stopCooldown() {
        if (cooldownTimer) {
            window.clearInterval(cooldownTimer);
            cooldownTimer = null;
        }
    }

    function startCooldown() {
        var button = $('noticeResend');
        var left = RESEND_SECONDS;

        stopCooldown();
        button.disabled = true;
        button.textContent = 'إعادة الإرسال بعد ' + left + ' ثانية';

        cooldownTimer = window.setInterval(function () {
            left -= 1;

            if (left <= 0) {
                stopCooldown();
                button.disabled = false;
                button.textContent = 'إعادة الإرسال';
                return;
            }

            button.textContent = 'إعادة الإرسال بعد ' + left + ' ثانية';
        }, 1000);
    }

    function showNotice(kind, email) {
        notice = { kind: kind, email: email };

        var isSignup = kind === 'signup';
        var text = $('noticeText');
        var strong = document.createElement('strong');
        strong.textContent = email;

        $('noticeTitle').textContent = isSignup ? 'تحقق من بريدك الإلكتروني' : 'تم إرسال رابط الاستعادة';

        text.textContent = '';
        if (isSignup) {
            text.appendChild(document.createTextNode('أرسلنا رسالة تأكيد إلى '));
            text.appendChild(strong);
            text.appendChild(document.createTextNode('. افتح الرسالة واضغط على رابط التأكيد لتفعيل حسابك، ثم سجّل الدخول. إن لم تجدها فتحقق من مجلد الرسائل غير المرغوب فيها (Spam).'));
        } else {
            text.appendChild(document.createTextNode('إن كان '));
            text.appendChild(strong);
            text.appendChild(document.createTextNode(' مسجّلًا لدينا فستصلك رسالة تحتوي على رابط لتعيين كلمة مرور جديدة خلال دقائق. الرابط صالح لمدة محدودة. تحقق أيضًا من مجلد الرسائل غير المرغوب فيها (Spam).'));
        }

        $('noticeChange').textContent = 'استخدام بريد آخر';
        showView('notice', { focus: false });
        startCooldown();
        $('noticeTitle').setAttribute('tabindex', '-1');
        $('noticeTitle').focus();
    }

    function resendFromNotice() {
        if (busy) return;
        busy = true;

        var button = $('noticeResend');
        button.disabled = true;

        var action = notice.kind === 'signup'
            ? Auth.resendConfirmation(notice.email)
            : Auth.sendPasswordReset(notice.email);

        action.then(function (result) {
            busy = false;

            if (result.ok) {
                alertBox.show('success', 'تمت إعادة إرسال الرسالة. تحقق من بريدك.');
                startCooldown();
            } else {
                alertBox.show('error', result.message);
                button.disabled = false;
            }
        });
    }

    /* =========================================
       إعادة إرسال رسالة التأكيد من شاشة الدخول
    ========================================= */
    function resendConfirmationFor(email, event) {
        var button = event && event.currentTarget;
        if (button) button.disabled = true;

        Auth.resendConfirmation(email).then(function (result) {
            if (result.ok) {
                alertBox.show('success', 'أُرسلت رسالة التأكيد من جديد. تحقق من بريدك (ومن الرسائل غير المرغوب فيها).');
            } else {
                alertBox.show('error', result.message);
            }
        });
    }

    /* =========================================
       النماذج
    ========================================= */
    function focusFirstInvalid(form) {
        var bad = form.querySelector('.invalid');
        if (bad) bad.focus();
    }

    function submitLogin(event) {
        event.preventDefault();
        if (busy) return;

        alertBox.hide();

        var emailIn = $('emailInput'), passIn = $('passwordInput');
        var email = emailIn.value.trim();
        var password = passIn.value;
        var valid = true;

        if (!UI.validateEmail(email)) {
            UI.setFieldError(emailIn, $('emailError'), 'يرجى إدخال بريد إلكتروني صحيح.');
            valid = false;
        } else {
            UI.setFieldError(emailIn, $('emailError'), '');
        }

        if (!password) {
            UI.setFieldError(passIn, $('passwordError'), 'يرجى إدخال كلمة المرور.');
            valid = false;
        } else {
            UI.setFieldError(passIn, $('passwordError'), '');
        }

        if (!valid) {
            focusFirstInvalid($('loginForm'));
            return;
        }

        busy = true;
        UI.setLoading($('loginBtn'), true);

        Auth.signIn(email, password).then(function (result) {
            if (result.ok) {
                onSignedIn('تم تسجيل الدخول بنجاح.');
                return;
            }

            busy = false;
            UI.setLoading($('loginBtn'), false);

            var actions = [];
            if (result.status === 'unconfirmed') {
                actions.push({
                    label: 'إعادة إرسال رسالة التأكيد',
                    onClick: function (ev) { resendConfirmationFor(email, ev); }
                });
            }

            alertBox.show('error', result.message, actions);
        });
    }

    function submitSignup(event) {
        event.preventDefault();
        if (busy) return;

        alertBox.hide();

        var emailIn = $('signupEmail'), passIn = $('signupPassword'), confirmIn = $('signupConfirm');
        var email = emailIn.value.trim();
        var valid = true;

        if (!UI.validateEmail(email)) {
            UI.setFieldError(emailIn, $('signupEmailError'), 'يرجى إدخال بريد إلكتروني صحيح.');
            valid = false;
        } else {
            UI.setFieldError(emailIn, $('signupEmailError'), '');
        }

        if (!UI.isPasswordValid(passIn.value)) {
            UI.setFieldError(passIn, $('signupPasswordError'), 'كلمة المرور يجب أن تكون 8 أحرف على الأقل وتجمع بين الحروف والأرقام.');
            valid = false;
        } else {
            UI.setFieldError(passIn, $('signupPasswordError'), '');
        }

        if (confirmIn.value !== passIn.value) {
            UI.setFieldError(confirmIn, $('signupConfirmError'), 'كلمتا المرور غير متطابقتين.');
            valid = false;
        } else {
            UI.setFieldError(confirmIn, $('signupConfirmError'), '');
        }

        if (!valid) {
            focusFirstInvalid($('signupForm'));
            return;
        }

        busy = true;
        UI.setLoading($('signupBtn'), true);

        Auth.signUp(email, passIn.value).then(function (result) {
            if (result.ok && result.status === 'signed-in') {
                onSignedIn('تم إنشاء حسابك بنجاح.');
                return;
            }

            busy = false;
            UI.setLoading($('signupBtn'), false);

            if (result.ok) {
                /* لا نحتفظ بكلمة المرور في الصفحة بعد النجاح */
                passIn.value = '';
                confirmIn.value = '';
                showNotice('signup', email);
                return;
            }

            var actions = [];
            if (result.status === 'exists') {
                actions.push({
                    label: 'تسجيل الدخول',
                    onClick: function () { carryEmail('signupEmail', 'emailInput'); showView('login', { focus: true }); }
                });
                actions.push({
                    label: 'نسيت كلمة المرور؟',
                    onClick: function () { carryEmail('signupEmail', 'forgotEmail'); showView('forgot', { focus: true }); }
                });
            }

            alertBox.show('error', result.message, actions);
        });
    }

    function submitForgot(event) {
        event.preventDefault();
        if (busy) return;

        alertBox.hide();

        var emailIn = $('forgotEmail');
        var email = emailIn.value.trim();

        if (!UI.validateEmail(email)) {
            UI.setFieldError(emailIn, $('forgotEmailError'), 'يرجى إدخال بريد إلكتروني صحيح.');
            emailIn.focus();
            return;
        }

        UI.setFieldError(emailIn, $('forgotEmailError'), '');

        busy = true;
        UI.setLoading($('forgotBtn'), true);

        Auth.sendPasswordReset(email).then(function (result) {
            busy = false;
            UI.setLoading($('forgotBtn'), false);

            if (result.ok) {
                showNotice('reset', email);
            } else {
                alertBox.show('error', result.message);
            }
        });
    }

    function startGoogle() {
        if (busy) return;

        var button = $('googleLoginBtn');
        var label = $('googleLoginText');
        var original = label.textContent;

        alertBox.hide();
        busy = true;
        button.disabled = true;
        label.textContent = 'جارٍ التحويل إلى Google…';

        Auth.signInWithGoogle().then(function (result) {
            /* عند النجاح يتولى المتصفح الانتقال إلى Google؛ نُبقي الزر معطّلًا */
            if (result.ok) return;

            busy = false;
            button.disabled = false;
            label.textContent = original;
            alertBox.show('error', result.message);
        });
    }

    /* =========================================
       ربط الأحداث
    ========================================= */
    function bindEvents() {
        UI.bindPasswordToggles(document);
        UI.bindPasswordRules($('signupPassword'), $('signupPasswordRules'));

        $('loginForm').addEventListener('submit', submitLogin);
        $('signupForm').addEventListener('submit', submitSignup);
        $('forgotForm').addEventListener('submit', submitForgot);
        $('googleLoginBtn').addEventListener('click', startGoogle);

        /* مسح خطأ الحقل عند الكتابة */
        [
            ['emailInput', 'emailError'], ['passwordInput', 'passwordError'],
            ['signupEmail', 'signupEmailError'], ['signupPassword', 'signupPasswordError'],
            ['signupConfirm', 'signupConfirmError'], ['forgotEmail', 'forgotEmailError']
        ].forEach(function (pair) {
            $(pair[0]).addEventListener('input', function () {
                UI.setFieldError($(pair[0]), $(pair[1]), '');
                alertBox.hide();
            });
        });

        /* التبويبات (مع التنقل بالأسهم) */
        [$('tabLogin'), $('tabSignup')].forEach(function (tab) {
            tab.addEventListener('click', function () {
                var target = tab.getAttribute('data-mode');
                if (target === currentMode) return;

                if (target === 'signup') carryEmail('emailInput', 'signupEmail');
                else carryEmail('signupEmail', 'emailInput');

                showView(target);
            });

            tab.addEventListener('keydown', function (event) {
                if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;

                event.preventDefault();
                var other = tab === $('tabLogin') ? $('tabSignup') : $('tabLogin');
                other.click();
                other.focus();
            });
        });

        $('forgotLink').addEventListener('click', function (event) {
            event.preventDefault();
            carryEmail('emailInput', 'forgotEmail');
            showView('forgot', { focus: true });
        });

        $('forgotBack').addEventListener('click', function () {
            carryEmail('forgotEmail', 'emailInput');
            showView('login', { focus: true });
        });

        $('noticeResend').addEventListener('click', resendFromNotice);

        $('noticeChange').addEventListener('click', function () {
            showView(notice.kind === 'signup' ? 'signup' : 'forgot', { focus: true });
        });

        $('noticeLogin').addEventListener('click', function () {
            carryEmail(notice.kind === 'signup' ? 'signupEmail' : 'forgotEmail', 'emailInput');
            showView('login', { focus: true });
        });

        $('signedInContinue').addEventListener('click', function () {
            window.location.assign(targetAfterLogin());
        });

        $('signedInLogout').addEventListener('click', function () {
            var button = $('signedInLogout');
            button.disabled = true;

            Auth.signOut().then(function (result) {
                button.disabled = false;
                if (result && result.ok) showView('login', { focus: true });
            });
        });

        /* العودة من bfcache (زر الرجوع بعد الانتقال إلى Google): نعيد الأزرار لحالتها */
        window.addEventListener('pageshow', function (event) {
            if (!event.persisted || redirecting) return;

            busy = false;
            UI.setLoading($('loginBtn'), false);
            UI.setLoading($('signupBtn'), false);
            UI.setLoading($('forgotBtn'), false);
            $('googleLoginBtn').disabled = false;
            $('googleLoginText').textContent = 'المتابعة باستخدام Google';
        });
    }

    /* =========================================
       معاملات الرابط
    ========================================= */
    /** يمسح معاملات الخطأ من شريط العنوان حتى لا تظهر الرسالة مجددًا عند التحديث. */
    function cleanErrorParams() {
        try {
            var query = new URLSearchParams(window.location.search);
            ['error', 'error_code', 'error_description'].forEach(function (key) { query.delete(key); });

            var search = query.toString();
            /* أخطاء روابط البريد وGoogle تأتي غالبًا في الـ hash (#error=...) فنمسحه أيضًا */
            var hash = /(^#|&)error=/.test(window.location.hash) ? '' : window.location.hash;
            window.history.replaceState(null, '', window.location.pathname + (search ? '?' + search : '') + hash);
        } catch (e) { /* لا شيء */ }
    }

    function readParams() {
        var params = new URLSearchParams(window.location.search);

        returnTarget = Auth.safeReturnUrl(params.get('returnTo'));
        /* نحفظها أيضًا لأن العودة من Google أو من رابط البريد تأتي بلا هذه المعاملات */
        if (returnTarget) Auth.rememberReturnTo(returnTarget);

        var mode = params.get('mode');
        return mode === 'signup' || mode === 'forgot' ? mode : 'login';
    }

    /* =========================================
       التشغيل
    ========================================= */
    function init() {
        if (!Auth || !UI || !alertBox) {
            console.error('تعذر تحميل js/auth.js أو js/auth-ui.js');
            return;
        }

        bindEvents();
        showView(readParams());

        var callbackMessage = Auth.callbackErrorMessage();
        if (callbackMessage) {
            alertBox.show('error', callbackMessage);
            cleanErrorParams();
        }

        if (!Auth.getClient()) {
            alertBox.show('error', 'تعذر تحميل خدمة الحساب. تحقق من اتصال الإنترنت وأعد تحميل الصفحة.');
            return;
        }

        Auth.getSession().then(function (result) {
            if (result.error) {
                console.error('تعذر قراءة الجلسة:', result.error);
                return;
            }

            if (!result.session || busy) return;

            var cb = Auth.callback;

            if (cb.hasTokens || cb.hasCode) {
                /* عودة من رابط تأكيد البريد أو من Google */
                var confirmed = cb.type === 'signup' || cb.type === 'email';
                onSignedIn(confirmed
                    ? 'تم تأكيد بريدك الإلكتروني وتسجيل دخولك بنجاح.'
                    : 'تم تسجيل الدخول بنجاح.');
            } else {
                showSignedIn(result.session);
            }
        });

        /* تغيّر الجلسة من تبويب آخر */
        Auth.onChange(function (event, session) {
            if (busy || redirecting) return;

            if (event === 'SIGNED_OUT' && currentMode === 'signedin') {
                showView('login');
            } else if (event === 'SIGNED_IN' && session && (currentMode === 'login' || currentMode === 'signup')) {
                showSignedIn(session);
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
