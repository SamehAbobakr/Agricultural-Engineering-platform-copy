// =========================================
// نظام الغرف — عارض الصور بحجم أكبر (Lightbox)
// نافذة واحدة تُنشأ عند أول استخدام. إغلاق بـ Esc أو الخلفية أو الزر،
// وتنقّل بالأسهم بين صور نفس المهمة، وإعادة التركيز للعنصر الذي فتحها.
// =========================================

const RoomsViewer = {

    root: null,
    img: null,
    caption: null,
    counter: null,
    prevBtn: null,
    nextBtn: null,
    group: [],
    index: 0,
    opener: null,

    build() {
        if (RoomsViewer.root) return;
        const el = RoomsUtils.el;

        RoomsViewer.img = el('img', { className: 'rm-viewer-img', attrs: { alt: '', decoding: 'async' } });
        RoomsViewer.caption = el('p', { className: 'rm-viewer-caption' });
        RoomsViewer.counter = el('span', { className: 'rm-viewer-counter', attrs: { 'aria-live': 'polite' } });

        const closeBtn = el('button', {
            className: 'rm-viewer-btn rm-viewer-close',
            text: '×',
            attrs: { type: 'button', 'aria-label': 'إغلاق الصورة' }
        });
        RoomsViewer.prevBtn = el('button', {
            className: 'rm-viewer-btn rm-viewer-prev',
            text: '›',
            attrs: { type: 'button', 'aria-label': 'الصورة السابقة' }
        });
        RoomsViewer.nextBtn = el('button', {
            className: 'rm-viewer-btn rm-viewer-next',
            text: '‹',
            attrs: { type: 'button', 'aria-label': 'الصورة التالية' }
        });

        const figure = el('figure', { className: 'rm-viewer-figure' }, [RoomsViewer.img, RoomsViewer.caption]);

        RoomsViewer.root = el('div', {
            className: 'rm-viewer',
            attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'عرض الصورة', hidden: true }
        }, [closeBtn, RoomsViewer.prevBtn, figure, RoomsViewer.nextBtn, RoomsViewer.counter]);

        document.body.appendChild(RoomsViewer.root);

        closeBtn.addEventListener('click', RoomsViewer.close);
        RoomsViewer.prevBtn.addEventListener('click', function () { RoomsViewer.step(-1); });
        RoomsViewer.nextBtn.addEventListener('click', function () { RoomsViewer.step(1); });

        // النقر على الخلفية (لا على الصورة) يغلق
        RoomsViewer.root.addEventListener('click', function (event) {
            if (event.target === RoomsViewer.root || event.target === figure) RoomsViewer.close();
        });

        document.addEventListener('keydown', function (event) {
            if (RoomsViewer.root.hidden) return;

            if (event.key === 'Escape') RoomsViewer.close();
            else if (event.key === 'ArrowLeft') RoomsViewer.step(1);    // RTL: اليسار = التالي
            else if (event.key === 'ArrowRight') RoomsViewer.step(-1);
            else if (event.key === 'Tab') RoomsViewer.trapFocus(event);
        });
    },

    // group: [{ url, alt, caption }]
    open(group, index, opener) {
        RoomsViewer.build();
        RoomsViewer.group = group;
        RoomsViewer.index = index;
        RoomsViewer.opener = opener || null;

        RoomsViewer.root.hidden = false;
        document.body.classList.add('rm-viewer-open');
        RoomsViewer.show();
        RoomsViewer.root.querySelector('.rm-viewer-close').focus();
    },

    show() {
        const item = RoomsViewer.group[RoomsViewer.index];
        if (!item) return;

        RoomsViewer.img.src = item.url;
        RoomsViewer.img.alt = item.alt || '';
        RoomsViewer.caption.textContent = item.caption || '';
        RoomsViewer.caption.hidden = !item.caption;

        const many = RoomsViewer.group.length > 1;
        RoomsViewer.prevBtn.hidden = !many;
        RoomsViewer.nextBtn.hidden = !many;
        RoomsViewer.counter.hidden = !many;
        RoomsViewer.counter.textContent = RoomsUtils.num(RoomsViewer.index + 1) + ' / ' + RoomsUtils.num(RoomsViewer.group.length);
    },

    step(delta) {
        const n = RoomsViewer.group.length;
        if (n < 2) return;
        RoomsViewer.index = (RoomsViewer.index + delta + n) % n;
        RoomsViewer.show();
    },

    close() {
        if (!RoomsViewer.root || RoomsViewer.root.hidden) return;

        RoomsViewer.root.hidden = true;
        RoomsViewer.img.removeAttribute('src');
        document.body.classList.remove('rm-viewer-open');

        if (RoomsViewer.opener && document.contains(RoomsViewer.opener)) RoomsViewer.opener.focus();
        RoomsViewer.opener = null;
    },

    // يُبقي التركيز داخل النافذة
    trapFocus(event) {
        const items = Array.from(RoomsViewer.root.querySelectorAll('button')).filter(function (b) { return !b.hidden; });
        if (!items.length) return;

        const first = items[0];
        const last = items[items.length - 1];

        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }
};
