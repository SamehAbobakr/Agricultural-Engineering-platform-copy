// =========================================
// مجتمع الطلاب والخريجين — دوال مساعدة
// لا تستخدم innerHTML مع أي بيانات؛ كل العناصر تُبنى بـ DOM.
// تعتمد على js/ui.js: safeUrl و normalizeText
// =========================================

const CommunityUtils = {

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

    cleanText(value) {
        return typeof value === 'string' ? value.trim() : '';
    },

    // توحيد النص للبحث (أ/إ/آ، ة/ه، ى/ي) — نفس دالة بحث المنصة
    searchKey(value) {
        const text = CommunityUtils.cleanText(value);
        return typeof normalizeText === 'function' ? normalizeText(text) : text.toLowerCase();
    },

    // رابط http/https مطلق فقط (safeUrl المشتركة تقبل المسارات النسبية، فنشترط البروتوكول صراحة)
    httpUrl(value) {
        const text = CommunityUtils.cleanText(value);
        if (!/^https?:\/\//i.test(text)) return '';
        return typeof safeUrl === 'function' ? safeUrl(text) : '';
    },

    // رابط http/https يخص نطاقًا معينًا (مثل facebook.com) — غير ذلك يُتجاهل
    urlForHosts(value, hosts) {
        const url = CommunityUtils.httpUrl(value);
        if (!url) return '';

        try {
            const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
            return hosts.some(domain => host === domain || host.endsWith('.' + domain)) ? url : '';
        } catch (error) {
            return '';
        }
    },

    // رقم واتساب: نقبل صيغة دولية (+ أو 00) أو رقم موبايل مصري (01xxxxxxxxx).
    // أي صيغة محلية أخرى لا نستطيع التأكد من بلدها فلا نبني لها رابطًا.
    whatsappUrl(value) {
        const raw = CommunityUtils.cleanText(value);
        if (!/^\+?[0-9\s()\-]{8,20}$/.test(raw)) return '';

        let digits = raw.replace(/\D/g, '');

        if (!raw.startsWith('+')) {
            if (digits.startsWith('00')) digits = digits.slice(2);
            else if (/^01\d{9}$/.test(digits)) digits = '2' + digits;
            else return '';
        }

        return (digits.length >= 8 && digits.length <= 15) ? `https://wa.me/${digits}` : '';
    },

    // أيقونة SVG بسيطة (تُبنى بـ DOM، بدون مكتبة أيقونات)
    icon(pathData, className = 'community-icon') {
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
        return CommunityUtils.el('span', { className: 'community-avatar-fallback' }, [
            CommunityUtils.icon('M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'community-avatar-icon')
        ]);
    },

    // صورة شخصية (http/https فقط) مع بديل عند الخطأ
    avatar(imageUrl, altText) {
        const holder = CommunityUtils.el('span', { className: 'community-avatar' });
        const url = CommunityUtils.httpUrl(imageUrl);

        if (!url) {
            holder.appendChild(CommunityUtils.avatarFallback());
            return holder;
        }

        const img = CommunityUtils.el('img', {
            attrs: {
                src: url,
                alt: altText || '',
                loading: 'lazy',
                decoding: 'async',
                referrerpolicy: 'no-referrer'
            }
        });

        img.addEventListener('error', () => {
            img.remove();
            holder.appendChild(CommunityUtils.avatarFallback());
        }, { once: true });

        holder.appendChild(img);
        return holder;
    }
};
