/**
 * subjects.js — المواد الدراسية (جدول subjects)
 * القيم المتاحة (البرنامج/الفرقة/الترم/القسم) هي نفسها التي يستخدمها الموقع في التنقل؛
 * أي قيمة مختلفة لن تظهر للطلاب لأن الموقع يبحث بها حرفيًا.
 */
(function () {
    'use strict';

    var PROGRAMS = ['الهندسة الزراعية', 'اللاندسكيب والمسطحات الخضراء'];
    var GRADES = ['الفرقة الأولى', 'الفرقة الثانية', 'الفرقة الثالثة', 'الفرقة الرابعة'];
    var TERMS = ['الترم الأول', 'الترم الثاني'];
    /* نفس أسماء الأقسام في js/departments.js */
    var DEPARTMENTS = [
        'هندسة القوى والآلات الزراعية',
        'هندسة المنشآت الزراعية والتحكم البيئي',
        'هندسة نظم المياه والرى',
        'هندسة تصنيع المنتجات الغذائية',
        'الشعبة العامة'
    ];

    window.AdminCrud.define('subjects', {
        table: 'subjects',
        title: 'المواد الدراسية', singular: 'مادة',
        hint: 'القسم يُختار فقط لمواد الفرقتين الثالثة والرابعة في الهندسة الزراعية؛ وفي غير ذلك اتركه فارغًا.',
        order: { column: 'id', ascending: false },
        searchColumns: ['name', 'professor'],
        filters: [
            { key: 'program', label: 'البرنامج', options: PROGRAMS },
            { key: 'grade', label: 'الفرقة', options: GRADES },
            { key: 'term', label: 'الترم', options: TERMS }
        ],
        columns: [
            { key: 'icon', label: '' },
            { key: 'name', label: 'المادة' },
            { key: 'professor', label: 'الدكتور' },
            { key: 'program', label: 'البرنامج' },
            { key: 'grade', label: 'الفرقة' },
            { key: 'department', label: 'القسم' },
            { key: 'term', label: 'الترم' }
        ],
        fields: [
            { key: 'name', label: 'اسم المادة', type: 'text', required: true, full: true },
            { key: 'professor', label: 'الدكتور المسؤول', type: 'text' },
            { key: 'icon', label: 'الأيقونة (إيموجي)', type: 'text', maxLength: 8 },
            { key: 'program', label: 'البرنامج', type: 'select', options: PROGRAMS, required: true },
            { key: 'grade', label: 'الفرقة', type: 'select', options: GRADES, required: true },
            { key: 'department', label: 'القسم', type: 'select', options: DEPARTMENTS },
            { key: 'term', label: 'الترم', type: 'select', options: TERMS, required: true }
        ],
        defaults: { program: PROGRAMS[0], icon: '📚' },
        rowLabel: function (r) { return r.name; },
        deleteWarning: 'سيُحذف معها كل ملفاتها أيضًا.'
    });
})();
