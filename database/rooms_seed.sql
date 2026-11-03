-- =====================================================================
-- بيانات تجريبية لنظام الغرف والمهمات (محتوى تجريبي فقط — ليس معلومات رسمية عن الكلية)
--
-- شرط التشغيل: نفّذ database/rooms_progress.sql أولًا (ينشئ الجداول والسياسات).
-- أين يُنفَّذ؟ Supabase Dashboard → SQL Editor → New query → الصق الملف → Run.
-- آمن لإعادة التشغيل: كل الإدخالات بـ ON CONFLICT DO NOTHING، فلا يحذف ولا يكرر
-- ولا يستبدل أي محتوى عدّلته بنفسك. معرّفات المهمات ثابتة كي يمكن إعادة التشغيل بأمان.
--
-- ما الذي تغيّره لاحقًا؟ كل شيء من Table Editor: عدّل rooms / tasks / task_content مباشرة،
-- أو أخفِ أي عنصر بـ is_active = false. (حذف مهمة عليها إنجازات مرفوض عمدًا.)
-- الصور هنا Placeholders من picsum.photos؛ استبدلها بروابط صورك (مثل Cloudflare R2) في cover_image
-- وفي الحقل url داخل عناصر blocks.
--
-- لا يحتوي هذا الملف على DELETE/TRUNCATE/DROP ولا يمسّ أي جدول آخر.
-- =====================================================================

-- ---------------------------------------------------------------------
-- الغرف
-- ---------------------------------------------------------------------
INSERT INTO public.rooms (title, slug, description, cover_image, icon, sort_order, difficulty, is_active)
VALUES ('التعرف على الكلية', 'know-the-college', 'غرفة تجريبية: نظرة مبسطة على فكرة الهندسة الزراعية وكيف تبدأ رحلتك داخل المنصة.', 'https://picsum.photos/seed/agri-room-1/1200/750', '🏛️', 10, 'beginner', TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO public.rooms (title, slug, description, cover_image, icon, sort_order, difficulty, is_active)
VALUES ('الأقسام العلمية', 'scientific-departments', 'غرفة تجريبية: كيف تُنظَّم الكلية إلى أقسام علمية وما المجالات الشائعة لكل قسم.', 'https://picsum.photos/seed/agri-room-2/1200/750', '🧩', 20, 'beginner', TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO public.rooms (title, slug, description, cover_image, icon, sort_order, difficulty, is_active)
VALUES ('التخصصات والمجالات الدراسية', 'study-fields', 'غرفة تجريبية: المواد والمهارات الشائعة في دراسة الهندسة الزراعية وصلتها بالعلوم الزراعية.', 'https://picsum.photos/seed/agri-room-3/1200/750', '📚', 30, 'intermediate', TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO public.rooms (title, slug, description, cover_image, icon, sort_order, difficulty, is_active)
VALUES ('الحياة الجامعية والمعامل', 'campus-labs', 'غرفة تجريبية: كيف تستفيد من المعامل وتنظم وقتك في الحياة الجامعية.', 'https://picsum.photos/seed/agri-room-4/1200/750', '🔬', 40, 'beginner', TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO public.rooms (title, slug, description, cover_image, icon, sort_order, difficulty, is_active)
VALUES ('التدريب والمشروعات', 'training-projects', 'غرفة تجريبية: الفرق بين التدريب والمشروع وكيف تبدأ فكرة جيدة وتوثق عملك.', 'https://picsum.photos/seed/agri-room-5/1200/750', '🛠️', 50, 'intermediate', TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO public.rooms (title, slug, description, cover_image, icon, sort_order, difficulty, is_active)
VALUES ('مجالات العمل بعد التخرج', 'careers-after-graduation', 'غرفة تجريبية: أمثلة عامة لمسارات العمل وكيف تبني طريقك المهني مبكرًا.', 'https://picsum.photos/seed/agri-room-6/1200/750', '💼', 60, 'intermediate', TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO public.rooms (title, slug, description, cover_image, icon, sort_order, difficulty, is_active)
VALUES ('مستقبل الهندسة الزراعية', 'future-of-agri-engineering', 'غرفة تجريبية: تقنيات حديثة تتشكل بها الزراعة، وكيف تستعد للمستقبل.', 'https://picsum.photos/seed/agri-room-7/1200/750', '🚀', 70, 'advanced', TRUE)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- المهمات (room_id يُؤخذ من الـ slug)
-- ---------------------------------------------------------------------
INSERT INTO public.tasks (id, room_id, title, description, points, sort_order, is_active)
SELECT 'b0000000-0000-4000-8000-010100000000', r.id, 'ما المقصود بالهندسة الزراعية؟', 'تعريف عام ومبسط للمجال.', 10, 10, TRUE
FROM public.rooms r WHERE r.slug = 'know-the-college'
ON CONFLICT DO NOTHING;

INSERT INTO public.tasks (id, room_id, title, description, points, sort_order, is_active)
SELECT 'b0000000-0000-4000-8000-010200000000', r.id, 'كيف تستخدم هذه المنصة في رحلتك الدراسية؟', 'خطوات سريعة للاستفادة من أقسام المنصة.', 10, 20, TRUE
FROM public.rooms r WHERE r.slug = 'know-the-college'
ON CONFLICT DO NOTHING;

INSERT INTO public.tasks (id, room_id, title, description, points, sort_order, is_active)
SELECT 'b0000000-0000-4000-8000-010300000000', r.id, 'أين أجد المعلومات الرسمية عن الكلية؟', 'الفرق بين محتوى المنصة والمصادر الرسمية.', 10, 30, TRUE
FROM public.rooms r WHERE r.slug = 'know-the-college'
ON CONFLICT DO NOTHING;

INSERT INTO public.tasks (id, room_id, title, description, points, sort_order, is_active)
SELECT 'b0000000-0000-4000-8000-020100000000', r.id, 'ما الفرق بين القسم والتخصص والمقرر؟', 'ثلاثة مصطلحات تتكرر كثيرًا.', 10, 10, TRUE
FROM public.rooms r WHERE r.slug = 'scientific-departments'
ON CONFLICT DO NOTHING;

INSERT INTO public.tasks (id, room_id, title, description, points, sort_order, is_active)
SELECT 'b0000000-0000-4000-8000-020200000000', r.id, 'أمثلة شائعة للأقسام في كليات الهندسة الزراعية', 'نظرة عامة، وقد تختلف الأسماء الفعلية.', 15, 20, TRUE
FROM public.rooms r WHERE r.slug = 'scientific-departments'
ON CONFLICT DO NOTHING;

INSERT INTO public.tasks (id, room_id, title, description, points, sort_order, is_active)
SELECT 'b0000000-0000-4000-8000-020300000000', r.id, 'كيف أختار المجال الأقرب لميولي؟', 'أسئلة تساعدك على التفكير.', 10, 30, TRUE
FROM public.rooms r WHERE r.slug = 'scientific-departments'
ON CONFLICT DO NOTHING;

INSERT INTO public.tasks (id, room_id, title, description, points, sort_order, is_active)
SELECT 'b0000000-0000-4000-8000-030100000000', r.id, 'ما المواد الأساسية التي يدرسها طالب الهندسة؟', 'أساسيات تتكرر في أغلب البرامج الهندسية.', 10, 10, TRUE
FROM public.rooms r WHERE r.slug = 'study-fields'
ON CONFLICT DO NOTHING;

INSERT INTO public.tasks (id, room_id, title, description, points, sort_order, is_active)
SELECT 'b0000000-0000-4000-8000-030200000000', r.id, 'كيف ترتبط الهندسة بالعلوم الزراعية؟', 'تكامل المجالين.', 15, 20, TRUE
FROM public.rooms r WHERE r.slug = 'study-fields'
ON CONFLICT DO NOTHING;

INSERT INTO public.tasks (id, room_id, title, description, points, sort_order, is_active)
SELECT 'b0000000-0000-4000-8000-030300000000', r.id, 'ما المهارات التي تساعدك على التفوق؟', 'مهارات تتجاوز المذاكرة.', 10, 30, TRUE
FROM public.rooms r WHERE r.slug = 'study-fields'
ON CONFLICT DO NOTHING;

INSERT INTO public.tasks (id, room_id, title, description, points, sort_order, is_active)
SELECT 'b0000000-0000-4000-8000-040100000000', r.id, 'ما دور المعامل في دراسة الهندسة؟', 'ربط النظرية بالتطبيق.', 10, 10, TRUE
FROM public.rooms r WHERE r.slug = 'campus-labs'
ON CONFLICT DO NOTHING;

INSERT INTO public.tasks (id, room_id, title, description, points, sort_order, is_active)
SELECT 'b0000000-0000-4000-8000-040200000000', r.id, 'كيف تستعد لأول يوم في المعمل؟', 'قواعد عامة للسلامة والتحضير.', 10, 20, TRUE
FROM public.rooms r WHERE r.slug = 'campus-labs'
ON CONFLICT DO NOTHING;

INSERT INTO public.tasks (id, room_id, title, description, points, sort_order, is_active)
SELECT 'b0000000-0000-4000-8000-040300000000', r.id, 'كيف تنظم وقتك بين المحاضرات والتطبيق؟', 'عادات بسيطة تصنع فرقًا.', 10, 30, TRUE
FROM public.rooms r WHERE r.slug = 'campus-labs'
ON CONFLICT DO NOTHING;

INSERT INTO public.tasks (id, room_id, title, description, points, sort_order, is_active)
SELECT 'b0000000-0000-4000-8000-050100000000', r.id, 'ما الفرق بين التدريب الميداني ومشروع التخرج؟', 'مقارنة عامة وتبسيطية.', 15, 10, TRUE
FROM public.rooms r WHERE r.slug = 'training-projects'
ON CONFLICT DO NOTHING;

INSERT INTO public.tasks (id, room_id, title, description, points, sort_order, is_active)
SELECT 'b0000000-0000-4000-8000-050200000000', r.id, 'كيف تختار فكرة مشروع جيدة؟', 'معايير سريعة للتقييم.', 15, 20, TRUE
FROM public.rooms r WHERE r.slug = 'training-projects'
ON CONFLICT DO NOTHING;

INSERT INTO public.tasks (id, room_id, title, description, points, sort_order, is_active)
SELECT 'b0000000-0000-4000-8000-050300000000', r.id, 'كيف توثّق عملك ليكون ملفًا مهنيًا؟', 'التوثيق جزء من النجاح.', 10, 30, TRUE
FROM public.rooms r WHERE r.slug = 'training-projects'
ON CONFLICT DO NOTHING;

INSERT INTO public.tasks (id, room_id, title, description, points, sort_order, is_active)
SELECT 'b0000000-0000-4000-8000-060100000000', r.id, 'ما الجهات التي يعمل بها المهندس الزراعي عادة؟', 'أمثلة عامة وليست قائمة رسمية.', 10, 10, TRUE
FROM public.rooms r WHERE r.slug = 'careers-after-graduation'
ON CONFLICT DO NOTHING;

INSERT INTO public.tasks (id, room_id, title, description, points, sort_order, is_active)
SELECT 'b0000000-0000-4000-8000-060200000000', r.id, 'ما الفرق بين العمل الميداني والمكتبي؟', 'اختر بيئة تناسب طبيعتك.', 10, 20, TRUE
FROM public.rooms r WHERE r.slug = 'careers-after-graduation'
ON CONFLICT DO NOTHING;

INSERT INTO public.tasks (id, room_id, title, description, points, sort_order, is_active)
SELECT 'b0000000-0000-4000-8000-060300000000', r.id, 'كيف أبني طريقي المهني منذ الآن؟', 'خطوات عملية خلال سنوات الدراسة.', 15, 30, TRUE
FROM public.rooms r WHERE r.slug = 'careers-after-graduation'
ON CONFLICT DO NOTHING;

INSERT INTO public.tasks (id, room_id, title, description, points, sort_order, is_active)
SELECT 'b0000000-0000-4000-8000-070100000000', r.id, 'ما أبرز التقنيات الحديثة في الزراعة؟', 'أفكار عامة عن اتجاهات المجال.', 15, 10, TRUE
FROM public.rooms r WHERE r.slug = 'future-of-agri-engineering'
ON CONFLICT DO NOTHING;

INSERT INTO public.tasks (id, room_id, title, description, points, sort_order, is_active)
SELECT 'b0000000-0000-4000-8000-070200000000', r.id, 'كيف تساعد الهندسة الزراعية في ترشيد المياه؟', 'فكرة الاستخدام الكفء للمياه.', 15, 20, TRUE
FROM public.rooms r WHERE r.slug = 'future-of-agri-engineering'
ON CONFLICT DO NOTHING;

INSERT INTO public.tasks (id, room_id, title, description, points, sort_order, is_active)
SELECT 'b0000000-0000-4000-8000-070300000000', r.id, 'كيف أستعد لمستقبل متغير؟', 'عادات تجعلك مرنًا.', 20, 30, TRUE
FROM public.rooms r WHERE r.slug = 'future-of-agri-engineering'
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- محتوى المهمات (blocks مصفوفة JSONB مرتّبة)
-- ---------------------------------------------------------------------
INSERT INTO public.task_content (task_id, blocks)
SELECT t.id, $json$[
  {
    "type": "note",
    "variant": "warning",
    "title": "محتوى تجريبي",
    "text": "هذا المحتوى لتوضيح طريقة عمل النظام فقط، وليس معلومة رسمية عن الكلية. سيُستبدل لاحقًا من لوحة Supabase."
  },
  {
    "type": "paragraph",
    "text": "الهندسة الزراعية مجال يطبّق مبادئ الهندسة (الميكانيكا والمياه والمنشآت والطاقة) على الإنتاج الزراعي وما بعد الحصاد، بهدف زيادة الكفاءة وتقليل الفاقد."
  },
  {
    "type": "heading",
    "level": 1,
    "text": "أبرز المحاور العامة للمجال"
  },
  {
    "type": "list",
    "ordered": false,
    "items": [
      "الآلات والقوى الزراعية",
      "الري والتحكم في المياه",
      "المنشآت والبيئة الزراعية",
      "تصنيع الأغذية وما بعد الحصاد",
      "الطاقة المتجددة في الزراعة"
    ]
  },
  {
    "type": "image",
    "url": "https://picsum.photos/seed/agri-field/1200/700",
    "alt": "صورة تجريبية لحقل زراعي",
    "caption": "صورة تجريبية (Placeholder) — اضغط لتكبيرها"
  }
]$json$::jsonb
FROM public.tasks t WHERE t.id = 'b0000000-0000-4000-8000-010100000000'
ON CONFLICT DO NOTHING;

INSERT INTO public.task_content (task_id, blocks)
SELECT t.id, $json$[
  {
    "type": "note",
    "variant": "warning",
    "title": "محتوى تجريبي",
    "text": "هذا المحتوى لتوضيح طريقة عمل النظام فقط، وليس معلومة رسمية عن الكلية. سيُستبدل لاحقًا من لوحة Supabase."
  },
  {
    "type": "paragraph",
    "text": "تجمع المنصة أدوات متعددة تساعدك على الدراسة والتعرف على الكلية. هذه خطوات مقترحة للبداية:"
  },
  {
    "type": "list",
    "ordered": true,
    "items": [
      "تصفح المقررات والملفات من الصفحة الرئيسية.",
      "تابع أهدافك وتقدمك من «لوحة إنجاز الطالب».",
      "تعرّف على أعضاء هيئة التدريس من «دليل هيئة التدريس».",
      "استخدم «الأدوات» مثل مؤقت المذاكرة لتنظيم وقتك."
    ]
  },
  {
    "type": "note",
    "variant": "tip",
    "text": "سجّل دخولك لتُحفظ إنجازاتك ونقاطك في هذه الغرف.",
    "title": "نصيحة"
  }
]$json$::jsonb
FROM public.tasks t WHERE t.id = 'b0000000-0000-4000-8000-010200000000'
ON CONFLICT DO NOTHING;

INSERT INTO public.task_content (task_id, blocks)
SELECT t.id, $json$[
  {
    "type": "note",
    "variant": "warning",
    "title": "محتوى تجريبي",
    "text": "هذا المحتوى لتوضيح طريقة عمل النظام فقط، وليس معلومة رسمية عن الكلية. سيُستبدل لاحقًا من لوحة Supabase."
  },
  {
    "type": "paragraph",
    "text": "هذه الغرف للاستكشاف والتعريف العام. أما اللوائح والجداول والإعلانات فمصدرها الرسمي هو إدارة الكلية."
  },
  {
    "type": "note",
    "variant": "info",
    "text": "راجع شؤون الطلاب أو الموقع الرسمي للكلية عند الحاجة إلى معلومة مؤكدة.",
    "title": "تنبيه مهم"
  },
  {
    "type": "quote",
    "text": "اسأل دائمًا عن المصدر الرسمي قبل الاعتماد على أي معلومة مهمة."
  }
]$json$::jsonb
FROM public.tasks t WHERE t.id = 'b0000000-0000-4000-8000-010300000000'
ON CONFLICT DO NOTHING;

INSERT INTO public.task_content (task_id, blocks)
SELECT t.id, $json$[
  {
    "type": "note",
    "variant": "warning",
    "title": "محتوى تجريبي",
    "text": "هذا المحتوى لتوضيح طريقة عمل النظام فقط، وليس معلومة رسمية عن الكلية. سيُستبدل لاحقًا من لوحة Supabase."
  },
  {
    "type": "paragraph",
    "text": "يختلط على الطلاب الجدد الفرق بين هذه المصطلحات، وهذا جدول تبسيطي:"
  },
  {
    "type": "table",
    "headers": [
      "المصطلح",
      "المعنى المبسّط",
      "مثال توضيحي"
    ],
    "rows": [
      [
        "القسم",
        "وحدة علمية داخل الكلية تضم أعضاء هيئة تدريس ومعامل",
        "قسم افتراضي A"
      ],
      [
        "التخصص",
        "مسار دراسي يحدد المواد التي تدرسها",
        "مسار افتراضي B"
      ],
      [
        "المقرر",
        "مادة دراسية واحدة في فصل محدد",
        "مادة افتراضية C"
      ]
    ],
    "caption": "جدول تجريبي لتوضيح المصطلحات"
  }
]$json$::jsonb
FROM public.tasks t WHERE t.id = 'b0000000-0000-4000-8000-020100000000'
ON CONFLICT DO NOTHING;

INSERT INTO public.task_content (task_id, blocks)
SELECT t.id, $json$[
  {
    "type": "note",
    "variant": "warning",
    "title": "محتوى تجريبي",
    "text": "هذا المحتوى لتوضيح طريقة عمل النظام فقط، وليس معلومة رسمية عن الكلية. سيُستبدل لاحقًا من لوحة Supabase."
  },
  {
    "type": "note",
    "variant": "warning",
    "text": "هذه أمثلة عامة للمجال، وأسماء أقسام الكلية الفعلية قد تختلف. راجع المصدر الرسمي.",
    "title": "قبل أن تقرأ"
  },
  {
    "type": "table",
    "headers": [
      "المجال الشائع",
      "ما الذي يهتم به عادة؟"
    ],
    "rows": [
      [
        "الآلات والقوى الزراعية",
        "تصميم الآلات وتشغيلها وصيانتها ومصادر القوى"
      ],
      [
        "الري والتحكم في المياه",
        "نقل المياه وتوزيعها وترشيد استخدامها"
      ],
      [
        "المنشآت والبيئة الزراعية",
        "الصوب والمخازن والحظائر والتحكم في البيئة"
      ],
      [
        "تصنيع الأغذية وما بعد الحصاد",
        "التداول والتخزين والتصنيع وتقليل الفاقد"
      ]
    ],
    "caption": "أمثلة عامة (غير رسمية)"
  }
]$json$::jsonb
FROM public.tasks t WHERE t.id = 'b0000000-0000-4000-8000-020200000000'
ON CONFLICT DO NOTHING;

INSERT INTO public.task_content (task_id, blocks)
SELECT t.id, $json$[
  {
    "type": "note",
    "variant": "warning",
    "title": "محتوى تجريبي",
    "text": "هذا المحتوى لتوضيح طريقة عمل النظام فقط، وليس معلومة رسمية عن الكلية. سيُستبدل لاحقًا من لوحة Supabase."
  },
  {
    "type": "list",
    "ordered": true,
    "items": [
      "ما الذي يشدّك أكثر: الآلات أم المياه أم المنشآت أم التصنيع؟",
      "هل تفضل العمل الميداني أم المكتبي أم المعملي؟",
      "هل تستمتع بالحسابات والتصميم أم بالتجارب والقياس؟"
    ]
  },
  {
    "type": "quote",
    "text": "لا تستعجل القرار؛ جرّب وتعلّم ثم قرّر.",
    "cite": "نصيحة عامة"
  },
  {
    "type": "video",
    "url": "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    "title": "فيديو تجريبي",
    "caption": "فيديو تجريبي لعرض إمكانية دعم الفيديو"
  }
]$json$::jsonb
FROM public.tasks t WHERE t.id = 'b0000000-0000-4000-8000-020300000000'
ON CONFLICT DO NOTHING;

INSERT INTO public.task_content (task_id, blocks)
SELECT t.id, $json$[
  {
    "type": "note",
    "variant": "warning",
    "title": "محتوى تجريبي",
    "text": "هذا المحتوى لتوضيح طريقة عمل النظام فقط، وليس معلومة رسمية عن الكلية. سيُستبدل لاحقًا من لوحة Supabase."
  },
  {
    "type": "paragraph",
    "text": "تعتمد دراسة الهندسة عادةً على أسس علمية مشتركة قبل التعمق في التطبيقات الزراعية، مثل:"
  },
  {
    "type": "list",
    "ordered": false,
    "items": [
      "الرياضيات والتفاضل والتكامل",
      "الفيزياء والميكانيكا",
      "الرسم الهندسي والتصميم",
      "أساسيات الحاسب والبرمجة"
    ]
  },
  {
    "type": "note",
    "variant": "info",
    "text": "قائمة المواد الفعلية تحددها لائحة الكلية الرسمية."
  }
]$json$::jsonb
FROM public.tasks t WHERE t.id = 'b0000000-0000-4000-8000-030100000000'
ON CONFLICT DO NOTHING;

INSERT INTO public.task_content (task_id, blocks)
SELECT t.id, $json$[
  {
    "type": "note",
    "variant": "warning",
    "title": "محتوى تجريبي",
    "text": "هذا المحتوى لتوضيح طريقة عمل النظام فقط، وليس معلومة رسمية عن الكلية. سيُستبدل لاحقًا من لوحة Supabase."
  },
  {
    "type": "table",
    "headers": [
      "الجانب",
      "الهندسة الزراعية",
      "العلوم الزراعية"
    ],
    "rows": [
      [
        "نقطة التركيز",
        "الأنظمة والآلات والمنشآت والمياه",
        "النبات والتربة والإنتاج الحيواني"
      ],
      [
        "نوع الأسئلة",
        "كيف نصمم ونقيس ونحسّن النظام؟",
        "كيف ينمو الكائن وما احتياجاته؟"
      ],
      [
        "مثال",
        "تصميم نظام ري",
        "اختيار صنف مناسب للمحصول"
      ]
    ],
    "caption": "مقارنة تبسيطية"
  },
  {
    "type": "paragraph",
    "text": "المجالان متكاملان: يحتاج المهندس إلى فهم احتياجات المحصول، ويستفيد المنتج من حلول المهندس."
  }
]$json$::jsonb
FROM public.tasks t WHERE t.id = 'b0000000-0000-4000-8000-030200000000'
ON CONFLICT DO NOTHING;

INSERT INTO public.task_content (task_id, blocks)
SELECT t.id, $json$[
  {
    "type": "note",
    "variant": "warning",
    "title": "محتوى تجريبي",
    "text": "هذا المحتوى لتوضيح طريقة عمل النظام فقط، وليس معلومة رسمية عن الكلية. سيُستبدل لاحقًا من لوحة Supabase."
  },
  {
    "type": "list",
    "ordered": false,
    "items": [
      "التفكير التحليلي وحل المشكلات",
      "العمل ضمن فريق",
      "إتقان الأدوات الرقمية (جداول بيانات، رسم، برمجة)",
      "الكتابة الفنية وعرض الأفكار"
    ]
  },
  {
    "type": "note",
    "variant": "tip",
    "text": "خصّص وقتًا ثابتًا أسبوعيًا للتدريب على المهارات خارج المحاضرات."
  },
  {
    "type": "links",
    "title": "مصادر إضافية (أمثلة)",
    "items": [
      {
        "text": "أكاديمية خان — دروس مجانية في الرياضيات والعلوم",
        "url": "https://www.khanacademy.org"
      },
      {
        "text": "منظمة الأغذية والزراعة (الفاو)",
        "url": "https://www.fao.org"
      }
    ]
  }
]$json$::jsonb
FROM public.tasks t WHERE t.id = 'b0000000-0000-4000-8000-030300000000'
ON CONFLICT DO NOTHING;

INSERT INTO public.task_content (task_id, blocks)
SELECT t.id, $json$[
  {
    "type": "note",
    "variant": "warning",
    "title": "محتوى تجريبي",
    "text": "هذا المحتوى لتوضيح طريقة عمل النظام فقط، وليس معلومة رسمية عن الكلية. سيُستبدل لاحقًا من لوحة Supabase."
  },
  {
    "type": "paragraph",
    "text": "تتيح المعامل تجربة الأفكار ومقارنة النتائج العملية بالحسابات النظرية، مما يرسّخ الفهم."
  },
  {
    "type": "gallery",
    "images": [
      {
        "url": "https://picsum.photos/seed/lab-a/900/600",
        "alt": "صورة تجريبية 1",
        "caption": "صورة تجريبية ١"
      },
      {
        "url": "https://picsum.photos/seed/lab-b/900/600",
        "alt": "صورة تجريبية 2",
        "caption": "صورة تجريبية ٢"
      },
      {
        "url": "https://picsum.photos/seed/lab-c/900/600",
        "alt": "صورة تجريبية 3",
        "caption": "صورة تجريبية ٣"
      }
    ]
  },
  {
    "type": "list",
    "ordered": false,
    "items": [
      "تجربة القياس وتسجيل البيانات",
      "تحليل النتائج وكتابة التقرير",
      "التعرف على الأجهزة والأدوات"
    ]
  }
]$json$::jsonb
FROM public.tasks t WHERE t.id = 'b0000000-0000-4000-8000-040100000000'
ON CONFLICT DO NOTHING;

INSERT INTO public.task_content (task_id, blocks)
SELECT t.id, $json$[
  {
    "type": "note",
    "variant": "warning",
    "title": "محتوى تجريبي",
    "text": "هذا المحتوى لتوضيح طريقة عمل النظام فقط، وليس معلومة رسمية عن الكلية. سيُستبدل لاحقًا من لوحة Supabase."
  },
  {
    "type": "list",
    "ordered": true,
    "items": [
      "اقرأ تعليمات التجربة قبل الحضور.",
      "التزم بتعليمات الأمان وارتداء الملابس المناسبة.",
      "دوّن ملاحظاتك وقياساتك أولًا بأول.",
      "نظّف مكانك وأعد الأدوات لموضعها."
    ]
  },
  {
    "type": "note",
    "variant": "warning",
    "text": "لا تشغّل أي جهاز قبل أخذ إذن المشرف على المعمل.",
    "title": "سلامتك أولًا"
  }
]$json$::jsonb
FROM public.tasks t WHERE t.id = 'b0000000-0000-4000-8000-040200000000'
ON CONFLICT DO NOTHING;

INSERT INTO public.task_content (task_id, blocks)
SELECT t.id, $json$[
  {
    "type": "note",
    "variant": "warning",
    "title": "محتوى تجريبي",
    "text": "هذا المحتوى لتوضيح طريقة عمل النظام فقط، وليس معلومة رسمية عن الكلية. سيُستبدل لاحقًا من لوحة Supabase."
  },
  {
    "type": "paragraph",
    "text": "التنظيم الجيد يقلل التوتر ويرفع الأداء. جرّب تقسيم يومك إلى فترات تركيز قصيرة تتخللها استراحات."
  },
  {
    "type": "list",
    "ordered": false,
    "items": [
      "خطط لأسبوعك كل يوم أحد مثلًا",
      "ابدأ بالمهمة الأصعب أو الأهم",
      "راجع المحاضرة في نفس اليوم"
    ]
  },
  {
    "type": "link",
    "url": "../tools/study-timer.html",
    "text": "جرّب مؤقت المذاكرة في المنصة",
    "description": "أداة مساعدة لتقسيم وقت التركيز"
  }
]$json$::jsonb
FROM public.tasks t WHERE t.id = 'b0000000-0000-4000-8000-040300000000'
ON CONFLICT DO NOTHING;

INSERT INTO public.task_content (task_id, blocks)
SELECT t.id, $json$[
  {
    "type": "note",
    "variant": "warning",
    "title": "محتوى تجريبي",
    "text": "هذا المحتوى لتوضيح طريقة عمل النظام فقط، وليس معلومة رسمية عن الكلية. سيُستبدل لاحقًا من لوحة Supabase."
  },
  {
    "type": "table",
    "headers": [
      "الجانب",
      "التدريب الميداني",
      "مشروع التخرج"
    ],
    "rows": [
      [
        "الهدف",
        "التعرف على بيئة العمل الحقيقية",
        "تطبيق ما تعلمته في مشكلة محددة"
      ],
      [
        "طبيعة العمل",
        "ملاحظة ومشاركة داخل جهة عمل",
        "تصميم أو تجربة أو دراسة منظمة"
      ],
      [
        "المخرجات",
        "تقرير تدريب",
        "تقرير ومنتج أو نموذج أو بحث"
      ]
    ],
    "caption": "مقارنة عامة — تختلف التفاصيل بحسب لائحة الكلية"
  }
]$json$::jsonb
FROM public.tasks t WHERE t.id = 'b0000000-0000-4000-8000-050100000000'
ON CONFLICT DO NOTHING;

INSERT INTO public.task_content (task_id, blocks)
SELECT t.id, $json$[
  {
    "type": "note",
    "variant": "warning",
    "title": "محتوى تجريبي",
    "text": "هذا المحتوى لتوضيح طريقة عمل النظام فقط، وليس معلومة رسمية عن الكلية. سيُستبدل لاحقًا من لوحة Supabase."
  },
  {
    "type": "heading",
    "level": 1,
    "text": "اختبر فكرتك بهذه الأسئلة"
  },
  {
    "type": "list",
    "ordered": true,
    "items": [
      "هل تحل مشكلة حقيقية يمكن قياسها؟",
      "هل الوقت والموارد المتاحة كافية؟",
      "هل تجد أمامك مشرفًا ومصادر تساعدك؟",
      "هل تستطيع عرض نتيجة ملموسة في النهاية؟"
    ]
  },
  {
    "type": "quote",
    "text": "فكرة صغيرة تُنفَّذ جيدًا أفضل من فكرة ضخمة لا تكتمل."
  }
]$json$::jsonb
FROM public.tasks t WHERE t.id = 'b0000000-0000-4000-8000-050200000000'
ON CONFLICT DO NOTHING;

INSERT INTO public.task_content (task_id, blocks)
SELECT t.id, $json$[
  {
    "type": "note",
    "variant": "warning",
    "title": "محتوى تجريبي",
    "text": "هذا المحتوى لتوضيح طريقة عمل النظام فقط، وليس معلومة رسمية عن الكلية. سيُستبدل لاحقًا من لوحة Supabase."
  },
  {
    "type": "paragraph",
    "text": "احتفظ بصور وقياسات وملاحظات لكل مرحلة، فهي تصنع ملف أعمال قويًا لاحقًا."
  },
  {
    "type": "list",
    "ordered": false,
    "items": [
      "صور قبل وبعد",
      "رسومات ومخططات مبسطة",
      "جداول النتائج والاستنتاجات",
      "ما تعلمته وما ستغيره"
    ]
  },
  {
    "type": "image",
    "url": "https://picsum.photos/seed/agri-portfolio/1200/700",
    "alt": "صورة تجريبية لملف أعمال",
    "caption": "صورة تجريبية (Placeholder)"
  }
]$json$::jsonb
FROM public.tasks t WHERE t.id = 'b0000000-0000-4000-8000-050300000000'
ON CONFLICT DO NOTHING;

INSERT INTO public.task_content (task_id, blocks)
SELECT t.id, $json$[
  {
    "type": "note",
    "variant": "warning",
    "title": "محتوى تجريبي",
    "text": "هذا المحتوى لتوضيح طريقة عمل النظام فقط، وليس معلومة رسمية عن الكلية. سيُستبدل لاحقًا من لوحة Supabase."
  },
  {
    "type": "list",
    "ordered": false,
    "items": [
      "شركات الري ومعدات الزراعة",
      "مصانع الأغذية ومراكز التعبئة",
      "مشروعات الاستصلاح والإنتاج الزراعي",
      "مكاتب الاستشارات والتصميم",
      "الجهات البحثية والأكاديمية",
      "الأعمال الحرة وريادة الأعمال"
    ]
  },
  {
    "type": "note",
    "variant": "info",
    "text": "فرص العمل تتغير بحسب السوق، فتابع المستجدات باستمرار."
  }
]$json$::jsonb
FROM public.tasks t WHERE t.id = 'b0000000-0000-4000-8000-060100000000'
ON CONFLICT DO NOTHING;

INSERT INTO public.task_content (task_id, blocks)
SELECT t.id, $json$[
  {
    "type": "note",
    "variant": "warning",
    "title": "محتوى تجريبي",
    "text": "هذا المحتوى لتوضيح طريقة عمل النظام فقط، وليس معلومة رسمية عن الكلية. سيُستبدل لاحقًا من لوحة Supabase."
  },
  {
    "type": "table",
    "headers": [
      "الجانب",
      "ميداني",
      "مكتبي"
    ],
    "rows": [
      [
        "بيئة العمل",
        "مزارع ومصانع ومواقع تنفيذ",
        "مكاتب تصميم وتخطيط"
      ],
      [
        "أنواع المهام",
        "متابعة التنفيذ والصيانة والقياس",
        "تصميم ورسم وحسابات وتقارير"
      ],
      [
        "مهارات مطلوبة",
        "تواصل وتحمل ومرونة",
        "تحليل ودقة وبرامج هندسية"
      ]
    ],
    "caption": "مقارنة تبسيطية"
  }
]$json$::jsonb
FROM public.tasks t WHERE t.id = 'b0000000-0000-4000-8000-060200000000'
ON CONFLICT DO NOTHING;

INSERT INTO public.task_content (task_id, blocks)
SELECT t.id, $json$[
  {
    "type": "note",
    "variant": "warning",
    "title": "محتوى تجريبي",
    "text": "هذا المحتوى لتوضيح طريقة عمل النظام فقط، وليس معلومة رسمية عن الكلية. سيُستبدل لاحقًا من لوحة Supabase."
  },
  {
    "type": "list",
    "ordered": true,
    "items": [
      "جرّب التدريب الصيفي مبكرًا.",
      "طوّر مهاراتك الرقمية واللغوية.",
      "وثّق مشروعاتك في ملف أعمال.",
      "تواصل مع الخريجين وتعلّم من تجاربهم."
    ]
  },
  {
    "type": "quote",
    "text": "بناء الخبرة يبدأ بخطوة صغيرة اليوم."
  }
]$json$::jsonb
FROM public.tasks t WHERE t.id = 'b0000000-0000-4000-8000-060300000000'
ON CONFLICT DO NOTHING;

INSERT INTO public.task_content (task_id, blocks)
SELECT t.id, $json$[
  {
    "type": "note",
    "variant": "warning",
    "title": "محتوى تجريبي",
    "text": "هذا المحتوى لتوضيح طريقة عمل النظام فقط، وليس معلومة رسمية عن الكلية. سيُستبدل لاحقًا من لوحة Supabase."
  },
  {
    "type": "list",
    "ordered": false,
    "items": [
      "الاستشعار عن بعد وتحليل صور الأقمار الصناعية",
      "الري الذكي وأجهزة قياس رطوبة التربة",
      "الطائرات المسيّرة للمراقبة والرش الدقيق",
      "الزراعة الدقيقة وتحليل البيانات",
      "الطاقة الشمسية في الضخ والتشغيل"
    ]
  },
  {
    "type": "image",
    "url": "https://picsum.photos/seed/agri-tech/1200/700",
    "alt": "صورة تجريبية لتقنية زراعية",
    "caption": "صورة تجريبية (Placeholder)"
  },
  {
    "type": "links",
    "title": "للاستزادة",
    "items": [
      {
        "text": "منظمة الأغذية والزراعة (الفاو)",
        "url": "https://www.fao.org"
      }
    ]
  }
]$json$::jsonb
FROM public.tasks t WHERE t.id = 'b0000000-0000-4000-8000-070100000000'
ON CONFLICT DO NOTHING;

INSERT INTO public.task_content (task_id, blocks)
SELECT t.id, $json$[
  {
    "type": "note",
    "variant": "warning",
    "title": "محتوى تجريبي",
    "text": "هذا المحتوى لتوضيح طريقة عمل النظام فقط، وليس معلومة رسمية عن الكلية. سيُستبدل لاحقًا من لوحة Supabase."
  },
  {
    "type": "paragraph",
    "text": "المياه مورد محدود، والهدف هو إعطاء النبات ما يحتاجه فقط في الوقت المناسب."
  },
  {
    "type": "table",
    "headers": [
      "الأسلوب",
      "الفكرة العامة",
      "ملاحظة"
    ],
    "rows": [
      [
        "الري بالتنقيط",
        "توصيل الماء قرب الجذور",
        "يقلل الفاقد غالبًا"
      ],
      [
        "الري بالرش",
        "توزيع الماء كمطر صناعي",
        "يتأثر بالرياح"
      ],
      [
        "الجدولة بالمستشعرات",
        "الري حسب الحاجة الفعلية",
        "يحتاج قياسات وبيانات"
      ]
    ],
    "caption": "مقارنة تعليمية مبسطة — ليست توصية فنية"
  }
]$json$::jsonb
FROM public.tasks t WHERE t.id = 'b0000000-0000-4000-8000-070200000000'
ON CONFLICT DO NOTHING;

INSERT INTO public.task_content (task_id, blocks)
SELECT t.id, $json$[
  {
    "type": "note",
    "variant": "warning",
    "title": "محتوى تجريبي",
    "text": "هذا المحتوى لتوضيح طريقة عمل النظام فقط، وليس معلومة رسمية عن الكلية. سيُستبدل لاحقًا من لوحة Supabase."
  },
  {
    "type": "list",
    "ordered": true,
    "items": [
      "تعلّم مهارة جديدة كل فصل دراسي.",
      "تابع الأخبار العلمية في مجالك.",
      "شارك في فرق ومسابقات ومشروعات.",
      "اربط ما تدرسه بمشكلات حقيقية حولك."
    ]
  },
  {
    "type": "note",
    "variant": "tip",
    "text": "المستقبل لمن يجمع بين المعرفة الهندسية والقدرة على التعلم المستمر."
  },
  {
    "type": "quote",
    "text": "التقنية تتغير، أما مهارة التعلم فتبقى معك."
  }
]$json$::jsonb
FROM public.tasks t WHERE t.id = 'b0000000-0000-4000-8000-070300000000'
ON CONFLICT DO NOTHING;
