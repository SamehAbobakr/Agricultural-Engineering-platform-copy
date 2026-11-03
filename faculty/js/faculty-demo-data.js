// =========================================
// بيانات العرض التجريبي — سجل واحد فقط
// =========================================
// - تُستخدم فقط عندما تكون FACULTY_CONFIG.dataSource = 'demo'.
// - السجل وهمي بوضوح، وليس لشخص حقيقي، وبلا بريد ولا روابط.
// - قبل الإطلاق: اجعل dataSource = 'supabase' ثم احذف هذا الملف
//   وسطر <script> الخاص به من faculty.html (انظر docs/faculty-directory-setup.md).

const FACULTY_DEMO_MEMBERS = [
    {
        id: 'demo-record',
        full_name: 'عضو تجريبي — بيانات توضيحية',
        academic_title: 'مدرس',
        department: 'هندسة نظم المياه والرى',
        specialization: 'تخصص توضيحي لاختبار شكل البطاقة',
        bio: 'هذا سجل تجريبي لاختبار التصميم وطريقة العرض فقط، وليس لعضو هيئة تدريس حقيقي. ' +
             'تظهر السجلات الفعلية هنا تلقائيًا بعد ربط الدليل بجدول Supabase.',
        email: null,
        profile_image: null,
        academic_url: null,
        is_active: true,
        sort_order: 1,
        isDemo: true
    }
];
