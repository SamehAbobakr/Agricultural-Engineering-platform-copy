// =========================================
// صفحة «عن الكلية» — قائمة الغرف + ملخص تقدم الطالب
// تعتمد على: auth.js (PlatformAuth) ثم rooms-config / utils / api / progress
// =========================================

const RoomsListApp = {

    rooms: [],
    loading: false,
    loaded: false,
    lastUserId: null,
    recentCache: new Map(),   // taskId -> { title, roomTitle, roomSlug }

    els: {},

    init() {
        const byId = function (id) { return document.getElementById(id); };

        RoomsListApp.els = {
            stats: byId('rmHeroStats'),
            progress: byId('rmProgress'),
            grid: byId('rmRoomsGrid'),
            count: byId('rmRoomsCount')
        };

        if (!RoomsListApp.els.grid) return;

        RoomsListApp.renderSkeleton();
        RoomsListApp.load();

        // تبدّل المستخدم أو خروجه: نفرّغ بياناته ونعيد الرسم. تجديد التوكن لا يعيد شيئًا.
        if (window.PlatformAuth) {
            PlatformAuth.onChange(function (event, session) {
                if (event === 'TOKEN_REFRESHED') return;

                const userId = session && session.user ? session.user.id : null;
                if (RoomsListApp.loading || userId === RoomsListApp.lastUserId) return;

                RoomsListApp.lastUserId = userId;
                RoomsListApp.refreshProgress(session);
            });
        }
    },

    async load() {
        const app = RoomsListApp;
        app.loading = true;
        app.renderSkeleton();

        const results = await Promise.all([RoomsApi.listRooms(), RoomsApi.getSession()]);
        const roomsRes = results[0];
        const session = results[1];

        if (roomsRes.error) {
            console.error('تعذّر جلب الغرف:', roomsRes.error);
            app.loading = false;
            app.renderError();
            return;
        }

        app.rooms = roomsRes.data;
        app.lastUserId = session && session.user ? session.user.id : null;
        app.progressOk = await RoomsProgress.load(session);
        app.loaded = true;
        app.loading = false;

        app.renderAll();
    },

    async refreshProgress(session) {
        const app = RoomsListApp;
        if (!app.loaded) return;

        app.progressOk = await RoomsProgress.load(session);
        app.renderAll();
    },

    renderAll() {
        RoomsListApp.renderStats();
        RoomsListApp.renderProgress();
        RoomsListApp.renderGrid();
    },

    // ---------- حالات التحميل والخطأ ----------

    renderSkeleton() {
        const el = RoomsUtils.el;
        const grid = RoomsListApp.els.grid;

        grid.setAttribute('aria-busy', 'true');
        RoomsUtils.clear(grid);

        for (let i = 0; i < 4; i++) {
            grid.appendChild(el('div', { className: 'rm-card rm-skeleton', attrs: { 'aria-hidden': 'true' } }, [
                el('span', { className: 'rm-sk rm-sk-icon' }),
                el('span', { className: 'rm-card-body' }, [
                    el('span', { className: 'rm-sk rm-sk-line rm-sk-title' }),
                    el('span', { className: 'rm-sk rm-sk-line' }),
                    el('span', { className: 'rm-sk rm-sk-line rm-sk-short' })
                ])
            ]));
        }
    },

    renderError() {
        const el = RoomsUtils.el;
        const grid = RoomsListApp.els.grid;

        grid.setAttribute('aria-busy', 'false');
        RoomsUtils.clear(grid);
        RoomsUtils.clear(RoomsListApp.els.progress);
        if (RoomsListApp.els.count) RoomsListApp.els.count.textContent = '';

        const retry = el('button', { className: 'rm-btn', text: 'إعادة المحاولة', attrs: { type: 'button' } });
        retry.addEventListener('click', function () { RoomsListApp.load(); });

        grid.appendChild(el('div', { className: 'rm-state rm-state-error', attrs: { role: 'alert' } }, [
            el('span', { className: 'rm-state-icon', text: '⚠️', attrs: { 'aria-hidden': 'true' } }),
            el('h3', { text: 'تعذّر تحميل الغرف' }),
            el('p', { text: 'تأكد من اتصالك بالإنترنت ثم حاول مرة أخرى.' }),
            retry
        ]));
    },

    renderEmpty() {
        const el = RoomsUtils.el;
        RoomsListApp.els.grid.appendChild(el('div', { className: 'rm-state' }, [
            el('span', { className: 'rm-state-icon', text: '🌱', attrs: { 'aria-hidden': 'true' } }),
            el('h3', { text: 'لا توجد غرف منشورة بعد' }),
            el('p', { text: 'سيتم إضافة الغرف قريبًا، عد لاحقًا.' })
        ]));
    },

    // ---------- أرقام عامة في الغلاف ----------

    renderStats() {
        const el = RoomsUtils.el;
        const box = RoomsListApp.els.stats;
        if (!box) return;

        RoomsUtils.clear(box);

        let tasks = 0;
        let points = 0;
        RoomsListApp.rooms.forEach(function (room) {
            tasks += room.tasks.length;
            room.tasks.forEach(function (t) { points += t.points; });
        });

        [
            [RoomsListApp.rooms.length, 'غرف'],
            [tasks, 'مهمة'],
            [points, 'نقطة متاحة']
        ].forEach(function (item) {
            box.appendChild(el('li', {}, [
                el('strong', { text: RoomsUtils.num(item[0]) }),
                el('span', { text: item[1] })
            ]));
        });
    },

    // ---------- ملخص تقدم الطالب (للمسجّل) أو دعوة الدخول (للزائر) ----------

    renderProgress() {
        const el = RoomsUtils.el;
        const box = RoomsListApp.els.progress;
        RoomsUtils.clear(box);

        if (!RoomsListApp.rooms.length) return;

        // زائر: دعوة هادئة، والتصفح مفتوح
        if (!RoomsProgress.isSignedIn() && RoomsProgress.userId === null && !RoomsListApp.lastUserId) {
            const link = el('a', {
                className: 'rm-btn rm-btn-ghost',
                text: 'تسجيل الدخول',
                attrs: { href: PlatformAuth.loginUrl(window.location.href) }
            });

            box.appendChild(el('div', { className: 'rm-guest' }, [
                el('span', { className: 'rm-guest-icon', text: '🔓', attrs: { 'aria-hidden': 'true' } }),
                el('p', { text: 'تصفّح كل الغرف والمهمات بحرية. سجّل دخولك لحفظ تقدمك وجمع النقاط ومتابعته لاحقًا.' }),
                link
            ]));
            return;
        }

        // مسجّل لكن فشل جلب إنجازاته
        if (!RoomsListApp.progressOk) {
            const retry = el('button', { className: 'rm-btn rm-btn-ghost', text: 'إعادة المحاولة', attrs: { type: 'button' } });
            retry.addEventListener('click', function () {
                PlatformAuth.getSession().then(function (r) { RoomsListApp.refreshProgress(r.session); });
            });

            box.appendChild(el('div', { className: 'rm-guest', attrs: { role: 'alert' } }, [
                el('span', { className: 'rm-guest-icon', text: '⚠️', attrs: { 'aria-hidden': 'true' } }),
                el('p', { text: 'تعذّر تحميل تقدمك الآن. الغرف متاحة للتصفح كالمعتاد.' }),
                retry
            ]));
            return;
        }

        const o = RoomsProgress.overall(RoomsListApp.rooms);

        const tile = function (value, label, extra) {
            return el('li', { className: 'rm-tile' }, [
                el('strong', { text: value }),
                el('span', { text: label }),
                extra
            ]);
        };

        const stats = el('ul', { className: 'rm-tiles' }, [
            tile(RoomsUtils.num(o.points), 'نقطة مكتسبة', el('small', { text: 'من ' + RoomsUtils.num(o.totalPoints) })),
            tile(RoomsUtils.num(o.done), 'مهمة مكتملة'),
            tile(RoomsUtils.num(o.remaining), 'مهمة متبقية'),
            tile(RoomsUtils.num(o.percent) + '٪', 'نسبة الإنجاز', RoomsUtils.progressBar(o.percent, 'نسبة الإنجاز الإجمالية'))
        ]);

        const recentList = el('ul', { className: 'rm-recent-list' });

        box.appendChild(el('div', { className: 'rm-dash' }, [
            el('h2', { className: 'rm-dash-title', text: 'تقدمك في استكشاف الكلية' }),
            stats,
            el('div', { className: 'rm-recent' }, [
                el('h3', { text: 'آخر المهمات التي أكملتها' }),
                recentList
            ])
        ]));

        RoomsListApp.renderRecent(recentList);
    },

    async renderRecent(list) {
        const el = RoomsUtils.el;
        const ids = RoomsProgress.recentIds(ROOMS_CONFIG.recentLimit);

        if (!ids.length) {
            list.appendChild(el('li', { className: 'rm-muted', text: 'لم تكمل أي مهمة بعد. ابدأ بأي غرفة من الأسفل!' }));
            return;
        }

        const missing = ids.filter(function (id) { return !RoomsListApp.recentCache.has(id); });

        if (missing.length) {
            list.appendChild(el('li', { className: 'rm-muted', text: 'جارٍ التحميل…', attrs: { role: 'status' } }));

            const res = await RoomsApi.getTaskTitles(missing);
            if (res.error) {
                RoomsUtils.clear(list);
                list.appendChild(el('li', { className: 'rm-muted', text: 'تعذّر تحميل آخر المهمات.' }));
                return;
            }

            (res.data || []).forEach(function (row) {
                const room = row.rooms || {};
                RoomsListApp.recentCache.set(String(row.id), {
                    title: RoomsUtils.cleanText(row.title),
                    roomTitle: RoomsUtils.cleanText(room.title),
                    roomSlug: RoomsUtils.cleanText(room.slug)
                });
            });
        }

        // قد يكون المستخدم تبدّل أثناء الانتظار: لا نرسم في عنصر خرج من الصفحة
        if (!document.contains(list)) return;
        RoomsUtils.clear(list);

        ids.forEach(function (id) {
            const info = RoomsListApp.recentCache.get(id);
            const done = RoomsProgress.completions.get(id);
            if (!info || !done) return;

            const titleNode = RoomsUtils.isValidSlug(info.roomSlug)
                ? el('a', {
                    text: info.title,
                    attrs: { href: ROOMS_CONFIG.roomPage + '?room=' + encodeURIComponent(info.roomSlug) }
                })
                : el('span', { text: info.title });

            list.appendChild(el('li', {}, [
                el('span', { className: 'rm-recent-check', text: '✓', attrs: { 'aria-hidden': 'true' } }),
                el('span', { className: 'rm-recent-main' }, [
                    titleNode,
                    el('small', { text: [info.roomTitle, RoomsUtils.formatDate(done.completedAt)].filter(Boolean).join(' · ') })
                ]),
                el('span', { className: 'rm-chip rm-chip-points', text: '+' + RoomsUtils.num(done.points) })
            ]));
        });
    },

    // ---------- بطاقات الغرف ----------

    renderGrid() {
        const el = RoomsUtils.el;
        const grid = RoomsListApp.els.grid;
        const signedIn = RoomsProgress.isSignedIn() && RoomsListApp.progressOk;

        grid.setAttribute('aria-busy', 'false');
        RoomsUtils.clear(grid);

        if (RoomsListApp.els.count) {
            RoomsListApp.els.count.textContent = RoomsListApp.rooms.length ? RoomsUtils.num(RoomsListApp.rooms.length) : '';
        }

        if (!RoomsListApp.rooms.length) {
            RoomsListApp.renderEmpty();
            return;
        }

        RoomsListApp.rooms.forEach(function (room, index) {
            const p = RoomsProgress.forRoom(room);
            const totalPoints = room.tasks.reduce(function (sum, t) { return sum + t.points; }, 0);

            const meta = el('span', { className: 'rm-card-meta' }, [
                el('span', { className: 'rm-chip', text: '📋 ' + RoomsUtils.taskCount(room.tasks.length) }),
                room.difficulty
                    ? el('span', { className: 'rm-chip rm-level rm-level-' + room.difficulty, text: ROOMS_CONFIG.difficultyLabels[room.difficulty] })
                    : null,
                totalPoints > 0
                    ? el('span', { className: 'rm-chip rm-chip-points', text: '⭐ ' + RoomsUtils.num(totalPoints) + ' نقطة' })
                    : null
            ]);

            const body = el('span', { className: 'rm-card-body' }, [
                el('h3', { className: 'rm-card-title', text: room.title }),
                room.description ? el('p', { className: 'rm-card-desc', text: room.description }) : null,
                meta
            ]);

            if (signedIn && p.total > 0) {
                const state = p.done === 0 ? 'لم تبدأ' : (p.done === p.total ? 'مكتملة ✓' : 'قيد التقدم');
                const cls = p.done === 0 ? '' : (p.done === p.total ? ' is-done' : ' is-progress');

                body.appendChild(el('span', { className: 'rm-card-prog' }, [
                    el('span', { className: 'rm-card-prog-row' }, [
                        el('span', { className: 'rm-state-badge' + cls, text: state }),
                        el('span', { text: 'أنجزت ' + RoomsUtils.num(p.done) + ' من ' + RoomsUtils.num(p.total) + ' · ' + RoomsUtils.num(p.percent) + '٪' })
                    ]),
                    RoomsUtils.progressBar(p.percent, 'تقدمك في غرفة ' + room.title)
                ]));
            }

            const side = el('span', {
    className: 'rm-card-side',
    attrs: { 'aria-hidden': 'true' }
}, [
    el('span', {
        className: 'rm-card-num',
        text: RoomsUtils.num(index + 1).padStart(2, '٠')
    }),
    el('span', {
        className: 'rm-card-icon',
        text: room.icon
    })
]);

grid.appendChild(el('a', {
    className: 'rm-card',
    attrs: {
        href: ROOMS_CONFIG.roomPage + '?room=' + encodeURIComponent(room.slug)
    }
}, [
    side,
    body,
    el('span', {
        className: 'rm-task-chevron',
        attrs: { 'aria-hidden': 'true' }
    }, [
        el('span', { className: 'rm-task-play-icon' })
    ])
]));
        });
    }
};

document.addEventListener('DOMContentLoaded', RoomsListApp.init);
