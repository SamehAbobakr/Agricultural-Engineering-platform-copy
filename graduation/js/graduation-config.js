// =========================================
// معرض مشاريع التخرج — الإعدادات
// عنوان Supabase والمفتاح العام في js/config.js المشترك. لا مفاتيح سرية هنا.
// =========================================

const GRAD_CONFIG = {
    table: 'graduation_projects',

    // الأعمدة المطلوبة فقط (لا نستخدم select('*'))
    listColumns:
        'id,title,slug,summary,department,graduation_year,project_field,project_type,' +
        'cover_image,keywords,published_at,created_at',

    detailColumns:
        'id,title,slug,summary,description,problem_statement,objectives,methodology,department,' +
        'graduation_year,project_field,project_type,supervisor,students,keywords,cover_image,' +
        'gallery_images,video_url,report_url,external_links,published_at,created_at',

    // صفحات المعرض (مسارات نسبية: الموقع منشور على مسار فرعي)
    listPage: 'graduation.html',
    projectPage: 'project.html',

    requestTimeoutMs: 15000,

    // حروف الـ slug المسموحة (نفس قيد قاعدة البيانات)
    slugPattern: /^[a-z0-9]+(-[a-z0-9]+)*$/
};
