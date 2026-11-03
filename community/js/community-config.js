// =========================================
// مجتمع طلاب وخريجي الهندسة الزراعية — الإعدادات
// (عنوان Supabase والمفتاح العام موجودان في js/config.js المشترك للمنصة)
// =========================================

const COMMUNITY_CONFIG = {

    // اسم الجدول في Supabase (انظر database/community_members.sql)
    table: 'community_members',

    // الأعمدة التي تُجلب فقط (لا نستخدم select('*'))
    columns: [
        'id', 'full_name', 'member_type', 'department', 'study_year',
        'graduation_year', 'bio', 'skills', 'phone', 'facebook_url',
        'linkedin_url', 'github_url', 'profile_image', 'is_active', 'sort_order'
    ].join(','),

    // مهلة الاتصال بالملي ثانية
    requestTimeoutMs: 15000,

    // الصفة (القيمة المخزنة ← النص المعروض)
    memberTypes: {
        student: 'طالب',
        graduate: 'خريج'
    },

    // الفرق الدراسية (نفس مسميات المنصة)
    studyYears: {
        1: 'الفرقة الأولى',
        2: 'الفرقة الثانية',
        3: 'الفرقة الثالثة',
        4: 'الفرقة الرابعة'
    },

    // حدود حماية للبيانات القادمة من الجدول
    maxSkills: 20,
    maxSkillLength: 60,

    // عدد المهارات الظاهر على البطاقة (الباقي في نافذة التفاصيل)
    maxSkillsOnCard: 3,

    // تأخير البحث أثناء الكتابة (ملي ثانية)
    searchDebounceMs: 150
};
