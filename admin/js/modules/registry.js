/**
 * registry.js — وصف وحدات لوحة الإدارة (بيانات فقط)
 *
 * id:     المعرّف في الرابط (#/id)
 * group:  عنوان المجموعة في القائمة الجانبية
 * script: ملف الوحدة داخل admin/js/modules/ (يُحمَّل عند أول زيارة؛ الملف الواحد قد يعرّف عدة وحدات)
 * أي وحدة تُضاف هنا يجب أن يسجّل ملفها نفسه بـ AdminCrud.define(id, ...) أو AdminModules.define(id, ...)
 */
window.AdminRouter.register([
    { id: 'dashboard',     title: 'الرئيسية',              icon: '📊', group: 'عام',              script: 'dashboard.js' },

    { id: 'subjects',      title: 'المواد الدراسية',       icon: '📚', group: 'المحتوى الدراسي',  script: 'subjects.js' },
    { id: 'files',         title: 'ملفات المواد',          icon: '📁', group: 'المحتوى الدراسي',  script: 'files.js' },

    { id: 'more-items',    title: 'أقسام «المزيد»',        icon: '🧩', group: 'المزيد',           script: 'more.js' },
    { id: 'more-contents', title: 'محتوى الأقسام',         icon: '🗂️', group: 'المزيد',           script: 'more.js' },
    { id: 'external',      title: 'المصادر الخارجية',      icon: '🔗', group: 'المزيد',           script: 'more.js' },
    { id: 'top-years',     title: 'الأوائل',               icon: '🏆', group: 'المزيد',           script: 'more.js' },
    { id: 'exams',         title: 'جداول الامتحانات',      icon: '🗓️', group: 'المزيد',           script: 'more.js' },

    { id: 'faculty',       title: 'هيئة التدريس',          icon: '👨‍🏫', group: 'الأشخاص',          script: 'people.js' },
    { id: 'community',     title: 'مجتمع الطلاب والخريجين', icon: '🤝', group: 'الأشخاص',          script: 'people.js' },

    { id: 'rooms',         title: 'الغرف',                 icon: '🧭', group: 'المسار التعليمي',  script: 'rooms.js' },
    { id: 'tasks',         title: 'المهام والمحتوى',       icon: '✅', group: 'المسار التعليمي',  script: 'rooms.js' },
    { id: 'quiz',          title: 'أسئلة المهام',          icon: '❓', group: 'المسار التعليمي',  script: 'rooms.js' },

    { id: 'graduation',    title: 'مشاريع التخرج',         icon: '🎓', group: 'المحتوى الأكاديمي', script: 'graduation.js' },

    { id: 'admins',        title: 'المسؤولون',             icon: '🛡️', group: 'النظام',           script: 'admins.js' }
]);
