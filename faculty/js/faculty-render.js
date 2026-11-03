// =========================================
// دليل أعضاء هيئة التدريس — رسم الواجهة
// دوال تأخذ البيانات وتبني عناصر DOM؛ لا تحتفظ بحالة.
// =========================================

const FacultyRender = {

    

    // ---------- القوائم المنسدلة ----------
    // الأقسام: أقسام المنصة المعتمدة (js/data.js) + أي قسم يظهر في البيانات ولا يوجد فيها
    // الدرجات: الترتيب المعتمد في الإعدادات + أي درجة جديدة تظهر في البيانات
    filterOptions(members, refs) {
        const platformDepartments = (typeof departmentsList !== 'undefined' ? departmentsList : [])
            .map(d => d.name);

        FacultyRender.fillSelect(
            refs.departmentFilter,
            FacultyRender.mergeUnique(platformDepartments, members.map(m => m.department))
        );

        FacultyRender.fillSelect(
            refs.titleFilter,
            FacultyRender.mergeUnique(FACULTY_CONFIG.titleOrder, members.map(m => m.title))
        );
    },

    mergeUnique(primary, extra) {
        return [...new Set([...primary, ...extra].filter(Boolean))];
    },

    fillSelect(select, values) {
        const previous = select.value;
        const firstOption = select.options[0];   // خيار "الكل" الثابت في HTML

        select.replaceChildren(firstOption);

        values.forEach(value => {
            select.appendChild(FacultyUtils.el('option', { text: value, attrs: { value } }));
        });

        // نحافظ على الاختيار السابق إن كان ما زال موجودًا
        select.value = values.includes(previous) ? previous : '';
    },

    // ---------- البطاقات ----------
    cards(container, members, onOpen) {
        const fragment = document.createDocumentFragment();

        members.forEach(member => fragment.appendChild(FacultyRender.card(member, onOpen)));

        // replaceChildren يمسح القديم أولًا: لا تكرار للبطاقات عند إعادة الرسم
        container.replaceChildren(fragment);
    },

    badge(member) {
        const rank = FACULTY_CONFIG.titleOrder.indexOf(member.title);

        return FacultyUtils.el('span', {
            className: 'faculty-badge',
            text: member.title || 'غير محدد',
            attrs: { 'data-rank': rank === -1 ? 'other' : rank }
        });
    },

    card(member, onOpen) {
        const headingRow = FacultyUtils.el('div', { className: 'faculty-card__badges' }, [
            FacultyRender.badge(member),
            member.isDemo ? FacultyUtils.el('span', { className: 'faculty-badge faculty-badge--demo', text: 'تجريبي' }) : null
        ]);

        const heading = FacultyUtils.el('div', { className: 'faculty-card__heading' }, [
            headingRow,
            FacultyUtils.el('h3', { text: member.name })
        ]);

        const button = FacultyUtils.el('button', {
            className: 'faculty-details-btn',
            text: 'عرض التفاصيل',
            attrs: { type: 'button', 'aria-haspopup': 'dialog', 'aria-label': `عرض تفاصيل ${member.name}` }
        });

        const card = FacultyUtils.el('article', {
            className: 'card faculty-card',
            attrs: { 'data-member-id': member.id }
        }, [
            FacultyUtils.el('div', { className: 'faculty-card__top' }, [
                FacultyUtils.avatar(member.image, member.name),
                heading
            ]),
            member.department
                ? FacultyUtils.el('p', { className: 'faculty-card__department', text: member.department })
                : null,
            member.specialization
                ? FacultyUtils.el('p', { className: 'card-info faculty-card__specialization', text: member.specialization })
                : null,
            FacultyUtils.el('div', { className: 'card-footer' }, [button])
        ]);

        // الضغط على أي مكان في البطاقة يفتح التفاصيل (الزر هو هدف لوحة المفاتيح)
        card.addEventListener('click', () => onOpen(member, button));

        return card;
    },

    // ---------- شارات الفلاتر النشطة ----------
    activeFilters(container, filters) {
        const fragment = document.createDocumentFragment();

        filters.forEach(({ label, onRemove }) => {
            const remove = FacultyUtils.el('button', {
                className: 'faculty-chip__remove',
                text: '×',
                attrs: { type: 'button', 'aria-label': `إزالة الفلتر: ${label}` }
            });
            remove.addEventListener('click', onRemove);

            fragment.appendChild(FacultyUtils.el('span', { className: 'faculty-chip' }, [
                FacultyUtils.el('span', { text: label }),
                remove
            ]));
        });

        container.replaceChildren(fragment);
    },

    // ---------- حالات الصفحة (تحميل / خطأ / فارغ) ----------
    statusBox(container, { icon, title, message, actionLabel, onAction, role }) {
        const children = [
            icon ? FacultyUtils.el('div', { className: 'faculty-status__icon', text: icon, attrs: { 'aria-hidden': 'true' } }) : null,
            title ? FacultyUtils.el('h3', { text: title }) : null,
            message ? FacultyUtils.el('p', { text: message }) : null
        ];

        if (actionLabel && onAction) {
            const action = FacultyUtils.el('button', {
                className: 'faculty-btn faculty-btn--primary',
                text: actionLabel,
                attrs: { type: 'button' }
            });
            action.addEventListener('click', onAction);
            children.push(action);
        }

        container.replaceChildren(FacultyUtils.el('div', {
            className: 'faculty-status',
            attrs: role ? { role } : {}
        }, children));
    },

    loading(container) {
        // نفس شاشة التحميل المستخدمة في المنصة (components.css)
        container.replaceChildren(FacultyUtils.el('div', {
            className: 'loading-screen',
            attrs: { role: 'status' }
        }, [
            FacultyUtils.el('div', { className: 'loading-spinner', text: '⚙️', attrs: { 'aria-hidden': 'true' } }),
            FacultyUtils.el('p', { text: 'جاري تحميل دليل أعضاء هيئة التدريس...' })
        ]));
    },

    error(container, onRetry) {
        FacultyRender.statusBox(container, {
            icon: '⚠️',
            title: 'تعذر تحميل الدليل',
            message: 'حدثت مشكلة أثناء الاتصال بالخادم. تأكد من اتصالك بالإنترنت ثم أعد المحاولة.',
            actionLabel: 'إعادة المحاولة',
            onAction: onRetry,
            role: 'alert'
        });
    },

    emptySource(container) {
        FacultyRender.statusBox(container, {
            icon: '📭',
            title: 'لا توجد بيانات في الدليل حتى الآن',
            message: 'سيظهر أعضاء هيئة التدريس هنا فور إضافتهم.'
        });
    },

    emptyResults(container, onReset) {
        FacultyRender.statusBox(container, {
            icon: '🔍',
            title: 'لم يتم العثور على نتائج',
            message: 'لا يوجد عضو يطابق البحث أو الفلاتر المحددة. جرّب تغيير كلمات البحث أو مسح الفلاتر.',
            actionLabel: 'مسح كل الفلاتر',
            onAction: onReset
        });
    }
};
