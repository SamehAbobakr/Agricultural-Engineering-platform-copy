/**
 * files.js — ملفات المواد (جدول material_files)
 * الأقسام (category) تظهر للطلاب كتبويبات داخل المادة بنفس الترتيب أدناه؛ أي قسم جديد يُضاف في النهاية.
 */
(function () {
    'use strict';

    var CATEGORIES = ['المحاضرات', 'الكتاب الاكترونى', 'السكاشن', 'الملخصات', 'حل الشيت', 'الفيديوهات', 'الامتحانات', 'أخرى'];
    var FILE_TYPES = ['PDF', 'فيديو', 'صورة', 'Word', 'PowerPoint', 'Excel', 'رابط'];

    window.AdminCrud.define('files', {
        table: 'material_files',
        title: 'ملفات المواد', singular: 'ملف',
        hint: 'اختر المادة أولًا من الفلتر لعرض ملفاتها؛ ورقم الترتيب يحدد ظهور الملفات داخل القسم (الأصغر أولًا).',
        order: { column: 'id', ascending: false },
        searchColumns: ['title', 'category'],
        filters: [
            {
                key: 'subject_id', label: 'المادة',
                load: function () {
                    return window.AdminData.all('subjects', 'id,name,grade,term', { column: 'name' }).then(function (res) {
                        return (res.data || []).map(function (s) { return [s.id, s.name + ' — ' + (s.grade || '') + ' / ' + (s.term || '')]; });
                    });
                }
            }
        ],
        columns: [
            { key: 'icon', label: '' },
            { key: 'title', label: 'العنوان' },
            { key: 'subject_id', label: 'المادة' },
            { key: 'category', label: 'القسم' },
            { key: 'file_type', label: 'النوع' },
            { key: 'file_order', label: 'الترتيب' },
            {
                key: 'file_url', label: 'الرابط',
                render: function (r) {
                    var u = window.AdminDom.safeUrl(r.file_url);
                    return u ? window.AdminDom.html`<a href="${u}" target="_blank" rel="noopener noreferrer">فتح ↗</a>` : '—';
                }
            }
        ],
        fields: [
            {
                key: 'subject_id', label: 'المادة', type: 'select', required: true, valueType: 'number', full: true,
                load: function () {
                    return window.AdminData.all('subjects', 'id,name,grade,term', { column: 'name' }).then(function (res) {
                        return (res.data || []).map(function (s) { return [s.id, s.name + ' — ' + (s.grade || '') + ' / ' + (s.term || '')]; });
                    });
                }
            },
            { key: 'title', label: 'عنوان الملف', type: 'text', required: true, full: true },
            { key: 'category', label: 'القسم', type: 'text', required: true, suggest: CATEGORIES, hint: 'اختر من الاقتراحات ليظهر الملف في التبويب الصحيح.' },
            { key: 'file_type', label: 'نوع الملف', type: 'text', suggest: FILE_TYPES },
            { key: 'file_url', label: 'رابط الملف', type: 'url', required: true, full: true, placeholder: 'https://...' },
            { key: 'description', label: 'وصف (اختياري)', type: 'textarea', full: true, rows: 3 },
            { key: 'icon', label: 'الأيقونة (إيموجي)', type: 'text', maxLength: 8 },
            { key: 'file_order', label: 'الترتيب', type: 'number', min: 0 }
        ],
        defaults: { icon: '📄', file_order: 0, category: 'المحاضرات', file_type: 'PDF' },
        rowLabel: function (r) { return r.title; }
    });
})();
