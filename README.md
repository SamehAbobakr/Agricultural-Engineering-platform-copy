# منصة كلية الهندسة الزراعية – جامعة الأزهر

موقع تعليمي مجاني (عربي RTL) يعرض مقررات ومحاضرات وملفات الكلية. مكتوب بـ HTML وCSS وJavaScript عادي بدون أدوات بناء، ومنشور على GitHub Pages، والبيانات من Supabase والملفات على Cloudflare R2.

## هيكل المشروع

| المسار | وظيفته |
|---|---|
| `index.html` | الصفحة الرئيسية (التطبيق كله يُرسم داخل `#contentArea` بواسطة JS) |
| `about/about.html` + `about/room.html` | «عن الكلية» = نظام الغرف والمهمات: القائمة والتقدم في `about.html`، والغرفة الواحدة في `room.html?room=<slug>`. الكود في `about/js/rooms-*.js` والتنسيق المعزول (أصناف `rm-*`) في `about/css/rooms.css` |
| `tools/tools.html` | صفحة الأدوات، و`tools/study-timer.html` مؤقت المذاكرة (مستقل) |
| `student_dashboard/` | لوحة إنجاز الطالب (`index.html` + `css/style.css` + `js/app.js`) |
| `faculty/` | دليل أعضاء هيئة التدريس: `faculty.html` + `css/faculty.css` + `js/` (سبعة ملفات صغيرة، انظر أدناه) |
| `css/` | تنسيقات مشتركة بين كل الصفحات (`variables.css` فيه الألوان والوضع الليلي/النهاري) |
| `js/` | سكربتات الصفحة الرئيسية + الملفان المشتركان `auth.js` (المصادقة) و`header.js` (الهيدر والثيم) |
| `assets/images/icons/` | صور الأيقونات |
| `login.html` / `reset-password.html` | صفحتا الدخول/إنشاء الحساب/نسيت كلمة المرور، وتعيين كلمة مرور جديدة (واجهتهما `js/login.js` و`js/reset-password.js` وتنسيقهما `css/auth.css`) |
| `database/` | ملفات SQL لجداول Supabase (تُشغَّل يدويًا من SQL Editor): `faculty_members.sql` و`student_dashboard.sql` و`rooms_progress.sql` (الجداول والأمان) ثم `rooms_seed.sql` (محتوى تجريبي) |
| `docs/` | التوثيق: `auth-setup.md` (إعداد Google وSMTP وRedirect URLs) و`email-templates/` (قوالب رسائل التأكيد والاستعادة بالعربية) |
| `.github/workflows/supabase-keepalive.yml` | يرسل طلبًا لـ Supabase كل 3 أيام حتى لا يتوقف المشروع المجاني |

## ترتيب سكربتات الصفحة الرئيسية (مهم)

`config.js` ← `state.js` ← `data.js` ← `supabase.js` ← `ui.js` ← `navigation.js` ← `departments.js` ← `home.js` ← `subjects.js` ← `materials.js` ← `search.js` ← `ai-assistant.js` ← `app.js`

كل ملف يعتمد على ما قبله، فلا تغيّر الترتيب في `index.html`.

## المصادقة والثيم (ملفان مشتركان — لا تكرر منطقهما في الصفحات)

| الملف | وظيفته |
|---|---|
| `js/auth.js` | **عميل Supabase الوحيد** لكل صفحة (`PlatformAuth.getClient()`)، والاشتراك الوحيد في `onAuthStateChange`، وتحديث زر «تسجيل الدخول/الخروج» في الهيدر وقائمة الموبايل، وكل عمليات الحساب: `signUp` و`signIn` و`signInWithGoogle` و`sendPasswordReset` و`resendConfirmation` و`updatePassword` و`signOut`، ومعالجة الرجوع من رابط البريد/Google (`callback`) ووجهة العودة بعد الدخول (`loginUrl` و`safeReturnUrl`). لا تستدعِ `supabase.createClient()` في أي مكان آخر (يسبب تحذير `Multiple GoTrueClient`). |
| `js/auth-ui.js` | أدوات واجهة فقط (تحقق الحقول، رسالة التنبيه، إظهار كلمة المرور). لا منطق مصادقة فيه. |
| `js/header.js` | الهمبرجر ودرج الموبايل + **الوضع الليلي/النهاري** (`toggleTheme()` من `onclick`، المفتاح `localStorage['theme']`، ويُطبَّق مبكرًا على `<html>` لمنع الوميض). لا تضف منطق ثيم في أي ملف آخر. |

كل صفحة تستخدم الهيدر تحمّل في `<head>`: `auth.js` ثم `header.js`، وتحمّل مكتبة Supabase و`config.js` قبل نهاية الصفحة (الصفحات التي تستخدم `js/supabase.js` تحمّل `auth.js` قبله). صفحة `tools/study-timer.html` مستقلة عمدًا ولا تستخدم أيًّا منهما.

## قواعد أمان عند تعديل الكود

1. **أي نص قادم من قاعدة البيانات** يمرّ على `escapeHtml(...)` قبل وضعه في HTML.
2. **أي رابط قادم من قاعدة البيانات** يمرّ على `safeUrl(...)` (يقبل `http` و`https` فقط).
3. **لا تكتب بيانات داخل `onclick="..."` مباشرة.** استخدم `inlineArg(قيمة)` الموجودة في `js/ui.js`، فهي تمرّر رقمًا فقط وتمنع حقن الكود.
4. مفتاح Supabase الموجود في `js/config.js` مفتاح **عام** (`publishable`) ومصمَّم للواجهة، وحمايته الحقيقية تكون بسياسات Row Level Security في Supabase. لا تضع أبدًا مفتاح `service_role` أو أي مفتاح سري في هذا المستودع.

## الروابط بين الصفحات

الموقع منشور على مسار فرعي (`/Agricultural-Engineering-platform/`)، لذلك استخدم مسارات **نسبية** فقط:
من `index.html` اكتب `tools/tools.html`، ومن داخل مجلد فرعي اكتب `../index.html`. لا تبدأ أي رابط بـ `/`.

## إعداد المصادقة (Google والبريد) — خطوات خارج الكود

تسجيل الدخول بـ Google وإرسال رسائل التأكيد/الاستعادة **لا يعملان إلا بعد ضبط Supabase وGoogle Cloud وSMTP واختبارها فعليًا**. الخطوات والقوالب العربية والاختبارات المطلوبة في `docs/auth-setup.md`. لا تضع أي سر (Client Secret أو `service_role`) في المستودع.

## الإنجازات والنقاط (الأساس في قاعدة البيانات)

نفّذ `database/rooms_progress.sql` مرة واحدة (آمن لإعادة التشغيل). القواعد لمن سيبني واجهة الغرف:

1. **المحتوى للجميع، الإنجاز للمسجّلين:** الزائر يقرأ `rooms` و`tasks` و`task_content` (المنشور فقط) بلا دخول.
2. **سجّل الإنجاز بـ `supabase.rpc('complete_task', { p_task_id })` فقط.** لا تكتب في `user_task_completions` مباشرة (مغلق)، ولا تُرسل نقاطًا ولا `user_id`: الهوية من الجلسة والنقاط من جدول `tasks`.
3. **نقاط الطالب** = مجموع `awarded_points` من `user_task_completions` (RLS تُرجع إنجازاته هو فقط). لا يوجد جدول نقاط منفصل.
4. **زائر غير مسجّل يحاول إكمال مهمة:** وجّهه إلى `PlatformAuth.loginUrl(location.href)` فيعود لنفس الصفحة بعد الدخول.
5. **بعد تسجيل الخروج أو تبديل الحساب** لا يجب أن تبقى بيانات المستخدم السابق في المتصفح: استمع لـ `PlatformAuth.onChange` وفرّغ الحالة، وأي تخزين محلي لتقدّم المستخدم يجب أن يبدأ مفتاحه بـ `agri_user_` فيمسحه `auth.js` تلقائيًا عند الخروج أو تبدّل المستخدم.

## لوحة الإنجاز: ربطها بحساب الطالب

بيانات الطالب (الأهداف، تقدمه في المواد، بياناته الشخصية، الملاحظات) محفوظة في Supabase مرتبطة بحسابه (`auth.uid()`) وتحميها سياسات RLS — لم يعد `localStorage` مصدرًا لها.

1. **نفّذ مرة واحدة** `database/student_dashboard.sql` من Supabase → SQL Editor (آمن لإعادة التشغيل ولا يحذف شيئًا).
2. بلا جلسة تعرض اللوحة بوابة «سجّل الدخول» بدل أي بيانات. عند الخروج أو تبديل الحساب تُفرَّغ البيانات وتُلغى الطلبات والمؤقتات المعلّقة.
3. بيانات `localStorage` القديمة (المفتاح `agri_student_dashboard_v2`) **لم تُحذف ولم تُنقل**: تبقى في متصفح كل طالب كما هي ولا تظهر في اللوحة. أي نقل لها لاحقًا يجب أن يكون اختيارًا صريحًا من الطالب.

## لوحة الإنجاز: تعديل التصميم

ملف `student_dashboard/css/tailwind.css` ناتج بناء Tailwind (مرفوع جاهزًا). إذا أضفت أصناف Tailwind جديدة داخل `student_dashboard/index.html` أو `student_dashboard/js/*.js` فشغّل داخل مجلد `student_dashboard`:

```
npm install
npm run build:css
```

## دليل أعضاء هيئة التدريس (`faculty/`)

كل ملف له وظيفة واحدة، وترتيب تحميلها في `faculty.html` مهم (كل ملف يعتمد على ما قبله):

| الملف | وظيفته |
|---|---|
| `js/faculty-config.js` | **الإعدادات**: مصدر البيانات (`dataSource`)، اسم الجدول، ترتيب الدرجات الوظيفية |
| `js/faculty-demo-data.js` | سجل تجريبي واحد فقط (يُحذف قبل الإطلاق) |
| `js/faculty-utils.js` | دوال مساعدة آمنة (بناء DOM، روابط `https` و`mailto`، الصورة البديلة) |
| `js/faculty-api.js` | **الطبقة الوحيدة** التي تعرف مصدر البيانات (Supabase أو العرض التجريبي) |
| `js/faculty-render.js` | رسم البطاقات والإحصائيات والفلاتر وحالات التحميل/الخطأ/الفراغ |
| `js/faculty-modal.js` | نافذة التفاصيل (لوحة المفاتيح والتركيز) ونسخ الاسم |
| `js/faculty-app.js` | تشغيل الصفحة: الحالة والبحث والفلاتر والأحداث |

تعتمد الصفحة على ملفات المنصة المشتركة: `js/config.js` و`js/supabase.js` (العميل المشترك) و`js/data.js` (أسماء الأقسام) و`js/ui.js` (الوضع الليلي و`safeUrl` و`normalizeText`).

للتفعيل مع Supabase: شغّل `database/faculty_members.sql` ثم غيّر `dataSource` إلى `'supabase'` — التفاصيل في `docs/faculty-directory-setup.md`.



## واجهة الغرف والمهمات (about/)

- **ترتيب السكربتات:** `rooms-config` ← `rooms-utils` ← `rooms-api` ← `rooms-progress` ثم (`rooms-blocks` ← `rooms-viewer` ← `rooms-room`) لصفحة الغرفة أو `rooms-list` للقائمة.
- **الغرف تأتي من Supabase** (لا شيء مكتوب في HTML). محتوى كل مهمة يُجلب عند فتحها فقط.
- **المحتوى:** `task_content.blocks` مصفوفة JSONB، والأنواع المدعومة: `heading, paragraph, image, gallery, video, list, table, link, links, quote, note, divider`. لإضافة نوع جديد أضف دالة في `RoomsBlocks.renderers` وقاعدة CSS؛ النوع المجهول يُتخطّى بصمت.
- **الأمان:** كل نص بـ `textContent`، وكل رابط بـ `httpUrl` (http/https فقط). الإنجاز عبر `complete_task` فقط، ولا تُخزَّن بيانات التقدم في المتصفح.
- **تغيير المحتوى:** من Table Editor في Supabase؛ أخفِ بـ `is_active = false`. المحتوى الحالي تجريبي، والصور Placeholders.
- الهيدر والفوتر منسوخان حرفيًا من الصفحة القديمة، ولا يغيّر `rooms.css` شيئًا فيهما.
