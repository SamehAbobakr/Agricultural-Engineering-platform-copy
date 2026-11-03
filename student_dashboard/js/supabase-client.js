// العميل المشترك للمنصة: يُنشأ مرة واحدة فقط في ../js/auth.js (لا تنشئ عميلًا آخر هنا).
// لو لم تُحمَّل مكتبة Supabase (النت ضعيف مثلاً) تكون القيمة null والصفحة تعرض رسالة خطأ بدل أن تنهار.
export const supabaseClient = window.PlatformAuth ? window.PlatformAuth.getClient() : null;
window.supabaseClient = supabaseClient;
