-- =====================================================================
-- تشخيص نظام النقاط — للقراءة فقط (لا يغيّر أي شيء). شغّله قبل 003 وبعده.
-- كل استعلام مستقل؛ شغّلهم واحدًا واحدًا وأرسل النتائج للمراجعة.
-- =====================================================================

-- D1) تعريف الدالة والـ Triggers الحالية كما هي في القاعدة (لأنها غير موجودة في المستودع)
SELECT pg_get_functiondef('public.sync_task_points_from_questions()'::regprocedure) AS def;

SELECT c.relname AS table_name, t.tgname, t.tgenabled, pg_get_triggerdef(t.oid) AS def
FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
WHERE NOT t.tgisinternal AND c.relnamespace = 'public'::regnamespace
  AND c.relname IN ('rooms','tasks','task_quiz_questions','user_task_quiz_answers','user_task_completions')
ORDER BY 1, 2;

-- D2) أعمدة الجداول الخمسة (للتأكد من points / is_active / total_points)
SELECT table_name, column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('rooms','tasks','task_quiz_questions','user_task_quiz_answers','user_task_completions')
ORDER BY table_name, ordinal_position;

-- D3) تعريف الدالتين الحاليتين (قارنهما بالموجود في 001 قبل استبدالهما)
SELECT proname, pg_get_functiondef(oid) AS def
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN ('submit_task_answer','complete_task','get_task_questions');

-- D4) مهام نقاطها لا تساوي مجموع أسئلتها النشطة
SELECT t.id, t.title, t.points AS stored_points,
       COALESCE(SUM(q.points) FILTER (WHERE q.is_active), 0) AS questions_points
FROM public.tasks t LEFT JOIN public.task_quiz_questions q ON q.task_id = t.id
GROUP BY t.id, t.title, t.points
HAVING t.points <> COALESCE(SUM(q.points) FILTER (WHERE q.is_active), 0);

-- D5) غرف مجموعها المخزَّن لا يساوي مجموع مهامها النشطة
SELECT r.id, r.title, r.total_points AS stored_total,
       COALESCE(SUM(t.points) FILTER (WHERE t.is_active), 0) AS tasks_total
FROM public.rooms r LEFT JOIN public.tasks t ON t.room_id = r.id
GROUP BY r.id, r.title, r.total_points
HAVING r.total_points IS DISTINCT FROM COALESCE(SUM(t.points) FILTER (WHERE t.is_active), 0);

-- D6) إنجازات نقاطها المسجَّلة لا تساوي نقاط المهمة الحالية (تاريخية: لا تُعدَّل تلقائيًا)
SELECT c.id, c.user_id, c.task_id, c.awarded_points, t.points AS task_points_now,
       c.awarded_points - t.points AS diff
FROM public.user_task_completions c JOIN public.tasks t ON t.id = c.task_id
WHERE c.awarded_points <> t.points
ORDER BY ABS(c.awarded_points - t.points) DESC;

-- D7) طلاب نقاطهم المكتسبة أكبر من مجموع نقاط المهام النشطة المنشورة (التناقض 120 مقابل 75)
WITH earned AS (
  SELECT user_id, SUM(awarded_points) AS earned FROM public.user_task_completions GROUP BY user_id
), avail AS (
  SELECT COALESCE(SUM(t.points), 0) AS available
  FROM public.tasks t JOIN public.rooms r ON r.id = t.room_id WHERE t.is_active AND r.is_active
)
SELECT e.user_id, e.earned, a.available FROM earned e CROSS JOIN avail a WHERE e.earned > a.available;

-- D8) إنجازات على مهام أصبحت غير نشطة أو داخل غرف غير نشطة
SELECT c.id, c.user_id, c.task_id, c.awarded_points, t.is_active AS task_active, r.is_active AS room_active
FROM public.user_task_completions c
JOIN public.tasks t ON t.id = c.task_id JOIN public.rooms r ON r.id = t.room_id
WHERE NOT t.is_active OR NOT r.is_active;

-- D9) إنجازات لمهام فيها أسئلة نشطة لم يُجب عنها الطالب كلها (طريقة complete_task القديمة)
SELECT c.id, c.user_id, c.task_id, c.awarded_points,
       (SELECT COUNT(*) FROM public.task_quiz_questions q WHERE q.task_id = c.task_id AND q.is_active) AS active_questions,
       (SELECT COUNT(*) FROM public.user_task_quiz_answers a
          JOIN public.task_quiz_questions q ON q.id = a.question_id
         WHERE a.user_id = c.user_id AND q.task_id = c.task_id AND q.is_active) AS answered
FROM public.user_task_completions c
WHERE (SELECT COUNT(*) FROM public.task_quiz_questions q WHERE q.task_id = c.task_id AND q.is_active) > 0
  AND (SELECT COUNT(*) FROM public.user_task_quiz_answers a
         JOIN public.task_quiz_questions q ON q.id = a.question_id
        WHERE a.user_id = c.user_id AND q.task_id = c.task_id AND q.is_active)
    < (SELECT COUNT(*) FROM public.task_quiz_questions q WHERE q.task_id = c.task_id AND q.is_active);
