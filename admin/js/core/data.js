/**
 * data.js — طبقة الوصول للبيانات (Data Access Layer) للوحة الإدارة
 *
 * - الوحيدة التي تكلّم Supabase في لوحة الإدارة. الوحدات (modules) لا تستدعي supabase مباشرة.
 * - تستخدم عميل المنصة الوحيد (PlatformAuth.getClient) وجلسة دخول المنصة نفسها.
 * - كل دالة تُرجع { data, error, message, count } ولا ترمي أخطاء (نفس أسلوب about/js/rooms-api.js).
 * - الحماية الحقيقية في PostgreSQL: سياسات RLS (admin_all) تسمح بالكتابة للمسؤول فقط
 *   (database/admin/001_admin_setup.sql). الواجهة هنا لراحة المستخدم لا للحماية.
 */
(function () {
    'use strict';

    var DEFAULT_TIMEOUT = 20000;
    var MAX_PAGE = 100;

    function client() {
        return (window.PlatformAuth && window.PlatformAuth.getClient()) || null;
    }

    function withTimeout(promise, ms) {
        return new Promise(function (resolve, reject) {
            var t = setTimeout(function () { reject(new Error('انتهت مهلة الاتصال بالخادم.')); }, ms);
            promise.then(function (v) { clearTimeout(t); resolve(v); },
                         function (e) { clearTimeout(t); reject(e); });
        });
    }

    /** رسالة عربية مفهومة دون كشف تفاصيل داخلية */
    function friendlyError(error) {
        if (!error) return 'حدث خطأ غير متوقع.';
        var code = String(error.code || '');
        var msg = String(error.message || '');

        if (code === 'PGRST202' || code === '42883') {
            return 'الدالة المطلوبة غير موجودة في قاعدة البيانات. نفّذ database/admin/001_admin_setup.sql أولًا.';
        }
        if (code === '42501' || /permission denied|row-level security/i.test(msg)) {
            return 'ليست لديك صلاحية تنفيذ هذه العملية.';
        }
        if (code === 'PGRST301' || code === 'PGRST303' || /jwt/i.test(msg)) {
            return 'انتهت الجلسة. سجّل الدخول من جديد.';
        }
        if (code === '23505') return 'القيمة مكررة؛ يوجد سجل بنفس البيانات (مثل رابط مختصر مستخدم من قبل).';
        if (code === '23503') return 'لا يمكن إتمام العملية لأن بيانات أخرى مرتبطة بهذا السجل (مثل إنجازات الطلاب). أخفِه بدل حذفه.';
        if (code === '23514') return 'قيمة غير مقبولة في قاعدة البيانات (طول أو صيغة غير صحيحة). راجع الحقول وحاول مرة أخرى.';
        if (code === '23502') return 'حقل مطلوب ناقص.';
        if (code === '22P02') return 'صيغة قيمة غير صحيحة.';
        if (/failed to fetch|networkerror|load failed|انتهت مهلة/i.test(msg)) {
            return 'تعذر الاتصال بالخادم. تحقق من الإنترنت وحاول مرة أخرى.';
        }
        return 'تعذر إتمام العملية. حاول مرة أخرى.';
    }

    function unavailable() {
        var text = window.SUPABASE_CONFIG_ERROR || 'خدمة قاعدة البيانات غير متاحة.';
        return { data: null, error: new Error(text), message: text, count: null };
    }

    function run(factory) {
        var c = client();
        if (!c) return Promise.resolve(unavailable());

        return withTimeout(Promise.resolve(factory(c)), DEFAULT_TIMEOUT).then(function (res) {
            if (res.error) {
                console.error('[admin-data]', res.error);
                return { data: null, error: res.error, message: friendlyError(res.error), count: null };
            }
            return { data: res.data, error: null, message: '', count: res.count === undefined ? null : res.count };
        }).catch(function (error) {
            console.error('[admin-data]', error);
            return { data: null, error: error, message: friendlyError(error), count: null };
        });
    }

    function rpc(name, args) {
        return run(function (c) { return c.rpc(name, args || {}); });
    }

    /** يمنع حقن عوامل PostgREST داخل .or(): يحذف الفواصل والأقواس والرموز الخاصة */
    function sanitizeSearch(term) {
        return String(term || '').replace(/[,()%*_\\:"'`]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100);
    }

    /**
     * all(table, columns, order) — كل صفوف جدول صغير (لقوائم الاختيار). يجلب على دفعات 1000.
     * order = { column, ascending }
     */
    function all(table, columns, order) {
        var out = [];

        function page(from) {
            return run(function (c) {
                var q = c.from(table).select(columns || '*');
                if (order && order.column) q = q.order(order.column, { ascending: order.ascending !== false });
                return q.range(from, from + 999);
            }).then(function (res) {
                if (res.error) return res;
                out = out.concat(res.data || []);
                if ((res.data || []).length === 1000 && out.length < 10000) return page(from + 1000);
                return { data: out, error: null, message: '', count: out.length };
            });
        }

        return page(0);
    }

    /**
     * Repository: createRepository({ table, select, searchColumns, order, idKey })
     *   list({ page, pageSize, search, filters:{col:val} }) → { data, count, error, message }
     *   get(id) | create(values) | update(id, values) | remove(id)
     * التعديل والحذف يتحققان من أن صفًا تغيّر فعلًا: سياسات RLS لا تُرجع خطأ بل صفرًا من الصفوف
     * عندما يكون الحساب غير مسؤول، فنحوّل هذا إلى رسالة واضحة.
     */
    function createRepository(cfg) {
        var idKey = cfg.idKey || 'id';
        var denied = 'لم يتم تنفيذ العملية. تأكد أن حسابك مسؤول (database/admin/002_add_admin.sql).';

        function changed(res) {
            if (res.error) return res;
            if (!Array.isArray(res.data) || !res.data.length) {
                return { data: null, error: new Error('no rows affected'), message: denied, count: null };
            }
            return res;
        }

        return {
            table: cfg.table,

            list: function (q) {
                q = q || {};
                var page = Math.max(1, q.page || 1);
                var size = Math.min(MAX_PAGE, q.pageSize || 20);
                var from = (page - 1) * size;
                var order = q.order || cfg.order || { column: idKey, ascending: false };

                return run(function (c) {
                    var query = c.from(cfg.table).select(cfg.select || '*', { count: 'exact' });

                    var filters = q.filters || {};
                    Object.keys(filters).forEach(function (col) {
                        var v = filters[col];
                        if (v !== '' && v !== null && v !== undefined) query = query.eq(col, v);
                    });

                    var term = sanitizeSearch(q.search);
                    if (term && cfg.searchColumns && cfg.searchColumns.length) {
                        query = query.or(cfg.searchColumns.map(function (col) {
                            return col + '.ilike.%' + term + '%';
                        }).join(','));
                    }

                    query = query.order(order.column, { ascending: !!order.ascending });
                    /* ترتيب ثانوي ثابت كي لا تتبدّل الصفوف بين الصفحات عند تساوي القيم */
                    if (order.column !== idKey) query = query.order(idKey, { ascending: true });

                    return query.range(from, from + size - 1);
                });
            },

            get: function (id) {
                return run(function (c) {
                    return c.from(cfg.table).select(cfg.select || '*').eq(idKey, id).maybeSingle();
                });
            },

            create: function (values) {
                return run(function (c) { return c.from(cfg.table).insert(values).select(); }).then(changed);
            },

            update: function (id, values) {
                return run(function (c) { return c.from(cfg.table).update(values).eq(idKey, id).select(); }).then(changed);
            },

            remove: function (id) {
                return run(function (c) { return c.from(cfg.table).delete().eq(idKey, id).select(); }).then(changed);
            }
        };
    }

    window.AdminData = {
        client: client, run: run, rpc: rpc, all: all, friendlyError: friendlyError,
        createRepository: createRepository, sanitizeSearch: sanitizeSearch
    };
})();
