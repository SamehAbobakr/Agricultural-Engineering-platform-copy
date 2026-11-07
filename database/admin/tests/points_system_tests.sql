-- =====================================================================
-- اختبار نظام النقاط (على Staging فقط). يعمل داخل Transaction وينتهي بـ ROLLBACK فلا يترك أثرًا.
-- شغّل الملف كاملًا في SQL Editor؛ كل فحص يطبع NOTICE بـ PASS أو يرفع خطأ FAIL.
-- يحتاج: 003_points_system.sql مُنفَّذًا، ووجود مستخدم واحد على الأقل في auth.users.
-- =====================================================================
BEGIN;

DO $$
DECLARE
  r UUID; t1 UUID; t2 UUID; q1 UUID; q2 UUID; q3 UUID; q4 UUID; u UUID; res JSONB; v INT;
BEGIN
  SELECT id INTO u FROM auth.users LIMIT 1;
  IF u IS NULL THEN RAISE EXCEPTION 'FAIL: no auth user available'; END IF;

  INSERT INTO public.rooms (title, slug) VALUES ('t', 'zz-points-test') RETURNING id INTO r;
  INSERT INTO public.tasks (room_id, title, points) VALUES (r, 'T1', 999) RETURNING id INTO t1;
  INSERT INTO public.tasks (room_id, title, points) VALUES (r, 'T2', 999) RETURNING id INTO t2;

  SELECT points INTO v FROM public.tasks WHERE id = t1;
  IF v <> 0 THEN RAISE EXCEPTION 'FAIL 1: new task must start at 0, got %', v; END IF;
  RAISE NOTICE 'PASS 1: manual points ignored on insert';

  INSERT INTO public.task_quiz_questions (task_id, question, options, correct_option_id, points)
  VALUES (t1, 'q1', '[{"id":"a","text":"x"},{"id":"b","text":"y"}]', 'a', 10) RETURNING id INTO q1;
  INSERT INTO public.task_quiz_questions (task_id, question, options, correct_option_id, points)
  VALUES (t1, 'q2', '[{"id":"a","text":"x"},{"id":"b","text":"y"}]', 'a', 20) RETURNING id INTO q2;
  INSERT INTO public.task_quiz_questions (task_id, question, options, correct_option_id, points)
  VALUES (t2, 'q3', '[{"id":"a","text":"x"},{"id":"b","text":"y"}]', 'a', 5) RETURNING id INTO q3;

  IF (SELECT points FROM public.tasks WHERE id = t1) <> 30 THEN RAISE EXCEPTION 'FAIL 2: T1 should be 30'; END IF;
  IF (SELECT total_points FROM public.rooms WHERE id = r) <> 35 THEN RAISE EXCEPTION 'FAIL 2: room should be 35'; END IF;
  RAISE NOTICE 'PASS 2: add questions updates task and room';

  UPDATE public.task_quiz_questions SET points = 15 WHERE id = q1;
  IF (SELECT total_points FROM public.rooms WHERE id = r) <> 40 THEN RAISE EXCEPTION 'FAIL 3: edit question points'; END IF;
  RAISE NOTICE 'PASS 3: edit question points';

  UPDATE public.task_quiz_questions SET is_active = FALSE WHERE id = q2;
  IF (SELECT points FROM public.tasks WHERE id = t1) <> 15 THEN RAISE EXCEPTION 'FAIL 4: deactivate question'; END IF;
  UPDATE public.task_quiz_questions SET is_active = TRUE WHERE id = q2;
  IF (SELECT points FROM public.tasks WHERE id = t1) <> 35 THEN RAISE EXCEPTION 'FAIL 4: reactivate question'; END IF;
  RAISE NOTICE 'PASS 4: deactivate / reactivate question';

  UPDATE public.task_quiz_questions SET task_id = t2 WHERE id = q2;
  IF (SELECT points FROM public.tasks WHERE id = t1) <> 15 OR (SELECT points FROM public.tasks WHERE id = t2) <> 25 THEN
    RAISE EXCEPTION 'FAIL 5: move question must update both tasks'; END IF;
  RAISE NOTICE 'PASS 5: move question between tasks';

  DELETE FROM public.task_quiz_questions WHERE id = q3;
  IF (SELECT points FROM public.tasks WHERE id = t2) <> 20 THEN RAISE EXCEPTION 'FAIL 6: delete question'; END IF;
  RAISE NOTICE 'PASS 6: delete question';

  UPDATE public.tasks SET points = 777 WHERE id = t1;
  IF (SELECT points FROM public.tasks WHERE id = t1) <> 15 THEN RAISE EXCEPTION 'FAIL 7: manual update must be reverted'; END IF;
  RAISE NOTICE 'PASS 7: manual task points update is overridden';

  UPDATE public.tasks SET is_active = FALSE WHERE id = t2;
  IF (SELECT total_points FROM public.rooms WHERE id = r) <> 15 THEN RAISE EXCEPTION 'FAIL 8: deactivate task'; END IF;
  UPDATE public.tasks SET is_active = TRUE WHERE id = t2;
  IF (SELECT total_points FROM public.rooms WHERE id = r) <> 35 THEN RAISE EXCEPTION 'FAIL 8: reactivate task'; END IF;
  RAISE NOTICE 'PASS 8: deactivate / reactivate task';

  DELETE FROM public.tasks WHERE id = t2;
  IF (SELECT total_points FROM public.rooms WHERE id = r) <> 15 THEN RAISE EXCEPTION 'FAIL 9: delete task'; END IF;
  RAISE NOTICE 'PASS 9: delete task';

  -- إجابات الطالب: الصحيحة فقط تمنح نقاطًا، والمجموع = نقاط الأسئلة (وليس نقاط المهمة المخزّنة)
  PERFORM set_config('request.jwt.claim.sub', u::TEXT, TRUE);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::TEXT, TRUE);

  INSERT INTO public.task_quiz_questions (task_id, question, options, correct_option_id, points)
  VALUES (t1, 'q4', '[{"id":"a","text":"x"},{"id":"b","text":"y"}]', 'a', 10) RETURNING id INTO q4;
  IF (SELECT points FROM public.tasks WHERE id = t1) <> 25 THEN RAISE EXCEPTION 'FAIL 10: T1 should be 25'; END IF;

  res := public.submit_task_answer(q1, 'b');   -- إجابة خاطئة: لا نقاط ولا إكمال
  IF (res->>'correct')::BOOLEAN OR (res->>'completed')::BOOLEAN THEN RAISE EXCEPTION 'FAIL 10: wrong answer'; END IF;
  res := public.submit_task_answer(q1, 'a');   -- صحيحة لكن بقي سؤال
  IF (res->>'completed')::BOOLEAN THEN RAISE EXCEPTION 'FAIL 10: must not complete with 1 of 2'; END IF;
  RAISE NOTICE 'PASS 10: wrong and partial answers do not complete';

  BEGIN
    PERFORM public.complete_task(t1);
    RAISE EXCEPTION 'FAIL 11: complete_task must reject quiz tasks';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    IF SQLERRM NOT LIKE 'QUIZ_REQUIRED%' THEN RAISE; END IF;
    RAISE NOTICE 'PASS 11: complete_task blocked for tasks with questions';
  END;

  res := public.submit_task_answer(q4, 'a');   -- آخر سؤال: يكتمل بـ 15 + 10 = 25
  IF NOT (res->>'completed')::BOOLEAN OR (res->>'awarded_points')::INT <> 25 THEN
    RAISE EXCEPTION 'FAIL 12: expected completion with 25 points, got %', res; END IF;
  RAISE NOTICE 'PASS 12: awarded = sum of correct questions points (25)';

  -- تعديل الأسئلة بعد الإكمال لا يغيّر نقاط الطالب التاريخية
  UPDATE public.task_quiz_questions SET points = 100 WHERE id = q4;
  IF (SELECT awarded_points FROM public.user_task_completions WHERE user_id = u AND task_id = t1) <> 25 THEN
    RAISE EXCEPTION 'FAIL 13: historical awarded_points changed'; END IF;
  RAISE NOTICE 'PASS 13: historical awarded_points unchanged';
END
$$;

ROLLBACK;
