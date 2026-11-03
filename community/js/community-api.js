// =========================================
// مجتمع الطلاب والخريجين — طبقة البيانات
// الوحيدة التي تعرف من أين تأتي البيانات (جدول Supabase).
// تعيد دائمًا { members, error } ولا ترمي أخطاء.
// تعتمد على: js/config.js ثم js/supabase.js (عميل Supabase المشترك supabaseClient)
// =========================================

const CommunityApi = {

    // المهارات قد تصل كمصفوفة (TEXT[]) أو كنص مفصول بفواصل — نقبل الحالتين
    parseSkills(value) {
        let list = [];

        if (Array.isArray(value)) list = value;
        else if (typeof value === 'string') list = value.split(/[,،;؛\n]/);

        const seen = new Set();
        const skills = [];

        list.forEach(item => {
            const label = CommunityUtils.cleanText(typeof item === 'string' ? item : '')
                .slice(0, COMMUNITY_CONFIG.maxSkillLength);
            const key = CommunityUtils.searchKey(label);

            if (label && !seen.has(key) && skills.length < COMMUNITY_CONFIG.maxSkills) {
                seen.add(key);
                skills.push({ label, key });
            }
        });

        return skills;
    },

    // سنة صحيحة ضمن نطاق، أو null
    parseYear(value, min, max) {
        const number = Number(value);
        return (value !== null && value !== '' && Number.isInteger(number) && number >= min && number <= max)
            ? number
            : null;
    },

    // تحويل سجل الجدول إلى الشكل الداخلي الذي تستخدمه الواجهة
    normalizeRecord(raw) {
        if (!raw || typeof raw !== 'object') return null;

        const id = raw.id === null || raw.id === undefined ? '' : String(raw.id);
        const name = CommunityUtils.cleanText(raw.full_name);
        const type = CommunityUtils.cleanText(raw.member_type);

        // سجل بلا معرّف أو اسم أو صفة معروفة لا يُعرض، والسجل غير النشط لا يُعرض أبدًا
        if (!id || !name || raw.is_active === false) return null;
        if (!Object.prototype.hasOwnProperty.call(COMMUNITY_CONFIG.memberTypes, type)) return null;

        const sortOrder = Number(raw.sort_order);
        const isStudent = type === 'student';

        return {
            id,
            name,
            type,
            department: CommunityUtils.cleanText(raw.department),
            studyYear: isStudent ? CommunityApi.parseYear(raw.study_year, 1, 4) : null,
            graduationYear: isStudent ? null : CommunityApi.parseYear(raw.graduation_year, 1950, 2100),
            bio: CommunityUtils.cleanText(raw.bio),
            skills: CommunityApi.parseSkills(raw.skills),
            phone: CommunityUtils.cleanText(raw.phone),
            facebook: CommunityUtils.cleanText(raw.facebook_url),
            linkedin: CommunityUtils.cleanText(raw.linkedin_url),
            github: CommunityUtils.cleanText(raw.github_url),
            image: CommunityUtils.cleanText(raw.profile_image),
            sortOrder: Number.isFinite(sortOrder) && raw.sort_order !== null ? sortOrder : null
        };
    },

    // ترتيب: sort_order (الفارغ في النهاية) ← الاسم
    compareMembers(a, b) {
        if (a.sortOrder !== b.sortOrder) {
            if (a.sortOrder === null) return 1;
            if (b.sortOrder === null) return -1;
            return a.sortOrder - b.sortOrder;
        }

        return a.name.localeCompare(b.name, 'ar');
    },

    // تنظيف القائمة: تحويل + حذف غير الصالح + منع تكرار نفس المعرّف + ترتيب
    prepare(rawList) {
        const byId = new Map();

        (Array.isArray(rawList) ? rawList : []).forEach(raw => {
            const member = CommunityApi.normalizeRecord(raw);
            if (member && !byId.has(member.id)) byId.set(member.id, member);
        });

        return [...byId.values()].sort(CommunityApi.compareMembers);
    },

    // نقطة الدخول الوحيدة التي تستدعيها الواجهة
    async load() {
        if (typeof supabaseClient === 'undefined' || !supabaseClient) {
            console.error('❌ عميل Supabase غير متاح: تأكد من تحميل js/config.js و js/supabase.js قبل ملفات المجتمع.');
            return { members: [], error: { code: 'client-missing' } };
        }

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), COMMUNITY_CONFIG.requestTimeoutMs);

        try {
            const { data, error } = await supabaseClient
                .from(COMMUNITY_CONFIG.table)
                .select(COMMUNITY_CONFIG.columns)
                .eq('is_active', true)
                .order('sort_order', { ascending: true, nullsFirst: false })
                .order('full_name', { ascending: true })
                .limit(1000)
                .abortSignal(controller.signal);

            if (error) throw error;

            return { members: CommunityApi.prepare(data), error: null };

        } catch (error) {
            console.error('❌ خطأ في جلب أعضاء المجتمع من Supabase:', error);
            return { members: [], error: { code: error && error.code ? error.code : 'request-failed' } };

        } finally {
            clearTimeout(timer);
        }
    }
};
