/**
 * access.js — هل المستخدم الحالي مسؤول؟ (للعرض فقط)
 *
 * المصدر: الدالة PostgreSQL  public.is_admin()  (database/admin/001_admin_setup.sql):
 *   المسؤول = بريد مضاف يدويًا في الجدول admin_emails + حساب مؤكَّد البريد في Supabase Auth.
 * تسجيل الدخول نفسه هو دخول المنصة الأصلي (login.html) — لا يوجد دخول منفصل للإدارة.
 *
 * تحذير: هذه الحالة تُخفي/تُظهر واجهة فقط. الحماية الفعلية سياسات RLS (admin_all) داخل PostgreSQL،
 * وتعديل هذا الكائن من وحدة تحكم المتصفح لا يمنح أي صلاحية كتابة حقيقية.
 *
 * الحالات: ready | not-admin | not-installed | error
 */
(function () {
    'use strict';

    var state = { status: 'unknown', email: '', message: '' };

    function load(user) {
        var email = String((user && user.email) || '');

        return window.PlatformAuth.checkAdmin().then(function (res) {
            state = { status: 'unknown', email: email, message: '' };

            if (res.error) {
                if (!res.installed) {
                    state.status = 'not-installed';
                    state.message = 'نظام الإدارة غير مُثبَّت في قاعدة البيانات بعد. نفّذ الملف database/admin/001_admin_setup.sql من Supabase → SQL Editor.';
                } else {
                    state.status = 'error';
                    state.message = window.AdminData.friendlyError(res.error);
                }
            } else if (!res.admin) {
                state.status = 'not-admin';
                state.message = 'هذا الحساب ليس مسؤولًا. يُضاف البريد يدويًا بتنفيذ database/admin/002_add_admin.sql، ويجب أن يكون البريد مؤكَّدًا.';
            } else {
                state.status = 'ready';
            }

            return state;
        });
    }

    window.AdminAccess = {
        load: load,
        get state() { return state; },
        isAdmin: function () { return state.status === 'ready'; }
    };
})();
