CREATE TABLE IF NOT EXISTS public.faculty_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    academic_title TEXT NOT NULL,
    department TEXT NOT NULL,
    specialization TEXT,
    bio TEXT,
    email TEXT,
    profile_image TEXT,
    academic_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT faculty_members_full_name_len
        CHECK (CHAR_LENGTH(BTRIM(full_name)) BETWEEN 2 AND 200),

    CONSTRAINT faculty_members_title_len
        CHECK (CHAR_LENGTH(BTRIM(academic_title)) BETWEEN 1 AND 60),

    CONSTRAINT faculty_members_department_len
        CHECK (CHAR_LENGTH(BTRIM(department)) BETWEEN 1 AND 120),

    CONSTRAINT faculty_members_specialization_len
        CHECK (specialization IS NULL OR CHAR_LENGTH(specialization) <= 300),

    CONSTRAINT faculty_members_bio_len
        CHECK (bio IS NULL OR CHAR_LENGTH(bio) <= 3000),

    CONSTRAINT faculty_members_email_format
        CHECK (
            email IS NULL
            OR (
                CHAR_LENGTH(email) <= 254
                AND email ~ '^[^[:space:]@<>"?&#%\\,;()]+@[^[:space:]@<>"?&#%\\,;()]+\.[^[:space:]@<>"?&#%\\,;()]+$'
            )
        ),

    CONSTRAINT faculty_members_image_http
        CHECK (
            profile_image IS NULL
            OR BTRIM(profile_image) = ''
            OR profile_image ~* '^https?://[^[:space:]]+$'
        ),

    CONSTRAINT faculty_members_url_http
        CHECK (
            academic_url IS NULL
            OR BTRIM(academic_url) = ''
            OR academic_url ~* '^https?://[^[:space:]]+$'
        )
);

COMMENT ON TABLE public.faculty_members IS
    'دليل أعضاء هيئة التدريس بكلية الهندسة الزراعية.';

CREATE INDEX IF NOT EXISTS faculty_members_active_order_idx
    ON public.faculty_members (sort_order, full_name)
    WHERE is_active = TRUE;

CREATE OR REPLACE FUNCTION public.faculty_members_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS faculty_members_set_updated_at
    ON public.faculty_members;

CREATE TRIGGER faculty_members_set_updated_at
    BEFORE UPDATE ON public.faculty_members
    FOR EACH ROW
    EXECUTE FUNCTION public.faculty_members_set_updated_at();

ALTER TABLE public.faculty_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "faculty_members_public_read_active"
    ON public.faculty_members;

CREATE POLICY "faculty_members_public_read_active"
    ON public.faculty_members
    FOR SELECT
    TO anon, authenticated
    USING (is_active = TRUE);

REVOKE ALL ON TABLE public.faculty_members FROM anon, authenticated;

GRANT SELECT (
    id,
    full_name,
    academic_title,
    department,
    specialization,
    bio,
    email,
    profile_image,
    academic_url,
    is_active,
    sort_order
)
ON TABLE public.faculty_members
TO anon, authenticated;