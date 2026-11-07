-- =====================================================================
-- 003) توحيد نظام النقاط:  السؤال ← المهمة ← الغرفة
--
-- القواعد:
--   tasks.points       = مجموع points للأسئلة النشطة في المهمة (مشتقّة، لا تُدخَل يدويًا)
--   rooms.total_points = مجموع tasks.points للمهام النشطة في الغرفة
--   awarded_points     = مجموع نقاط الأسئلة التي أجاب الطالب عنها صحيحًا وقت إكمال المهمة (لقطة تاريخية)
--
-- ما الذي يفعله هذا الملف؟
--   1) لا يمسّ trg_sync_task_points ولا sync_task_points_from_questions() (اختُبرتا وتعملان).
--      يضيف فوقهما شبكة أمان "مطلقة" (تحسب المجموع من جديد لا تزيد/تنقص) فلا تتعارض معهما:
--        - تغطية نقل سؤال من مهمة لأخرى وحذفه (تحديث المهمتين).
--        - منع تعديل tasks.points يدويًا (من الواجهة أو SQL Editor): تُحسب دائمًا من الأسئلة.
--        - تحديث rooms.total_points عند إضافة/حذف/نقل/تعديل نقاط/تفعيل/تعطيل أي مهمة.
--   2) يستبدل submit_task_answer بنفس الواجهة ونفس الناتج، لكن النقاط = مجموع نقاط أسئلة الطالب الصحيحة
--      (بدل قراءة tasks.points التي قد تتأخر).
--   3) يغلق ثغرة complete_task: كانت تمنح نقاط المهمة كاملة لأي مسجَّل دون إجابة الأسئلة.
--   4) يعيد حساب rooms.total_points فقط (قيمة مشتقة). لا يغيّر tasks.points ولا أي إنجاز تاريخي.
--
-- قبل التشغيل: شغّل diagnostics/points_diagnostics.sql (D1 و D3) وقارن تعريفات الدوال الحية بما في 001.
-- آمن لإعادة التشغيل. لا يحذف بيانات.
-- =====================================================================
BEGIN;

-- 0) العمود موجود بحسب المهمة؛ هذا الأمر لا يفعل شيئًا إن كان موجودًا
ALTER TABLE public.rooms
    ADD COLUMN IF NOT EXISTS total_points INTEGER NOT NULL DEFAULT 0;

-- ---------------------------------------------------------------------
-- 1) حساب مجموع غرفة (مطلق)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recalc_room_total_points(p_room_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF p_room_id IS NULL THEN RETURN; END IF;

    UPDATE public.rooms r
       SET total_points = s.total
      FROM (SELECT COALESCE(SUM(t.points), 0)::INTEGER AS total
              FROM public.tasks t
             WHERE t.room_id = p_room_id AND t.is_active) s
     WHERE r.id = p_room_id
       AND r.total_points IS DISTINCT FROM s.total;
END;
$$;

-- ---------------------------------------------------------------------
-- 2) حساب نقاط مهمة من أسئلتها النشطة (مطلق)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recalc_task_points(p_task_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF p_task_id IS NULL THEN RETURN; END IF;

    UPDATE public.tasks t
       SET points = s.total
      FROM (SELECT COALESCE(SUM(q.points), 0)::INTEGER AS total
              FROM public.task_quiz_questions q
             WHERE q.task_id = p_task_id AND q.is_active) s
     WHERE t.id = p_task_id
       AND t.points IS DISTINCT FROM s.total;
END;
$$;

REVOKE ALL ON FUNCTION public.recalc_room_total_points(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recalc_task_points(UUID)       FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------
-- 3) أسئلة ← مهمة (بلا قائمة أعمدة عمدًا: UPDATE OF لا يعمل إلا لو ذُكر العمود في SET؛ والحساب المطلق لا يكتب إن لم يتغيّر شيء)
--    يغطي الإضافة والحذف والنقل (المهمة القديمة والجديدة) والتفعيل والتعطيل وتعديل الدرجة
--    الاسم يبدأ بـ trg_zz_ ليعمل بعد trg_sync_task_points (الـ Triggers تعمل بالترتيب الأبجدي)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.points_questions_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF TG_OP IN ('UPDATE', 'DELETE') THEN
        PERFORM public.recalc_task_points(OLD.task_id);
    END IF;
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        PERFORM public.recalc_task_points(NEW.task_id);
    END IF;
    RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.points_questions_changed() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_zz_points_questions_changed ON public.task_quiz_questions;
CREATE TRIGGER trg_zz_points_questions_changed
    AFTER INSERT OR DELETE OR UPDATE ON public.task_quiz_questions
    FOR EACH ROW EXECUTE FUNCTION public.points_questions_changed();

-- ---------------------------------------------------------------------
-- 4) مهام: نقاط المهمة مشتقة دائمًا (تمنع الإدخال اليدوي)
--    BEFORE: القيمة الجديدة = مجموع الأسئلة النشطة، مهما أُرسل في INSERT/UPDATE.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.points_task_enforce_derived()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.points := 0;   -- مهمة جديدة بلا أسئلة
    ELSE
        NEW.points := COALESCE((
            SELECT SUM(q.points)::INTEGER
              FROM public.task_quiz_questions q
             WHERE q.task_id = NEW.id AND q.is_active
        ), 0);
    END IF;
    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.points_task_enforce_derived() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_aa_points_task_enforce_derived ON public.tasks;
CREATE TRIGGER trg_aa_points_task_enforce_derived
    BEFORE INSERT OR UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.points_task_enforce_derived();

-- ---------------------------------------------------------------------
-- 5) مهام ← غرفة: إضافة/حذف/نقل/تعديل نقاط/تفعيل/تعطيل
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.points_tasks_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF TG_OP IN ('UPDATE', 'DELETE') THEN
        PERFORM public.recalc_room_total_points(OLD.room_id);
    END IF;
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        PERFORM public.recalc_room_total_points(NEW.room_id);
    END IF;
    RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.points_tasks_changed() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_zz_points_tasks_changed ON public.tasks;
CREATE TRIGGER trg_zz_points_tasks_changed
    AFTER INSERT OR DELETE OR UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.points_tasks_changed();

-- ---------------------------------------------------------------------
-- 6) submit_task_answer: نفس الواجهة والناتج؛ النقاط = مجموع نقاط أسئلة الطالب الصحيحة
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_task_answer(p_question_id UUID, p_option_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_uid        UUID := auth.uid();
    v_task_id    UUID;
    v_correct_id TEXT;
    v_is_correct BOOLEAN;
    v_total      INTEGER;
    v_answered   INTEGER;
    v_points     INTEGER;
    v_row        public.user_task_completions%ROWTYPE;
    v_completed  BOOLEAN := FALSE;
    v_new        BOOLEAN := FALSE;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '28000';
    END IF;

    SELECT q.task_id, q.correct_option_id
      INTO v_task_id, v_correct_id
      FROM public.task_quiz_questions q
      JOIN public.tasks t ON t.id = q.task_id
      JOIN public.rooms r ON r.id = t.room_id
     WHERE q.id = p_question_id AND q.is_active AND t.is_active AND r.is_active;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'QUESTION_NOT_FOUND' USING ERRCODE = 'P0002';
    END IF;

    v_is_correct := (p_option_id IS NOT NULL AND p_option_id = v_correct_id);

    IF v_is_correct THEN
        INSERT INTO public.user_task_quiz_answers (user_id, question_id)
        VALUES (v_uid, p_question_id)
        ON CONFLICT ON CONSTRAINT user_task_quiz_answers_user_question_key DO NOTHING;
    END IF;

    SELECT COUNT(*) INTO v_total
      FROM public.task_quiz_questions q
     WHERE q.task_id = v_task_id AND q.is_active;

    SELECT COUNT(*), COALESCE(SUM(q.points), 0)::INTEGER
      INTO v_answered, v_points
      FROM public.user_task_quiz_answers a
      JOIN public.task_quiz_questions q ON q.id = a.question_id
     WHERE a.user_id = v_uid AND q.task_id = v_task_id AND q.is_active;

    IF v_total > 0 AND v_answered >= v_total THEN
        v_completed := TRUE;

        INSERT INTO public.user_task_completions (user_id, task_id, awarded_points)
        VALUES (v_uid, v_task_id, v_points)
        ON CONFLICT ON CONSTRAINT user_task_completions_user_task_key DO NOTHING
        RETURNING * INTO v_row;

        IF FOUND THEN
            v_new := TRUE;
        ELSE
            SELECT * INTO v_row
              FROM public.user_task_completions c
             WHERE c.user_id = v_uid AND c.task_id = v_task_id;
        END IF;
    END IF;

    RETURN JSONB_BUILD_OBJECT(
        'correct',            v_is_correct,
        'completed',          v_completed,
        'newly_completed',    v_new,
        'awarded_points',     COALESCE(v_row.awarded_points, 0),
        'answered_questions', v_answered,
        'total_questions',    v_total,
        'completed_at',       v_row.completed_at
    );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_task_answer(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_task_answer(UUID, TEXT) TO authenticated;

-- ---------------------------------------------------------------------
-- 7) complete_task: كانت تمنح tasks.points كاملة دون إجابة الأسئلة (ثغرة).
--    الآن ترفض أي مهمة لها أسئلة نشطة (الإنجاز يكون عبر submit_task_answer فقط).
--    المهمة بلا أسئلة نشطة تُسجَّل بنقاطها (= 0 وفق القاعدة).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_task(p_task_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_uid    UUID := auth.uid();
    v_points INTEGER;
    v_row    public.user_task_completions%ROWTYPE;
    v_new    BOOLEAN := TRUE;
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

    IF EXISTS (SELECT 1 FROM public.task_quiz_questions q
                WHERE q.task_id = p_task_id AND q.is_active) THEN
        RAISE EXCEPTION 'QUIZ_REQUIRED' USING ERRCODE = 'P0001',
            HINT = 'هذه المهمة لها أسئلة: يُسجَّل إنجازها عبر submit_task_answer فقط.';
    END IF;

    INSERT INTO public.user_task_completions (user_id, task_id, awarded_points)
    VALUES (v_uid, p_task_id, COALESCE(v_points, 0))
    ON CONFLICT ON CONSTRAINT user_task_completions_user_task_key DO NOTHING
    RETURNING * INTO v_row;

    IF NOT FOUND THEN
        v_new := FALSE;
        SELECT * INTO v_row
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
-- 8) rooms.total_points: قيمة مشتقة، نعيد حسابها مرة واحدة للغرف الحالية
--    (لا تغيّر tasks.points ولا الإنجازات). الحساب من tasks.points الحالية كما هي.
-- ---------------------------------------------------------------------
UPDATE public.rooms r
   SET total_points = s.total
  FROM (SELECT r2.id,
               COALESCE(SUM(t.points) FILTER (WHERE t.is_active), 0)::INTEGER AS total
          FROM public.rooms r2 LEFT JOIN public.tasks t ON t.room_id = r2.id
         GROUP BY r2.id) s
 WHERE r.id = s.id AND r.total_points IS DISTINCT FROM s.total;

COMMIT;
