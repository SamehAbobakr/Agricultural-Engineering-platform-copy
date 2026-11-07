// =========================================
// معرض مشاريع التخرج — صفحة الأرشيف (graduation.html)
// بحث + فلاتر + ترتيب تعمل فعليًا على البيانات المنشورة، والإحصائيات تُحسب منها.
// =========================================

const GradApp = {

    projects: [],
    state: { q: '', dept: '', year: '', field: '', type: '', sort: 'newest' },
    els: {},
    searchTimer: null,

    async init() {
        const $ = function (id) { return document.getElementById(id); };
        GradApp.els = {
            stats: $('gradStats'), controls: $('gradControls'), search: $('gradSearch'),
            dept: $('gradDept'), year: $('gradYear'), field: $('gradField'), type: $('gradType'),
            sort: $('gradSort'), reset: $('gradReset'), count: $('gradCount'),
            status: $('gradStatus'), grid: $('gradGrid')
        };

        GradApp.bind();
        await GradApp.load();
    },

    async load() {
        GradApp.showStatus('loading', 'جارٍ تحميل المشاريع…');
        GradUtils.clear(GradApp.els.grid);
        GradApp.els.controls.hidden = true;

        const res = await GradApi.listPublished();

        if (res.error) {
            console.error('[graduation]', res.error);
            GradApp.showStatus('error', GradUtils.describeError(res.error), true);
            return;
        }

        GradApp.projects = res.data;
        GradApp.renderStats();

        if (!GradApp.projects.length) {
            GradApp.showStatus('empty', 'لم تُنشر مشاريع تخرج بعد. ترقّب إضافة المشاريع قريبًا.');
            return;
        }

        GradApp.fillFilters();
        GradApp.els.controls.hidden = false;
        GradApp.render();
    },

    // ---------- الإحصائيات الحقيقية من البيانات المنشورة ----------
    renderStats() {
        const el = GradUtils.el;
        const box = GradApp.els.stats;
        GradUtils.clear(box);

        const years = new Set(), depts = new Set();
        GradApp.projects.forEach(function (p) {
            if (p.year) years.add(p.year);
            if (p.department) depts.add(p.department);
        });

        [
            [GradApp.projects.length, 'مشروع'],
            [years.size, 'دفعة'],
            [depts.size, 'قسم مشارك']
        ].forEach(function (item) {
            box.appendChild(el('li', { className: 'gp-stat' }, [
                el('strong', { text: GradUtils.num(item[0]) }),
                el('span', { text: item[1] })
            ]));
        });
    },

    // ---------- خيارات الفلاتر من البيانات نفسها ----------
    fillFilters() {
        const uniq = function (key, numeric) {
            const set = new Set();
            GradApp.projects.forEach(function (p) { if (p[key]) set.add(p[key]); });
            const arr = Array.from(set);
            return numeric ? arr.sort(function (a, b) { return b - a; })
                           : arr.sort(function (a, b) { return String(a).localeCompare(String(b), 'ar'); });
        };

        const fill = function (select, values) {
            const first = select.firstElementChild;
            GradUtils.clear(select);
            select.appendChild(first);
            values.forEach(function (v) {
                select.appendChild(GradUtils.el('option', { text: String(v), attrs: { value: String(v) } }));
            });
        };

        fill(GradApp.els.dept, uniq('department'));
        fill(GradApp.els.year, uniq('year', true));
        fill(GradApp.els.field, uniq('field'));
        fill(GradApp.els.type, uniq('type'));
    },

    bind() {
        const e = GradApp.els;

        e.search.addEventListener('input', function () {
            clearTimeout(GradApp.searchTimer);
            GradApp.searchTimer = setTimeout(function () {
                GradApp.state.q = e.search.value;
                GradApp.render();
            }, 200);
        });

        [['dept', e.dept], ['year', e.year], ['field', e.field], ['type', e.type], ['sort', e.sort]]
            .forEach(function (pair) {
                pair[1].addEventListener('change', function () {
                    GradApp.state[pair[0]] = pair[1].value;
                    GradApp.render();
                });
            });

        e.reset.addEventListener('click', function () {
            GradApp.state = { q: '', dept: '', year: '', field: '', type: '', sort: 'newest' };
            e.search.value = '';
            [e.dept, e.year, e.field, e.type].forEach(function (s) { s.value = ''; });
            e.sort.value = 'newest';
            GradApp.render();
        });
    },

    // ---------- التصفية والبحث والترتيب ----------
    filtered() {
        const s = GradApp.state;
        const q = GradUtils.searchKey(s.q);

        const list = GradApp.projects.filter(function (p) {
            if (s.dept && p.department !== s.dept) return false;
            if (s.year && String(p.year) !== s.year) return false;
            if (s.field && p.field !== s.field) return false;
            if (s.type && p.type !== s.type) return false;

            if (q) {
                // البحث بالاسم والوصف والكلمات المفتاحية؛ كل كلمة في الاستعلام يجب أن توجد
                const hay = GradUtils.searchKey(
                    p.title + ' ' + p.summary + ' ' + p.keywords.join(' ')
                );
                if (!q.split(' ').every(function (w) { return hay.indexOf(w) !== -1; })) return false;
            }
            return true;
        });

        const byTitle = function (a, b) { return a.title.localeCompare(b.title, 'ar'); };

        if (s.sort === 'oldest') {
            list.sort(function (a, b) { return (a.year - b.year) || (a.stamp - b.stamp) || byTitle(a, b); });
        } else if (s.sort === 'name') {
            list.sort(byTitle);
        } else {
            list.sort(function (a, b) { return (b.year - a.year) || (b.stamp - a.stamp) || byTitle(a, b); });
        }

        return list;
    },

    render() {
        const list = GradApp.filtered();
        const grid = GradApp.els.grid;

        GradUtils.clear(grid);
        GradApp.els.count.textContent = GradUtils.num(list.length);

        if (!list.length) {
            GradApp.showStatus('empty', 'لا توجد مشاريع مطابقة للبحث أو الفلاتر الحالية.');
            return;
        }

        GradApp.hideStatus();
        const frag = document.createDocumentFragment();
        list.forEach(function (p) { frag.appendChild(GradApp.card(p)); });
        grid.appendChild(frag);
    },

    // ---------- بطاقة المشروع ----------
    card(p) {
        const el = GradUtils.el;
        const href = GradUtils.projectHref(p.slug);

        const media = el('div', { className: 'gp-card__media' });
        if (p.cover) {
            media.appendChild(GradUtils.image(p.cover, 'صورة غلاف مشروع ' + p.title, 'gp-card__img'));
        }
        media.appendChild(el('span', { className: 'gp-card__placeholder', text: '🎓', attrs: { 'aria-hidden': 'true' } }));

        const badges = el('div', { className: 'gp-badges' }, [
            p.year ? el('span', { className: 'gp-badge gp-badge--year', text: String(p.year) }) : null,
            p.field ? el('span', { className: 'gp-badge', text: p.field }) : null
        ]);

        return el('article', { className: 'card gp-card' }, [
            media,
            el('div', { className: 'gp-card__body' }, [
                badges,
                el('h3', {}, [el('a', { className: 'gp-card__title-link', text: p.title, attrs: { href: href } })]),
                p.department ? el('p', { className: 'gp-card__dept', text: p.department }) : null,
                p.summary ? el('p', { className: 'card-info gp-card__summary', text: p.summary }) : null
            ]),
            el('div', { className: 'card-footer' }, [
                p.type ? el('span', { text: p.type }) : el('span'),
                el('a', { className: 'gp-card__more', text: 'عرض التفاصيل ←', attrs: { href: href } })
            ])
        ]);
    },

    // ---------- حالات الصفحة ----------
    showStatus(kind, message, withRetry) {
        const el = GradUtils.el;
        const box = GradApp.els.status;
        GradUtils.clear(box);

        const node = el('div', {
            className: 'gp-status gp-status--' + kind,
            attrs: { role: kind === 'error' ? 'alert' : 'status' }
        }, [
            kind === 'loading' ? el('span', { className: 'gp-spinner', attrs: { 'aria-hidden': 'true' } }) : null,
            el('p', { text: message })
        ]);

        if (withRetry) {
            const btn = el('button', { className: 'gp-btn', text: 'إعادة المحاولة', attrs: { type: 'button' } });
            btn.addEventListener('click', GradApp.load);
            node.appendChild(btn);
        }
        box.appendChild(node);
    },

    hideStatus() {
        GradUtils.clear(GradApp.els.status);
    }
};

document.addEventListener('DOMContentLoaded', GradApp.init);
