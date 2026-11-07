-- =====================================================================
-- لوحة إنجاز الطالب: جداول بيانات الطالب + سياسات RLS
--
-- أين يُنفَّذ؟
--   Supabase Dashboard → SQL Editor → New query → الصق الملف كاملًا → Run.
--   الملف آمن لإعادة التشغيل (idempotent): لا يحذف جداول ولا بيانات.
--
-- ما الذي يفعله؟
--   ينشئ ثلاثة جداول، كل سجل فيها مرتبط بحساب الطالب (user_id = auth.uid()):
--     1) student_dashboard_profiles  صف واحد لكل طالب: الاسم، الفرقة، الترم، المعدل، العبارة، الملاحظات
--     2) student_dashboard_goals     أهداف الطالب وحالة إنجازها
--     3) student_dashboard_progress  تقدّم الطالب في كل مادة (عدد المحاضرات المراجَعة + رابط الملفات)
--   ويفعّل RLS عليها بحيث لا يقرأ الطالب ولا يعدّل إلا سجلاته هو.
--   لا يمسّ جدول subjects ولا أي جدول آخر، ولا يغيّر مفاتيح المشروع.
--
-- ملاحظة أمان: لا توجد أي سياسة للدور anon، فالزائر غير المسجَّل لا يصل لهذه الجداول إطلاقًا.
-- =====================================================================


-- ---------------------------------------------------------------------
-- دالة مشتركة لتحديث updated_at عند التعديل
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.student_dashboard_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;


-- ---------------------------------------------------------------------
-- 1) البيانات الشخصية (صف واحد لكل طالب)
--    القيم الافتراضية تطابق student_dashboard/js/dashboard-data.js
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_dashboard_profiles (
    user_id UUID PRIMARY KEY DEFAULT auth.uid()
        REFERENCES auth.users (id) ON DELETE CASCADE,
    student_name TEXT NOT NULL DEFAULT 'طالب هندسة زراعية',
    academic_year TEXT NOT NULL DEFAULT '3',
    academic_term TEXT NOT NULL DEFAULT '2',
    gpa TEXT NOT NULL DEFAULT '',
    quote TEXT NOT NULL DEFAULT 'استعن بالله ولا تعجز.. كل خطوة هندسية تقربك من هدفك.',
    quick_notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT student_dashboard_profiles_name_len
        CHECK (CHAR_LENGTH(student_name) BETWEEN 1 AND 100),
    CONSTRAINT student_dashboard_profiles_year
        CHECK (academic_year IN ('1', '2', '3', '4')),
    CONSTRAINT student_dashboard_profiles_term
        CHECK (academic_term IN ('1', '2')),
    CONSTRAINT student_dashboard_profiles_gpa_len
        CHECK (CHAR_LENGTH(gpa) <= 20),
    CONSTRAINT student_dashboard_profiles_quote_len
        CHECK (CHAR_LENGTH(quote) <= 300),
    CONSTRAINT student_dashboard_profiles_notes_len
        CHECK (CHAR_LENGTH(quick_notes) <= 5000)
);

COMMENT ON TABLE public.student_dashboard_profiles IS
    'البيانات الشخصية لطالب لوحة الإنجاز (صف واحد لكل حساب).';


-- ---------------------------------------------------------------------
-- 2) الأهداف
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_dashboard_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid()
        REFERENCES auth.users (id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT '',
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT student_dashboard_goals_title_len
        CHECK (CHAR_LENGTH(BTRIM(title)) BETWEEN 1 AND 200),
    CONSTRAINT student_dashboard_goals_category_len
        CHECK (CHAR_LENGTH(category) <= 50)
);

COMMENT ON TABLE public.student_dashboard_goals IS
    'أهداف الطالب في لوحة الإنجاز وحالة إنجازها.';

CREATE INDEX IF NOT EXISTS student_dashboard_goals_user_idx
    ON public.student_dashboard_goals (user_id, created_at DESC);


-- ---------------------------------------------------------------------
-- 3) التقدم في المواد (صف لكل طالب × مادة)
--    subject_id نص: يطابق قيمة subjects.id أيًّا كان نوعها (رقم أو UUID)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_dashboard_progress (
    user_id UUID NOT NULL DEFAULT auth.uid()
        REFERENCES auth.users (id) ON DELETE CASCADE,
    subject_id TEXT NOT NULL,
    total_files INTEGER NOT NULL DEFAULT 0,
    reviewed_files INTEGER NOT NULL DEFAULT 0,
    link TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (user_id, subject_id),

    CONSTRAINT student_dashboard_progress_subject_len
        CHECK (CHAR_LENGTH(subject_id) BETWEEN 1 AND 100),
    CONSTRAINT student_dashboard_progress_total_range
        CHECK (total_files BETWEEN 0 AND 999),
    CONSTRAINT student_dashboard_progress_reviewed_range
        CHECK (reviewed_files BETWEEN 0 AND total_files),
    CONSTRAINT student_dashboard_progress_link_http
        CHECK (
            link IS NULL
            OR BTRIM(link) = ''
            OR (CHAR_LENGTH(link) <= 2000 AND link ~* '^https?://[^[:space:]]+$')
        )
);

COMMENT ON TABLE public.student_dashboard_progress IS
    'تقدّم الطالب في مراجعة محاضرات كل مادة + رابط ملفاته.';


-- ---------------------------------------------------------------------
-- تحديث updated_at تلقائيًا
-- ---------------------------------------------------------------------
DROP TRIGGER IF EXISTS student_dashboard_profiles_set_updated_at
    ON public.student_dashboard_profiles;
CREATE TRIGGER student_dashboard_profiles_set_updated_at
    BEFORE UPDATE ON public.student_dashboard_profiles
    FOR EACH ROW EXECUTE FUNCTION public.student_dashboard_set_updated_at();

DROP TRIGGER IF EXISTS student_dashboard_goals_set_updated_at
    ON public.student_dashboard_goals;
CREATE TRIGGER student_dashboard_goals_set_updated_at
    BEFORE UPDATE ON public.student_dashboard_goals
    FOR EACH ROW EXECUTE FUNCTION public.student_dashboard_set_updated_at();

DROP TRIGGER IF EXISTS student_dashboard_progress_set_updated_at
    ON public.student_dashboard_progress;
CREATE TRIGGER student_dashboard_progress_set_updated_at
    BEFORE UPDATE ON public.student_dashboard_progress
    FOR EACH ROW EXECUTE FUNCTION public.student_dashboard_set_updated_at();


-- ---------------------------------------------------------------------
-- RLS: كل طالب يرى ويعدّل سجلاته فقط (user_id = auth.uid() الموثوق من JWT)
--   - (SELECT auth.uid()) بدل auth.uid() مباشرة: يُحسب مرة واحدة للاستعلام (أداء أفضل).
--   - WITH CHECK على INSERT/UPDATE يمنع كتابة سجل باسم طالب آخر
--     أو نقل سجل لحساب آخر، حتى لو أرسلت الواجهة user_id مختلفًا.
--   - الدور anon بلا أي سياسة = ممنوع تمامًا.
-- ---------------------------------------------------------------------
ALTER TABLE public.student_dashboard_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_dashboard_goals    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_dashboard_progress ENABLE ROW LEVEL SECURITY;

-- ---- profiles
DROP POLICY IF EXISTS "student_dashboard_profiles_select_own" ON public.student_dashboard_profiles;
DROP POLICY IF EXISTS "student_dashboard_profiles_insert_own" ON public.student_dashboard_profiles;
DROP POLICY IF EXISTS "student_dashboard_profiles_update_own" ON public.student_dashboard_profiles;
DROP POLICY IF EXISTS "student_dashboard_profiles_delete_own" ON public.student_dashboard_profiles;

CREATE POLICY "student_dashboard_profiles_select_own"
    ON public.student_dashboard_profiles FOR SELECT TO authenticated
    USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "student_dashboard_profiles_insert_own"
    ON public.student_dashboard_profiles FOR INSERT TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "student_dashboard_profiles_update_own"
    ON public.student_dashboard_profiles FOR UPDATE TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "student_dashboard_profiles_delete_own"
    ON public.student_dashboard_profiles FOR DELETE TO authenticated
    USING ((SELECT auth.uid()) = user_id);

-- ---- goals
DROP POLICY IF EXISTS "student_dashboard_goals_select_own" ON public.student_dashboard_goals;
DROP POLICY IF EXISTS "student_dashboard_goals_insert_own" ON public.student_dashboard_goals;
DROP POLICY IF EXISTS "student_dashboard_goals_update_own" ON public.student_dashboard_goals;
DROP POLICY IF EXISTS "student_dashboard_goals_delete_own" ON public.student_dashboard_goals;

CREATE POLICY "student_dashboard_goals_select_own"
    ON public.student_dashboard_goals FOR SELECT TO authenticated
    USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "student_dashboard_goals_insert_own"
    ON public.student_dashboard_goals FOR INSERT TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "student_dashboard_goals_update_own"
    ON public.student_dashboard_goals FOR UPDATE TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "student_dashboard_goals_delete_own"
    ON public.student_dashboard_goals FOR DELETE TO authenticated
    USING ((SELECT auth.uid()) = user_id);

-- ---- progress
DROP POLICY IF EXISTS "student_dashboard_progress_select_own" ON public.student_dashboard_progress;
DROP POLICY IF EXISTS "student_dashboard_progress_insert_own" ON public.student_dashboard_progress;
DROP POLICY IF EXISTS "student_dashboard_progress_update_own" ON public.student_dashboard_progress;
DROP POLICY IF EXISTS "student_dashboard_progress_delete_own" ON public.student_dashboard_progress;

CREATE POLICY "student_dashboard_progress_select_own"
    ON public.student_dashboard_progress FOR SELECT TO authenticated
    USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "student_dashboard_progress_insert_own"
    ON public.student_dashboard_progress FOR INSERT TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "student_dashboard_progress_update_own"
    ON public.student_dashboard_progress FOR UPDATE TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "student_dashboard_progress_delete_own"
    ON public.student_dashboard_progress FOR DELETE TO authenticated
    USING ((SELECT auth.uid()) = user_id);


-- ---------------------------------------------------------------------
-- الصلاحيات: الطلاب المسجَّلون فقط (RLS أعلاه يحصر كل طالب في سجلاته)
-- ---------------------------------------------------------------------
REVOKE ALL ON TABLE public.student_dashboard_profiles FROM anon, authenticated;
REVOKE ALL ON TABLE public.student_dashboard_goals    FROM anon, authenticated;
REVOKE ALL ON TABLE public.student_dashboard_progress FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.student_dashboard_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.student_dashboard_goals    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.student_dashboard_progress TO authenticated;


-- ---------------------------------------------------------------------
-- للتحقق بعد التشغيل (اختياري):
--   SELECT tablename, rowsecurity FROM pg_tables
--   WHERE schemaname = 'public' AND tablename LIKE 'student_dashboard_%';
--   → يجب أن تظهر rowsecurity = true للجداول الثلاثة.
-- ---------------------------------------------------------------------
