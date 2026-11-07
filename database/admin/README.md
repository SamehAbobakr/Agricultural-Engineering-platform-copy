# قاعدة بيانات لوحة الإدارة

مشروع Supabase الوحيد للموقع واللوحة: `nmukuzolpbkczqayzatp` (العنوان والمفتاح في `js/config.js`).
التنفيذ يدويًا من Supabase → **SQL Editor**، وكل ملف آمن لإعادة التشغيل.

| الترتيب | الملف | ماذا يفعل |
|---|---|---|
| 1 | `001_admin_setup.sql` | جدول `admin_emails` + الدالة `is_admin()`، وسياسات RLS التي تسمح **للمسؤول فقط** بالكتابة في جداول المحتوى، وإصلاح قراءة جداول «المزيد» للمسجَّل، وتشديد الصلاحيات، ودالتا الاختبارات `get_task_questions` / `submit_task_answer` |
| 2 | `002_add_admin.sql` | تضع بريدك (يدويًا) في `admin_emails` فيصبح مسؤولًا |
| 3 | `003_points_system.sql` | توحيد النقاط: سؤال ← مهمة ← غرفة (triggers مطلقة فوق `trg_sync_task_points`)، `rooms.total_points`، إصلاح `submit_task_answer` وإغلاق ثغرة `complete_task` |
| 4 (اختياري) | `004_points_reconcile_optional.sql` | معاينة ثم مطابقة `tasks.points` القديمة اليدوية مع أسئلتها |

قبل 003 شغّل `diagnostics/points_diagnostics.sql` (للقراءة فقط)، وبعده `tests/points_system_tests.sql` على **Staging** (ينتهي بـ ROLLBACK).
ملاحظة: مشروع الإنتاج/الـ Staging يُحدَّدان بـ `js/config.js`؛ نفّذ على Staging أولًا.

## من هو المسؤول؟

المسؤول = **بريد تضيفه أنت يدويًا** في `admin_emails` + **حساب مؤكَّد البريد** في Supabase Auth.
لا توجد صفحة دخول خاصة بالإدارة: يسجّل المسؤول من **صفحة دخول المنصة** (`login.html`، بريد/كلمة مرور أو Google)،
فيظهر له زر «🛡️ لوحة الإدارة» في الهيدر.

لإضافة مسؤول آخر أو إزالته (SQL Editor):

```sql
insert into public.admin_emails (email) values ('name@example.com');   -- بحروف صغيرة
delete from public.admin_emails where email = 'name@example.com';
```

> لا تُدار قائمة المسؤولين من الواجهة عمدًا، حتى لا يستطيع حساب مخترق أو خطأ في الواجهة منح الإدارة لأحد.

## الأمان

- الواجهة تُخفي وتُظهر فقط. الحماية الفعلية في PostgreSQL: سياسة `admin_all` على كل جدول محتوى تشترط `is_admin()`.
- الزائر والطالب لا يكتبان في جداول المحتوى (محجوب بالصلاحيات وRLS).
- إنجازات الطلاب والإجابات تُكتب فقط عبر دوال `SECURITY DEFINER`، والإجابة الصحيحة لا تغادر الخادم.

## ملفات SQL الأخرى في `database/`

`faculty_members.sql` و`community_members.sql` و`student_dashboard.sql` و`rooms_progress.sql` و`rooms_seed.sql`
هي التي أنشأت الجداول الأصلية. جداول قاعدة البيانات الحالية موجودة بالفعل، فلا تُعاد إلا لو أنشأت مشروعًا جديدًا فارغًا
(نفّذها أولًا بهذا الترتيب ثم `001` و`002`).
