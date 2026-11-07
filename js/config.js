
const SUPABASE_URL = "https://kegawnvzoimaddnziotv.supabase.co";
const SUPABASE_KEY = "sb_publishable_0crKHKVfwNCtP5ieWDUpzg_4BeMZLkg";

/* حارس بسيط: لا ينشئ auth.js عميل Supabase إن كان الإعداد غير صالح، وتظهر رسالة واضحة بدل صفحة فارغة صامتة */
(function () {
    'use strict';

    var problem = '';

    if (/^sb_secret_/i.test(SUPABASE_KEY)) {
        problem = 'تم رصد مفتاح سري (sb_secret_) في js/config.js. استخدم Publishable Key فقط وغيّر المفتاح المكشوف من لوحة Supabase.';
    } else if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(SUPABASE_KEY) && !/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(SUPABASE_KEY)) {
        problem = 'لم يُضبط مفتاح Supabase بعد. افتح js/config.js والصق Publishable Key في SUPABASE_KEY.';
    }

    window.SUPABASE_CONFIG_ERROR = problem;
    if (!problem) return;

    console.error('[config.js] ' + problem);

    document.addEventListener('DOMContentLoaded', function () {
        var bar = document.createElement('div');
        bar.setAttribute('role', 'alert');
        bar.dir = 'rtl';
        bar.style.cssText = 'position:fixed;top:0;right:0;left:0;z-index:2147483000;padding:10px 14px;' +
            'background:#7f1d1d;color:#fff;font:700 14px/1.6 Cairo,Tahoma,sans-serif;text-align:center;';
        bar.textContent = '⚠️ ' + problem;
        document.body.appendChild(bar);
    });
})();
