-- =====================================================================
-- إضافة مسؤول — عدّل البريد في السطر المحدد ثم نفّذ (Supabase → SQL Editor)
--
-- الخطوات:
--   1) أنشئ حسابك من صفحة دخول المنصة (login.html → إنشاء حساب) وأكّد بريدك،
--      أو من Supabase → Authentication → Users → Add user (مع تفعيل Auto Confirm User).
--   2) ضع نفس البريد أدناه (حروف صغيرة) ونفّذ الملف.
--   3) سجّل الدخول من صفحة دخول المنصة؛ سيظهر زر «🛡️ لوحة الإدارة» في الهيدر.
--
-- شروط:
--   • البريد بحروف صغيرة (الجدول يرفض الحروف الكبيرة؛ الملف يحوّلها لك).
--   • الحساب يجب أن يكون مؤكَّد البريد، وإلا فلن يُعدّ مسؤولًا (حماية: لا يكفي التسجيل ببريد المسؤول).
--   • نفس البريد يعمل بتسجيل الدخول بكلمة المرور أو بحساب Google (بشرط أن يكون هو نفسه بريد الحساب).
-- =====================================================================

DO $$
DECLARE
    v_email TEXT := LOWER(BTRIM('PUT_YOUR_EMAIL_HERE@example.com'));   -- ← ← عدّل هذا البريد فقط
BEGIN
    IF v_email LIKE 'put_your_email_here%' THEN
        RAISE EXCEPTION 'عدّل البريد في الملف أولًا (السطر المحدد بالسهم) ثم أعد التنفيذ.';
    END IF;

    INSERT INTO public.admin_emails (email) VALUES (v_email) ON CONFLICT (email) DO NOTHING;
END
$$;

-- تحقق: يجب أن ترى صفًا لبريدك مع has_account = true و confirmed = true
SELECT a.email,
       (u.id IS NOT NULL)                  AS has_account,
       (u.email_confirmed_at IS NOT NULL)  AS confirmed
  FROM public.admin_emails a
  LEFT JOIN auth.users u ON LOWER(u.email) = a.email
 ORDER BY a.created_at;

-- لإزالة مسؤول:
-- DELETE FROM public.admin_emails WHERE email = 'name@example.com';
