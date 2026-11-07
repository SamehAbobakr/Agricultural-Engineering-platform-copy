// =========================================
// نظام الغرف والمهمات — الإعدادات
// هذا الملف الوحيد الذي تعدّله عادةً. عنوان Supabase والمفتاح العام في js/config.js المشترك.
// =========================================

const ROOMS_CONFIG = {

    // أسماء الجداول (انظر database/rooms_progress.sql)
    tables: {
        rooms: 'rooms',
        tasks: 'tasks',
        content: 'task_content',
        completions: 'user_task_completions'
    },

    // الأعمدة المطلوبة فقط (لا نستخدم select('*'))
    roomColumns: 'id,title,slug,description,cover_image,icon,sort_order,difficulty',
    // مجموع نقاط الغرفة مشتق في قاعدة البيانات (database/admin/003_points_system.sql)
    roomPointsColumn: 'total_points',
    taskColumns: 'id,title,description,points,sort_order',

    // صفحة الغرفة (مسار نسبي: تعمل على GitHub Pages داخل مسار فرعي)
    roomPage: 'room.html',

    // مهلة الاتصال بالملي ثانية
    requestTimeoutMs: 15000,

    // عدد آخر المهمات المكتملة في ملخص التقدم
    recentLimit: 5,

    difficultyLabels: {
        beginner: 'مبتدئ',
        intermediate: 'متوسط',
        advanced: 'متقدم'
    },

    // أيقونة بديلة عند غياب الأيقونة
    fallbackIcon: '🌾'
};
