// =========================================
// دليل أعضاء هيئة التدريس — طبقة البيانات
// الوحيدة التي تعرف من أين تأتي البيانات (Supabase أو العرض التجريبي).
// تعيد دائمًا { members, error } ولا ترمي أخطاء.
// تعتمد على: js/config.js ثم js/supabase.js (عميل Supabase المشترك supabaseClient)
// =========================================

const FacultyApi = {

    // تحويل سجل الجدول إلى الشكل الداخلي الذي تستخدمه الواجهة
    normalizeRecord(raw) {
        if (!raw || typeof raw !== 'object') return null;

        const id = raw.id === null || raw.id === undefined ? '' : String(raw.id);
        const name = FacultyUtils.cleanText(raw.full_name);

        // السجل بلا معرّف أو اسم لا يُعرض، والسجل غير النشط لا يُعرض أبدًا
        if (!id || !name || raw.is_active === false) return null;

        const sortOrder = Number(raw.sort_order);

        return {
            id,
            name,
            title: FacultyUtils.cleanText(raw.academic_title),
            department: FacultyUtils.cleanText(raw.department),
            specialization: FacultyUtils.cleanText(raw.specialization),
            bio: FacultyUtils.cleanText(raw.bio),
            email: FacultyUtils.cleanText(raw.email),
            image: FacultyUtils.cleanText(raw.profile_image),
            url: FacultyUtils.cleanText(raw.academic_url),
            sortOrder: Number.isFinite(sortOrder) && raw.sort_order !== null ? sortOrder : null,
            isDemo: raw.isDemo === true
        };
    },

    // ترتيب: sort_order (الفارغ في النهاية) ← ترتيب الدرجة ← الاسم
    compareMembers(a, b) {
        if (a.sortOrder !== b.sortOrder) {
            if (a.sortOrder === null) return 1;
            if (b.sortOrder === null) return -1;
            return a.sortOrder - b.sortOrder;
        }

        const rankA = FacultyApi.titleRank(a.title);
        const rankB = FacultyApi.titleRank(b.title);
        if (rankA !== rankB) return rankA - rankB;

        return a.name.localeCompare(b.name, 'ar');
    },

    titleRank(title) {
        const index = FACULTY_CONFIG.titleOrder.indexOf(title);
        return index === -1 ? FACULTY_CONFIG.titleOrder.length : index;
    },

    // تنظيف القائمة: تحويل + حذف غير الصالح + منع تكرار نفس المعرّف + ترتيب
    prepare(rawList) {
        const byId = new Map();

        (Array.isArray(rawList) ? rawList : []).forEach(raw => {
            const member = FacultyApi.normalizeRecord(raw);
            if (member && !byId.has(member.id)) byId.set(member.id, member);
        });

        return [...byId.values()].sort(FacultyApi.compareMembers);
    },

    // نقطة الدخول الوحيدة التي تستدعيها الواجهة
    async load() {
        if (FACULTY_CONFIG.dataSource === 'demo') {
            return { members: FacultyApi.prepare(FACULTY_DEMO_MEMBERS), error: null };
        }

        return FacultyApi.loadFromSupabase();
    },

    async loadFromSupabase() {
        if (typeof supabaseClient === 'undefined') {
            console.error('❌ عميل Supabase غير متاح: تأكد من تحميل js/config.js و js/supabase.js قبل ملفات الدليل.');
            return { members: [], error: { code: 'client-missing' } };
        }

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), FACULTY_CONFIG.requestTimeoutMs);

        try {
            const { data, error } = await supabaseClient
                .from(FACULTY_CONFIG.table)
                .select(FACULTY_CONFIG.columns)
                .eq('is_active', true)
                .order('sort_order', { ascending: true, nullsFirst: false })
                .order('full_name', { ascending: true })
                .limit(1000)
                .abortSignal(controller.signal);

            if (error) throw error;

            return { members: FacultyApi.prepare(data), error: null };

        } catch (error) {
            console.error('❌ خطأ في جلب أعضاء هيئة التدريس من Supabase:', error);
            return { members: [], error: { code: error && error.code ? error.code : 'request-failed' } };

        } finally {
            clearTimeout(timer);
        }
    }
};
