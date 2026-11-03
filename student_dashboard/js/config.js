export const APP_CONFIG = {
    // مفتاح localStorage القديم لنسخة اللوحة المحلية. لم يعد يُقرأ أو يُكتب:
    // بيانات الطالب الآن في Supabase مرتبطة بحسابه. تُرك المفتاح هنا للتوثيق فقط،
    // ولا تُحذف بيانات المتصفح القديمة تلقائيًا (انظر README).
    LEGACY_STORAGE_KEY: 'agri_student_dashboard_v2',

    // أسماء جداول Supabase (تُنشأ بملف database/student_dashboard.sql)
    TABLES: {
        profiles: 'student_dashboard_profiles',
        goals: 'student_dashboard_goals',
        progress: 'student_dashboard_progress'
    },

    // حدود الإدخال — يجب أن تطابق قيود CHECK في ملف SQL
    LIMITS: {
        studentName: 100,
        gpa: 20,
        quote: 300,
        quickNotes: 5000,
        goalTitle: 200,
        courseLink: 2000,
        courseFiles: 999
    }
};
