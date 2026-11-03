// =========================================
// دليل أعضاء هيئة التدريس — نافذة التفاصيل
// إمكانية الوصول: role=dialog، إغلاق بـ Escape وبزر وبالنقر على الخلفية،
// حصر التنقل بلوحة المفاتيح داخل النافذة، وإرجاع التركيز لزر الفتح.
// =========================================

const FacultyModal = {

    modal: null,
    panel: null,
    body: null,
    toast: null,
    activeMember: null,
    lastFocused: null,
    toastTimer: null,
    closeTimer: null,

    init() {
        FacultyModal.modal = document.getElementById('facultyModal');
        FacultyModal.panel = FacultyModal.modal.querySelector('.faculty-modal__panel');
        FacultyModal.body = document.getElementById('facultyModalBody');
        FacultyModal.toast = document.getElementById('facultyToast');

        FacultyModal.modal.addEventListener('click', event => {
            if (event.target.closest('[data-close]')) FacultyModal.close();
        });

        document.addEventListener('keydown', FacultyModal.onKeydown);
    },

    isOpen() {
        return FacultyModal.modal && !FacultyModal.modal.hidden && FacultyModal.modal.classList.contains('is-open');
    },

    open(member, trigger) {
        clearTimeout(FacultyModal.closeTimer);

        FacultyModal.activeMember = member;
        FacultyModal.lastFocused = trigger || document.activeElement;
        FacultyModal.body.replaceChildren(FacultyModal.buildContent(member));
        FacultyModal.body.scrollTop = 0;

        FacultyModal.modal.hidden = false;
        FacultyModal.modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('faculty-modal-open');

        // إطار واحد حتى يعمل الانتقال البصري
        requestAnimationFrame(() => {
            FacultyModal.modal.classList.add('is-open');
            const closeBtn = FacultyModal.modal.querySelector('.faculty-modal__close');
            if (closeBtn) closeBtn.focus();
        });
    },

    close() {
        if (!FacultyModal.modal || FacultyModal.modal.hidden) return;

        FacultyModal.modal.classList.remove('is-open');
        FacultyModal.modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('faculty-modal-open');

        FacultyModal.closeTimer = setTimeout(() => {
            FacultyModal.modal.hidden = true;
            FacultyModal.body.replaceChildren();
            FacultyModal.activeMember = null;
        }, 180);

        const target = FacultyModal.lastFocused;
        if (target && typeof target.focus === 'function' && document.contains(target)) target.focus();
        FacultyModal.lastFocused = null;
    },

    onKeydown(event) {
        if (!FacultyModal.isOpen()) return;

        if (event.key === 'Escape') {
            event.preventDefault();
            FacultyModal.close();
            return;
        }

        // حصر Tab داخل النافذة
        if (event.key === 'Tab') {
            const focusable = [...FacultyModal.panel.querySelectorAll('a[href], button:not([disabled])')];
            if (!focusable.length) return;

            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }
    },

    // ---------- بناء المحتوى (حقول اختيارية: لا تُعرض إن كانت فارغة) ----------
    buildContent(member) {
        const { el } = FacultyUtils;

        const header = el('div', { className: 'faculty-modal__header' }, [
            FacultyUtils.avatar(member.image, member.name),
            el('div', { className: 'faculty-modal__identity' }, [
                el('div', { className: 'faculty-card__badges' }, [
                    FacultyRender.badge(member),
                    member.isDemo ? el('span', { className: 'faculty-badge faculty-badge--demo', text: 'تجريبي' }) : null
                ]),
                el('h2', { text: member.name, attrs: { id: 'facultyModalName' } }),
                member.department ? el('p', { className: 'faculty-modal__department', text: member.department }) : null
            ])
        ]);

        const sections = [header];

        if (member.isDemo) {
            sections.push(el('p', {
                className: 'faculty-notice faculty-notice--inline',
                text: 'سجل تجريبي لاختبار التصميم فقط، وليس لعضو هيئة تدريس حقيقي.'
            }));
        }

        if (member.specialization) sections.push(FacultyModal.block('التخصص', member.specialization));
        if (member.bio) sections.push(FacultyModal.block('نبذة تعريفية', member.bio));

        const links = FacultyModal.buildLinks(member);
        if (links) sections.push(links);

        sections.push(FacultyModal.buildFooter(member));

        return el('div', { className: 'faculty-modal__content' }, sections);
    },

    block(title, text) {
        return FacultyUtils.el('section', { className: 'faculty-info-block' }, [
            FacultyUtils.el('h3', { text: title }),
            FacultyUtils.el('p', { text })
        ]);
    },

    buildLinks(member) {
        const { el } = FacultyUtils;
        const items = [];

        const academicUrl = FacultyUtils.httpUrl(member.url);
        if (academicUrl) {
            items.push(el('li', {}, [
                el('a', {
                    className: 'faculty-link',
                    text: 'الصفحة الأكاديمية / الملف البحثي',
                    attrs: { href: academicUrl, target: '_blank', rel: 'noopener noreferrer' }
                })
            ]));
        }

        const mailto = FacultyUtils.mailtoUrl(member.email);
        if (mailto) {
            items.push(el('li', {}, [
                el('a', {
                    className: 'faculty-link',
                    attrs: { href: mailto }
                }, [
                    el('span', { text: 'البريد الإلكتروني: ' }),
                    el('bdi', { text: member.email, attrs: { dir: 'ltr' } })
                ])
            ]));
        }

        if (!items.length) return null;

        return el('section', { className: 'faculty-info-block' }, [
            el('h3', { text: 'التواصل والروابط' }),
            el('ul', { className: 'faculty-links' }, items)
        ]);
    },

    buildFooter(member) {
        const button = FacultyUtils.el('button', {
            className: 'faculty-btn',
            text: 'نسخ الاسم واللقب',
            attrs: { type: 'button' }
        });

        button.addEventListener('click', () => FacultyModal.copyName(member));

        return FacultyUtils.el('div', { className: 'faculty-modal__footer' }, [button]);
    },

    // ---------- نسخ الاسم ----------
    copyName(member) {
        const text = [member.name, member.title].filter(Boolean).join(' - ') +
            ' بكلية الهندسة الزراعية جامعة الأزهر';

        const done = () => FacultyModal.showToast('تم نسخ الاسم واللقب');
        const fail = () => FacultyModal.showToast('تعذر النسخ التلقائي');

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(done).catch(() => {
                FacultyModal.fallbackCopy(text) ? done() : fail();
            });
        } else {
            FacultyModal.fallbackCopy(text) ? done() : fail();
        }
    },

    fallbackCopy(text) {
        const area = FacultyUtils.el('textarea', {
            attrs: { readonly: true, 'aria-hidden': 'true', tabindex: '-1' }
        });
        area.value = text;
        area.className = 'faculty-sr-only';
        document.body.appendChild(area);
        area.select();

        let ok = false;
        try { ok = document.execCommand('copy'); } catch (error) { ok = false; }

        area.remove();
        return ok;
    },

    showToast(message) {
        const toast = FacultyModal.toast;
        if (!toast) return;

        toast.textContent = message;
        toast.classList.add('is-visible');

        clearTimeout(FacultyModal.toastTimer);
        FacultyModal.toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2600);
    }
};
