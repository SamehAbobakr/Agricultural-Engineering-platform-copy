-- =====================================================================
-- نظام الغرف والمهمات والنقاط: الجداول + سياسات RLS + دالة تسجيل الإنجاز
--
-- أين يُنفَّذ؟
--   Supabase Dashboard → SQL Editor → New query → الصق الملف كاملًا → Run.
--   آمن لإعادة التشغيل (idempotent): لا يحذف جداول ولا بيانات، ولا يمسّ أي جدول قائم.
--
-- ما الذي يفعله؟
--   1) rooms / tasks / task_content : المحتوى. القراءة متاحة للزوار (المنشور فقط)، ولا كتابة من الواجهة.
--   2) user_task_completions        : إنجازات الطلاب. كل طالب يقرأ إنجازاته فقط، ولا أحد يكتب فيها مباشرة.
--   3) public.complete_task(task_id): الطريقة الوحيدة لتسجيل إنجاز. تأخذ هوية الطالب من الجلسة
--                                     (auth.uid()) والنقاط من جدول tasks، ولا تقبل أي قيمة من المتصفح
--                                     غير رقم المهمة، فلا يمكن التلاعب بالنقاط ولا الإنجاز باسم غيرك.
--
-- النقاط: لا يوجد جدول نقاط مستقل. الإجمالي = SUM(awarded_points) من إنجازات الطالب،
--   فيتطابق دائمًا مع الإنجازات الحقيقية ولا يمكن احتسابه مرتين (قيد UNIQUE على user_id + task_id).
--
-- إدارة المحتوى: من لوحة Supabase (Table Editor أو SQL Editor) فقط. استخدم is_active = false
--   لإخفاء غرفة أو مهمة بدل حذفها؛ حذف مهمة عليها إنجازات مرفوض عمدًا (ON DELETE RESTRICT)
--   حتى لا تضيع نقاط الطلاب بالخطأ.
--
-- ملاحظة: هذا الملف لا يحتوي بيانات تجريبية ولا يغيّر أي سياسة على جداول المنصة الأخرى.
-- =====================================================================


-- ---------------------------------------------------------------------
-- دالة تحديث updated_at (خاصة بهذا النظام، لا تلمس دوال الجداول الأخرى)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rooms_set_updated_at()
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
-- 1) الغرف
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    cover_image TEXT,
    icon TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    difficulty TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT rooms_slug_key UNIQUE (slug),
    CONSTRAINT rooms_title_len CHECK (CHAR_LENGTH(BTRIM(title)) BETWEEN 1 AND 200),
    CONSTRAINT rooms_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    CONSTRAINT rooms_description_len CHECK (CHAR_LENGTH(description) <= 2000),
    CONSTRAINT rooms_difficulty_values
        CHECK (difficulty IS NULL OR difficulty IN ('beginner', 'intermediate', 'advanced')),
    CONSTRAINT rooms_cover_image_http
        CHECK (cover_image IS NULL OR cover_image ~* '^https?://[^[:space:]]+$')
);

COMMENT ON TABLE public.rooms IS 'غرف استكشاف الكلية (كل غرفة تحتوي مجموعة مهمات).';

CREATE INDEX IF NOT EXISTS rooms_active_order_idx ON public.rooms (is_active, sort_order);


-- ---------------------------------------------------------------------
-- 2) المهمات
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.rooms (id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    points INTEGER NOT NULL DEFAULT 10,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT tasks_title_len CHECK (CHAR_LENGTH(BTRIM(title)) BETWEEN 1 AND 300),
    CONSTRAINT tasks_description_len CHECK (CHAR_LENGTH(description) <= 2000),
    CONSTRAINT tasks_points_range CHECK (points BETWEEN 0 AND 1000)
);

COMMENT ON TABLE public.tasks IS 'مهمات الغرف: السؤال + عدد النقاط. المحتوى التفصيلي في task_content.';

CREATE INDEX IF NOT EXISTS tasks_room_order_idx ON public.tasks (room_id, sort_order);


-- ---------------------------------------------------------------------
-- 3) محتوى المهمة
--    صف واحد لكل مهمة، وblocks مصفوفة JSONB مرتّبة؛ كل عنصر كائن له "type" مثل:
--      {"type":"heading","level":2,"text":"..."}      {"type":"paragraph","text":"..."}
--      {"type":"image","url":"https://...","alt":"...","caption":"..."}
--      {"type":"video","url":"https://...","title":"..."}
--      {"type":"list","ordered":false,"items":["...","..."]}
--      {"type":"table","headers":["..."],"rows":[["..."]]}
--      {"type":"link","url":"https://...","text":"..."}   {"type":"quote","text":"..."}
--    إضافة نوع جديد لا تحتاج تعديل الجدول. الواجهة هي من يقرر كيف تعرض كل نوع، وأي رابط
--    قادم من هنا يمرّ على safeUrl() ونصوصه على escapeHtml() قبل العرض.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.task_content (
    task_id UUID PRIMARY KEY REFERENCES public.tasks (id) ON DELETE CASCADE,
    blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT task_content_blocks_is_array CHECK (JSONB_TYPEOF(blocks) = 'array')
);

COMMENT ON TABLE public.task_content IS 'محتوى المهمة كمصفوفة JSONB مرتّبة من العناصر (نص، صورة، فيديو، جدول...).';


-- ---------------------------------------------------------------------
-- 4) إنجازات الطلاب
--    user_id يُحدَّد من الجلسة فقط (انظر complete_task) ولا يُكتب من المتصفح.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_task_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES public.tasks (id) ON DELETE RESTRICT,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    awarded_points INTEGER NOT NULL,

    CONSTRAINT user_task_completions_user_task_key UNIQUE (user_id, task_id),
    CONSTRAINT user_task_completions_points_range CHECK (awarded_points BETWEEN 0 AND 1000)
);

COMMENT ON TABLE public.user_task_completions IS
    'إنجازات الطلاب: صف واحد لكل (طالب، مهمة). النقاط = مجموع awarded_points.';

CREATE INDEX IF NOT EXISTS user_task_completions_user_idx
    ON public.user_task_completions (user_id, completed_at DESC);


-- ---------------------------------------------------------------------
-- تحديث updated_at تلقائيًا
-- ---------------------------------------------------------------------
DROP TRIGGER IF EXISTS rooms_set_updated_at ON public.rooms;
CREATE TRIGGER rooms_set_updated_at
    BEFORE UPDATE ON public.rooms
    FOR EACH ROW EXECUTE FUNCTION public.rooms_set_updated_at();

DROP TRIGGER IF EXISTS tasks_set_updated_at ON public.tasks;
CREATE TRIGGER tasks_set_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.rooms_set_updated_at();

DROP TRIGGER IF EXISTS task_content_set_updated_at ON public.task_content;
CREATE TRIGGER task_content_set_updated_at
    BEFORE UPDATE ON public.task_content
    FOR EACH ROW EXECUTE FUNCTION public.rooms_set_updated_at();


-- ---------------------------------------------------------------------
-- RLS
--   المحتوى: الزائر والطالب يقرآن المنشور فقط (is_active). لا سياسات كتابة = لا كتابة من الواجهة.
--   الإنجازات: القراءة للمالك فقط. لا سياسات INSERT/UPDATE/DELETE، فكل كتابة مباشرة مرفوضة.
-- ---------------------------------------------------------------------
ALTER TABLE public.rooms                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_content          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_task_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rooms_select_published" ON public.rooms;
CREATE POLICY "rooms_select_published"
    ON public.rooms FOR SELECT TO anon, authenticated
    USING (is_active);

DROP POLICY IF EXISTS "tasks_select_published" ON public.tasks;
CREATE POLICY "tasks_select_published"
    ON public.tasks FOR SELECT TO anon, authenticated
    USING (
        is_active
        AND EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = tasks.room_id AND r.is_active)
    );

DROP POLICY IF EXISTS "task_content_select_published" ON public.task_content;
CREATE POLICY "task_content_select_published"
    ON public.task_content FOR SELECT TO anon, authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.tasks t
            JOIN public.rooms r ON r.id = t.room_id
            WHERE t.id = task_content.task_id AND t.is_active AND r.is_active
        )
    );

DROP POLICY IF EXISTS "user_task_completions_select_own" ON public.user_task_completions;
CREATE POLICY "user_task_completions_select_own"
    ON public.user_task_completions FOR SELECT TO authenticated
    USING ((SELECT auth.uid()) = user_id);


-- ---------------------------------------------------------------------
-- الصلاحيات (طبقة ثانية فوق RLS): قراءة فقط؛ الكتابة الوحيدة عبر complete_task
-- ---------------------------------------------------------------------
REVOKE ALL ON TABLE public.rooms                 FROM anon, authenticated;
REVOKE ALL ON TABLE public.tasks                 FROM anon, authenticated;
REVOKE ALL ON TABLE public.task_content          FROM anon, authenticated;
REVOKE ALL ON TABLE public.user_task_completions FROM anon, authenticated;

GRANT SELECT ON TABLE public.rooms        TO anon, authenticated;
GRANT SELECT ON TABLE public.tasks        TO anon, authenticated;
GRANT SELECT ON TABLE public.task_content TO anon, authenticated;
GRANT SELECT ON TABLE public.user_task_completions TO authenticated;


-- ---------------------------------------------------------------------
-- تسجيل إنجاز مهمة (الطريقة الوحيدة)
--   الاستدعاء من الواجهة:  supabase.rpc('complete_task', { p_task_id: '<uuid>' })
--   - الهوية من auth.uid() (JWT موثوق) — لا يوجد معامل user_id أصلًا.
--   - النقاط تُقرأ من tasks.points وقت التسجيل (لا تُرسَل من المتصفح).
--   - تُقبل مهمة منشورة داخل غرفة منشورة فقط.
--   - تكرار الاستدعاء لا يمنح نقاطًا إضافية: يُرجع الإنجاز الأول مع newly_completed = false.
--   - SECURITY DEFINER لأنها تكتب في جدول مغلق على الواجهة؛ search_path فارغ وكل الأسماء كاملة.
--   النتيجة JSON: { task_id, awarded_points, newly_completed, completed_at }
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_task(p_task_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_points INTEGER;
    v_row public.user_task_completions%ROWTYPE;
    v_new BOOLEAN := TRUE;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '28000';
    END IF;

    SELECT t.points
      INTO v_points
      FROM public.tasks t
      JOIN public.rooms r ON r.id = t.room_id
     WHERE t.id = p_task_id AND t.is_active AND r.is_active;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'TASK_NOT_FOUND' USING ERRCODE = 'P0002';
    END IF;

    INSERT INTO public.user_task_completions (user_id, task_id, awarded_points)
    VALUES (v_uid, p_task_id, v_points)
    ON CONFLICT ON CONSTRAINT user_task_completions_user_task_key DO NOTHING
    RETURNING * INTO v_row;

    IF NOT FOUND THEN
        v_new := FALSE;

        SELECT *
          INTO v_row
          FROM public.user_task_completions c
         WHERE c.user_id = v_uid AND c.task_id = p_task_id;
    END IF;

    RETURN JSONB_BUILD_OBJECT(
        'task_id', v_row.task_id,
        'awarded_points', v_row.awarded_points,
        'newly_completed', v_new,
        'completed_at', v_row.completed_at
    );
END;
$$;

REVOKE ALL ON FUNCTION public.complete_task(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_task(UUID) TO authenticated;


-- ---------------------------------------------------------------------
-- للتحقق بعد التشغيل (اختياري):
--   SELECT tablename, rowsecurity FROM pg_tables
--   WHERE schemaname = 'public'
--     AND tablename IN ('rooms','tasks','task_content','user_task_completions');
--   → يجب أن تظهر rowsecurity = true للجداول الأربعة.
--
-- إجمالي نقاط الطالب الحالي (من الواجهة بعد تسجيل الدخول):
--   supabase.from('user_task_completions').select('awarded_points')  ثم اجمع القيم
--   (السياسة تُرجع إنجازاته هو فقط).
-- ---------------------------------------------------------------------
