// =========================================
// نظام الغرف — دوال مساعدة
// كل نص قادم من قاعدة البيانات يُوضع بـ textContent فقط (لا innerHTML)،
// وكل رابط يمرّ على httpUrl (http/https فقط) — نفس قاعدة المنصة الأمنية.
// =========================================

const RoomsUtils = {

    // إنشاء عنصر بأمان
    el(tag, options, children) {
        const opts = options || {};
        const node = document.createElement(tag);

        if (opts.className) node.className = opts.className;
        if (opts.text !== undefined && opts.text !== null) node.textContent = opts.text;

        if (opts.attrs) {
            Object.keys(opts.attrs).forEach(function (name) {
                const value = opts.attrs[name];
                if (value !== undefined && value !== null && value !== false) {
                    node.setAttribute(name, value === true ? '' : String(value));
                }
            });
        }

        (children || []).forEach(function (child) {
            if (child) node.appendChild(child);
        });

        return node;
    },

    clear(node) {
        while (node.firstChild) node.removeChild(node.firstChild);
    },

    cleanText(value) {
        return typeof value === 'string' ? value.trim() : '';
    },

    // رابط http/https فقط، وإلا نص فارغ
    httpUrl(value) {
        if (typeof value !== 'string') return '';
        const trimmed = value.trim();
        if (!trimmed) return '';

        try {
            const parsed = new URL(trimmed, window.location.href);
            return (parsed.protocol === 'http:' || parsed.protocol === 'https:') ? parsed.href : '';
        } catch (error) {
            return '';
        }
    },

    // أرقام عربية مفصولة
    num(value) {
        const n = Number(value);
        return (Number.isFinite(n) ? n : 0).toLocaleString('ar-EG');
    },

    // صياغة عدد المهمات بالعربية (مهمة واحدة / مهمتان / ٣ مهمات / ١١ مهمة)
    taskCount(n) {
        if (n === 0) return 'لا مهمات بعد';
        if (n === 1) return 'مهمة واحدة';
        if (n === 2) return 'مهمتان';
        return RoomsUtils.num(n) + (n <= 10 ? ' مهمات' : ' مهمة');
    },

    percent(done, total) {
        return total > 0 ? Math.round((done / total) * 100) : 0;
    },

    formatDate(value) {
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return '';
        try {
            return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
        } catch (error) {
            return d.toISOString().slice(0, 10);
        }
    },

    // slug صالح (نفس قيد قاعدة البيانات)
    isValidSlug(value) {
        return typeof value === 'string' && value.length <= 120 && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value);
    },

    // يرفض الوعد إن تأخر أكثر من المهلة
    withTimeout(promise, ms) {
        let timer;
        const timeout = new Promise(function (resolve, reject) {
            timer = setTimeout(function () {
                reject(new Error('RoomsTimeout'));
            }, ms);
        });

        return Promise.race([promise, timeout]).then(function (value) {
            clearTimeout(timer);
            return value;
        }, function (error) {
            clearTimeout(timer);
            throw error;
        });
    },

    // أيقونة الغرفة: نص قصير (إيموجي) فقط
    iconText(value) {
        const text = RoomsUtils.cleanText(value);
        return (text && text.length <= 8) ? text : ROOMS_CONFIG.fallbackIcon;
    },

    // شريط تقدم دلالي
    progressBar(percentValue, label) {
        const fill = RoomsUtils.el('span', { className: 'rm-progress-fill' });
        fill.style.width = percentValue + '%';

        return RoomsUtils.el('span', {
            className: 'rm-progress',
            attrs: {
                role: 'progressbar',
                'aria-valuemin': 0,
                'aria-valuemax': 100,
                'aria-valuenow': percentValue,
                'aria-label': label
            }
        }, [fill]);
    }
};
