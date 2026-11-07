// =========================================
// معرض مشاريع التخرج — دوال مساعدة
// لا يُستخدم innerHTML مع أي بيانات: النص دائمًا بـ textContent، والروابط http/https فقط.
// =========================================

const GradUtils = {

    el(tag, options = {}, children = []) {
        const node = document.createElement(tag);

        if (options.className) node.className = options.className;
        if (options.text !== undefined && options.text !== null) node.textContent = options.text;

        if (options.attrs) {
            Object.entries(options.attrs).forEach(function (entry) {
                const value = entry[1];
                if (value !== undefined && value !== null && value !== false) {
                    node.setAttribute(entry[0], value === true ? '' : String(value));
                }
            });
        }

        children.forEach(function (child) { if (child) node.appendChild(child); });
        return node;
    },

    clear(node) {
        while (node && node.firstChild) node.removeChild(node.firstChild);
    },

    cleanText(value) {
        return typeof value === 'string' ? value.trim() : '';
    },

    // مصفوفة نصوص نظيفة (تتجاهل غير النصوص والفارغ)
    textList(value) {
        return (Array.isArray(value) ? value : [])
            .map(GradUtils.cleanText)
            .filter(Boolean);
    },

    // رابط http/https فقط، وإلا نص فارغ
    httpUrl(value) {
        const text = GradUtils.cleanText(value);
        if (!text) return '';
        try {
            const u = new URL(text);
            return (u.protocol === 'http:' || u.protocol === 'https:') ? u.href : '';
        } catch (e) {
            return '';
        }
    },

    // توحيد النص العربي للبحث: حذف التشكيل والتطويل، أ/إ/آ ← ا، ة ← ه، ى ← ي
    searchKey(value) {
        return GradUtils.cleanText(String(value === undefined || value === null ? '' : value))
            .toLowerCase()
            .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
            .replace(/[أإآ]/g, 'ا')
            .replace(/ة/g, 'ه')
            .replace(/ى/g, 'ي')
            .replace(/\s+/g, ' ');
    },

    num(value) {
        const n = Number(value);
        return Number.isFinite(n) ? n.toLocaleString('ar-EG') : '';
    },

    // رابط صفحة تفاصيل مشروع (قابل للمشاركة)
    projectHref(slug) {
        return GRAD_CONFIG.projectPage + '?slug=' + encodeURIComponent(slug);
    },

    // تصنيف خطأ الاتصال لرسالة مفهومة
    describeError(error) {
        const text = error ? String(error.message || error.code || error) : '';
        if (window.SUPABASE_CONFIG_ERROR) return window.SUPABASE_CONFIG_ERROR;
        if (/42P01|does not exist|PGRST205/i.test(text) || (error && (error.code === '42P01' || error.code === 'PGRST205'))) {
            return 'جدول المشاريع غير مُنشأ بعد في قاعدة البيانات. (على المسؤول تنفيذ database/graduation/001_graduation_projects.sql)';
        }
        return 'تعذر تحميل البيانات. تحقق من الاتصال بالإنترنت وحاول مرة أخرى.';
    },

    withTimeout(promise, ms) {
        return new Promise(function (resolve, reject) {
            const t = setTimeout(function () { reject(new Error('انتهت مهلة الاتصال')); }, ms);
            promise.then(function (v) { clearTimeout(t); resolve(v); },
                         function (e) { clearTimeout(t); reject(e); });
        });
    },

    // صورة بحجم مناسب مع تحميل كسول وبديل عند الفشل
    image(url, alt, className) {
        const img = GradUtils.el('img', {
            className: className || '',
            attrs: { src: url, alt: alt || '', loading: 'lazy', decoding: 'async' }
        });
        img.addEventListener('error', function () {
            img.classList.add('is-broken');
            img.removeAttribute('src');
        }, { once: true });
        return img;
    },

    // تحويل رابط فيديو إلى نوع قابل للتضمين الآمن (قائمة بيضاء) أو رابط خارجي
    videoInfo(url) {
        const safe = GradUtils.httpUrl(url);
        if (!safe) return null;
        const u = new URL(safe);
        const host = u.hostname.replace(/^www\./, '');

        let id = '';
        if (host === 'youtu.be') id = u.pathname.slice(1);
        else if (host === 'youtube.com' || host === 'm.youtube.com') {
            if (u.pathname === '/watch') id = u.searchParams.get('v') || '';
            else if (/^\/(embed|shorts)\//.test(u.pathname)) id = u.pathname.split('/')[2] || '';
        }
        if (/^[A-Za-z0-9_-]{6,15}$/.test(id)) {
            return { kind: 'iframe', src: 'https://www.youtube-nocookie.com/embed/' + id, href: safe };
        }

        if (host === 'vimeo.com' && /^\/\d+/.test(u.pathname)) {
            return { kind: 'iframe', src: 'https://player.vimeo.com/video/' + u.pathname.split('/')[1], href: safe };
        }
        if (host === 'player.vimeo.com' && /^\/video\/\d+/.test(u.pathname)) {
            return { kind: 'iframe', src: safe, href: safe };
        }
        if (/\.(mp4|webm|ogg)$/i.test(u.pathname)) {
            return { kind: 'file', src: safe, href: safe };
        }
        return { kind: 'link', href: safe };
    }
};
