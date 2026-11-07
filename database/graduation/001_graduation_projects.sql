-- =====================================================================
-- معرض مشاريع التخرج: جدول graduation_projects + الفهارس + RLS
--
-- أين يُنفَّذ؟  Supabase → SQL Editor → الصق الملف كاملًا → Run (آمن لإعادة التشغيل، لا يحذف بيانات).
-- المتطلب السابق: database/admin/001_admin_setup.sql (يوفّر الدالة public.is_admin()).
-- نفّذه على Staging أولًا ثم Production.
--
-- قرارات التصميم (مبنية على بنية المنصة الفعلية):
--   * الأقسام العلمية ليست جدولًا في قاعدة البيانات؛ هي قائمة ثابتة في js/data.js (departmentsList)،
--     وجداول المنصة (faculty_members, subjects) تخزّن اسم القسم نصًّا. لذلك department هنا نصّ بنفس الأسماء
--     ولا يوجد department_id (لا يوجد جدول يُشار إليه). الواجهة تفرض اختيار الاسم من القائمة نفسها.
--   * الطلاب والصور والكلمات المفتاحية والمراجع تُخزَّن داخل صف المشروع (مصفوفات / JSONB) بدل جداول فرعية:
--     تُقرأ دائمًا مع المشروع، ولا تحتاج RLS مستقلة، ولا تعقّد نموذج لوحة الإدارة الحالية (CRUD لجدول واحد).
--   * الملفات (صور/PDF) لا تُخزَّن في القاعدة: هنا روابطها فقط (R2 أو غيره، http/https).
--   * id من نوع UUID كبقية جداول المنصة (rooms, tasks, faculty_members).
-- =====================================================================
BEGIN;

-- مساعد: كل عناصر المصفوفة روابط http/https صالحة (CHECK لا يقبل استعلامًا فرعيًا، فنستخدم دالة IMMUTABLE)
CREATE OR REPLACE FUNCTION public.graduation_urls_ok(p_urls TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
    SELECT COALESCE(BOOL_AND(u ~* '^https?://[^[:space:]]+$'), TRUE) FROM UNNEST(p_urls) AS u;
$$;

-- مساعد: external_links مصفوفة كائنات {title, url} بروابط http/https
CREATE OR REPLACE FUNCTION public.graduation_links_ok(p_links JSONB)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
    SELECT JSONB_TYPEOF(p_links) = 'array'
       AND JSONB_ARRAY_LENGTH(p_links) <= 30
       AND NOT EXISTS (
            SELECT 1 FROM JSONB_ARRAY_ELEMENTS(p_links) AS e
             WHERE JSONB_TYPEOF(e) <> 'object'
                OR COALESCE(e ->> 'url', '') !~* '^https?://[^[:space:]]+$'
                OR CHAR_LENGTH(COALESCE(e ->> 'title', '')) > 300
       );
$$;

CREATE TABLE IF NOT EXISTS public.graduation_projects (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title             TEXT NOT NULL,
    slug              TEXT NOT NULL,
    summary           TEXT NOT NULL DEFAULT '',          -- وصف مختصر يظهر في البطاقة
    description       TEXT,                              -- الوصف والنبذة
    problem_statement TEXT,                              -- المشكلة التي يعالجها
    objectives        TEXT[] NOT NULL DEFAULT '{}',      -- أهداف المشروع (عنصر لكل هدف)
    methodology       TEXT,                              -- طريقة التنفيذ
    department        TEXT NOT NULL,                     -- القسم العلمي (من قائمة المنصة)
    graduation_year   INTEGER NOT NULL,
    project_field     TEXT NOT NULL,                     -- مجال المشروع
    project_type      TEXT NOT NULL,                     -- نوع المشروع
    supervisor        TEXT,                              -- الدكتور المشرف
    students          TEXT[] NOT NULL DEFAULT '{}',      -- أسماء الطلاب المشاركين
    keywords          TEXT[] NOT NULL DEFAULT '{}',
    cover_image       TEXT,
    gallery_images    TEXT[] NOT NULL DEFAULT '{}',
    video_url         TEXT,
    report_url        TEXT,
    external_links    JSONB NOT NULL DEFAULT '[]'::JSONB,  -- [{ "title": "...", "url": "https://..." }]
    is_published      BOOLEAN NOT NULL DEFAULT FALSE,    -- مسودة افتراضيًا
    published_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT graduation_projects_slug_key UNIQUE (slug),
    CONSTRAINT graduation_projects_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND CHAR_LENGTH(slug) <= 120),
    CONSTRAINT graduation_projects_title_len CHECK (CHAR_LENGTH(BTRIM(title)) BETWEEN 3 AND 250),
    CONSTRAINT graduation_projects_summary_len CHECK (CHAR_LENGTH(summary) <= 600),
    CONSTRAINT graduation_projects_description_len CHECK (description IS NULL OR CHAR_LENGTH(description) <= 8000),
    CONSTRAINT graduation_projects_problem_len CHECK (problem_statement IS NULL OR CHAR_LENGTH(problem_statement) <= 5000),
    CONSTRAINT graduation_projects_methodology_len CHECK (methodology IS NULL OR CHAR_LENGTH(methodology) <= 8000),
    CONSTRAINT graduation_projects_department_len CHECK (CHAR_LENGTH(BTRIM(department)) BETWEEN 1 AND 120),
    CONSTRAINT graduation_projects_year_range CHECK (graduation_year BETWEEN 1990 AND 2100),
    CONSTRAINT graduation_projects_field_len CHECK (CHAR_LENGTH(BTRIM(project_field)) BETWEEN 1 AND 120),
    CONSTRAINT graduation_projects_type_len CHECK (CHAR_LENGTH(BTRIM(project_type)) BETWEEN 1 AND 120),
    CONSTRAINT graduation_projects_supervisor_len CHECK (supervisor IS NULL OR CHAR_LENGTH(supervisor) <= 200),
    CONSTRAINT graduation_projects_students_max CHECK (CARDINALITY(students) <= 20),
    CONSTRAINT graduation_projects_objectives_max CHECK (CARDINALITY(objectives) <= 30),
    CONSTRAINT graduation_projects_keywords_max CHECK (CARDINALITY(keywords) <= 20),
    CONSTRAINT graduation_projects_gallery_max CHECK (CARDINALITY(gallery_images) <= 40),
    CONSTRAINT graduation_projects_cover_http CHECK (cover_image IS NULL OR cover_image ~* '^https?://[^[:space:]]+$'),
    CONSTRAINT graduation_projects_video_http CHECK (video_url IS NULL OR video_url ~* '^https?://[^[:space:]]+$'),
    CONSTRAINT graduation_projects_report_http CHECK (report_url IS NULL OR report_url ~* '^https?://[^[:space:]]+$'),
    CONSTRAINT graduation_projects_gallery_http CHECK (public.graduation_urls_ok(gallery_images)),
    CONSTRAINT graduation_projects_links_valid CHECK (public.graduation_links_ok(external_links))
);

COMMENT ON TABLE public.graduation_projects IS
    'أرشيف مشاريع التخرج. القراءة العامة للمنشور فقط (is_published)، والكتابة للمسؤول فقط (is_admin()).';

-- الفهارس
CREATE INDEX IF NOT EXISTS graduation_projects_published_year_idx
    ON public.graduation_projects (is_published, graduation_year DESC);
CREATE INDEX IF NOT EXISTS graduation_projects_department_idx
    ON public.graduation_projects (department);
CREATE INDEX IF NOT EXISTS graduation_projects_keywords_gin
    ON public.graduation_projects USING GIN (keywords);

-- updated_at تلقائيًا + published_at عند أول نشر
CREATE OR REPLACE FUNCTION public.graduation_projects_before_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at := NOW();
    IF NEW.is_published AND NEW.published_at IS NULL THEN
        NEW.published_at := NOW();
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS graduation_projects_before_write ON public.graduation_projects;
CREATE TRIGGER graduation_projects_before_write
    BEFORE INSERT OR UPDATE ON public.graduation_projects
    FOR EACH ROW EXECUTE FUNCTION public.graduation_projects_before_write();

-- RLS: قراءة عامة للمنشور فقط، وكل الكتابة (والقراءة الكاملة بما فيها المسودات) للمسؤول
ALTER TABLE public.graduation_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "graduation_projects_public_read" ON public.graduation_projects;
CREATE POLICY "graduation_projects_public_read"
    ON public.graduation_projects FOR SELECT TO anon, authenticated
    USING (is_published);

DROP POLICY IF EXISTS "admin_all" ON public.graduation_projects;
CREATE POLICY "admin_all"
    ON public.graduation_projects FOR ALL TO authenticated
    USING ((SELECT public.is_admin()))
    WITH CHECK ((SELECT public.is_admin()));

-- الصلاحيات (طبقة ثانية فوق RLS)
REVOKE ALL ON TABLE public.graduation_projects FROM anon, authenticated;
GRANT SELECT ON TABLE public.graduation_projects TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.graduation_projects TO authenticated;

COMMIT;

-- للتحقق بعد التشغيل (اختياري):
--   SELECT policyname, roles, cmd FROM pg_policies WHERE tablename = 'graduation_projects';
--     → graduation_projects_public_read {anon,authenticated} SELECT  و  admin_all {authenticated} ALL
--   SELECT rowsecurity FROM pg_tables WHERE tablename = 'graduation_projects';   → true
