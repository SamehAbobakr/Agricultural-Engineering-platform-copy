/**
 * admins.js — صفحة «المسؤولون» (عرض فقط)
 * المسؤول = بريد في جدول public.admin_emails. الإضافة والحذف يدويًا من Supabase → SQL Editor عمدًا
 * (حتى لا يستطيع حساب مسؤول مخترق أو خطأ في الواجهة منح الإدارة لأحد).
 */
(function () {
    'use strict';

    window.AdminModules.define('admins', {
        mount: function (ctx) {
            var html = ctx.dom.html, D = ctx.dom, alive = true;
            D.mount(ctx.root, ctx.ui.loadingState());

            ctx.data.run(function (c) { return c.from('admin_emails').select('email,created_at').order('created_at'); }).then(function (res) {
                if (!alive) return;
                if (res.error) { D.mount(ctx.root, ctx.ui.errorState(res.message)); return; }

                var me = String(ctx.access.state.email || '').toLowerCase();

                D.mount(ctx.root, html`
                    <section class="adm-card">
                        <h2>المسؤولون الحاليون</h2>
                        <div class="adm-table-wrap"><table class="adm-table">
                            <thead><tr><th>البريد الإلكتروني</th><th>أُضيف في</th></tr></thead>
                            <tbody>${(res.data || []).map(function (r) {
                                return html`<tr><td dir="ltr">${r.email}${String(r.email).toLowerCase() === me ? html` <span class="adm-badge adm-badge--ok">أنت</span>` : ''}</td><td>${D.formatDate(r.created_at)}</td></tr>`;
                            })}</tbody></table></div>
                    </section>
                    <section class="adm-card adm-mt">
                        <h2>إضافة أو إزالة مسؤول</h2>
                        <p>من Supabase ← <b>SQL Editor</b> نفّذ أحد الأمرين (بعد أن يكون صاحب البريد قد سجّل حسابه من صفحة دخول المنصة وأكّد بريده). الملف الجاهز: <code dir="ltr">database/admin/002_add_admin.sql</code>.</p>
                        <pre class="adm-code" dir="ltr">insert into public.admin_emails (email) values ('name@example.com');

delete from public.admin_emails where email = 'name@example.com';</pre>
                        <p class="adm-hint">يُشترط أن يكون البريد مؤكَّدًا (Email confirmed) في Supabase Auth؛ فمجرد التسجيل ببريد المسؤول دون تأكيده لا يمنح أي صلاحية.</p>
                    </section>`);
            });

            return function () { alive = false; };
        }
    });
})();
