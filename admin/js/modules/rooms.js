/**
 * rooms.js — المسار التعليمي (3 وحدات في ملف واحد)
 *  rooms ← rooms                  (الغرف)
 *  tasks ← tasks (+ task_content) (المهام، ومحرر «المحتوى» لكل مهمة)
 *  quiz  ← task_quiz_questions    (أسئلة اختيار من متعدد لكل مهمة)
 *
 * محتوى المهمة = مصفوفة عناصر (blocks) تُخزَّن في task_content.blocks بنفس الأنواع التي يعرضها
 * الموقع في about/js/rooms-blocks.js (heading, paragraph, image, gallery, video, list, table, link, links, quote, note, divider).
 * الإجابة الصحيحة للسؤال لا تصل للطالب أبدًا: الموقع يسأل دوال PostgreSQL فقط (get_task_questions / submit_task_answer).
 */
(function () {
    'use strict';

    var D = window.AdminDom;
    var html = D.html;

    function roomOptions() {
        return window.AdminData.all('rooms', 'id,title', { column: 'sort_order' }).then(function (res) {
            return (res.data || []).map(function (r) { return [r.id, r.title]; });
        });
    }

    /** «اسم الغرفة — اسم المهمة» */
    function taskOptions() {
        return Promise.all([
            window.AdminData.all('rooms', 'id,title'),
            window.AdminData.all('tasks', 'id,title,room_id,sort_order', { column: 'sort_order' })
        ]).then(function (r) {
            var rooms = {};
            (r[0].data || []).forEach(function (x) { rooms[x.id] = x.title; });
            return (r[1].data || []).map(function (t) { return [t.id, (rooms[t.room_id] || '؟') + ' — ' + t.title]; });
        });
    }

    /* =========================================
       الغرف
    ========================================= */
    window.AdminCrud.define('rooms', {
        table: 'rooms',
        title: 'الغرف', singular: 'غرفة',
        hint: 'الغرفة غير المفعّلة (غير ظاهرة) لا يراها الطلاب هي ومهامها. الرابط المختصر (slug) حروف إنجليزية صغيرة وأرقام وشرطات فقط.',
        order: { column: 'sort_order', ascending: true },
        searchColumns: ['title', 'slug'],
        columns: [
            { key: 'icon', label: '' },
            { key: 'title', label: 'العنوان' },
            { key: 'slug', label: 'الرابط المختصر', ltr: true },
            { key: 'difficulty', label: 'المستوى', render: function (r) { return ({ beginner: 'مبتدئ', intermediate: 'متوسط', advanced: 'متقدم' })[r.difficulty] || '—'; } },
            { key: 'total_points', label: 'مجموع النقاط (تلقائي)' },
            { key: 'sort_order', label: 'الترتيب' },
            { key: 'is_active', label: 'ظاهرة' }
        ],
        fields: [
            { key: 'title', label: 'عنوان الغرفة', type: 'text', required: true, maxLength: 200, full: true },
            { key: 'slug', label: 'الرابط المختصر (slug)', type: 'text', required: true, dir: 'ltr', pattern: /^[a-z0-9]+(-[a-z0-9]+)*$/, patternMessage: 'حروف إنجليزية صغيرة وأرقام وشرطات بينها فقط، مثل: soil-basics', placeholder: 'soil-basics' },
            { key: 'icon', label: 'الأيقونة (إيموجي)', type: 'text', maxLength: 8 },
            { key: 'difficulty', label: 'المستوى', type: 'select', options: [['beginner', 'مبتدئ'], ['intermediate', 'متوسط'], ['advanced', 'متقدم']] },
            { key: 'sort_order', label: 'الترتيب', type: 'number', min: 0, required: true },
            { key: 'description', label: 'الوصف', type: 'textarea', full: true, rows: 4, maxLength: 2000, emptyAs: '' },
            { key: 'cover_image', label: 'رابط صورة الغلاف', type: 'url', full: true, placeholder: 'https://...' },
            { key: 'is_active', label: 'الظهور', type: 'checkbox', checkLabel: 'ظاهرة للطلاب' }
        ],
        defaults: { is_active: true, sort_order: 100, icon: '🌾' },
        rowLabel: function (r) { return r.title; },
        deleteWarning: 'سيُحذف معها كل مهامها ومحتواها وأسئلتها. (يُمنع الحذف إن كان طلاب قد أنجزوا مهامها؛ عندها أخفِها بدل الحذف.)'
    });

    /* =========================================
       المهام
    ========================================= */
    window.AdminCrud.define('tasks', {
        table: 'tasks',
        title: 'المهام والمحتوى', singular: 'مهمة',
        hint: 'لكل مهمة «محتوى» تعليمي (عناصر مرتبة) و«أسئلة» اختيار من متعدد. نقاط المهمة تُحسب تلقائيًا من مجموع درجات أسئلتها المفعّلة (لا تُدخل يدويًا)، ومجموع الغرفة من مهامها المفعّلة. الطالب يُسجَّل له الإنجاز بعد إجابة كل الأسئلة بشكل صحيح.',
        order: { column: 'sort_order', ascending: true },
        searchColumns: ['title'],
        filters: [{ key: 'room_id', label: 'الغرفة', load: roomOptions }],
        columns: [
            { key: 'title', label: 'العنوان' },
            { key: 'room_id', label: 'الغرفة' },
            { key: 'points', label: 'النقاط (تلقائي)' },
            { key: 'sort_order', label: 'الترتيب' },
            { key: 'is_active', label: 'ظاهرة' }
        ],
        fields: [
            { key: 'room_id', label: 'الغرفة', type: 'select', required: true, load: roomOptions, full: true },
            { key: 'title', label: 'عنوان المهمة', type: 'text', required: true, maxLength: 300, full: true },
            { key: 'description', label: 'وصف مختصر', type: 'textarea', full: true, rows: 3, maxLength: 2000, emptyAs: '' },
            { key: 'sort_order', label: 'الترتيب', type: 'number', min: 0, required: true },
            { key: 'is_active', label: 'الظهور', type: 'checkbox', checkLabel: 'ظاهرة للطلاب' }
        ],
        defaults: { is_active: true, sort_order: 100 },
        rowLabel: function (r) { return r.title; },
        deleteWarning: 'سيُحذف معها محتواها وأسئلتها. (يُمنع الحذف إن كان طلاب قد أنجزوها؛ عندها أخفِها بدل الحذف.)',
        rowActions: [
            { label: '📝 المحتوى', onClick: function (row, api) { openContentEditor(row, api.ctx); } },
            { label: '❓ الأسئلة', onClick: function (row) { window.location.hash = '#/quiz?task_id=' + encodeURIComponent(row.id); } }
        ]
    });

    /* =========================================
       أسئلة المهام (اختيار من متعدد)
       الصيغة المخزّنة: options = [{id:'a', text:'...'}, ...] و correct_option_id = 'a'
    ========================================= */
    var OPTION_IDS = ['a', 'b', 'c', 'd', 'e', 'f'];

    window.AdminCrud.define('quiz', {
        table: 'task_quiz_questions',
        title: 'أسئلة المهام', singular: 'سؤال',
        hint: 'اكتب الاختيارات كل واحد في سطر (من 2 إلى 6)، ثم رقم الاختيار الصحيح. لا يرى الطالب الإجابة الصحيحة إلا عبر التحقق من الخادم.',
        order: { column: 'sort_order', ascending: true },
        searchColumns: ['question'],
        filters: [{ key: 'task_id', label: 'المهمة', load: taskOptions }],
        columns: [
            { key: 'question', label: 'السؤال', max: 80 },
            { key: 'task_id', label: 'المهمة' },
            { key: 'options', label: 'الاختيارات', render: function (r) { return Array.isArray(r.options) ? r.options.length : 0; } },
            { key: 'sort_order', label: 'الترتيب' },
            { key: 'points', label: 'الدرجة' },
            { key: 'is_active', label: 'مفعّل' }
        ],
        fields: [
            { key: 'task_id', label: 'المهمة', type: 'select', required: true, load: taskOptions, full: true },
            { key: 'question', label: 'نص السؤال', type: 'textarea', required: true, full: true, rows: 3 },
            { key: 'points', label: 'نقاط السؤال', type: 'number', min: 0, max: 1000, required: true },
            { key: 'options_lines', label: 'الاختيارات (كل اختيار في سطر)', type: 'list', required: true, full: true, maxItems: 6, rows: 6 },
            { key: 'correct_index', label: 'رقم الاختيار الصحيح (1 = أول سطر)', type: 'number', required: true, min: 1, max: 6 },
            { key: 'sort_order', label: 'الترتيب', type: 'number', min: 0, required: true },
            { key: 'is_active', label: 'التفعيل', type: 'checkbox', checkLabel: 'السؤال مفعّل' }
        ],
        defaults: { is_active: true, sort_order: 100, points: 10 },
        toForm: function (row) {
            var opts = Array.isArray(row.options) ? row.options : [];
            var idx = opts.findIndex(function (o) { return o && o.id === row.correct_option_id; });
            return Object.assign({}, row, {
                options_lines: opts.map(function (o) { return o && o.text !== undefined ? o.text : ''; }),
                points: row.points ?? 10,
                correct_index: idx >= 0 ? idx + 1 : ''
            });
        },
        beforeSave: function (v) {
            var lines = v.options_lines || [];
            if (lines.length < 2) return 'أدخل اختيارين على الأقل.';
            if (v.correct_index > lines.length) return 'رقم الاختيار الصحيح أكبر من عدد الاختيارات.';
            v.options = lines.map(function (text, i) { return { id: OPTION_IDS[i], text: text }; });
            v.correct_option_id = OPTION_IDS[v.correct_index - 1];
            delete v.options_lines;
            delete v.correct_index;
            return '';
        },
        rowLabel: function (r) { return String(r.question || '').slice(0, 60); }
    });

    /* =========================================
       محرر محتوى المهمة (task_content.blocks)
       كل نوع: label + حقول. نوع الحقل: text | textarea | select | check | lines
       lines = أسطر (كل سطر عنصر)، وله format (من البيانات إلى نص) و parse (من نص إلى بيانات).
    ========================================= */
    function splitFirst(line, sep) {
        var i = line.indexOf(sep);
        return i === -1 ? [line.trim(), ''] : [line.slice(0, i).trim(), line.slice(i + 1).trim()];
    }

    var TYPES = {
        heading: { label: 'عنوان', fields: [
            { k: 'text', l: 'نص العنوان', t: 'text' },
            { k: 'level', l: 'الحجم', t: 'select', num: true, opts: [['1', 'كبير'], ['2', 'متوسط'], ['3', 'صغير']], def: '2' }
        ] },
        paragraph: { label: 'فقرة', fields: [{ k: 'text', l: 'النص', t: 'textarea' }] },
        image: { label: 'صورة', fields: [
            { k: 'url', l: 'رابط الصورة', t: 'text', ltr: true, url: true },
            { k: 'alt', l: 'وصف بديل للصورة', t: 'text' },
            { k: 'caption', l: 'تعليق تحت الصورة', t: 'text' }
        ] },
        gallery: { label: 'معرض صور', fields: [{
            k: 'images', l: 'صورة في كل سطر:  الرابط | الوصف (اختياري)', t: 'lines', ltr: true,
            format: function (v) { return (v || []).map(function (i) { return i.url + (i.alt ? ' | ' + i.alt : ''); }); },
            parse: function (lines) { return lines.map(function (ln) { var p = splitFirst(ln, '|'); return { url: p[0], alt: p[1] }; }); },
            urlOf: function (item) { return item.url; }
        }] },
        video: { label: 'فيديو', fields: [
            { k: 'url', l: 'رابط الفيديو (YouTube / Vimeo / ملف mp4)', t: 'text', ltr: true, url: true },
            { k: 'title', l: 'عنوان الفيديو', t: 'text' },
            { k: 'caption', l: 'تعليق', t: 'text' }
        ] },
        list: { label: 'قائمة', fields: [
            { k: 'items', l: 'عنصر في كل سطر', t: 'lines',
                format: function (v) { return v || []; }, parse: function (lines) { return lines; } },
            { k: 'ordered', l: 'قائمة مرقّمة', t: 'check' }
        ] },
        table: { label: 'جدول', fields: [
            { k: 'caption', l: 'عنوان الجدول', t: 'text' },
            { k: 'headers', l: 'رؤوس الأعمدة (افصل بينها بـ | )', t: 'text',
                format: function (v) { return (v || []).join(' | '); },
                parse: function (text) { return text.split('|').map(function (s) { return s.trim(); }).filter(Boolean); } },
            { k: 'rows', l: 'الصفوف: كل صف في سطر والخلايا مفصولة بـ |', t: 'lines',
                format: function (v) { return (v || []).map(function (r) { return r.join(' | '); }); },
                parse: function (lines) { return lines.map(function (ln) { return ln.split('|').map(function (s) { return s.trim(); }); }); } }
        ] },
        link: { label: 'رابط', fields: [
            { k: 'url', l: 'الرابط', t: 'text', ltr: true, url: true },
            { k: 'text', l: 'نص الرابط', t: 'text' },
            { k: 'description', l: 'وصف قصير', t: 'text' }
        ] },
        links: { label: 'مجموعة روابط', fields: [
            { k: 'title', l: 'عنوان المجموعة', t: 'text' },
            { k: 'items', l: 'رابط في كل سطر:  النص | الرابط', t: 'lines', ltr: true,
                format: function (v) { return (v || []).map(function (i) { return i.text + ' | ' + i.url; }); },
                parse: function (lines) { return lines.map(function (ln) { var p = splitFirst(ln, '|'); return { text: p[0], url: p[1] }; }); },
                urlOf: function (item) { return item.url; } }
        ] },
        quote: { label: 'اقتباس', fields: [
            { k: 'text', l: 'نص الاقتباس', t: 'textarea' },
            { k: 'cite', l: 'المصدر', t: 'text' }
        ] },
        note: { label: 'ملاحظة / تنبيه', fields: [
            { k: 'variant', l: 'النوع', t: 'select', opts: [['info', 'ملاحظة'], ['tip', 'نصيحة'], ['warning', 'تنبيه']], def: 'info' },
            { k: 'title', l: 'العنوان (اختياري)', t: 'text' },
            { k: 'text', l: 'النص', t: 'textarea' }
        ] },
        divider: { label: 'فاصل', fields: [] }
    };

    function isHttp(u) { try { var x = new URL(u); return x.protocol === 'http:' || x.protocol === 'https:'; } catch (e) { return false; } }

    function blockCard(block, index, total) {
        var spec = TYPES[block.type];
        if (!spec) {
            return html`<div class="adm-block adm-block--unknown" data-i="${index}" data-type="${block.type}">
                <div class="adm-block__head"><b>نوع غير معروف: ${block.type}</b>
                    <span class="adm-block__tools"><button type="button" class="adm-icon-btn" data-do="del" aria-label="حذف">🗑️</button></span></div>
                <p class="adm-hint">سيُحفظ كما هو ما لم تحذفه.</p>
                <input type="hidden" data-raw="${JSON.stringify(block)}"></div>`;
        }

        return html`<div class="adm-block" data-i="${index}" data-type="${block.type}">
            <div class="adm-block__head"><b>${index + 1}. ${spec.label}</b>
                <span class="adm-block__tools">
                    <button type="button" class="adm-icon-btn" data-do="up" aria-label="أعلى"${D.raw(index === 0 ? ' disabled' : '')}>⬆️</button>
                    <button type="button" class="adm-icon-btn" data-do="down" aria-label="أسفل"${D.raw(index === total - 1 ? ' disabled' : '')}>⬇️</button>
                    <button type="button" class="adm-icon-btn" data-do="del" aria-label="حذف">🗑️</button>
                </span></div>
            ${spec.fields.map(function (f) {
                var v = block[f.k];
                if (f.format) v = f.format(v);
                if (f.t === 'lines') v = Array.isArray(v) ? v.join('\n') : '';
                if (v === undefined || v === null) v = f.def !== undefined ? f.def : '';
                var dir = f.ltr ? D.raw(' dir="ltr"') : '';

                if (f.t === 'check') return html`<label class="adm-check"><input type="checkbox" data-k="${f.k}"${D.raw(block[f.k] === true ? ' checked' : '')}> <span>${f.l}</span></label>`;
                if (f.t === 'select') return html`<label class="adm-field"><span>${f.l}</span><select class="adm-select" data-k="${f.k}">${f.opts.map(function (o) { return html`<option value="${o[0]}"${D.raw(String(v) === String(o[0]) ? ' selected' : '')}>${o[1]}</option>`; })}</select></label>`;
                if (f.t === 'text') return html`<label class="adm-field"><span>${f.l}</span><input class="adm-input" type="text" data-k="${f.k}" value="${v}"${dir}></label>`;
                return html`<label class="adm-field"><span>${f.l}</span><textarea class="adm-textarea" rows="${f.t === 'lines' ? 4 : 3}" data-k="${f.k}"${dir}>${v}</textarea></label>`;
            })}
        </div>`;
    }

    /**
     * يقرأ كل البطاقات من الصفحة إلى مصفوفة blocks؛ يُرجع { blocks, error }.
     * strict=false: قراءة متساهلة بلا تحقق (للتحريك والحذف والإضافة)، strict=true: تحقق كامل قبل الحفظ.
     */
    function readBlocks(host, strict) {
        var out = [], error = '';

        host.querySelectorAll('.adm-block').forEach(function (card, i) {
            if (error) return;
            var type = card.getAttribute('data-type');
            var spec = TYPES[type];

            if (!spec) {
                var raw = card.querySelector('[data-raw]');
                try { out.push(JSON.parse(raw.getAttribute('data-raw'))); } catch (e) { /* يُتخطى */ }
                return;
            }

            var block = { type: type };
            spec.fields.forEach(function (f) {
                var el = card.querySelector('[data-k="' + f.k + '"]');
                if (!el) return;

                if (f.t === 'check') { if (el.checked) block[f.k] = true; return; }

                var text = String(el.value).trim();
                if (f.t === 'lines') {
                    var lines = text.split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
                    var parsed = f.parse ? f.parse(lines) : lines;
                    if (strict && f.urlOf) parsed.forEach(function (it) { if (!isHttp(f.urlOf(it))) error = 'العنصر ' + (i + 1) + ': رابط غير صالح «' + f.urlOf(it) + '».'; });
                    block[f.k] = parsed;
                    return;
                }
                if (f.parse) { block[f.k] = f.parse(text); return; }
                if (strict && f.url && text && !isHttp(text)) { error = 'العنصر ' + (i + 1) + ': الرابط يجب أن يبدأ بـ http:// أو https://'; return; }
                if (text) block[f.k] = f.num ? Number(text) : text;
            });

            // عناصر لا معنى لها فارغة
            var needs = { heading: 'text', paragraph: 'text', quote: 'text', note: 'text', image: 'url', video: 'url', link: 'url' }[type];
            if (strict && needs && !block[needs] && !error) error = 'العنصر ' + (i + 1) + ' (' + spec.label + ') فارغ؛ املأه أو احذفه.';
            if (strict && (type === 'list' || type === 'links') && !(block.items || []).length && !error) error = 'العنصر ' + (i + 1) + ' (' + spec.label + ') بلا عناصر.';
            if (strict && type === 'gallery' && !(block.images || []).length && !error) error = 'العنصر ' + (i + 1) + ' (معرض الصور) بلا صور.';

            out.push(block);
        });

        return { blocks: out, error: error };
    }

    function openContentEditor(task, ctx) {
        var blocks = [];
        var host = null;

        function paint() {
            D.mount(host, blocks.length
                ? html`${blocks.map(function (b, i) { return blockCard(b, i, blocks.length); })}`
                : html`<div class="adm-note">لا يوجد محتوى بعد. أضف أول عنصر من الأسفل.</div>`);
        }

        /* strict=true قبل الحفظ فقط؛ التحريك والحذف والإضافة بلا تحقق حتى لا يعلق المسؤول بعنصر فارغ */
        function sync(strict) {
            var r = readBlocks(host, strict);
            if (strict && r.error) { ctx.ui.toast(r.error, 'error'); return false; }
            blocks = r.blocks;
            return true;
        }

        var body = html`
            <p class="adm-hint">ترتيب العناصر هنا هو ترتيب ظهورها للطالب. الصور والفيديو بروابط خارجية فقط.</p>
            <div id="blocksHost"></div>
            <div class="adm-block-add">
                <select class="adm-select" id="blockType" aria-label="نوع العنصر">
                    ${Object.keys(TYPES).map(function (k) { return html`<option value="${k}">${TYPES[k].label}</option>`; })}
                </select>
                <button type="button" class="adm-btn adm-btn--ghost" id="blockAdd">＋ إضافة عنصر</button>
            </div>`;

        var m = ctx.ui.modal({
            title: 'محتوى المهمة: ' + task.title,
            size: 'lg',
            body: body,
            actions: [
                { label: 'إلغاء', kind: 'ghost' },
                {
                    label: 'حفظ المحتوى', kind: 'primary', keepOpen: true,
                    onClick: function (api) {
                        if (!sync(true)) return false;
                        api.setBusy(true);
                        return window.AdminData.run(function (c) {
                            return c.from('task_content').upsert({ task_id: task.id, blocks: blocks }, { onConflict: 'task_id' });
                        }).then(function (res) {
                            api.setBusy(false);
                            if (res.error) { ctx.ui.toast(res.message, 'error'); return false; }
                            ctx.ui.toast('تم حفظ المحتوى.', 'success');
                            api.close();
                            return false;
                        });
                    }
                }
            ]
        });

        host = m.body.querySelector('#blocksHost');
        D.mount(host, ctx.ui.loadingState('جاري تحميل المحتوى...'));

        window.AdminData.run(function (c) { return c.from('task_content').select('blocks').eq('task_id', task.id).maybeSingle(); })
            .then(function (res) {
                if (res.error) { D.mount(host, ctx.ui.errorState(res.message)); return; }
                blocks = res.data && Array.isArray(res.data.blocks) ? res.data.blocks : [];
                paint();
            });

        m.body.querySelector('#blockAdd').addEventListener('click', function () {
            sync(false);
            var type = m.body.querySelector('#blockType').value;
            blocks.push({ type: type });
            paint();
            var cards = host.querySelectorAll('.adm-block');
            if (cards.length) cards[cards.length - 1].scrollIntoView({ block: 'nearest' });
        });

        host.addEventListener('click', function (e) {
            var btn = e.target.closest('[data-do]');
            if (!btn || btn.disabled) return;
            sync(false);
            var i = Number(btn.closest('.adm-block').getAttribute('data-i'));
            var act = btn.getAttribute('data-do');

            if (act === 'del') blocks.splice(i, 1);
            if (act === 'up' && i > 0) { var a = blocks[i - 1]; blocks[i - 1] = blocks[i]; blocks[i] = a; }
            if (act === 'down' && i < blocks.length - 1) { var b = blocks[i + 1]; blocks[i + 1] = blocks[i]; blocks[i] = b; }
            paint();
        });
    }
})();
