/**
 * dashboard.js — وحدة «الرئيسية»
 *
 * أرقام حقيقية فقط: لا توجد قيم افتراضية. إن فشل جلب رقم يظهر «—» مع التنبيه، وليس صفرًا.
 * العدّ مباشر (head:true = لا نقل صفوف). المسؤول يرى كل الصفوف حتى المخفية بفضل سياسة admin_all.
 */
(function () {
    'use strict';

    var TILES = [
        { table: 'subjects',              label: 'المواد الدراسية',      to: 'subjects' },
        { table: 'material_files',        label: 'الملفات',               to: 'files' },
        { table: 'more_items',            label: 'أقسام «المزيد»',        to: 'more-items' },
        { table: 'additional_resources',  label: 'المصادر الخارجية',      to: 'external' },
        { table: 'faculty_members',       label: 'أعضاء هيئة التدريس',    to: 'faculty' },
        { table: 'community_members',     label: 'أعضاء المجتمع',         to: 'community' },
        { table: 'rooms',                 label: 'الغرف',                 to: 'rooms' },
        { table: 'tasks',                 label: 'المهام',                to: 'tasks' },
        { table: 'task_quiz_questions',   label: 'أسئلة الاختبارات',      to: 'quiz' },
        { table: 'user_task_completions', label: 'مهام أنجزها الطلاب',    to: null }
    ];

    window.AdminModules.define('dashboard', {
        mount: function (ctx) {
            var html = ctx.dom.html, D = ctx.dom, alive = true;

            function render(counts, failed) {
                var tiles = TILES.map(function (t) {
                    var v = counts[t.table];
                    var bad = v === null || v === undefined;
                    var inner = html`<h3>${bad ? '—' : Number(v).toLocaleString('ar-EG')}</h3><p>${t.label}</p>`;
                    return t.to
                        ? html`<a class="stat-card adm-stat-link${bad ? ' adm-stat--bad' : ''}" href="#/${t.to}">${inner}</a>`
                        : html`<div class="stat-card${bad ? ' adm-stat--bad' : ''}">${inner}</div>`;
                });

                var items = [
                    ['ok', 'الحساب: ' + (ctx.access.state.email || '—') + ' — مسؤول (تم التحقق من قاعدة البيانات)'],
                    ['ok', 'الدخول: دخول المنصة الأصلي. قاعدة البيانات واحدة للموقع واللوحة.']
                ];
                if (failed.length) items.push(['warn', 'تعذر جلب: ' + failed.join('، ')]);

                D.mount(ctx.root, html`
                    <div class="stats-grid">${tiles}</div>
                    <div class="adm-grid adm-grid--2">
                        <section class="adm-card"><h2>حالة النظام</h2>
                            <ul class="adm-checklist">${items.map(function (i) {
                                return html`<li><span class="adm-dot" aria-hidden="true">${i[0] === 'ok' ? '✅' : '⚠️'}</span><span>${i[1]}</span></li>`;
                            })}</ul></section>
                        <section class="adm-card"><h2>ابدأ من هنا</h2>
                            <ul class="adm-checklist">
                                <li><span class="adm-dot" aria-hidden="true">1️⃣</span><span><a href="#/subjects">أضف المواد الدراسية</a> ثم <a href="#/files">ملفات كل مادة</a>.</span></li>
                                <li><span class="adm-dot" aria-hidden="true">2️⃣</span><span><a href="#/faculty">هيئة التدريس</a> و<a href="#/community">المجتمع</a>.</span></li>
                                <li><span class="adm-dot" aria-hidden="true">3️⃣</span><span><a href="#/more-items">أقسام «المزيد»</a> (شؤون الطلاب، مصادر خارجية، ...).</span></li>
                                <li><span class="adm-dot" aria-hidden="true">4️⃣</span><span><a href="#/rooms">الغرف</a> ثم <a href="#/tasks">المهام</a> و<a href="#/quiz">الأسئلة</a>.</span></li>
                            </ul>
                            <p class="adm-note">كل ما تضيفه هنا يظهر في الموقع فورًا؛ الإخفاء بدل الحذف متاح للغرف والمهام والأشخاص.</p></section>
                    </div>`);
            }

            D.mount(ctx.root, ctx.ui.loadingState('جاري تحميل الإحصائيات...'));

            Promise.all(TILES.map(function (t) {
                return ctx.data.run(function (c) { return c.from(t.table).select('*', { count: 'exact', head: true }); });
            })).then(function (results) {
                if (!alive) return;
                var counts = {}, failed = [];
                results.forEach(function (r, i) {
                    counts[TILES[i].table] = r.error ? null : r.count;
                    if (r.error) failed.push(TILES[i].label);
                });
                render(counts, failed);
            });

            return function () { alive = false; };
        }
    });
})();
