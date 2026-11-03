# إعداد المصادقة في Supabase (Google وSMTP والقوالب)

الكود في المنصة جاهز، لكن **ثلاثة أشياء تُضبط خارج الكود** في لوحة Supabase وGoogle Cloud. إلى أن تُضبط وتُختبر فعليًا:

- تسجيل الدخول بـ Google **لن يعمل** (الزر سيعرض «غير مفعّل حاليًا» إن كان المزوّد معطّلًا).
- رسائل التأكيد والاستعادة **قد لا تصل** لطلاب عاديين (انظر SMTP).

> لم يُتحقق من هذه الإعدادات على مشروعك الحقيقي أثناء التطوير (لا وصول من بيئة التطوير إلى Supabase). كل ما هو مكتوب هنا قائمة ضبط واختبار، وليس إعلانًا بأنها مضبوطة.

مشروع Supabase الحالي (من `js/config.js`): `https://kegawnvzoimaddnziotv.supabase.co`
رابط الموقع: `https://samehabobakr.github.io/Agricultural-Engineering-platform/`

---

## 1) Redirect URLs (أهم خطوة — بدونها تفشل روابط البريد وGoogle)

**Authentication → URL Configuration**

| الحقل | القيمة |
|---|---|
| Site URL | `https://samehabobakr.github.io/Agricultural-Engineering-platform/` |
| Redirect URLs | `https://samehabobakr.github.io/Agricultural-Engineering-platform/**` |

الواجهة ترسل هذين الرابطين بالتحديد، وكلاهما يغطّيه النمط أعلاه:

- `.../login.html` — الرجوع من Google ومن رابط تأكيد البريد.
- `.../reset-password.html` — الرجوع من رابط استعادة كلمة المرور.

للتجربة محليًا أضف مؤقتًا `http://localhost:8000/**` (أو منفذك)، واحذفه بعد الانتهاء.

> لو لم يكن الرابط ضمن القائمة يعيد Supabase الطالب إلى Site URL. الكود يتحسّب لذلك: رابط الاستعادة الذي يصل إلى أي صفحة أخرى يُحوَّل تلقائيًا إلى `reset-password.html`، لكن لا تعتمد على هذا بدل ضبط القائمة.

## 2) تسجيل الدخول بـ Google

**في Google Cloud Console** (console.cloud.google.com):

1. APIs & Services → OAuth consent screen: اختر External، واكتب اسم التطبيق وبريد الدعم، ثم **Publish app** (وهو في حالة Testing لا يدخل إلا المستخدمون التجريبيون المضافون يدويًا).
2. Credentials → Create credentials → OAuth client ID → النوع **Web application**.
3. **Authorized JavaScript origins**: `https://samehabobakr.github.io`
4. **Authorized redirect URIs**: `https://kegawnvzoimaddnziotv.supabase.co/auth/v1/callback`
   (هذا رابط Supabase نفسه وليس رابط الموقع.)
5. انسخ Client ID وClient Secret.

**في Supabase:** Authentication → Sign In / Providers → Google → فعّل المزوّد والصق Client ID وSecret → Save.

**الأسرار:** الـ Client Secret يوضع في لوحة Supabase فقط. لا يُكتب في أي ملف من المستودع. الواجهة تستخدم المفتاح العام `publishable` وحده.

## 3) البريد الإلكتروني (SMTP)

خادم البريد المدمج في Supabase **للتجربة فقط**: يرسل عادةً لأعضاء فريق المشروع فقط وبحدّ إرسال منخفض جدًا. لن تصل رسائل التأكيد والاستعادة لمعظم الطلاب بدون SMTP مخصص.

**Authentication → Emails → SMTP Settings → Enable Custom SMTP**، بقيم من مزوّد بريد (Resend أو Brevo أو SendGrid أو غيره): Host وPort وUsername وPassword وعنوان المرسل واسمه. ويُفضّل عنوان مرسل على نطاق تملكه مع ضبط SPF/DKIM عند المزوّد، وإلا تذهب الرسائل غالبًا إلى Spam.

بعد التفعيل راجع **Authentication → Rate Limits** (عدد الرسائل في الساعة) بما يناسب عدد الطلاب.

## 4) إعدادات البريد وكلمة المرور

**Authentication → Sign In / Providers → Email**

| الإعداد | القيمة المطلوبة | السبب |
|---|---|---|
| Enable Email provider | مفعّل | تسجيل الدخول بالبريد |
| Confirm email | **مفعّل** | الواجهة تتوقع رسالة تحقق قبل الدخول |
| Minimum password length | **8** | يطابق التحقق في الواجهة (`js/auth-ui.js`) |
| Password requirements | حروف وأرقام (Letters and digits) | يطابق الواجهة |

لو عطّلت Confirm email فالواجهة تتعامل مع ذلك (يدخل الطالب مباشرة بعد التسجيل)، لكن لن يكون هناك تحقق من ملكية البريد.

## 5) قوالب الرسائل (عربية RTL)

**Authentication → Emails → Templates:**

| القالب | الملف | العنوان المقترح |
|---|---|---|
| Confirm signup | `docs/email-templates/confirm-signup.html` | تأكيد بريدك الإلكتروني – منصة الهندسة الزراعية |
| Reset password | `docs/email-templates/reset-password.html` | استعادة كلمة المرور – منصة الهندسة الزراعية |

الصق محتوى الملف في خانة Message body. يجب أن يبقى المتغير `{{ .ConfirmationURL }}` كما هو.

---

## 6) اختبارات يجب تنفيذها بعد الضبط (لا تعتبر المصادقة جاهزة قبلها)

| # | الاختبار | النتيجة المتوقعة |
|---|---|---|
| 1 | إنشاء حساب ببريد حقيقي جديد | تظهر شاشة «تحقق من بريدك»، وتصل الرسالة (راجع Spam) |
| 2 | فتح رابط التأكيد | العودة إلى `login.html` ثم دخول تلقائي ثم الانتقال للمنصة |
| 3 | إنشاء حساب ببريد مسجّل | رسالة «مسجّل بالفعل» مع زري «تسجيل الدخول» و«نسيت كلمة المرور؟» |
| 4 | الدخول قبل تأكيد البريد | رسالة «لم يتم تأكيد بريدك» + زر إعادة الإرسال |
| 5 | «نسيت كلمة المرور؟» ببريد مسجّل | تصل رسالة، والرابط يفتح `reset-password.html` بنموذج كلمة مرور جديدة |
| 6 | فتح رابط الاستعادة مرة ثانية أو بعد انتهائه | شاشة «رابط الاستعادة غير صالح» + زر طلب رابط جديد |
| 7 | زر «المتابعة باستخدام Google» | يفتح Google ثم يعود لـ `login.html` ثم المنصة. إن ظهرت «غير مفعّل حاليًا» فالمزوّد غير مفعّل في Supabase |
| 8 | الدخول بالبريد نفسه عبر Google ثم بكلمة المرور | يُفضَّل أن يكون الحساب واحدًا (Supabase يربط الهويات ذات البريد المؤكَّد نفسه افتراضيًا) |
| 9 | تسجيل الخروج من أي صفحة | يعود الزر إلى «تسجيل الدخول» وتختفي بيانات الطالب |

## 7) نقاط يجب الانتباه لها

- **حساب Google وبريد/كلمة مرور بالبريد نفسه:** إن أنشأ الطالب حسابًا بكلمة مرور ثم دخل بـ Google بالبريد نفسه فسيرتبطان بحساب واحد (إن كان البريد مؤكَّدًا). وإن سجّل عبر Google أولًا فلا توجد له كلمة مرور، فيستخدم «نسيت كلمة المرور؟» لتعيين واحدة.
- **تسجيل الخروج** ينهي الجلسة في كل الأجهزة (السلوك الافتراضي في supabase-js).
- **لا توجد أسرار في المستودع.** إن وجدت يومًا `service_role` أو Client Secret داخل أي ملف فاعتبره مكشوفًا وجدّده فورًا.
