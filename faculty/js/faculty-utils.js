// =========================================
// دليل أعضاء هيئة التدريس — دوال مساعدة
// لا تستخدم innerHTML مع أي بيانات؛ كل العناصر تُبنى بـ DOM.
// تعتمد على js/ui.js: safeUrl و normalizeText
// =========================================

const FacultyUtils = {

    // إنشاء عنصر بأمان: النص دائمًا عبر textContent
    el(tag, options = {}, children = []) {
        const node = document.createElement(tag);

        if (options.className) node.className = options.className;
        if (options.text !== undefined && options.text !== null) node.textContent = options.text;

        if (options.attrs) {
            Object.entries(options.attrs).forEach(([name, value]) => {
                if (value !== undefined && value !== null && value !== false) {
                    node.setAttribute(name, value === true ? '' : String(value));
                }
            });
        }

        children.forEach(child => {
            if (child) node.appendChild(child);
        });

        return node;
    },

    // نص منظّف (أو نص فارغ)
    cleanText(value) {
        return typeof value === 'string' ? value.trim() : '';
    },

    // توحيد النص للبحث (أ/إ/آ، ة/ه، ى/ي) — نفس دالة بحث المنصة
    searchKey(value) {
        const text = FacultyUtils.cleanText(value);
        return typeof normalizeText === 'function' ? normalizeText(text) : text.toLowerCase();
    },

    // رابط http/https فقط (نفس دالة المنصة الآمنة)
    httpUrl(value) {
        return typeof safeUrl === 'function' ? safeUrl(value) : '';
    },

    // رابط بريد mailto آمن؛ يرفض أي قيمة فيها فراغ أو ? & # وغيرها
    // حتى لا تُضاف ترويسات (cc/body) من حقل في قاعدة البيانات.
    mailtoUrl(value) {
        const email = FacultyUtils.cleanText(value);
        const pattern = /^[^\s@<>"?&#%\\,;()[\]]+@[^\s@<>"?&#%\\,;()[\]]+\.[^\s@<>"?&#%\\,;()[\]]+$/;

        return (email.length <= 254 && pattern.test(email)) ? `mailto:${email}` : '';
    },

    // أيقونة SVG بسيطة (تُبنى بـ DOM، بدون مكتبة أيقونات)
    icon(pathData, className = 'faculty-icon') {
        const ns = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(ns, 'svg');
        const path = document.createElementNS(ns, 'path');

        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');
        svg.setAttribute('stroke-linecap', 'round');
        svg.setAttribute('stroke-linejoin', 'round');
        svg.setAttribute('aria-hidden', 'true');
        svg.setAttribute('focusable', 'false');
        svg.setAttribute('class', className);
        path.setAttribute('d', pathData);
        svg.appendChild(path);

        return svg;
    },

    // صورة بديلة عند غياب الصورة الشخصية أو تعذر تحميلها
    avatarFallback() {
        return FacultyUtils.el('span', { className: 'faculty-avatar-fallback' }, [
            FacultyUtils.icon('M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'faculty-avatar-icon')
        ]);
    },

    // صورة شخصية (رابط https/http فقط) مع بديل عند الخطأ
    // صورة شخصية قابلة للتكبير عند الضغط عليها
avatar(imageUrl, altText) {
    const holder = FacultyUtils.el('span', {
        className: 'faculty-avatar'
    });

    const url = FacultyUtils.httpUrl(imageUrl);

    if (!url) {
        holder.appendChild(FacultyUtils.avatarFallback());
        return holder;
    }

    const img = FacultyUtils.el('img', {
        attrs: {
            src: url,
            alt: altText,
            loading: 'lazy',
            decoding: 'async',
            referrerpolicy: 'no-referrer'
        }
    });

    img.addEventListener('error', () => {
        img.remove();
        holder.appendChild(FacultyUtils.avatarFallback());
    }, { once: true });

    // جعل الصورة قابلة للضغط
    img.tabIndex = 0;
    img.setAttribute('role', 'button');
    img.setAttribute('aria-label', `تكبير صورة ${altText || 'عضو هيئة التدريس'}`);
    img.title = 'اضغط لتكبير الصورة';

    const openImage = () => {
        if (!img.isConnected || !img.naturalWidth) return;

        let viewer = document.querySelector('.faculty-image-viewer');

        if (!viewer) {
            viewer = FacultyUtils.el('div', {
                className: 'faculty-image-viewer',
                attrs: {
                    role: 'dialog',
                    'aria-modal': 'true',
                    'aria-label': 'عرض الصورة بالحجم الكبير'
                }
            });

            const closeButton = FacultyUtils.el('button', {
                className: 'faculty-image-viewer-close',
                attrs: {
                    type: 'button',
                    'aria-label': 'إغلاق الصورة'
                }
            }, [
                FacultyUtils.icon(
                    'M18 6 6 18 M6 6l12 12',
                    'faculty-image-viewer-close-icon'
                )
            ]);
            const largeImage = FacultyUtils.el('img', {
                className: 'faculty-image-viewer-img',
                attrs: {
                    alt: ''
                }
            });

            viewer.append(closeButton, largeImage);
            document.body.appendChild(viewer);

            const closeViewer = () => {
                viewer.classList.remove('is-open');
                document.body.style.removeProperty('overflow');
                document.removeEventListener('keydown', handleKeydown);
            };

            const handleKeydown = event => {
                if (event.key === 'Escape') closeViewer();
            };

            closeButton.addEventListener('click', closeViewer);

            viewer.addEventListener('click', event => {
                if (event.target === viewer) closeViewer();
            });

            viewer._closeViewer = closeViewer;
            viewer._largeImage = largeImage;
            viewer._handleKeydown = handleKeydown;
        }

        viewer._largeImage.src = img.src;
        viewer._largeImage.alt = img.alt;
        viewer.classList.add('is-open');
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', viewer._handleKeydown);
        viewer.querySelector('.faculty-image-viewer-close').focus();
    };

    img.addEventListener('click', openImage);

    img.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openImage();
        }
    });

    holder.appendChild(img);
    return holder;
}
};
