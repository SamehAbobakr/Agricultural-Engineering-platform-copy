// =========================================
// معرض مشاريع التخرج — طبقة البيانات (Supabase)
// الوحيدة التي تتكلم مع قاعدة البيانات. تعيد دائمًا { data, error } ولا ترمي أخطاء.
// العميل الوحيد من PlatformAuth.getClient()؛ الحماية الحقيقية RLS (المنشور فقط للزوار).
// =========================================

const GradApi = {

    client() {
        if (window.SUPABASE_CONFIG_ERROR) return null;
        return (window.PlatformAuth && PlatformAuth.getClient()) || null;
    },

    async run(factory) {
        const client = GradApi.client();
        if (!client) {
            return { data: null, error: new Error(window.SUPABASE_CONFIG_ERROR || 'خدمة قاعدة البيانات غير متاحة') };
        }
        try {
            const res = await GradUtils.withTimeout(Promise.resolve(factory(client)), GRAD_CONFIG.requestTimeoutMs);
            if (res.error) return { data: null, error: res.error };
            return { data: res.data, error: null };
        } catch (error) {
            return { data: null, error: error };
        }
    },

    // كل المشاريع المنشورة (للبطاقات)
    listPublished() {
        return GradApi.run(function (c) {
            return c.from(GRAD_CONFIG.table)
                .select(GRAD_CONFIG.listColumns)
                .eq('is_published', true)
                .order('graduation_year', { ascending: false })
                .order('title', { ascending: true });
        }).then(function (res) {
            if (res.error) return res;
            return { data: (res.data || []).map(GradApi.normalize).filter(Boolean), error: null };
        });
    },

    // مشروع منشور واحد بالـ slug (null إن لم يوجد أو كان مسودة)
    getBySlug(slug) {
        return GradApi.run(function (c) {
            return c.from(GRAD_CONFIG.table)
                .select(GRAD_CONFIG.detailColumns)
                .eq('slug', slug)
                .eq('is_published', true)
                .maybeSingle();
        }).then(function (res) {
            if (res.error) return res;
            return { data: GradApi.normalize(res.data), error: null };
        });
    },

    // توحيد صف قادم من القاعدة
    normalize(raw) {
        if (!raw || typeof raw !== 'object') return null;

        const slug = GradUtils.cleanText(raw.slug);
        const title = GradUtils.cleanText(raw.title);
        if (!title || !GRAD_CONFIG.slugPattern.test(slug)) return null;

        const year = Number(raw.graduation_year);

        const links = (Array.isArray(raw.external_links) ? raw.external_links : [])
            .map(function (l) {
                const url = GradUtils.httpUrl(l && l.url);
                return url ? { url: url, title: GradUtils.cleanText(l.title) || url } : null;
            })
            .filter(Boolean);

        return {
            id: String(raw.id),
            slug: slug,
            title: title,
            summary: GradUtils.cleanText(raw.summary),
            description: GradUtils.cleanText(raw.description),
            problem: GradUtils.cleanText(raw.problem_statement),
            objectives: GradUtils.textList(raw.objectives),
            methodology: GradUtils.cleanText(raw.methodology),
            department: GradUtils.cleanText(raw.department),
            year: Number.isFinite(year) ? year : 0,
            field: GradUtils.cleanText(raw.project_field),
            type: GradUtils.cleanText(raw.project_type),
            supervisor: GradUtils.cleanText(raw.supervisor),
            students: GradUtils.textList(raw.students),
            keywords: GradUtils.textList(raw.keywords),
            cover: GradUtils.httpUrl(raw.cover_image),
            gallery: GradUtils.textList(raw.gallery_images).map(GradUtils.httpUrl).filter(Boolean),
            video: GradUtils.httpUrl(raw.video_url),
            report: GradUtils.httpUrl(raw.report_url),
            links: links,
            stamp: new Date(raw.published_at || raw.created_at || 0).getTime() || 0
        };
    }
};
