// =========================================
// نظام الغرف — عرض عناصر محتوى المهمة (task_content.blocks)
// كل عنصر كائن له "type". النوع غير المعروف يُتخطّى بصمت (كي لا تنكسر المهمة)،
// فإضافة نوع جديد = إضافة دالة واحدة في RoomsBlocks.renderers + قاعدة تنسيق.
// ترتيب العناصر هو ترتيبها في المصفوفة كما خُزّنت في قاعدة البيانات.
//
// الأنواع: heading, paragraph, image, gallery, video, list, table, link, links, quote, note, divider
// =========================================

const RoomsBlocks = {

    // يرجع DocumentFragment لكل العناصر الصالحة
    render(blocks) {
        const fragment = document.createDocumentFragment();
        const ctx = { images: [] };   // كل صور المهمة معًا لعارض الصور (تنقّل بالأسهم)

        (Array.isArray(blocks) ? blocks : []).forEach(function (block) {
            if (!block || typeof block !== 'object') return;

            const renderer = RoomsBlocks.renderers[block.type];
            if (!renderer) {
            console.warn('عنصر محتوى غير معروف:', {
                block: block,
                type: block.type,
                keys: Object.keys(block)
            });
            return;
        }

            try {
                const node = renderer(block, ctx);
                if (node) fragment.appendChild(node);
            } catch (error) {
                console.error('تعذّر عرض عنصر محتوى:', block.type, error);
            }
        });

        return fragment;
    },

    text(value) {
        return typeof value === 'string' ? value.trim() : '';
    },

    // صورة قابلة للتكبير
    imageFigure(item, ctx) {
        const el = RoomsUtils.el;
        const url = RoomsUtils.httpUrl(item && item.url);
        if (!url) return null;

        const alt = RoomsBlocks.text(item.alt);
        const captionText = RoomsBlocks.text(item.caption);
        const index = ctx.images.push({ url: url, alt: alt, caption: captionText }) - 1;

        const img = el('img', {
            attrs: { src: url, alt: alt, loading: 'lazy', decoding: 'async' }
        });

        const button = el('button', {
            className: 'rm-img-btn',
            attrs: { type: 'button', 'aria-label': 'تكبير الصورة' + (alt ? ': ' + alt : '') }
        }, [img]);

        const figure = el('figure', { className: 'rm-figure' }, [button]);
        if (captionText) figure.appendChild(el('figcaption', { text: captionText }));

        button.addEventListener('click', function () {
            RoomsViewer.open(ctx.images, index, button);
        });

        img.addEventListener('error', function () {
            const fallback = el('span', { className: 'rm-img-fallback', text: 'تعذّر تحميل الصورة' });
            button.replaceWith(fallback);
        });

        return figure;
    },

    // يحوّل رابط فيديو إلى { kind: 'embed'|'file'|'link', src }
    parseVideo(rawUrl) {
        const url = RoomsUtils.httpUrl(rawUrl);
        if (!url) return null;

        let u;
        try { u = new URL(url); } catch (error) { return null; }

        const host = u.hostname.replace(/^www\./, '').replace(/^m\./, '');
        const idPattern = /^[A-Za-z0-9_-]{6,20}$/;

        let id = '';
        if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
            if (u.pathname === '/watch') id = u.searchParams.get('v') || '';
            else {
                const m = u.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/);
                id = m ? m[1] : '';
            }
        } else if (host === 'youtu.be') {
            id = u.pathname.slice(1).split('/')[0];
        }
        if (id && idPattern.test(id)) {
            return { kind: 'embed', src: 'https://www.youtube-nocookie.com/embed/' + id };
        }

        if (host === 'vimeo.com' || host === 'player.vimeo.com') {
            const m = u.pathname.match(/(\d{5,12})\/?$/);
            if (m) return { kind: 'embed', src: 'https://player.vimeo.com/video/' + m[1] };
        }

        if (/\.(mp4|webm|ogv|ogg)$/i.test(u.pathname)) return { kind: 'file', src: url };

        return { kind: 'link', src: url };
    },

    externalLink(url, label) {
        return RoomsUtils.el('a', {
            className: 'rm-link',
            text: label,
            attrs: { href: url, target: '_blank', rel: 'noopener noreferrer' }
        });
    },

    renderers: {

        heading(block) {
            const text = RoomsBlocks.text(block.text);
            if (!text) return null;

            // العناوين داخل المهمة تبدأ من h4 (h1 عنوان الغرفة، h3 عنوان المهمة)
            const level = Math.min(Math.max(parseInt(block.level, 10) || 2, 1), 3);
            return RoomsUtils.el('h' + (level + 3), { className: 'rm-b-heading rm-b-h' + level, text: text });
        },

        paragraph(block) {
            const text = RoomsBlocks.text(block.text);
            return text ? RoomsUtils.el('p', { className: 'rm-b-text', text: text }) : null;
        },

        image(block, ctx) {
            return RoomsBlocks.imageFigure(block, ctx);
        },

        gallery(block, ctx) {
            const el = RoomsUtils.el;
            const items = (Array.isArray(block.images) ? block.images : [])
                .map(function (item) { return RoomsBlocks.imageFigure(item, ctx); })
                .filter(Boolean);

            if (!items.length) return null;
            return el('div', { className: 'rm-gallery' }, items);
        },

        video(block) {
            const el = RoomsUtils.el;
            const info = RoomsBlocks.parseVideo(block.url);
            if (!info) return null;

            const title = RoomsBlocks.text(block.title) || 'فيديو';
            const wrap = el('figure', { className: 'rm-video' });

            if (info.kind === 'embed') {
                wrap.appendChild(el('div', { className: 'rm-video-frame' }, [
                    el('iframe', {
                        attrs: {
                            src: info.src,
                            title: title,
                            loading: 'lazy',
                            allowfullscreen: true,
                            referrerpolicy: 'strict-origin-when-cross-origin',
                            allow: 'accelerometer; encrypted-media; gyroscope; picture-in-picture'
                        }
                    })
                ]));
            } else if (info.kind === 'file') {
                wrap.appendChild(el('div', { className: 'rm-video-frame' }, [
                    el('video', { attrs: { src: info.src, controls: true, preload: 'none', 'aria-label': title } })
                ]));
            } else {
                wrap.appendChild(RoomsBlocks.externalLink(info.src, 'مشاهدة الفيديو: ' + title));
            }

            const caption = RoomsBlocks.text(block.caption) || (info.kind === 'link' ? '' : title);
            if (caption) wrap.appendChild(el('figcaption', { text: caption }));
            return wrap;
        },

        list(block) {
            const el = RoomsUtils.el;
            const items = (Array.isArray(block.items) ? block.items : [])
                .map(RoomsBlocks.text)
                .filter(Boolean);

            if (!items.length) return null;

            return el(block.ordered === true ? 'ol' : 'ul', { className: 'rm-b-list' },
                items.map(function (text) { return el('li', { text: text }); }));
        },

        table(block) {
            const el = RoomsUtils.el;
            const headers = (Array.isArray(block.headers) ? block.headers : []).map(RoomsBlocks.text);
            const rows = (Array.isArray(block.rows) ? block.rows : [])
                .filter(Array.isArray)
                .map(function (row) { return row.map(function (cell) { return RoomsBlocks.text(String(cell === null || cell === undefined ? '' : cell)); }); });

            if (!headers.length && !rows.length) return null;

            const table = el('table', { className: 'rm-table' });

            const caption = RoomsBlocks.text(block.caption);
            if (caption) table.appendChild(el('caption', { text: caption }));

            if (headers.length) {
                table.appendChild(el('thead', {}, [
                    el('tr', {}, headers.map(function (h) { return el('th', { text: h, attrs: { scope: 'col' } }); }))
                ]));
            }

            table.appendChild(el('tbody', {}, rows.map(function (row) {
                return el('tr', {}, row.map(function (cell) { return el('td', { text: cell }); }));
            })));

            // حاوية تمرير أفقي: الجدول العريض لا يكسر الصفحة على الموبايل
            return el('div', {
                className: 'rm-table-wrap',
                attrs: { role: 'region', tabindex: 0, 'aria-label': caption || 'جدول' }
            }, [table]);
        },

        link(block) {
            const el = RoomsUtils.el;
            const url = RoomsUtils.httpUrl(block.url);
            if (!url) return null;

            const label = RoomsBlocks.text(block.text) || url;
            const description = RoomsBlocks.text(block.description);

            const box = el('p', { className: 'rm-b-linkline' }, [RoomsBlocks.externalLink(url, label)]);
            if (description) box.appendChild(el('span', { className: 'rm-link-desc', text: ' — ' + description }));
            return box;
        },

        links(block) {
            const el = RoomsUtils.el;
            const items = (Array.isArray(block.items) ? block.items : [])
                .map(function (item) {
                    const url = RoomsUtils.httpUrl(item && item.url);
                    return url ? { url: url, text: RoomsBlocks.text(item.text) || url } : null;
                })
                .filter(Boolean);

            if (!items.length) return null;

            const box = el('aside', { className: 'rm-resources' });
            const title = RoomsBlocks.text(block.title) || 'مصادر إضافية';
            box.appendChild(el('h4', { className: 'rm-resources-title', text: title }));
            box.appendChild(el('ul', {}, items.map(function (item) {
                return el('li', {}, [RoomsBlocks.externalLink(item.url, item.text)]);
            })));
            return box;
        },

        quote(block) {
            const el = RoomsUtils.el;
            const text = RoomsBlocks.text(block.text);
            if (!text) return null;

            const quote = el('blockquote', { className: 'rm-quote' }, [el('p', { text: text })]);
            const cite = RoomsBlocks.text(block.cite);
            if (cite) quote.appendChild(el('footer', { text: '— ' + cite }));
            return quote;
        },

        note(block) {
            const el = RoomsUtils.el;
            const text = RoomsBlocks.text(block.text);
            if (!text) return null;

            const variants = { info: 'ملاحظة', tip: 'نصيحة', warning: 'تنبيه' };
            const variant = variants[block.variant] ? block.variant : 'info';
            const title = RoomsBlocks.text(block.title) || variants[variant];

            return el('aside', { className: 'rm-note rm-note-' + variant }, [
                el('strong', { className: 'rm-note-title', text: title }),
                el('p', { text: text })
            ]);
        },

card_grid(block) {
    const items = Array.isArray(block.items) ? block.items : [];
    if (!items.length) return null;

    const section = RoomsUtils.el("div", {
        className: "rm-b-card-grid"
    });

    const title = RoomsBlocks.text(block.title);

    if (title) {
        section.appendChild(
            RoomsUtils.el("h4", {
                className: "rm-b-section-title",
                text: title
            })
        );
    }

    const grid = RoomsUtils.el("div", {
        className: "rm-b-card-grid-inner"
    });

    items.forEach(item => {
        if (!item || typeof item !== "object") return;

        const card = RoomsUtils.el("article", {
            className: "rm-b-card"
        });

        const icon = RoomsBlocks.text(item.icon);
        const itemTitle = RoomsBlocks.text(item.title);
        const description = RoomsBlocks.text(item.description);

        if (icon) {
            card.appendChild(
                RoomsUtils.el("span", {
                    className: "rm-b-card-icon",
                    text: icon,
                    attrs: { "aria-hidden": "true" }
                })
            );
        }

        if (itemTitle) {
            card.appendChild(
                RoomsUtils.el("h5", {
                    className: "rm-b-card-title",
                    text: itemTitle
                })
            );
        }

        if (description) {
            card.appendChild(
                RoomsUtils.el("p", {
                    className: "rm-b-card-description",
                    text: description
                })
            );
        }

        grid.appendChild(card);
    });

    section.appendChild(grid);
    return section;
},

steps(block) {
    const items = Array.isArray(block.items) ? block.items : [];
    if (!items.length) return null;

    const section = RoomsUtils.el("div", {
        className: "rm-b-steps"
    });

    const title = RoomsBlocks.text(block.title);

    if (title) {
        section.appendChild(
            RoomsUtils.el("h4", {
                className: "rm-b-section-title",
                text: title
            })
        );
    }

    const list = RoomsUtils.el("div", {
        className: "rm-b-steps-list"
    });

    items.forEach((item, index) => {
        const data = typeof item === "string"
            ? { title: item }
            : item;

        if (!data || typeof data !== "object") return;

        const step = RoomsUtils.el("div", {
            className: "rm-b-step"
        });

        step.appendChild(
            RoomsUtils.el("span", {
                className: "rm-b-step-number",
                text: String(index + 1),
                attrs: { "aria-hidden": "true" }
            })
        );

        const content = RoomsUtils.el("div", {
            className: "rm-b-step-content"
        });

        const stepTitle = RoomsBlocks.text(data.title);
        const description = RoomsBlocks.text(data.description);

        if (stepTitle) {
            content.appendChild(
                RoomsUtils.el("h5", {
                    className: "rm-b-step-title",
                    text: stepTitle
                })
            );
        }

        if (description) {
            content.appendChild(
                RoomsUtils.el("p", {
                    className: "rm-b-step-description",
                    text: description
                })
            );
        }

        step.appendChild(content);
        list.appendChild(step);
    });

    section.appendChild(list);
    return section;
},

tip_card(block) {
    const title = RoomsBlocks.text(block.title);
    const content = RoomsBlocks.text(block.text);

    if (!title && !content) return null;

    const variant = ["tip", "warning", "info"].includes(block.variant)
        ? block.variant
        : "tip";

    const card = RoomsUtils.el("aside", {
        className: "rm-b-tip-card"
    });

    card.classList.add("rm-b-tip-" + variant);

    if (title) {
        card.appendChild(
            RoomsUtils.el("h4", {
                className: "rm-b-tip-title",
                text: title
            })
        );
    }

    if (content) {
        card.appendChild(
            RoomsUtils.el("p", {
                className: "rm-b-tip-text",
                text: content
            })
        );
    }

    return card;
},


        divider() {
            return RoomsUtils.el('hr', { className: 'rm-divider' });
        }
    }
};
