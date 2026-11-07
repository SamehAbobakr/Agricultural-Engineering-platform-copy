/**
 * graduation.js — مشاريع التخرج (جدول graduation_projects)
 *
 * المشروع كله في صف واحد: الطلاب والأهداف والكلمات المفتاحية وروابط الصور = أسطر (كل سطر عنصر)،
 * والمراجع «العنوان | الرابط» في كل سطر. الصور والتقرير تُدخَل كروابط (رفع الملف إلى R2 يتم خارج هذه الصفحة
 * لأن المستودع لا يحتوي آلية رفع؛ الصق الرابط العام للملف).
 * مشروع جديد يُحفظ مسودة (غير منشور) حتى تفعّل «منشور». الحماية الحقيقية: RLS (admin_all) في
 * database/graduation/001_graduation_projects.sql.
 */
(function () {
    'use strict';

    // نفس أقسام المنصة (js/data.js → departmentsList) ونفس القائمة في وحدة هيئة التدريس
    var DEPARTMENTS = [
        'هندسة القوى والآلات الزراعية',
        'هندسة المنشآت الزراعية والتحكم البيئي',
        'هندسة نظم المياه والرى',
        'هندسة تصنيع المنتجات الغذائية',
        'الشعبة العامة'
    ];

    var FIELDS = ['القوى والآلات الزراعية', 'الري والموارد المائية', 'المنشآت والتحكم البيئي', 'تصنيع الأغذية', 'الزراعة الذكية والأتمتة', 'الطاقة المتجددة'];
    var TYPES = ['تصميم وتصنيع', 'بحث تطبيقي', 'دراسة ميدانية', 'محاكاة ونمذجة', 'مشروع برمجي'];

    var CURRENT_YEAR = new Date().getFullYear();

    function isHttp(u) {
        try { var x = new URL(u); return x.protocol === 'http:' || x.protocol === 'https:'; } catch (e) { return false; }
    }

    var repo = window.AdminData.createRepository({ table: 'graduation_projects', idKey: 'id' });

    window.AdminCrud.define('graduation', {
        table: 'graduation_projects',
        title: 'مشاريع التخرج', singular: 'مشروع تخرج',
        hint: 'المشروع الجديد يُحفظ «مسودة» ولا يراه الزوار حتى تفعّل «منشور». الرابط المختصر (slug) فريد، حروف إنجليزية صغيرة وأرقام وشرطات، وهو رابط صفحة المشروع. اكتب الطلاب والأهداف والكلمات المفتاحية وروابط الصور كل عنصر في سطر.',
        order: { column: 'graduation_year', ascending: false },
        searchColumns: ['title', 'slug', 'supervisor', 'department'],
        filters: [
            { key: 'department', label: 'القسم', options: DEPARTMENTS },
            { key: 'is_published', label: 'الحالة', options: [['true', 'منشور'], ['false', 'مسودة']] }
        ],
        columns: [
            { key: 'title', label: 'المشروع', max: 70 },
            { key: 'graduation_year', label: 'السنة' },
            { key: 'department', label: 'القسم', max: 40 },
            { key: 'project_field', label: 'المجال', max: 30 },
            { key: 'is_published', label: 'منشور' }
        ],
        fields: [
            { key: 'title', label: 'اسم المشروع', type: 'text', required: true, maxLength: 250, full: true },
            { key: 'slug', label: 'الرابط المختصر (slug)', type: 'text', required: true, dir: 'ltr', maxLength: 120, pattern: /^[a-z0-9]+(-[a-z0-9]+)*$/, patternMessage: 'حروف إنجليزية صغيرة وأرقام وشرطات بينها فقط، مثل: smart-irrigation-2026', placeholder: 'smart-irrigation-2026' },
            { key: 'graduation_year', label: 'سنة التخرج', type: 'number', required: true, min: 1990, max: 2100 },
            { key: 'department', label: 'القسم العلمي', type: 'select', required: true, options: DEPARTMENTS, full: true },
            { key: 'project_field', label: 'مجال المشروع', type: 'text', required: true, maxLength: 120, suggest: FIELDS },
            { key: 'project_type', label: 'نوع المشروع', type: 'text', required: true, maxLength: 120, suggest: TYPES },
            { key: 'supervisor', label: 'الدكتور المشرف', type: 'text', maxLength: 200, full: true },
            { key: 'students_lines', label: 'الطلاب المشاركون (اسم في كل سطر)', type: 'list', full: true, maxItems: 20, rows: 4 },
            { key: 'summary', label: 'وصف مختصر (يظهر في البطاقة، حتى 600 حرف)', type: 'textarea', full: true, rows: 3, maxLength: 600, emptyAs: '' },
            { key: 'description', label: 'الوصف والنبذة', type: 'textarea', full: true, rows: 6, maxLength: 8000 },
            { key: 'problem_statement', label: 'المشكلة التي يعالجها', type: 'textarea', full: true, rows: 4, maxLength: 5000 },
            { key: 'objectives_lines', label: 'أهداف المشروع (هدف في كل سطر)', type: 'list', full: true, maxItems: 30, rows: 5 },
            { key: 'methodology', label: 'طريقة التنفيذ', type: 'textarea', full: true, rows: 6, maxLength: 8000 },
            { key: 'keywords_lines', label: 'الكلمات المفتاحية (كلمة في كل سطر)', type: 'list', full: true, maxItems: 20, rows: 3 },
            { key: 'cover_image', label: 'رابط صورة الغلاف', type: 'url', full: true, placeholder: 'https://...' },
            { key: 'gallery_lines', label: 'روابط معرض الصور (رابط في كل سطر)', type: 'list', full: true, maxItems: 40, rows: 5 },
            { key: 'video_url', label: 'رابط الفيديو التوضيحي (YouTube / Vimeo / mp4)', type: 'url', full: true, placeholder: 'https://...' },
            { key: 'report_url', label: 'رابط تقرير PDF', type: 'url', full: true, placeholder: 'https://...' },
            { key: 'links_lines', label: 'المراجع والروابط (سطر لكل رابط:  العنوان | الرابط)', type: 'list', full: true, maxItems: 30, rows: 4 },
            { key: 'is_published', label: 'النشر', type: 'checkbox', checkLabel: 'منشور للزوار (أزل العلامة ليبقى مسودة)' }
        ],
        defaults: { is_published: false, graduation_year: CURRENT_YEAR },
        rowLabel: function (r) { return r.title; },
        deleteWarning: 'سيُحذف المشروع نهائيًا من المعرض. (ملفات الصور والتقرير على R2 لا تُحذف من هنا. لإخفائه مؤقتًا أزل «منشور» بدل الحذف.)',

        // صف قاعدة البيانات ← حقول النموذج
        toForm: function (row) {
            var links = Array.isArray(row.external_links) ? row.external_links : [];
            return Object.assign({}, row, {
                students_lines: row.students || [],
                objectives_lines: row.objectives || [],
                keywords_lines: row.keywords || [],
                gallery_lines: row.gallery_images || [],
                links_lines: links.map(function (l) { return (l && l.title ? l.title : '') + ' | ' + (l && l.url ? l.url : ''); })
            });
        },

        // حقول النموذج ← أعمدة قاعدة البيانات (يُرجع نص خطأ لإيقاف الحفظ)
        beforeSave: function (v) {
            var i, parts, links = [];

            var gallery = v.gallery_lines || [];
            for (i = 0; i < gallery.length; i++) {
                if (!isHttp(gallery[i])) return 'رابط الصورة رقم ' + (i + 1) + ' في المعرض غير صالح (يجب أن يبدأ بـ http:// أو https://).';
            }

            var lines = v.links_lines || [];
            for (i = 0; i < lines.length; i++) {
                var at = lines[i].lastIndexOf('|');
                parts = at === -1 ? ['', lines[i]] : [lines[i].slice(0, at).trim(), lines[i].slice(at + 1).trim()];
                if (!isHttp(parts[1])) return 'المرجع رقم ' + (i + 1) + ': اكتب «العنوان | الرابط» برابط يبدأ بـ http:// أو https://';
                links.push({ title: parts[0] || parts[1], url: parts[1] });
            }

            v.students = v.students_lines || [];
            v.objectives = v.objectives_lines || [];
            v.keywords = v.keywords_lines || [];
            v.gallery_images = gallery;
            v.external_links = links;

            delete v.students_lines;
            delete v.objectives_lines;
            delete v.keywords_lines;
            delete v.gallery_lines;
            delete v.links_lines;
            return '';
        },

        rowActions: [
            {
                label: '👁️ نشر / إخفاء',
                onClick: function (row, api) {
                    var next = !row.is_published;
                    repo.update(row.id, { is_published: next }).then(function (res) {
                        if (res.error) { api.ctx.ui.toast(res.message, 'error'); return; }
                        api.ctx.ui.toast(next ? 'تم نشر المشروع.' : 'تم إلغاء النشر (عاد مسودة).', 'success');
                        api.reload();
                    });
                }
            },
            {
                label: '🔗 فتح الصفحة',
                onClick: function (row) {
                    window.open('../graduation/project.html?slug=' + encodeURIComponent(row.slug), '_blank', 'noopener');
                }
            }
        ]
    });
})();
