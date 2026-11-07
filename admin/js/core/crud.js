/**
 * crud.js — يبني صفحة إدارة كاملة لأي جدول من وصف بسيط (قائمة + بحث + فلاتر + ترقيم + إضافة/تعديل/حذف)
 *
 * الاستخدام (انظر js/modules/subjects.js كمثال):
 *   AdminCrud.define('subjects', {
 *       table: 'subjects',
 *       title: 'المواد الدراسية', singular: 'مادة',
 *       order: { column: 'id', ascending: false },
 *       searchColumns: ['name', 'professor'],
 *       filters: [ { key: 'grade', label: 'الفرقة', options: ['الفرقة الأولى', ...] } ],
 *       columns: [ { key: 'name', label: 'الاسم' }, ... ],
 *       fields:  [ { key: 'name', label: 'اسم المادة', type: 'text', required: true }, ... ],
 *       rowLabel: function (row) { return row.name; }
 *   });
 *
 * أنواع الحقول: text | url | email | tel | number | textarea | select | checkbox | list | json
 *   - options: ['نص', ...] أو [[قيمة, نص], ...]  |  load: function () → Promise<[[قيمة, نص], ...]>
 *   - suggest: ['اقتراح', ...] لحقل text (قائمة اقتراحات مع حرية الكتابة)
 *   - valueType: 'number' لقيم select الرقمية (مثل subject_id)
 *   - full: true ليأخذ الحقل عرض الصف كاملًا في النموذج
 *   - emptyAs: قيمة تُحفظ عند ترك الحقل فارغًا (مثل '' للأعمدة NOT NULL)
 * خيارات الوحدة الإضافية: toForm(row) لتحويل الصف قبل ملء النموذج، beforeSave(values, mode, row)
 *   لتعديل القيم قبل الحفظ (يُرجع نص خطأ لإيقاف الحفظ)، rowActions: أزرار إضافية في كل صف.
 *
 * كل نص قادم من قاعدة البيانات يمر عبر html`...` (تهريب تلقائي).
 * التحقق هنا لراحة المستخدم فقط؛ التحقق الحقيقي قيود PostgreSQL وسياسات RLS.
 */
(function () {
    'use strict';

    var D = window.AdminDom;
    var html = D.html;
    var PAGE_SIZE = 15;

    /* ---------- أدوات صغيرة ---------- */

    function normOptions(list) {
        return (list || []).map(function (o) { return Array.isArray(o) ? [o[0], o[1]] : [o, o]; });
    }

    function isHttpUrl(v) {
        try { var u = new URL(v); return u.protocol === 'http:' || u.protocol === 'https:'; } catch (e) { return false; }
    }

    function shorten(text, n) {
        text = String(text === null || text === undefined ? '' : text);
        return text.length > n ? text.slice(0, n) + '…' : text;
    }

    /* =========================================
       النموذج: رسم الحقول وجمع القيم والتحقق
    ========================================= */

    function fieldValueForInput(f, v) {
        if (v === null || v === undefined) return '';
        if (f.type === 'list') return Array.isArray(v) ? v.join('\n') : '';
        if (f.type === 'json') { try { return JSON.stringify(v, null, 2); } catch (e) { return ''; } }
        return v;
    }

    function fieldHtml(f, value, opts) {
        var id = 'f_' + f.key;
        var req = f.required ? html` <b class="adm-req" title="مطلوب">*</b>` : '';
        var hint = f.hint ? html`<span class="adm-field__hint">${f.hint}</span>` : '';
        var ltr = (f.type === 'url' || f.type === 'email' || f.type === 'tel' || f.type === 'json' || f.dir === 'ltr') ? ' dir="ltr"' : '';
        var control;
        var v = fieldValueForInput(f, value);

        if (f.type === 'checkbox') {
            control = html`<label class="adm-check"><input type="checkbox" id="${id}" name="${f.key}"${D.raw(v === true || v === 'true' ? ' checked' : '')}> <span>${f.checkLabel || f.label}</span></label>`;
            return html`<div class="adm-field${f.full ? ' adm-field--full' : ''}">${control}${hint}<span class="adm-field__error" data-err="${f.key}"></span></div>`;
        }

        if (f.type === 'select') {
            var options = opts || [];
            var hasValue = options.some(function (o) { return String(o[0]) === String(v); });
            if (v !== '' && !hasValue) options = options.concat([[v, String(v)]]);   // قيمة قديمة غير موجودة في القائمة: نحتفظ بها
            control = html`<select class="adm-select" id="${id}" name="${f.key}"${D.raw(f.required ? ' required' : '')}>
                ${f.required && v !== '' ? '' : html`<option value="">— اختر —</option>`}
                ${options.map(function (o) { return html`<option value="${o[0]}"${D.raw(String(o[0]) === String(v) ? ' selected' : '')}>${o[1]}</option>`; })}
            </select>`;
        } else if (f.type === 'textarea' || f.type === 'list' || f.type === 'json') {
            control = html`<textarea class="adm-textarea${f.type === 'json' ? ' adm-mono' : ''}" id="${id}" name="${f.key}" rows="${f.rows || (f.type === 'textarea' ? 4 : 5)}"${D.raw(ltr)}${f.maxLength ? D.raw(' maxlength="' + Number(f.maxLength) + '"') : ''} placeholder="${f.placeholder || ''}">${v}</textarea>`;
        } else {
            var type = f.type === 'number' ? 'number' : (f.type === 'url' ? 'url' : (f.type === 'email' ? 'email' : (f.type === 'tel' ? 'tel' : 'text')));
            var attrs = '';
            if (f.type === 'number') {
                if (f.min !== undefined) attrs += ' min="' + Number(f.min) + '"';
                if (f.max !== undefined) attrs += ' max="' + Number(f.max) + '"';
                attrs += ' step="1"';
            }
            if (f.maxLength) attrs += ' maxlength="' + Number(f.maxLength) + '"';
            var list = f.suggest ? ' list="dl_' + f.key + '"' : '';
            control = html`<input class="adm-input" type="${type}" id="${id}" name="${f.key}" value="${v}"${D.raw(ltr + attrs + list)} placeholder="${f.placeholder || ''}" autocomplete="off">
                ${f.suggest ? html`<datalist id="${'dl_' + f.key}">${f.suggest.map(function (s) { return html`<option value="${s}"></option>`; })}</datalist>` : ''}`;
        }

        return html`<div class="adm-field${f.full ? ' adm-field--full' : ''}"><label for="${id}">${f.label}${req}</label>${control}${hint}<span class="adm-field__error" data-err="${f.key}"></span></div>`;
    }

    /** يقرأ قيم النموذج ويتحقق منها: { values, errors } */
    function collect(form, fields) {
        var values = {}, errors = {};

        fields.forEach(function (f) {
            var el = form.elements[f.key];
            if (!el) return;
            var raw, label = f.label;

            if (f.type === 'checkbox') { values[f.key] = !!el.checked; return; }

            raw = String(el.value === undefined ? '' : el.value);
            var text = raw.trim();

            if (f.type === 'list') {
                var items = raw.split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
                if (f.required && !items.length) errors[f.key] = 'أدخل عنصرًا واحدًا على الأقل.';
                if (f.maxItems && items.length > f.maxItems) errors[f.key] = 'الحد الأقصى ' + f.maxItems + ' عنصرًا.';
                values[f.key] = items;
                return;
            }

            if (f.type === 'json') {
                if (!text) { values[f.key] = f.emptyJson !== undefined ? f.emptyJson : null; return; }
                try { values[f.key] = JSON.parse(text); } catch (e) { errors[f.key] = 'صيغة JSON غير صحيحة.'; }
                return;
            }

            if (f.required && !text) { errors[f.key] = 'حقل «' + label + '» مطلوب.'; return; }

            if (!text) { values[f.key] = f.emptyAs !== undefined ? f.emptyAs : null; return; }

            if (f.type === 'number') {
                var n = Number(text);
                if (!isFinite(n) || Math.floor(n) !== n) { errors[f.key] = 'أدخل رقمًا صحيحًا.'; return; }
                if (f.min !== undefined && n < f.min) { errors[f.key] = 'أقل قيمة ' + f.min + '.'; return; }
                if (f.max !== undefined && n > f.max) { errors[f.key] = 'أكبر قيمة ' + f.max + '.'; return; }
                values[f.key] = n;
                return;
            }

            if (f.type === 'url' && !isHttpUrl(text)) { errors[f.key] = 'أدخل رابطًا يبدأ بـ http:// أو https://'; return; }
            if (f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) { errors[f.key] = 'بريد إلكتروني غير صالح.'; return; }
            if (f.pattern && !f.pattern.test(text)) { errors[f.key] = f.patternMessage || 'صيغة غير صحيحة.'; return; }
            if (f.maxLength && text.length > f.maxLength) { errors[f.key] = 'الحد الأقصى ' + f.maxLength + ' حرفًا.'; return; }

            if (f.type === 'select' && f.valueType === 'number') {
                values[f.key] = Number(text);
            } else {
                values[f.key] = text;
            }
        });

        return { values: values, errors: errors };
    }

    function showErrors(form, errors) {
        form.querySelectorAll('[data-err]').forEach(function (s) { s.textContent = ''; });
        var first = null;
        Object.keys(errors).forEach(function (k) {
            var s = form.querySelector('[data-err="' + k + '"]');
            if (s) s.textContent = errors[k];
            if (!first && form.elements[k]) first = form.elements[k];
        });
        if (first) first.focus();
    }

    /* =========================================
       تعريف الوحدة
    ========================================= */

    function define(id, cfg) {
        var repo = window.AdminData.createRepository({
            table: cfg.table, select: cfg.select, searchColumns: cfg.searchColumns,
            order: cfg.order, idKey: cfg.idKey
        });
        var idKey = cfg.idKey || 'id';

        window.AdminModules.define(id, {
            mount: function (ctx) {
                var alive = true;
                var state = { page: 1, search: '', filters: {} };
                /* فلتر ابتدائي من الرابط: #/files?subject_id=12 */
                (cfg.filters || []).forEach(function (f) { if (ctx.params && ctx.params[f.key]) state.filters[f.key] = ctx.params[f.key]; });
                var look = {};       // key → { value: label }
                var optionLists = {}; // key → [[value,label]]

                var loaders = [];
                (cfg.fields || []).concat(cfg.filters || []).forEach(function (f) {
                    if (f.options) { optionLists[f.key] = normOptions(f.options); }
                    else if (f.load) {
                        loaders.push(Promise.resolve(f.load(ctx)).then(function (list) { optionLists[f.key] = normOptions(list); })
                            .catch(function (e) { console.error(e); optionLists[f.key] = []; }));
                    }
                });

                var filtersHtml, toolbar;

                function buildLookups() {
                    Object.keys(optionLists).forEach(function (k) {
                        look[k] = {};
                        optionLists[k].forEach(function (o) { look[k][String(o[0])] = o[1]; });
                    });
                }

                /* ---------- الجدول ---------- */
                function cell(col, row) {
                    if (col.render) return col.render(row, look);
                    var v = row[col.key];
                    if (typeof v === 'boolean') return v ? html`<span class="adm-badge adm-badge--ok">نعم</span>` : html`<span class="adm-badge adm-badge--bad">لا</span>`;
                    if (Array.isArray(v)) return shorten(v.join('، '), 60);
                    if (look[col.key] && look[col.key][String(v)] !== undefined) return look[col.key][String(v)];
                    if (col.date) return D.formatDate(v);
                    return v === null || v === undefined || v === '' ? '—' : shorten(v, col.max || 70);
                }

                function renderTable(rows, total) {
                    var pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
                    var host = document.getElementById('crudTable');
                    if (!host) return;

                    if (!rows.length) {
                        D.mount(host, ctx.ui.emptyState(
                            state.search || Object.keys(state.filters).some(function (k) { return state.filters[k]; }) ? 'لا توجد نتائج مطابقة' : 'لا توجد بيانات بعد',
                            'اضغط «إضافة ' + cfg.singular + '» لإضافة أول سجل.'));
                        return;
                    }

                    D.mount(host, html`
                        <div class="adm-table-wrap"><table class="adm-table">
                            <thead><tr>${cfg.columns.map(function (c) { return html`<th>${c.label}</th>`; })}<th class="adm-table__actions">إجراءات</th></tr></thead>
                            <tbody>${rows.map(function (row, i) {
                                return html`<tr>
                                    ${cfg.columns.map(function (c) { return html`<td${c.ltr ? D.raw(' dir="ltr"') : ''} data-label="${c.label}">${cell(c, row)}</td>`; })}
                                    <td class="adm-table__actions">
                                        ${(cfg.rowActions || []).map(function (a, j) { return html`<button type="button" class="adm-btn adm-btn--ghost adm-btn--sm" data-act="x${j}" data-row="${i}">${a.label}</button>`; })}
                                        <button type="button" class="adm-btn adm-btn--ghost adm-btn--sm" data-act="edit" data-row="${i}">تعديل</button>
                                        <button type="button" class="adm-btn adm-btn--danger-ghost adm-btn--sm" data-act="del" data-row="${i}">حذف</button>
                                    </td></tr>`;
                            })}</tbody></table></div>
                        <div class="adm-pager">
                            <span>${total.toLocaleString('ar-EG')} سجل — صفحة ${state.page.toLocaleString('ar-EG')} من ${pages.toLocaleString('ar-EG')}</span>
                            <span><button type="button" class="adm-btn adm-btn--ghost adm-btn--sm" data-pg="prev"${D.raw(state.page <= 1 ? ' disabled' : '')}>السابق</button>
                            <button type="button" class="adm-btn adm-btn--ghost adm-btn--sm" data-pg="next"${D.raw(state.page >= pages ? ' disabled' : '')}>التالي</button></span>
                        </div>`);

                    host.querySelectorAll('[data-act]').forEach(function (b) {
                        b.addEventListener('click', function () {
                            var row = rows[Number(b.getAttribute('data-row'))];
                            var act = b.getAttribute('data-act');
                            if (act === 'edit') openForm(row);
                            else if (act === 'del') askDelete(row);
                            else cfg.rowActions[Number(act.slice(1))].onClick(row, api);
                        });
                    });
                    host.querySelectorAll('[data-pg]').forEach(function (b) {
                        b.addEventListener('click', function () {
                            state.page += b.getAttribute('data-pg') === 'next' ? 1 : -1;
                            reload();
                        });
                    });
                }

                function reload() {
                    var host = document.getElementById('crudTable');
                    if (host) D.mount(host, ctx.ui.loadingState());

                    repo.list({ page: state.page, pageSize: PAGE_SIZE, search: state.search, filters: state.filters }).then(function (res) {
                        if (!alive) return;
                        if (res.error) {
                            D.mount(document.getElementById('crudTable'), ctx.ui.errorState(res.message, 'crudRetry'));
                            var r = document.getElementById('crudRetry');
                            if (r) r.addEventListener('click', reload);
                            return;
                        }
                        var total = res.count || 0;
                        var rows = res.data || [];
                        if (!rows.length && state.page > 1) { state.page -= 1; reload(); return; }
                        renderTable(rows, total);
                    });
                }

                /* ---------- إضافة / تعديل ---------- */
                function openForm(row) {
                    var editing = !!row;
                    var data = row ? (cfg.toForm ? cfg.toForm(row) : row) : (typeof cfg.defaults === 'function' ? cfg.defaults(state) : (cfg.defaults || {}));
                    // فلتر نشط (مثل «الغرفة») يملأ الحقل المقابل تلقائيًا عند الإضافة
                    if (!editing) {
                        data = Object.assign({}, data);
                        Object.keys(state.filters).forEach(function (k) {
                            if (state.filters[k] && data[k] === undefined) {
                                var fd = (cfg.fields || []).filter(function (f) { return f.key === k; })[0];
                                data[k] = fd && fd.valueType === 'number' ? Number(state.filters[k]) : state.filters[k];
                            }
                        });
                    }

                    var body = html`<form id="crudForm" class="adm-form" novalidate>
                        ${cfg.formNote ? html`<p class="adm-note adm-field--full">${cfg.formNote}</p>` : ''}
                        ${cfg.fields.map(function (f) { return fieldHtml(f, data[f.key], optionLists[f.key]); })}
                    </form>`;

                    ctx.ui.modal({
                        title: (editing ? 'تعديل ' : 'إضافة ') + cfg.singular,
                        size: cfg.modalSize || 'lg',
                        body: body,
                        actions: [
                            { label: 'إلغاء', kind: 'ghost' },
                            {
                                label: editing ? 'حفظ التعديلات' : 'إضافة', kind: 'primary', keepOpen: true,
                                onClick: function (api2) {
                                    var form = api2.body.querySelector('#crudForm');
                                    var out = collect(form, cfg.fields);
                                    showErrors(form, out.errors);
                                    if (Object.keys(out.errors).length) return false;

                                    var payload = out.values;
                                    if (cfg.beforeSave) {
                                        var problem = cfg.beforeSave(payload, editing ? 'edit' : 'new', row);
                                        if (problem) { ctx.ui.toast(problem, 'error'); return false; }
                                    }

                                    api2.setBusy(true);
                                    var req = editing ? repo.update(row[idKey], payload) : repo.create(payload);
                                    return req.then(function (res) {
                                        api2.setBusy(false);
                                        if (res.error) { ctx.ui.toast(res.message, 'error'); return false; }
                                        ctx.ui.toast(editing ? 'تم حفظ التعديلات.' : 'تمت الإضافة.', 'success');
                                        api2.close();
                                        if (alive) reload();
                                        return false;
                                    });
                                }
                            }
                        ]
                    });
                }

                /* ---------- حذف ---------- */
                function askDelete(row) {
                    var label = cfg.rowLabel ? cfg.rowLabel(row, look) : String(row[idKey]);
                    ctx.ui.confirm({
                        title: 'حذف ' + cfg.singular,
                        message: 'سيُحذف «' + label + '» نهائيًا ولا يمكن التراجع. ' + (cfg.deleteWarning || ''),
                        confirmLabel: 'حذف نهائيًا', danger: true
                    }).then(function (yes) {
                        if (!yes) return;
                        repo.remove(row[idKey]).then(function (res) {
                            if (res.error) { ctx.ui.toast(res.message, 'error'); return; }
                            ctx.ui.toast('تم الحذف.', 'success');
                            if (alive) reload();
                        });
                    });
                }

                var api = { reload: reload, ctx: ctx, look: look, lists: optionLists, refresh: reload };

                /* ---------- الهيكل ---------- */
                Promise.all(loaders).then(function () {
                    if (!alive) return;
                    buildLookups();

                    filtersHtml = (cfg.filters || []).map(function (f) {
                        return html`<select class="adm-select adm-toolbar__filter" data-filter="${f.key}" aria-label="${f.label}">
                            <option value="">${f.label}: الكل</option>
                            ${(optionLists[f.key] || []).map(function (o) { return html`<option value="${o[0]}"${D.raw(String(state.filters[f.key]) === String(o[0]) ? ' selected' : '')}>${o[1]}</option>`; })}
                        </select>`;
                    });

                    toolbar = html`
                        ${cfg.hint ? html`<p class="adm-hint">${cfg.hint}</p>` : ''}
                        <div class="adm-toolbar">
                            ${cfg.searchColumns && cfg.searchColumns.length ? html`<input type="search" class="adm-input adm-toolbar__search" id="crudSearch" placeholder="🔍 بحث..." aria-label="بحث">` : ''}
                            ${filtersHtml}
                            <button type="button" class="adm-btn adm-btn--primary adm-toolbar__add" id="crudAdd">＋ إضافة ${cfg.singular}</button>
                        </div>
                        <div id="crudTable"></div>`;
                    D.mount(ctx.root, toolbar);

                    var s = document.getElementById('crudSearch');
                    if (s) s.addEventListener('input', D.debounce(function () { state.search = s.value; state.page = 1; reload(); }, 350));
                    ctx.root.querySelectorAll('[data-filter]').forEach(function (sel) {
                        sel.addEventListener('change', function () { state.filters[sel.getAttribute('data-filter')] = sel.value; state.page = 1; reload(); });
                    });
                    document.getElementById('crudAdd').addEventListener('click', function () { openForm(null); });

                    reload();
                });

                D.mount(ctx.root, ctx.ui.loadingState());
                return function () { alive = false; };
            }
        });
    }

    window.AdminCrud = { define: define, fieldHtml: fieldHtml, collect: collect, showErrors: showErrors };
})();
