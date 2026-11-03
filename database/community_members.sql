-- =========================================
-- مجتمع طلاب وخريجي الهندسة الزراعية
-- جدول مستقل تمامًا: لا يلمس أي جدول أو سياسة موجودة.
-- يُنفَّذ يدويًا مرة واحدة من Supabase → SQL Editor (آمن لإعادة التشغيل).
-- =========================================

CREATE TABLE IF NOT EXISTS public.community_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    member_type TEXT NOT NULL,               -- 'student' أو 'graduate'
    department TEXT NOT NULL,
    study_year SMALLINT,                     -- 1..4 (للطالب فقط)
    graduation_year SMALLINT,                -- للخريج فقط (اختياري)
    bio TEXT,
    skills TEXT[] NOT NULL DEFAULT '{}',     -- مهارات ومجالات المساعدة (نصوص حرة)
    phone TEXT,                              -- رقم هاتف/واتساب (اختياري)
    facebook_url TEXT,
    linkedin_url TEXT,
    github_url TEXT,                         -- GitHub أو موقع شخصي
    profile_image TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT community_members_full_name_len
        CHECK (CHAR_LENGTH(BTRIM(full_name)) BETWEEN 2 AND 200),

    CONSTRAINT community_members_type_valid
        CHECK (member_type IN ('student', 'graduate')),

    CONSTRAINT community_members_department_len
        CHECK (CHAR_LENGTH(BTRIM(department)) BETWEEN 1 AND 120),

    CONSTRAINT community_members_study_year_valid
        CHECK (study_year IS NULL OR (member_type = 'student' AND study_year BETWEEN 1 AND 4)),

    CONSTRAINT community_members_graduation_year_valid
        CHECK (graduation_year IS NULL OR (member_type = 'graduate' AND graduation_year BETWEEN 1950 AND 2100)),

    CONSTRAINT community_members_bio_len
        CHECK (bio IS NULL OR CHAR_LENGTH(bio) <= 1500),

    CONSTRAINT community_members_skills_size
        CHECK (
            CARDINALITY(skills) <= 20
            AND CHAR_LENGTH(ARRAY_TO_STRING(skills, '|')) <= 800
        ),

    CONSTRAINT community_members_phone_format
        CHECK (phone IS NULL OR phone ~ '^\+?[0-9 ()-]{8,20}$'),

    CONSTRAINT community_members_facebook_http
        CHECK (facebook_url IS NULL OR BTRIM(facebook_url) = '' OR facebook_url ~* '^https?://[^[:space:]]+$'),

    CONSTRAINT community_members_linkedin_http
        CHECK (linkedin_url IS NULL OR BTRIM(linkedin_url) = '' OR linkedin_url ~* '^https?://[^[:space:]]+$'),

    CONSTRAINT community_members_github_http
        CHECK (github_url IS NULL OR BTRIM(github_url) = '' OR github_url ~* '^https?://[^[:space:]]+$'),

    CONSTRAINT community_members_image_http
        CHECK (profile_image IS NULL OR BTRIM(profile_image) = '' OR profile_image ~* '^https?://[^[:space:]]+$')
);

COMMENT ON TABLE public.community_members IS
    'مجتمع طلاب وخريجي كلية الهندسة الزراعية (مبادرة طلابية غير رسمية). تُضاف السجلات يدويًا وبموافقة أصحابها.';

CREATE INDEX IF NOT EXISTS community_members_active_order_idx
    ON public.community_members (sort_order, full_name)
    WHERE is_active = TRUE;

CREATE OR REPLACE FUNCTION public.community_members_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS community_members_set_updated_at
    ON public.community_members;

CREATE TRIGGER community_members_set_updated_at
    BEFORE UPDATE ON public.community_members
    FOR EACH ROW
    EXECUTE FUNCTION public.community_members_set_updated_at();

-- الأمان: قراءة السجلات النشطة فقط، ولا كتابة من المتصفح إطلاقًا.
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "community_members_public_read_active"
    ON public.community_members;

CREATE POLICY "community_members_public_read_active"
    ON public.community_members
    FOR SELECT
    TO anon, authenticated
    USING (is_active = TRUE);

REVOKE ALL ON TABLE public.community_members FROM anon, authenticated;

GRANT SELECT (
    id, full_name, member_type, department, study_year, graduation_year,
    bio, skills, phone, facebook_url, linkedin_url, github_url,
    profile_image, is_active, sort_order
)
ON TABLE public.community_members
TO anon, authenticated;

-- =========================================
-- قالب لإضافة عضو (انسخه من SQL Editor وبدّل القيم بعد موافقة صاحبها):
--
-- INSERT INTO public.community_members
--     (full_name, member_type, department, study_year, graduation_year,
--      bio, skills, phone, facebook_url, linkedin_url, github_url, profile_image, sort_order)
-- VALUES
--     ('<الاسم>', 'student',  '<اسم القسم كما في المنصة>', 3, NULL,
--      '<نبذة قصيرة>', ARRAY['<مهارة 1>', '<مهارة 2>'],
--      NULL, NULL, NULL, NULL, NULL, 10),
--     ('<الاسم>', 'graduate', '<اسم القسم كما في المنصة>', NULL, 2022,
--      NULL, ARRAY['<مجال مساعدة>'],
--      NULL, NULL, NULL, NULL, NULL, 20);
--
-- لإخفاء عضو دون حذفه:  UPDATE public.community_members SET is_active = FALSE WHERE id = '<المعرّف>';
-- =========================================
