// =========================================
// مجتمع الطلاب والخريجين — رسم الواجهة
// دوال تأخذ البيانات وتبني عناصر DOM؛ لا تحتفظ بحالة.
// =========================================

const CommunityRender = {

    // ---------- القوائم المنسدلة ----------
    // الأقسام: أقسام المنصة المعتمدة (js/data.js) + أي قسم يظهر في البيانات ولا يوجد فيها
    // المهارات: كل ما يظهر في البيانات (الأكثر تكرارًا أولًا)
    filterOptions(members, refs) {
        const platformDepartments = (typeof departmentsList !== 'undefined' ? departmentsList : [])
            .map(d => d.name);

        CommunityRender.fillSelect(
            refs.departmentFilter,
            CommunityRender.mergeUnique(platformDepartments, members.map(m => m.department))
                .map(name => ({ value: name, label: name }))
        );

        CommunityRender.fillSelect(
            refs.skillFilter,
            CommunityRender.skillOptions(members)
        );
    },

    mergeUnique(primary, extra) {
        return [...new Set([...primary, ...extra].filter(Boolean))];
    },

    // قائمة المهارات الفريدة (المقارنة بالمفتاح الموحّد، والعرض بأول صياغة ظهرت)
    skillOptions(members) {
        const counts = new Map();

        members.forEach(member => member.skills.forEach(skill => {
            const entry = counts.get(skill.key) || { value: skill.key, label: skill.label, count: 0 };
            entry.count += 1;
            counts.set(skill.key, entry);
        }));

        return [...counts.values()].sort((a, b) =>
            b.count - a.count || a.label.localeCompare(b.label, 'ar')
        );
    },

    fillSelect(select, options) {
        const previous = select.value;
        const firstOption = select.options[0];   // خيار "الكل" الثابت في HTML

        select.replaceChildren(firstOption);

        options.forEach(({ value, label }) => {
            select.appendChild(CommunityUtils.el('option', { text: label, attrs: { value } }));
        });

        select.value = options.some(option => option.value === previous) ? previous : '';
    },

    // ---------- نصوص مشتركة ----------
    typeLabel(member) {
        return COMMUNITY_CONFIG.memberTypes[member.type] || '';
    },

    // «الفرقة الثالثة» للطالب، و«تخرّج عام 2019» للخريج (أو فارغ إن لم تتوفر)
    stageLabel(member) {
        if (member.type === 'student') {
            return member.studyYear ? COMMUNITY_CONFIG.studyYears[member.studyYear] : '';
        }
        return member.graduationYear ? `تخرّج عام ${member.graduationYear}` : '';
    },

    badge(member) {
        return CommunityUtils.el('span', {
            className: 'community-badge',
            text: CommunityRender.typeLabel(member),
            attrs: { 'data-type': member.type }
        });
    },

    skillChips(skills, limit) {
        const shown = typeof limit === 'number' ? skills.slice(0, limit) : skills;
        const chips = shown.map(skill => CommunityUtils.el('span', { className: 'community-skill', text: skill.label }));

        if (shown.length < skills.length) {
            chips.push(CommunityUtils.el('span', {
                className: 'community-skill community-skill--more',
                text: `+${skills.length - shown.length}`,
                attrs: { 'aria-label': `و${skills.length - shown.length} مجالات أخرى` }
            }));
        }

        return chips;
    },

    // ---------- البطاقات ----------
    cards(container, members, onOpen) {
        const fragment = document.createDocumentFragment();

        members.forEach(member => fragment.appendChild(CommunityRender.card(member, onOpen)));

        // replaceChildren يمسح القديم أولًا: لا تكرار للبطاقات عند إعادة الرسم
        container.replaceChildren(fragment);
    },

    card(member, onOpen) {
        const stage = CommunityRender.stageLabel(member);

        const heading = CommunityUtils.el('div', { className: 'community-card__heading' }, [
            CommunityUtils.el('div', { className: 'community-card__badges' }, [CommunityRender.badge(member)]),
            CommunityUtils.el('h3', { text: member.name })
        ]);

        const button = CommunityUtils.el('button', {
            className: 'community-details-btn',
            text: 'عرض التفاصيل',
            attrs: { type: 'button', 'aria-haspopup': 'dialog', 'aria-label': `عرض تفاصيل ${member.name}` }
        });

        const card = CommunityUtils.el('article', {
            className: 'card community-card',
            attrs: { 'data-member-id': member.id }
        }, [
            CommunityUtils.el('div', { className: 'community-card__top' }, [
                CommunityUtils.avatar(member.image, member.name),
                heading
            ]),
            member.department
                ? CommunityUtils.el('p', { className: 'community-card__department', text: member.department })
                : null,
            stage
                ? CommunityUtils.el('p', { className: 'community-card__stage', text: stage })
                : null,
            member.bio
                ? CommunityUtils.el('p', { className: 'card-info community-card__bio', text: member.bio })
                : null,
            member.skills.length
                ? CommunityUtils.el('div', { className: 'community-skills' },
                    CommunityRender.skillChips(member.skills, COMMUNITY_CONFIG.maxSkillsOnCard))
                : null,
            CommunityUtils.el('div', { className: 'card-footer' }, [button])
        ]);

        // الضغط على أي مكان في البطاقة يفتح التفاصيل (الزر هو هدف لوحة المفاتيح)
        card.addEventListener('click', () => onOpen(member, button));

        return card;
    },

    // ---------- شارات الفلاتر النشطة ----------
    activeFilters(container, filters) {
        const fragment = document.createDocumentFragment();

        filters.forEach(({ label, onRemove }) => {
            const remove = CommunityUtils.el('button', {
                className: 'community-chip__remove',
                text: '×',
                attrs: { type: 'button', 'aria-label': `إزالة الفلتر: ${label}` }
            });
            remove.addEventListener('click', onRemove);

            fragment.appendChild(CommunityUtils.el('span', { className: 'community-chip' }, [
                CommunityUtils.el('span', { text: label }),
                remove
            ]));
        });

        container.replaceChildren(fragment);
    },

    // ---------- حالات الصفحة (تحميل / خطأ / فارغ) ----------
    statusBox(container, { icon, title, message, actionLabel, onAction, role }) {
        const children = [
            icon ? CommunityUtils.el('div', { className: 'community-status__icon', text: icon, attrs: { 'aria-hidden': 'true' } }) : null,
            title ? CommunityUtils.el('h3', { text: title }) : null,
            message ? CommunityUtils.el('p', { text: message }) : null
        ];

        if (actionLabel && onAction) {
            const action = CommunityUtils.el('button', {
                className: 'community-btn community-btn--primary',
                text: actionLabel,
                attrs: { type: 'button' }
            });
            action.addEventListener('click', onAction);
            children.push(action);
        }

        container.replaceChildren(CommunityUtils.el('div', {
            className: 'community-status',
            attrs: role ? { role } : {}
        }, children));
    },

    loading(container) {
        // نفس شاشة التحميل المستخدمة في المنصة (components.css)
        container.replaceChildren(CommunityUtils.el('div', {
            className: 'loading-screen',
            attrs: { role: 'status' }
        }, [
            CommunityUtils.el('div', { className: 'loading-spinner', text: '⚙️', attrs: { 'aria-hidden': 'true' } }),
            CommunityUtils.el('p', { text: 'جاري تحميل مجتمع الطلاب والخريجين...' })
        ]));
    },

    error(container, onRetry) {
        CommunityRender.statusBox(container, {
            icon: '⚠️',
            title: 'تعذر تحميل المجتمع',
            message: 'حدثت مشكلة أثناء الاتصال بالخادم. تأكد من اتصالك بالإنترنت ثم أعد المحاولة.',
            actionLabel: 'إعادة المحاولة',
            onAction: onRetry,
            role: 'alert'
        });
    },

    emptySource(container) {
        CommunityRender.statusBox(container, {
            icon: '🌱',
            title: 'لا يوجد أعضاء في المجتمع حتى الآن',
            message: 'سيظهر الطلاب والخريجون هنا فور إضافتهم.'
        });
    },

    emptyResults(container, onReset) {
        CommunityRender.statusBox(container, {
            icon: '🔍',
            title: 'لم يتم العثور على نتائج',
            message: 'لا يوجد عضو يطابق البحث أو الفلاتر المحددة. جرّب تغيير كلمات البحث أو مسح الفلاتر.',
            actionLabel: 'مسح كل الفلاتر',
            onAction: onReset
        });
    }
};
