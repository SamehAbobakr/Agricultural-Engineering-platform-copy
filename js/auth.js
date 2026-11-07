/**
 * auth.js — المصدر الوحيد لمنطق المصادقة في المنصة
 *
 * ما يفعله هذا الملف (وما لا يفعله أي ملف آخر):
 *   1) ينشئ عميل Supabase واحدًا فقط لكل صفحة (PlatformAuth.getClient()).
 *      لا تستدعِ supabase.createClient() في أي مكان آخر، وإلا يظهر التحذير
 *      "Multiple GoTrueClient instances detected".
 *   2) يشترك مرة واحدة في onAuthStateChange ويوزّع الأحداث على من يطلبها
 *      (PlatformAuth.onChange) — مثل لوحة إنجاز الطالب.
 *   3) يُظهر «تسجيل الخروج» أو «تسجيل الدخول» في الهيدر وقائمة الموبايل
 *      بحسب الجلسة الفعلية، ويُنفّذ signOut() عند الضغط.
 *   4) عمليات الحساب التي تستدعيها login.js وreset-password.js:
 *      signUp / signIn / signInWithGoogle / sendPasswordReset / resendConfirmation / updatePassword.
 *      كلها تُرجع { ok, status, message, error } — الرسالة عربية جاهزة للعرض.
 *   5) معالجة الرجوع من رابط البريد أو من Google (PlatformAuth.callback) ووجهة العودة بعد الدخول.
 *   6) زر «🛡️ لوحة الإدارة» في الهيدر وقائمة الموبايل للمسؤولين فقط (يسأل الدالة is_admin() في قاعدة البيانات).
 *      الزر للعرض فقط؛ الحماية الفعلية في PostgreSQL (انظر database/admin/).
 *
 * ترتيب التحميل: يُحمَّل في <head> قبل header.js. لا يحتاج مكتبة Supabase ولا config.js
 * وقت التحميل؛ فهو يقرأهما عند أول استدعاء لـ getClient() (بعد تحميلهما).
 *
 * لا أسرار هنا: المفتاح في config.js مفتاح عام (publishable). كل أسرار Google OAuth وSMTP
 * تُضبط داخل لوحة Supabase فقط (انظر docs/auth-setup.md).
 */
(function () {
    'use strict';

    if (window.PlatformAuth) return;

    /* روابط الدخول/الخروج في الهيدر (سطح المكتب) وقائمة الموبايل */
    var LINK_SELECTOR =
        '.nav-desktop-actions .login-link, #mobileNavDrawer a[href$="login.html"]';

    /* أي بيانات تقدّم خاصة بمستخدم تُخزَّن في المتصفح يجب أن يبدأ مفتاحها بهذه البادئة،
       فتُمسح تلقائيًا عند تسجيل الخروج أو تبديل الحساب (لا يظهر تقدّم مستخدم سابق لغيره). */
    var USER_CACHE_PREFIX = 'agri_user_';
    var RETURN_KEY = 'agri_auth_return_to';

    var client = null;
    var subscribed = false;
    var listeners = [];
    var currentSession = null;
    var lastUserId = null;
    var signingOut = false;
    var authLinks = [];
    var linksBound = false;

    /* =========================================
       جذر الموقع (يعمل من أي مجلد، وعلى المسار الفرعي لـ GitHub Pages)
       auth.js يقع دائمًا في <الجذر>/js/auth.js
    ========================================= */
    var SITE_ROOT = (function () {
        try {
            var src = document.currentScript && document.currentScript.src;
            if (src) return new URL('../', src).href;
        } catch (e) { /* نكمل بالاحتياطي */ }

        return new URL('./', window.location.href).href;
    })();

    function pageUrl(path) {
        return new URL(path || '', SITE_ROOT).href;
    }

    /* =========================================
       معاملات الرجوع من البريد / Google
       تُقرأ هنا فورًا لأن مكتبة Supabase تمسح الـ hash بعد معالجته
    ========================================= */
    var callback = (function () {
        var hashParams = new URLSearchParams(String(window.location.hash || '').replace(/^#/, ''));
        var queryParams = new URLSearchParams(window.location.search || '');

        function pick(key) {
            return hashParams.get(key) || queryParams.get(key) || '';
        }

        return {
            hasTokens: hashParams.has('access_token'),
            hasCode: queryParams.has('code'),
            type: pick('type'),
            error: pick('error'),
            errorCode: pick('error_code'),
            errorDescription: pick('error_description'),
            hashHasError: hashParams.has('error') && hashParams.has('error_description')
        };
    })();

    /* رابط الاستعادة قد يصل إلى صفحة غير reset-password.html إذا لم يكن الرابط ضمن Redirect URLs
       فيعود Supabase إلى Site URL. نحوّله هنا بدل أن يُسجَّل الدخول بصمت بلا نموذج تغيير كلمة المرور. */
    (function redirectStrayCallback() {
        var path = window.location.pathname;
        var onLogin = /\/login\.html$/.test(path);
        var onReset = /\/reset-password\.html$/.test(path);

        if (callback.type === 'recovery' && callback.hasTokens && !onReset) {
            window.location.replace(pageUrl('reset-password.html') + window.location.hash);
        } else if (callback.hashHasError && !onLogin && !onReset) {
            window.location.replace(pageUrl('login.html') + window.location.hash);
        }
    })();

    /* =========================================
       العميل الوحيد
    ========================================= */
    function getClient() {
        if (client) return client;

        if (!window.supabase || typeof window.supabase.createClient !== 'function') return null;
        if (typeof SUPABASE_URL === 'undefined' || typeof SUPABASE_KEY === 'undefined') return null;
        /* config.js يضع سبب الرفض (مفتاح لم يُضبط أو مفتاح سري) ويعرض رسالة ظاهرة للمطوّر */
        if (window.SUPABASE_CONFIG_ERROR) return null;

        client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        return client;
    }

    /* =========================================
       رسائل الأخطاء (عربية، ولا تكشف تفاصيل داخلية)
    ========================================= */
    function errorMessage(error) {
        if (!error) return 'حدث خطأ غير متوقع. حاول مرة أخرى.';

        var code = String(error.code || error.error_code || '').toLowerCase();
        var text = String(error.message || error.error_description || '').toLowerCase();
        var name = String(error.name || '');

        function has(part) { return text.indexOf(part) !== -1; }

        if (name === 'AuthRetryableFetchError' || has('failed to fetch') || has('networkerror') || has('load failed')) {
            return 'تعذر الاتصال بالخادم. تحقق من الإنترنت وحاول مرة أخرى.';
        }
        if (code === 'invalid_credentials' || has('invalid login credentials')) {
            return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
        }
        if (code === 'email_not_confirmed' || has('email not confirmed')) {
            return 'لم يتم تأكيد بريدك الإلكتروني بعد. افتح رسالة التأكيد المرسلة إليك أو اطلب إعادة إرسالها.';
        }
        if (code === 'user_already_exists' || code === 'email_exists' || has('already registered')) {
            return 'هذا البريد الإلكتروني مسجّل بالفعل. سجّل الدخول أو استعد كلمة المرور.';
        }
        /* same_password قبل weak_password: رسالتاهما تبدآن بـ "password should be" */
        if (code === 'same_password' || has('different from the old password')) {
            return 'كلمة المرور الجديدة يجب أن تختلف عن كلمة المرور الحالية.';
        }
        if (code === 'weak_password' || has('password should be at least') || has('weak password')) {
            return 'كلمة المرور ضعيفة. استخدم 8 أحرف على الأقل تجمع بين الحروف والأرقام.';
        }
        if (code === 'over_email_send_rate_limit' || has('email rate limit') || has('for security purposes')) {
            return 'تم طلب رسائل كثيرة في وقت قصير. انتظر دقيقة أو أكثر ثم حاول مرة أخرى.';
        }
        if (code === 'over_request_rate_limit' || error.status === 429 || has('rate limit')) {
            return 'محاولات كثيرة في وقت قصير. انتظر قليلًا ثم حاول مرة أخرى.';
        }
        if (code === 'otp_expired' || has('link is invalid or has expired') || has('token has expired')) {
            return 'انتهت صلاحية الرابط أو سبق استخدامه. اطلب رابطًا جديدًا.';
        }
        if (code === 'session_not_found' || code === 'session_expired' || code === 'bad_jwt' || has('auth session missing')) {
            return 'انتهت جلسة الاستعادة أو أن الرابط غير صالح. اطلب رابطًا جديدًا.';
        }
        if (code === 'signup_disabled' || has('signups not allowed')) {
            return 'إنشاء حسابات جديدة متوقف حاليًا.';
        }
        if (code === 'email_address_invalid' || has('unable to validate email')) {
            return 'البريد الإلكتروني غير صالح.';
        }
        if (code === 'provider_disabled' || has('provider is not enabled') || has('unsupported provider')) {
            return 'تسجيل الدخول بحساب Google غير مفعّل حاليًا.';
        }
        if (code === 'access_denied') {
            return 'تم إلغاء تسجيل الدخول أو رُفض الإذن.';
        }
        if (has('error sending') || has('smtp')) {
            return 'تعذر إرسال الرسالة الآن. حاول لاحقًا.';
        }

        return 'حدث خطأ غير متوقع. حاول مرة أخرى.';
    }

    /** رسالة عربية لخطأ جاء في رابط الرجوع (رابط منتهي، إلغاء Google...) أو نص فارغ إن لم يوجد خطأ. */
    function callbackErrorMessage() {
        if (!callback.error && !callback.errorCode) return '';

        return errorMessage({
            code: callback.errorCode || callback.error,
            message: callback.errorDescription
        });
    }

    function fail(error, extra) {
        var result = { ok: false, message: errorMessage(error), error: error };

        if (extra) Object.keys(extra).forEach(function (key) { result[key] = extra[key]; });
        return result;
    }

    function unavailable() {
        return {
            ok: false,
            message: 'خدمة الحساب غير متاحة. تحقق من الاتصال بالإنترنت وأعد تحميل الصفحة.',
            error: new Error('auth client unavailable')
        };
    }

    /* =========================================
       وجهة العودة بعد الدخول (من نفس الموقع فقط)
    ========================================= */

    /** تقبل رابطًا نسبيًا أو مطلقًا داخل المنصة فقط، وتُرجع رابطًا مطلقًا أو null. */
    function safeReturnUrl(raw) {
        if (!raw) return null;

        try {
            var url = new URL(String(raw), SITE_ROOT);

            if (url.origin !== window.location.origin) return null;
            if (url.href.indexOf(SITE_ROOT) !== 0) return null;
            /* لا نعود إلى صفحات المصادقة نفسها (حلقة) */
            if (/\/(login|reset-password)\.html$/.test(url.pathname)) return null;

            return url.href;
        } catch (e) {
            return null;
        }
    }

    function rememberReturnTo(url) {
        var safe = safeReturnUrl(url);
        if (!safe) return;

        try { window.sessionStorage.setItem(RETURN_KEY, safe); } catch (e) { /* التخزين غير متاح */ }
    }

    function consumeReturnTo() {
        try {
            var stored = window.sessionStorage.getItem(RETURN_KEY);
            window.sessionStorage.removeItem(RETURN_KEY);
            return safeReturnUrl(stored);
        } catch (e) {
            return null;
        }
    }

    /** رابط صفحة الدخول مع العودة إلى صفحة معيّنة بعد النجاح (مثلًا: PlatformAuth.loginUrl(location.href)). */
    function loginUrl(returnTo) {
        var safe = safeReturnUrl(returnTo);
        return pageUrl('login.html') + (safe ? '?returnTo=' + encodeURIComponent(safe) : '');
    }

    /* =========================================
       عمليات الحساب
    ========================================= */
    function signUp(email, password) {
        var c = getClient();
        if (!c) return Promise.resolve(unavailable());

        return c.auth.signUp({
            email: email,
            password: password,
            options: { emailRedirectTo: pageUrl('login.html') }
        }).then(function (result) {
            if (result.error) return fail(result.error, { status: 'error' });

            var data = result.data || {};

            /* التأكيد معطّل في Supabase: يُنشأ الحساب وتبدأ الجلسة مباشرة */
            if (data.session) return { ok: true, status: 'signed-in', data: data };

            /* بريد مسجّل مسبقًا: مع تفعيل التأكيد لا يُرجع Supabase خطأ (لمنع كشف الحسابات)
               بل مستخدمًا بلا identities */
            if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
                return {
                    ok: false,
                    status: 'exists',
                    message: 'هذا البريد الإلكتروني مسجّل بالفعل. سجّل الدخول أو استعد كلمة المرور. وإن كنت أنشأت حسابك سابقًا عبر Google فاستخدم زر Google.',
                    error: null
                };
            }

            return { ok: true, status: 'confirm', data: data };
        }).catch(function (error) {
            return fail(error, { status: 'error' });
        });
    }

    function signIn(email, password) {
        var c = getClient();
        if (!c) return Promise.resolve(unavailable());

        return c.auth.signInWithPassword({ email: email, password: password }).then(function (result) {
            if (result.error) {
                var code = String(result.error.code || '').toLowerCase();
                var unconfirmed = code === 'email_not_confirmed' ||
                    String(result.error.message || '').toLowerCase().indexOf('email not confirmed') !== -1;

                return fail(result.error, { status: unconfirmed ? 'unconfirmed' : 'error' });
            }

            if (!result.data || !result.data.session) {
                return { ok: false, status: 'error', message: 'لم يتم إنشاء جلسة دخول. حاول مرة أخرى.', error: null };
            }

            return { ok: true, status: 'signed-in', data: result.data };
        }).catch(function (error) {
            return fail(error, { status: 'error' });
        });
    }

    /**
     * Google عبر Supabase Auth. لا أسرار في الواجهة: Client ID وSecret يُضبطان في لوحة Supabase.
     * قبل التحويل نقرأ إعدادات المزوّدين العامة؛ فإن كان Google غير مفعّل نعرض رسالة واضحة
     * بدل أن يُنقل الطالب إلى صفحة خطأ JSON خام من خادم Supabase.
     */
    function signInWithGoogle() {
        var c = getClient();
        if (!c) return Promise.resolve(unavailable());

        function start() {
            return c.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: pageUrl('login.html') }
            }).then(function (result) {
                if (result.error) return fail(result.error, { status: 'error' });
                return { ok: true, status: 'redirecting' };
            });
        }

        return window.fetch(SUPABASE_URL + '/auth/v1/settings', { headers: { apikey: SUPABASE_KEY } })
            .then(function (response) {
                if (!response.ok) throw new Error('settings ' + response.status);
                return response.json();
            })
            .then(function (settings) {
                if (settings && settings.external && settings.external.google === false) {
                    return {
                        ok: false,
                        status: 'provider_disabled',
                        message: 'تسجيل الدخول بحساب Google غير مفعّل حاليًا. استخدم البريد الإلكتروني وكلمة المرور.',
                        error: null
                    };
                }

                return start();
            })
            .catch(function (error) {
                return fail(error, { status: 'error' });
            });
    }

    function sendPasswordReset(email) {
        var c = getClient();
        if (!c) return Promise.resolve(unavailable());

        return c.auth.resetPasswordForEmail(email, {
            redirectTo: pageUrl('reset-password.html')
        }).then(function (result) {
            if (result.error) return fail(result.error, { status: 'error' });
            return { ok: true, status: 'sent' };
        }).catch(function (error) {
            return fail(error, { status: 'error' });
        });
    }

    function resendConfirmation(email) {
        var c = getClient();
        if (!c) return Promise.resolve(unavailable());

        return c.auth.resend({
            type: 'signup',
            email: email,
            options: { emailRedirectTo: pageUrl('login.html') }
        }).then(function (result) {
            if (result.error) return fail(result.error, { status: 'error' });
            return { ok: true, status: 'sent' };
        }).catch(function (error) {
            return fail(error, { status: 'error' });
        });
    }

    /** تعيين كلمة مرور جديدة (يتطلب جلسة استعادة صالحة من رابط البريد). */
    function updatePassword(password) {
        var c = getClient();
        if (!c) return Promise.resolve(unavailable());

        return c.auth.updateUser({ password: password }).then(function (result) {
            if (result.error) return fail(result.error, { status: 'error' });
            return { ok: true, status: 'updated' };
        }).catch(function (error) {
            return fail(error, { status: 'error' });
        });
    }

    /* =========================================
       الجلسة والأحداث
    ========================================= */

    /** تُرجع { session, error } — error فارغ يعني أن الجلسة (أو غيابها) مؤكَّدة. */
    function getSession() {
        var c = getClient();

        if (!c) {
            return Promise.resolve({ session: null, error: new Error('خدمة الحساب غير متاحة') });
        }

        return c.auth.getSession().then(function (result) {
            if (result.error) return { session: null, error: result.error };

            currentSession = result.data.session || null;
            trackUser(currentSession);
            return { session: currentSession, error: null };
        }).catch(function (error) {
            return { session: null, error: error };
        });
    }

    /** معرّف المستخدم الحقيقي في Supabase Auth (auth.uid()) أو null. للعرض فقط؛ الحماية في RLS. */
    function getUserId() {
        return currentSession && currentSession.user ? currentSession.user.id : null;
    }

    /** يمسح من المتصفح كل ما يخص مستخدمًا (المفاتيح التي تبدأ بـ agri_user_). */
    function purgeUserCaches() {
        [window.localStorage, window.sessionStorage].forEach(function (storage) {
            try {
                var keys = [];

                for (var i = 0; i < storage.length; i++) {
                    var key = storage.key(i);
                    if (key && key.indexOf(USER_CACHE_PREFIX) === 0) keys.push(key);
                }

                keys.forEach(function (key) { storage.removeItem(key); });
            } catch (e) { /* التخزين غير متاح */ }
        });
    }

    /** عند تبدّل المستخدم أو خروجه تُمسح بيانات المستخدم السابق. */
    function trackUser(session) {
        var userId = session && session.user ? session.user.id : null;

        if (lastUserId && userId !== lastUserId) purgeUserCaches();

        lastUserId = userId;
    }

    function emit(event, session) {
        /* تأجيل الاستدعاء: Supabase لا ينصح باستدعاء دوال العميل داخل callback الحدث مباشرة */
        listeners.slice().forEach(function (callbackFn) {
            setTimeout(function () {
                try {
                    callbackFn(event, session);
                } catch (error) {
                    console.error('خطأ في مستمع حالة الدخول:', error);
                }
            }, 0);
        });
    }

    function ensureSubscription() {
        var c = getClient();
        if (!c) return false;
        if (subscribed) return true;

        subscribed = true;

        c.auth.onAuthStateChange(function (event, session) {
            currentSession = session || null;
            if (event === 'SIGNED_OUT') purgeUserCaches();
            trackUser(currentSession);
            updateLinks();
            /* تأجيل: لا نستدعي دوال العميل داخل callback الحدث مباشرة */
            setTimeout(refreshAdminLink, 0);
            emit(event, currentSession);
        });

        return true;
    }

    /** يسجّل مستمعًا لتغيّر الجلسة. يرجع دالة لإلغاء التسجيل. */
    function onChange(callbackFn) {
        listeners.push(callbackFn);
        ensureSubscription();

        return function () {
            listeners = listeners.filter(function (item) { return item !== callbackFn; });
        };
    }

    function isSignedIn() {
        return Boolean(currentSession);
    }

    /* =========================================
       المسؤول: زر «لوحة الإدارة» (عرض فقط) وفحص طازج للصفحة نفسها
       is_admin() = بريد مضاف يدويًا في admin_emails + حساب مؤكَّد البريد (database/admin/).
       النتيجة تُخزَّن في sessionStorage تحت agri_user_ فتُمسح مع الخروج وتبدّل الحساب.
    ========================================= */
    var ADMIN_CACHE_KEY = USER_CACHE_PREFIX + 'is_admin';

    function adminUrl() {
        return pageUrl('admin/index.html');
    }

    /**
     * فحص مباشر من الخادم (بلا كاش) — تستعمله صفحة الإدارة نفسها.
     * { admin: true|false, installed: false إن لم تُنفَّذ ملفات SQL, error }
     */
    function checkAdmin() {
        var c = getClient();
        if (!c) return Promise.resolve({ admin: false, installed: true, error: new Error('خدمة الحساب غير متاحة') });

        return c.rpc('is_admin').then(function (res) {
            if (res.error) {
                var code = String(res.error.code || '');
                var missing = code === 'PGRST202' || code === '42883';
                return { admin: false, installed: !missing, error: res.error };
            }

            return { admin: res.data === true, installed: true, error: null };
        }).catch(function (error) {
            return { admin: false, installed: true, error: error };
        });
    }

    function readAdminCache(userId) {
        try {
            var v = window.sessionStorage.getItem(ADMIN_CACHE_KEY) || '';
            if (v.indexOf(userId + ':') !== 0) return null;
            return v.slice(userId.length + 1) === '1';
        } catch (e) {
            return null;
        }
    }

    function writeAdminCache(userId, isAdmin) {
        try { window.sessionStorage.setItem(ADMIN_CACHE_KEY, userId + ':' + (isAdmin ? '1' : '0')); } catch (e) { /* غير متاح */ }
    }

    function renderAdminLinks(show) {
        var old = document.querySelectorAll('[data-admin-link]');
        for (var i = 0; i < old.length; i++) old[i].parentNode.removeChild(old[i]);

        if (!show) return;

        var onAdmin = /\/admin\//.test(window.location.pathname);

        var desktop = document.querySelector('.nav-desktop-actions');
        if (desktop) {
            var a = document.createElement('a');
            a.className = 'nav-action-link';
            a.href = adminUrl();
            a.setAttribute('data-admin-link', '');
            a.textContent = '🛡️ لوحة الإدارة';
            if (onAdmin) a.setAttribute('aria-current', 'page');
            desktop.insertBefore(a, desktop.firstChild);
        }

        var group = document.querySelector('#mobileNavDrawer .drawer-action-group');
        if (group) {
            var b = document.createElement('a');
            b.className = 'drawer-action-btn';
            b.href = adminUrl();
            b.setAttribute('data-admin-link', '');
            var icon = document.createElement('span');
            icon.textContent = '🛡️';
            b.appendChild(icon);
            b.appendChild(document.createTextNode(' لوحة الإدارة'));
            group.insertBefore(b, group.firstChild);
        }
    }

    /** يُظهر الزر للمسؤول فقط. أي فشل (دالة غير مثبتة، انقطاع) = لا زر، بصمت. */
    function refreshAdminLink() {
        var user = currentSession && currentSession.user;

        if (!user) { renderAdminLinks(false); return; }

        var cached = readAdminCache(user.id);
        if (cached !== null) { renderAdminLinks(cached); return; }

        if (!getClient()) return;

        checkAdmin().then(function (result) {
            if (!currentSession || !currentSession.user || currentSession.user.id !== user.id) return;
            if (result.error) { renderAdminLinks(false); return; }

            writeAdminCache(user.id, result.admin);
            renderAdminLinks(result.admin);
        });
    }

    /* =========================================
       تسجيل الخروج
    ========================================= */
    function setBusy(isBusy) {
        authLinks.forEach(function (link) {
            if (isBusy) link.setAttribute('aria-busy', 'true');
            else link.removeAttribute('aria-busy');
        });
    }

    function signOut() {
        if (signingOut) return Promise.resolve({ ok: false, busy: true });

        var c = getClient();

        if (!c) {
            window.alert('تعذر تسجيل الخروج: خدمة الحساب غير متاحة. تحقق من الاتصال بالإنترنت.');
            return Promise.resolve({ ok: false });
        }

        signingOut = true;
        setBusy(true);

        return c.auth.signOut().then(function (result) {
            if (result && result.error) throw result.error;

            currentSession = null;
            purgeUserCaches();
            trackUser(null);
            updateLinks();

            return { ok: true };
        }).catch(function (error) {
            console.error('تعذر تسجيل الخروج:', error);
            window.alert('تعذر تسجيل الخروج. حاول مرة أخرى.');

            return { ok: false, error: error };
        }).then(function (result) {
            signingOut = false;
            setBusy(false);

            return result;
        });
    }

    /* =========================================
       أزرار الهيدر
    ========================================= */
    function renderLink(link, loggedIn) {
        if (link.dataset.authOriginalHtml === undefined) {
            link.dataset.authOriginalHtml = link.innerHTML;
            link.dataset.authOriginalHref = link.getAttribute('href') || 'login.html';
        }

        if (!loggedIn) {
            link.innerHTML = link.dataset.authOriginalHtml;
            link.setAttribute('href', link.dataset.authOriginalHref);
            link.dataset.authState = 'out';
            return;
        }

        var first = link.firstElementChild;
        var hasIcon = Boolean(first && first.tagName === 'SPAN');

        link.textContent = '';

        if (hasIcon) {
            var icon = first.cloneNode(false);
            icon.textContent = '🚪';
            link.appendChild(icon);
            link.appendChild(document.createTextNode(' تسجيل الخروج'));
        } else {
            link.appendChild(document.createTextNode('👤 تسجيل الخروج'));
        }

        link.setAttribute('href', '#logout');
        link.dataset.authState = 'in';
    }

    function updateLinks() {
        var loggedIn = Boolean(currentSession);

        authLinks.forEach(function (link) {
            renderLink(link, loggedIn);
        });
    }

    function collectLinks() {
        authLinks = Array.prototype.slice.call(document.querySelectorAll(LINK_SELECTOR));

        authLinks.forEach(function (link) {
            link.setAttribute('data-auth-link', '');
        });

        if (linksBound) return;
        linksBound = true;

        /* مستمع واحد على المستند (لا يتكرر مهما تكررت التهيئة) */
        document.addEventListener('click', function (event) {
            var link = event.target.closest && event.target.closest('[data-auth-link]');

            if (!link || !currentSession) return;

            event.preventDefault();
            signOut();
        });
    }

    /* =========================================
       التهيئة
    ========================================= */
    function init() {
        collectLinks();

        /* لو تعذر تحميل مكتبة Supabase نترك الروابط كما هي («تسجيل الدخول») */
        if (!ensureSubscription()) return;

        getSession().then(function (result) {
            if (result.error) {
                console.error('تعذر قراءة جلسة المستخدم:', result.error);
                return;
            }

            updateLinks();
            refreshAdminLink();
        });

        /* العودة من bfcache (زر الرجوع): الجلسة قد تكون تغيّرت أثناء غياب الصفحة */
        window.addEventListener('pageshow', function (event) {
            if (!event.persisted) return;

            getSession().then(function (result) {
                if (result.error) return;

                updateLinks();
                refreshAdminLink();
                emit('PAGESHOW', result.session);
            });
        });
    }

    window.PlatformAuth = {
        /* العميل والجلسة */
        getClient: getClient,
        getSession: getSession,
        onChange: onChange,
        signOut: signOut,
        isSignedIn: isSignedIn,
        getUserId: getUserId,

        /* المسؤول */
        checkAdmin: checkAdmin,
        adminUrl: adminUrl,

        /* عمليات الحساب */
        signUp: signUp,
        signIn: signIn,
        signInWithGoogle: signInWithGoogle,
        sendPasswordReset: sendPasswordReset,
        resendConfirmation: resendConfirmation,
        updatePassword: updatePassword,

        /* الرجوع من البريد/Google ووجهة العودة */
        callback: callback,
        callbackErrorMessage: callbackErrorMessage,
        errorMessage: errorMessage,
        pageUrl: pageUrl,
        loginUrl: loginUrl,
        safeReturnUrl: safeReturnUrl,
        rememberReturnTo: rememberReturnTo,
        consumeReturnTo: consumeReturnTo,

        USER_CACHE_PREFIX: USER_CACHE_PREFIX
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
