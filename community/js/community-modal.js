// =========================================
// مجتمع الطلاب والخريجين — نافذة التفاصيل
// إمكانية الوصول: role=dialog، إغلاق بـ Escape وبزر وبالنقر على الخلفية،
// حصر التنقل بلوحة المفاتيح داخل النافذة، وإرجاع التركيز لزر الفتح.
// =========================================

const CommunityModal = {

    modal: null,
    panel: null,
    body: null,
    lastFocused: null,
    closeTimer: null,
    viewer: null,
    viewerImage: null,
    viewerTrigger: null,

    init() {
        CommunityModal.modal = document.getElementById('communityModal');
        CommunityModal.panel = CommunityModal.modal.querySelector('.community-modal__panel');
        CommunityModal.body = document.getElementById('communityModalBody');
        // إنشاء عارض الصور
CommunityModal.viewer = document.createElement('div');
CommunityModal.viewer.className = 'community-image-viewer';
CommunityModal.viewer.hidden = true;

const viewerClose = document.createElement('button');
viewerClose.className = 'community-image-viewer__close';
viewerClose.type = 'button';
viewerClose.setAttribute('aria-label', 'إغلاق الصورة');
viewerClose.textContent = '×';

CommunityModal.viewerImage = document.createElement('img');
CommunityModal.viewerImage.alt = '';

CommunityModal.viewer.append(viewerClose, CommunityModal.viewerImage);
CommunityModal.modal.appendChild(CommunityModal.viewer);

viewerClose.addEventListener('click', CommunityModal.closeImage);
CommunityModal.viewer.addEventListener('click', event => {
    if (event.target === CommunityModal.viewer ||
        event.target === CommunityModal.viewerImage) {
        CommunityModal.closeImage();
    }
});

// الضغط على صورة التفاصيل فقط
CommunityModal.body.addEventListener('click', event => {
    const img = event.target.closest(
        '.community-modal__header .community-avatar img'
    );

    if (img) CommunityModal.openImage(img);
});
        CommunityModal.modal.addEventListener('click', event => {
            if (event.target.closest('[data-close]')) CommunityModal.close();
        });

        document.addEventListener('keydown', CommunityModal.onKeydown);
    },

    isOpen() {
        return CommunityModal.modal && !CommunityModal.modal.hidden && CommunityModal.modal.classList.contains('is-open');
    },

    open(member, trigger) {
        clearTimeout(CommunityModal.closeTimer);

        CommunityModal.lastFocused = trigger || document.activeElement;
        CommunityModal.body.replaceChildren(CommunityModal.buildContent(member));
        CommunityModal.body.scrollTop = 0;

        CommunityModal.modal.hidden = false;
        CommunityModal.modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('community-modal-open');

        // إطار واحد حتى يعمل الانتقال البصري
        requestAnimationFrame(() => {
            CommunityModal.modal.classList.add('is-open');
            const closeBtn = CommunityModal.modal.querySelector('.community-modal__close');
            if (closeBtn) closeBtn.focus();
        });
    },

    close() {
        if (!CommunityModal.modal || CommunityModal.modal.hidden) return;

        CommunityModal.modal.classList.remove('is-open');
        CommunityModal.modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('community-modal-open');

        CommunityModal.closeTimer = setTimeout(() => {
            CommunityModal.modal.hidden = true;
            CommunityModal.body.replaceChildren();
        }, 180);

        const target = CommunityModal.lastFocused;
        if (target && typeof target.focus === 'function' && document.contains(target)) target.focus();
        CommunityModal.lastFocused = null;
    },
    openImage(img) {
    if (!img || !img.src) return;

    CommunityModal.viewerImage.src = img.src;
    CommunityModal.viewerImage.alt = img.alt || '';
    CommunityModal.viewer.hidden = false;

    CommunityModal.viewerTrigger = img;

    const closeBtn = CommunityModal.viewer.querySelector(
        '.community-image-viewer__close'
    );

    closeBtn.focus();
},

closeImage() {
    if (!CommunityModal.viewer || CommunityModal.viewer.hidden) return;

    CommunityModal.viewer.hidden = true;
    CommunityModal.viewerImage.removeAttribute('src');
    CommunityModal.viewerImage.alt = '';

    if (
        CommunityModal.viewerTrigger &&
        document.contains(CommunityModal.viewerTrigger)
    ) {
        CommunityModal.viewerTrigger.focus();
    }

    CommunityModal.viewerTrigger = null;
},

        onKeydown(event) {
            if (!CommunityModal.isOpen()) return;

            // لو الصورة مفتوحة، Escape يقفل الصورة فقط
            if (!CommunityModal.viewer.hidden) {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    event.stopPropagation();
                    CommunityModal.closeImage();
                    return;
                }

                // حصر التنقل داخل عارض الصورة
                if (event.key === 'Tab') {
                    event.preventDefault();
                    CommunityModal.viewer.querySelector(
                        '.community-image-viewer__close'
                    ).focus();
                    return;
                }

                return;
            }

    if (event.key === 'Escape') {
        event.preventDefault();
        CommunityModal.close();
        return;
    }

        // حصر Tab داخل النافذة
        if (event.key === 'Tab') {
            const focusable = [...CommunityModal.panel.querySelectorAll('a[href], button:not([disabled])')];
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
        const { el } = CommunityUtils;
        const stage = CommunityRender.stageLabel(member);

        const header = el('div', { className: 'community-modal__header' }, [
            CommunityUtils.avatar(member.image, member.name),
            el('div', { className: 'community-modal__identity' }, [
                el('div', { className: 'community-card__badges' }, [CommunityRender.badge(member)]),
                el('h2', { text: member.name, attrs: { id: 'communityModalName' } }),
                member.department ? el('p', { className: 'community-modal__department', text: member.department }) : null,
                stage ? el('p', { className: 'community-modal__stage', text: stage }) : null
            ])
        ]);

        const sections = [header];

        if (member.bio) sections.push(CommunityModal.block('نبذة تعريفية', member.bio));

        if (member.skills.length) {
            sections.push(el('section', { className: 'community-info-block' }, [
                el('h3', { text: 'المهارات ومجالات المساعدة' }),
                el('div', { className: 'community-skills' }, CommunityRender.skillChips(member.skills))
            ]));
        }

        const links = CommunityModal.buildLinks(member);
        if (links) sections.push(links);

        return el('div', { className: 'community-modal__content' }, sections);
    },

    block(title, text) {
        return CommunityUtils.el('section', { className: 'community-info-block' }, [
            CommunityUtils.el('h3', { text: title }),
            CommunityUtils.el('p', { text })
        ]);
    },

    linkItem(label, href, extra) {
        const { el } = CommunityUtils;

        return el('li', {}, [
            el('a', {
                className: 'community-link',
                attrs: { href, target: '_blank', rel: 'noopener noreferrer' }
            }, [
                el('span', { text: label }),
                extra || null
            ])
        ]);
    },

    // نعرض فقط الوسائل الموجودة والصحيحة (رابط غير صالح = لا يظهر)
    buildLinks(member) {
        const { el } = CommunityUtils;
        const items = [];

        const whatsapp = CommunityUtils.whatsappUrl(member.phone);
        if (whatsapp) {
            items.push(CommunityModal.linkItem(
                'واتساب: ',
                whatsapp,
                el('bdi', { text: member.phone, attrs: { dir: 'ltr' } })
            ));
        }

        const facebook = CommunityUtils.urlForHosts(member.facebook, ['facebook.com', 'fb.com', 'fb.me']);
        if (facebook) items.push(CommunityModal.linkItem('Facebook', facebook));

        const linkedin = CommunityUtils.urlForHosts(member.linkedin, ['linkedin.com', 'lnkd.in']);
        if (linkedin) items.push(CommunityModal.linkItem('LinkedIn', linkedin));

        const github = CommunityUtils.httpUrl(member.github);
        if (github) items.push(CommunityModal.linkItem('GitHub / موقع شخصي', github));

        if (!items.length) return null;

        return el('section', { className: 'community-info-block' }, [
            el('h3', { text: 'التواصل والروابط' }),
            el('ul', { className: 'community-links' }, items)
        ]);
    }
};
