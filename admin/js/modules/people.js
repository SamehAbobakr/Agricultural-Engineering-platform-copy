/**
 * people.js — الأشخاص (وحدتان في ملف واحد)
 *  faculty   ← faculty_members     (دليل هيئة التدريس)
 *  community ← community_members   (مجتمع الطلاب والخريجين — يُنشر بموافقة أصحابه فقط)
 * إخفاء شخص دون حذفه: ألغِ تفعيل «ظاهر في الموقع».
 */
(function () {
    'use strict';

    var DEPARTMENTS = [
        'هندسة القوى والآلات الزراعية',
        'هندسة المنشآت الزراعية والتحكم البيئي',
        'هندسة نظم المياه والرى',
        'هندسة تصنيع المنتجات الغذائية',
        'الشعبة العامة'
    ];

    window.AdminCrud.define('faculty', {
        table: 'faculty_members',
        title: 'هيئة التدريس', singular: 'عضو هيئة تدريس',
        hint: 'الترتيب الأصغر يظهر أولًا. العضو غير الظاهر لا يراه الزوار.',
        order: { column: 'sort_order', ascending: true },
        searchColumns: ['full_name', 'department', 'specialization'],
        columns: [
            { key: 'full_name', label: 'الاسم' },
            { key: 'academic_title', label: 'الدرجة' },
            { key: 'department', label: 'القسم' },
            { key: 'sort_order', label: 'الترتيب' },
            { key: 'is_active', label: 'ظاهر' }
        ],
        fields: [
            { key: 'full_name', label: 'الاسم الكامل', type: 'text', required: true, full: true, maxLength: 200 },
            { key: 'academic_title', label: 'الدرجة العلمية', type: 'text', required: true, maxLength: 60, suggest: ['أستاذ دكتور', 'أستاذ مساعد', 'مدرس', 'مدرس مساعد', 'معيد'] },
            { key: 'department', label: 'القسم', type: 'text', required: true, maxLength: 120, suggest: DEPARTMENTS },
            { key: 'specialization', label: 'التخصص الدقيق', type: 'text', full: true },
            { key: 'bio', label: 'نبذة', type: 'textarea', full: true, rows: 4 },
            { key: 'email', label: 'البريد الإلكتروني', type: 'email' },
            { key: 'academic_url', label: 'رابط الصفحة الأكاديمية', type: 'url', placeholder: 'https://...' },
            { key: 'profile_image', label: 'رابط الصورة', type: 'url', full: true, placeholder: 'https://...' },
            { key: 'sort_order', label: 'الترتيب', type: 'number', min: 0 },
            { key: 'is_active', label: 'الظهور', type: 'checkbox', checkLabel: 'ظاهر في الموقع' }
        ],
        defaults: { is_active: true, sort_order: 100 },
        rowLabel: function (r) { return r.full_name; }
    });

    window.AdminCrud.define('community', {
        table: 'community_members',
        title: 'مجتمع الطلاب والخريجين', singular: 'عضو',
        hint: 'لا تُضِف أحدًا إلا بموافقته؛ البيانات (ومنها الهاتف) تظهر للزوار. الترتيب الأصغر أولًا.',
        order: { column: 'sort_order', ascending: true },
        searchColumns: ['full_name', 'department'],
        filters: [{ key: 'member_type', label: 'النوع', options: [['student', 'طالب'], ['graduate', 'خريج']] }],
        columns: [
            { key: 'full_name', label: 'الاسم' },
            { key: 'member_type', label: 'النوع', render: function (r) { return r.member_type === 'graduate' ? 'خريج' : 'طالب'; } },
            { key: 'department', label: 'القسم' },
            { key: 'sort_order', label: 'الترتيب' },
            { key: 'is_active', label: 'ظاهر' }
        ],
        fields: [
            { key: 'full_name', label: 'الاسم الكامل', type: 'text', required: true, full: true, maxLength: 200 },
            { key: 'member_type', label: 'النوع', type: 'select', required: true, options: [['student', 'طالب'], ['graduate', 'خريج']] },
            { key: 'department', label: 'القسم', type: 'text', required: true, maxLength: 120, suggest: DEPARTMENTS },
            { key: 'study_year', label: 'الفرقة الحالية (للطالب)', type: 'number', min: 1, max: 6 },
            { key: 'graduation_year', label: 'سنة التخرج (للخريج)', type: 'number', min: 1980, max: 2100 },
            { key: 'bio', label: 'نبذة', type: 'textarea', full: true, rows: 4, maxLength: 1500 },
            { key: 'skills', label: 'المهارات (كل مهارة في سطر — حتى 20)', type: 'list', full: true, maxItems: 20 },
            { key: 'phone', label: 'الهاتف', type: 'tel', pattern: /^[0-9+() .-]{6,25}$/, patternMessage: 'أرقام وعلامات + - ( ) فقط (6 إلى 25 خانة).' },
            { key: 'profile_image', label: 'رابط الصورة', type: 'url', placeholder: 'https://...' },
            { key: 'facebook_url', label: 'فيسبوك', type: 'url', placeholder: 'https://...' },
            { key: 'linkedin_url', label: 'لينكدإن', type: 'url', placeholder: 'https://...' },
            { key: 'github_url', label: 'جيت هاب', type: 'url', placeholder: 'https://...' },
            { key: 'sort_order', label: 'الترتيب', type: 'number', min: 0, required: true },
            { key: 'is_active', label: 'الظهور', type: 'checkbox', checkLabel: 'ظاهر في الموقع' }
        ],
        defaults: { member_type: 'student', is_active: true, sort_order: 100, skills: [] },
        rowLabel: function (r) { return r.full_name; },
        beforeSave: function (v) {
            if ((v.skills || []).join('|').length > 800) return 'المهارات طويلة جدًا (الحد الأقصى 800 حرف إجمالًا).';
            if (v.full_name && v.full_name.length < 2) return 'الاسم قصير جدًا.';
            if (v.member_type === 'graduate') v.study_year = null;
            if (v.member_type === 'student') v.graduation_year = null;
            return '';
        }
    });
})();
