// =========================================
// معرض مشاريع التخرج — صفحة تفاصيل مشروع (project.html?slug=...)
// الحقول الاختيارية لا تظهر إن لم تتوفر بياناتها. المسودات لا تُعرض (RLS + شرط is_published).
// =========================================

const GradProject = {

    project: null,
    lightbox: null,

    async init() {
        const root = document.getElementById('gradProject');
        const slug = new URLSearchParams(location.search).get('slug') || '';

        if (!GRAD_CONFIG.slugPattern.test(slug)) {
            GradProject.status(root, 'missing', 'رابط المشروع غير صحيح.');
            return;
        }

        GradProject.status(root, 'loading', 'جارٍ تحميل المشروع…');

        const res = await GradApi.getBySlug(slug);

        if (res.error) {
            console.error('[graduation]', res.error);
            GradProject.status(root, 'error', GradUtils.describeError(res.error), function () { GradProject.init(); });
            return;
        }
        if (!res.data) {
            GradProject.status(root, 'missing', 'لم نعثر على هذا المشروع. قد يكون غير منشور أو تم حذفه.');
            return;
        }

        GradProject.project = res.data;
        GradProject.render(root, res.data);
    },

    status(root, kind, message, retry) {
        const el = GradUtils.el;
        GradUtils.clear(root);

        const node = el('div', {
            className: 'gp-status gp-status--' + kind,
            attrs: { role: kind === 'error' || kind === 'missing' ? 'alert' : 'status' }
        }, [
            kind === 'loading' ? el('span', { className: 'gp-spinner', attrs: { 'aria-hidden': 'true' } }) : null,
            el('p', { text: message })
        ]);

        if (retry) {
            const b = el('button', { className: 'gp-btn', text: 'إعادة المحاولة', attrs: { type: 'button' } });
            b.addEventListener('click', retry);
            node.appendChild(b);
        }
        if (kind === 'missing' || kind === 'error') {
            node.appendChild(el('a', { className: 'gp-btn', text: 'العودة إلى المعرض', attrs: { href: GRAD_CONFIG.listPage } }));
        }
        root.appendChild(node);
    },

    // عنوان الصفحة والوصف لمشاركة الرابط
    setMeta(p) {
        document.title = p.title + ' | معرض مشاريع التخرج';
        const meta = document.querySelector('meta[name="description"]');
        if (meta) meta.setAttribute('content', p.summary || ('مشروع تخرج: ' + p.title));
    },

    section(title, content) {
        const el = GradUtils.el;
        return el('section', { className: 'gp-section' }, [el('h2', { text: title }), content]);
    },

    paragraphs(text) {
        const el = GradUtils.el;
        const box = el('div', { className: 'gp-prose' });
        text.split(/\n{1,}/).map(GradUtils.cleanText).filter(Boolean).forEach(function (line) {
            box.appendChild(el('p', { text: line }));
        });
        return box;
    },

    list(items, ordered) {
        const el = GradUtils.el;
        return el(ordered ? 'ol' : 'ul', { className: 'gp-list' },
            items.map(function (t) { return el('li', { text: t }); }));
    },

    render(root, p) {
        const el = GradUtils.el;
        GradProject.setMeta(p);
        GradUtils.clear(root);

        // ----- العنوان -----
        root.appendChild(el('nav', { className: 'gp-crumbs', attrs: { 'aria-label': 'مسار التنقل' } }, [
            el('a', { text: 'معرض مشاريع التخرج', attrs: { href: GRAD_CONFIG.listPage } }),
            el('span', { text: '›', attrs: { 'aria-hidden': 'true' } }),
            el('span', { text: p.title, attrs: { 'aria-current': 'page' } })
        ]));

        root.appendChild(el('header', { className: 'gp-hero' }, [
            el('div', { className: 'gp-badges' }, [
                p.year ? el('span', { className: 'gp-badge gp-badge--year', text: 'دفعة ' + p.year }) : null,
                p.field ? el('span', { className: 'gp-badge', text: p.field }) : null,
                p.type ? el('span', { className: 'gp-badge', text: p.type }) : null
            ]),
            el('h1', { className: 'gp-title', text: p.title }),
            p.summary ? el('p', { className: 'gp-lead', text: p.summary }) : null
        ]));

        // ----- الغلاف -----
        if (p.cover) {
            const cover = el('div', { className: 'gp-cover' }, [GradUtils.image(p.cover, 'صورة غلاف مشروع ' + p.title, 'gp-cover__img')]);
            root.appendChild(cover);
        }

        const layout = el('div', { className: 'gp-layout' });
        const main = el('div', { className: 'gp-main' });
        const side = el('aside', { className: 'gp-side', attrs: { 'aria-label': 'بيانات المشروع' } });

        // ----- المحتوى الرئيسي -----
        if (p.description) main.appendChild(GradProject.section('نبذة عن المشروع', GradProject.paragraphs(p.description)));
        if (p.problem) main.appendChild(GradProject.section('المشكلة التي يعالجها', GradProject.paragraphs(p.problem)));
        if (p.objectives.length) main.appendChild(GradProject.section('أهداف المشروع', GradProject.list(p.objectives, true)));
        if (p.methodology) main.appendChild(GradProject.section('طريقة التنفيذ', GradProject.paragraphs(p.methodology)));
        if (p.gallery.length) main.appendChild(GradProject.section('معرض الصور', GradProject.gallery(p)));
        if (p.video) {
            const v = GradProject.video(p);
            if (v) main.appendChild(GradProject.section('فيديو توضيحي', v));
        }
        if (p.links.length) {
            main.appendChild(GradProject.section('المراجع والروابط', el('ul', { className: 'gp-list gp-links' },
                p.links.map(function (l) {
                    return el('li', {}, [el('a', { text: l.title, attrs: { href: l.url, target: '_blank', rel: 'noopener noreferrer' } })]);
                }))));
        }

        // ----- الشريط الجانبي: بيانات سريعة -----
        const facts = el('dl', { className: 'gp-facts' });
        const fact = function (label, value) {
            if (!value) return;
            facts.appendChild(el('dt', { text: label }));
            facts.appendChild(el('dd', { text: value }));
        };
        fact('القسم العلمي', p.department);
        fact('سنة التخرج', p.year ? String(p.year) : '');
        fact('المجال', p.field);
        fact('نوع المشروع', p.type);
        fact('الدكتور المشرف', p.supervisor);
        side.appendChild(el('div', { className: 'gp-panel' }, [el('h2', { text: 'بيانات المشروع' }), facts]));

        if (p.students.length) {
            side.appendChild(el('div', { className: 'gp-panel' }, [
                el('h2', { text: 'الطلاب المشاركون' }),
                GradProject.list(p.students, false)
            ]));
        }

        if (p.report) {
            side.appendChild(el('div', { className: 'gp-panel' }, [
                el('h2', { text: 'تقرير المشروع' }),
                el('a', { className: 'gp-btn gp-btn--primary', text: '📄 فتح تقرير PDF',
                    attrs: { href: p.report, target: '_blank', rel: 'noopener noreferrer' } })
            ]));
        }

        if (p.keywords.length) {
            side.appendChild(el('div', { className: 'gp-panel' }, [
                el('h2', { text: 'الكلمات المفتاحية' }),
                el('div', { className: 'gp-badges' }, p.keywords.map(function (k) { return el('span', { className: 'gp-badge', text: k }); }))
            ]));
        }

        layout.appendChild(main);
        layout.appendChild(side);
        root.appendChild(layout);

        root.appendChild(el('p', { className: 'gp-back' }, [
            el('a', { className: 'gp-btn', text: '← العودة إلى معرض المشاريع', attrs: { href: GRAD_CONFIG.listPage } })
        ]));
    },

    // ---------- الفيديو ----------
    video(p) {
        const el = GradUtils.el;
        const info = GradUtils.videoInfo(p.video);
        if (!info) return null;

        if (info.kind === 'iframe') {
            return el('div', { className: 'gp-video' }, [el('iframe', {
                attrs: {
                    src: info.src, title: 'فيديو مشروع ' + p.title, loading: 'lazy',
                    allow: 'accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen',
                    allowfullscreen: true, referrerpolicy: 'strict-origin-when-cross-origin'
                }
            })]);
        }
        if (info.kind === 'file') {
            return el('div', { className: 'gp-video' }, [el('video', {
                attrs: { src: info.src, controls: true, preload: 'metadata' }
            })]);
        }
        return el('a', { className: 'gp-btn', text: '▶ مشاهدة الفيديو',
            attrs: { href: info.href, target: '_blank', rel: 'noopener noreferrer' } });
    },

    // ---------- معرض الصور + عرض بالحجم الكامل ----------
    gallery(p) {
        const el = GradUtils.el;
        const grid = el('div', { className: 'gp-gallery' });

        p.gallery.forEach(function (url, index) {
            const btn = el('button', {
                className: 'gp-gallery__item', attrs: { type: 'button', 'aria-label': 'عرض الصورة ' + (index + 1) + ' بالحجم الكامل' }
            }, [GradUtils.image(url, 'صورة ' + (index + 1) + ' من مشروع ' + p.title, 'gp-gallery__img')]);
            btn.addEventListener('click', function () { GradProject.openLightbox(index, btn); });
            grid.appendChild(btn);
        });
        return grid;
    },

    openLightbox(index, opener) {
        const el = GradUtils.el;
        const urls = GradProject.project.gallery;
        let current = index;

        const img = el('img', { className: 'gp-lightbox__img', attrs: { alt: '' } });
        const counter = el('span', { className: 'gp-lightbox__counter', attrs: { 'aria-live': 'polite' } });
        const full = el('a', { className: 'gp-lightbox__open', text: 'فتح الأصل ↗', attrs: { target: '_blank', rel: 'noopener noreferrer' } });

        const mkBtn = function (cls, label, text) {
            return el('button', { className: 'gp-lightbox__btn ' + cls, text: text, attrs: { type: 'button', 'aria-label': label } });
        };
        const closeBtn = mkBtn('gp-lightbox__close', 'إغلاق', '×');
        const prevBtn = mkBtn('gp-lightbox__prev', 'الصورة السابقة', '›');   // في RTL السابق على اليمين
        const nextBtn = mkBtn('gp-lightbox__next', 'الصورة التالية', '‹');

        const box = el('div', { className: 'gp-lightbox', attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'عرض الصورة بالحجم الكامل' } },
            [closeBtn, prevBtn, nextBtn, img, el('div', { className: 'gp-lightbox__bar' }, [counter, full])]);

        const show = function (i) {
            current = (i + urls.length) % urls.length;
            img.src = urls[current];
            img.alt = 'صورة ' + (current + 1) + ' من مشروع ' + GradProject.project.title;
            full.href = urls[current];
            counter.textContent = GradUtils.num(current + 1) + ' / ' + GradUtils.num(urls.length);
            const single = urls.length < 2;
            prevBtn.hidden = single; nextBtn.hidden = single;
        };

        const close = function () {
            document.removeEventListener('keydown', onKey);
            document.body.classList.remove('gp-no-scroll');
            box.remove();
            if (opener && opener.focus) opener.focus();
        };

        const onKey = function (e) {
            if (e.key === 'Escape') close();
            else if (e.key === 'ArrowLeft') show(current + 1);    // RTL: السهم الأيسر = التالي
            else if (e.key === 'ArrowRight') show(current - 1);
            else if (e.key === 'Tab') { e.preventDefault(); closeBtn.focus(); }
        };

        closeBtn.addEventListener('click', close);
        prevBtn.addEventListener('click', function () { show(current - 1); });
        nextBtn.addEventListener('click', function () { show(current + 1); });
        box.addEventListener('click', function (e) { if (e.target === box) close(); });
        document.addEventListener('keydown', onKey);

        document.body.classList.add('gp-no-scroll');
        document.body.appendChild(box);
        show(index);
        closeBtn.focus();
    }
};

document.addEventListener('DOMContentLoaded', GradProject.init);
