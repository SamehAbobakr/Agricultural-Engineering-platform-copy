/**
 * more.js — قسم «المزيد» في الموقع (5 وحدات في ملف واحد)
 *
 *  external      ← additional_resources  (المصادر الخارجية؛ تُجمَّع في الموقع حسب category)
 *  more-items    ← more_items            (أقسام المزيد نفسها)
 *  more-contents ← more_contents         (محتوى الأقسام العادية: العلم الشرعي، البرمجة ...)
 *  top-years     ← top_years             (الأوائل — يظهر داخل قسم «شؤون الطلاب»)
 *  exams         ← exam_schedules        (جداول الامتحانات — يظهر داخل «شؤون الطلاب»)
 *
 * تنبيه: الموقع يتعرف على قسمين خاصين بعنوانهما حرفيًا: «شؤون الطلاب» و«مصادر خارجية».
 */
(function () {
    'use strict';

    var html = window.AdminDom.html;

    function moreItemsOptions() {
        return window.AdminData.all('more_items', 'id,title', { column: 'id' }).then(function (res) {
            return (res.data || []).map(function (m) { return [m.id, m.title]; });
        });
    }

    function pdfLink(key) {
        return function (r) {
            var u = window.AdminDom.safeUrl(r[key]);
            return u ? html`<a href="${u}" target="_blank" rel="noopener noreferrer">فتح ↗</a>` : '—';
        };
    }

    /* ---------- المصادر الخارجية ---------- */
    window.AdminCrud.define('external', {
        table: 'additional_resources',
        title: 'المصادر الخارجية', singular: 'مصدر',
        hint: 'المصادر التي لها نفس «التصنيف» تظهر معًا داخل بطاقة واحدة في الموقع. أيقونة التصنيف تؤخذ من أول مصدر له أيقونة.',
        order: { column: 'id', ascending: false },
        searchColumns: ['title', 'category', 'description'],
        columns: [
            { key: 'icon', label: '' },
            { key: 'title', label: 'العنوان' },
            { key: 'category', label: 'التصنيف' },
            { key: 'link', label: 'الرابط', render: pdfLink('link') }
        ],
        fields: [
            { key: 'title', label: 'العنوان', type: 'text', required: true, full: true },
            { key: 'category', label: 'التصنيف', type: 'text', required: true },
            { key: 'icon', label: 'الأيقونة (إيموجي)', type: 'text', maxLength: 8 },
            { key: 'link', label: 'الرابط', type: 'url', required: true, full: true, placeholder: 'https://...' },
            { key: 'description', label: 'الوصف', type: 'textarea', full: true, rows: 3 },
            { key: 'content_icon', label: 'أيقونة المحتوى (اختياري)', type: 'text', maxLength: 8 }
        ],
        defaults: { icon: '🌐' },
        rowLabel: function (r) { return r.title; }
    });

    /* ---------- أقسام المزيد ---------- */
    window.AdminCrud.define('more-items', {
        table: 'more_items',
        title: 'أقسام «المزيد»', singular: 'قسم',
        hint: 'العنوانان «شؤون الطلاب» و«مصادر خارجية» لهما سلوك خاص في الموقع؛ لا تغيّر كتابتهما. أي عنوان آخر يعرض بطاقات من «محتوى الأقسام».',
        order: { column: 'id', ascending: true },
        searchColumns: ['title', 'category'],
        columns: [
            { key: 'icon', label: '' },
            { key: 'title', label: 'العنوان' },
            { key: 'category', label: 'التصنيف' },
            { key: 'description', label: 'الوصف' }
        ],
        fields: [
            { key: 'title', label: 'العنوان', type: 'text', required: true, full: true },
            { key: 'category', label: 'التصنيف (يظهر على البطاقة)', type: 'text' },
            { key: 'icon', label: 'الأيقونة (إيموجي)', type: 'text', maxLength: 8 },
            { key: 'description', label: 'الوصف', type: 'textarea', full: true, rows: 3 },
            { key: 'link', label: 'رابط (اختياري)', type: 'url', full: true, placeholder: 'https://...' }
        ],
        rowLabel: function (r) { return r.title; },
        deleteWarning: 'سيُحذف معه محتواه وأوائله وجداول امتحاناته.'
    });

    /* ---------- محتوى الأقسام ---------- */
    window.AdminCrud.define('more-contents', {
        table: 'more_contents',
        title: 'محتوى الأقسام', singular: 'عنصر محتوى',
        hint: 'عناصر تظهر داخل قسم من «أقسام المزيد» (مثل العلم الشرعي أو البرمجة). كل عنصر يحمل حتى رابطين.',
        order: { column: 'id', ascending: false },
        searchColumns: ['title', 'description'],
        filters: [{ key: 'more_item_id', label: 'القسم', load: moreItemsOptions }],
        columns: [
            { key: 'icon', label: '' },
            { key: 'title', label: 'العنوان' },
            { key: 'more_item_id', label: 'القسم' },
            { key: 'link_1', label: 'رابط 1', render: pdfLink('link_1') },
            { key: 'link_2', label: 'رابط 2', render: pdfLink('link_2') }
        ],
        fields: [
            { key: 'more_item_id', label: 'القسم', type: 'select', required: true, valueType: 'number', load: moreItemsOptions, full: true },
            { key: 'title', label: 'العنوان', type: 'text', required: true },
            { key: 'icon', label: 'الأيقونة (إيموجي)', type: 'text', maxLength: 8 },
            { key: 'description', label: 'الوصف', type: 'textarea', full: true, rows: 3 },
            { key: 'link_1', label: 'الرابط الأول', type: 'url', full: true, placeholder: 'https://...' },
            { key: 'link_2', label: 'الرابط الثاني (اختياري)', type: 'url', full: true, placeholder: 'https://...' }
        ],
        rowLabel: function (r) { return r.title; }
    });

    /* ---------- الأوائل وجداول الامتحانات (نفس الشكل) ---------- */
    function yearsConfig(table, title, singular, hint) {
        return {
            table: table, title: title, singular: singular, hint: hint,
            order: { column: 'year', ascending: false },
            searchColumns: ['title'],
            filters: [{ key: 'more_item_id', label: 'القسم', load: moreItemsOptions }],
            columns: [
                { key: 'year', label: 'السنة' },
                { key: 'title', label: 'العنوان' },
                { key: 'more_item_id', label: 'القسم' },
                { key: 'pdf_url', label: 'الملف', render: pdfLink('pdf_url') }
            ],
            fields: [
                { key: 'more_item_id', label: 'القسم', type: 'select', required: true, valueType: 'number', load: moreItemsOptions, full: true, hint: 'اختر «شؤون الطلاب» ليظهر في صفحته.' },
                { key: 'title', label: 'العنوان', type: 'text', required: true },
                { key: 'year', label: 'السنة', type: 'number', min: 1990, max: 2100 },
                { key: 'pdf_url', label: 'رابط ملف PDF', type: 'url', required: true, full: true, placeholder: 'https://...' }
            ],
            defaults: { year: new Date().getFullYear() },
            rowLabel: function (r) { return r.title; }
        };
    }

    window.AdminCrud.define('top-years', yearsConfig('top_years', 'الأوائل', 'سجل أوائل', 'ملفات أوائل الدفعات حسب السنة (الأحدث أولًا).'));
    window.AdminCrud.define('exams', yearsConfig('exam_schedules', 'جداول الامتحانات', 'جدول امتحانات', 'جداول الامتحانات حسب السنة (الأحدث أولًا).'));
})();
