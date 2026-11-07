-- =====================================================================
-- 004) اختياري — مطابقة tasks.points مع أسئلتها (تغيير بيانات: راجع المعاينة أولًا)
--
-- لماذا؟ مهام قديمة نقاطها أُدخلت يدويًا ولا تساوي مجموع أسئلتها النشطة.
-- الخطوة 1: شغّل المعاينة (SELECT) وراجع ما سيتغيّر.
-- الخطوة 2: لو مناسب فعليًا، شغّل الجزء المعلَّق (UPDATE). المهام بلا أسئلة ستصبح 0 نقطة وفق القاعدة.
-- لا يمسّ user_task_completions: النقاط التاريخية للطلاب تبقى كما سُجّلت وقت الإنجاز.
-- =====================================================================

-- معاينة (للقراءة فقط)
SELECT t.id, t.title, t.points AS now_points,
       COALESCE(SUM(q.points) FILTER (WHERE q.is_active), 0) AS will_become
FROM public.tasks t LEFT JOIN public.task_quiz_questions q ON q.task_id = t.id
GROUP BY t.id, t.title, t.points
HAVING t.points <> COALESCE(SUM(q.points) FILTER (WHERE q.is_active), 0);

-- التنفيذ (أزل التعليق بعد المراجعة؛ trigger المهام يحدّث مجموع الغرف تلقائيًا)
-- UPDATE public.tasks SET points = points;   -- يشغّل trg_aa_points_task_enforce_derived لكل مهمة فيُعاد اشتقاق نقاطها
