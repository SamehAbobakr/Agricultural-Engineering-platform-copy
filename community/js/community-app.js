// =========================================
// مجتمع الطلاب والخريجين — تشغيل الصفحة
// يربط الواجهة بطبقة البيانات: تحميل ← بحث وفلاتر ← رسم.
// =========================================

const CommunityApp = {

    members: [],
    filters: { search: '', type: '', department: '', year: '', skill: '' },
    refs: {},
    searchTimer: null,
    loadId: 0,

    init() {
        const byId = id => document.getElementById(id);

        CommunityApp.refs = {
            controls: byId('communityControls'),
            search: byId('communitySearch'),
            typeFilter: byId('communityTypeFilter'),
            departmentFilter: byId('communityDepartmentFilter'),
            yearFilter: byId('communityYearFilter'),
            skillFilter: byId('communitySkillFilter'),
            resetBtn: byId('communityResetBtn'),
            resultsCount: byId('communityResultsCount'),
            activeFilters: byId('communityActiveFilters'),
            status: byId('communityStatus'),
            grid: byId('communityGrid')
        };

        CommunityApp.markActiveNav();
        CommunityModal.init();
        CommunityApp.fillYearOptions();
        CommunityApp.bindEvents();
        CommunityApp.load();
    },

    // دالة updateHeaderActiveLink في js/ui.js لا تعرف هذه الصفحة وتجعل «الرئيسية» نشطة،
    // فنضبط الرابط النشط هنا (يعمل بعدها لأن ui.js يُحمَّل قبل هذا الملف) دون تعديل ui.js.
    markActiveNav() {
        document.querySelectorAll('.main-nav .nav-link').forEach(link => {
            const isActive = link.dataset.nav === 'community';

            link.classList.toggle('active', isActive);

            if (isActive) link.setAttribute('aria-current', 'page');
            else link.removeAttribute('aria-current');
        });
    },

    fillYearOptions() {
        const select = CommunityApp.refs.yearFilter;

        Object.entries(COMMUNITY_CONFIG.studyYears).forEach(([value, label]) => {
            select.appendChild(CommunityUtils.el('option', { text: label, attrs: { value } }));
        });
    },

    // ---------- تحميل البيانات ----------
    async load() {
        const { refs } = CommunityApp;
        const currentLoad = ++CommunityApp.loadId;

        refs.controls.hidden = true;
        refs.grid.replaceChildren();
        CommunityRender.loading(refs.status);

        const { members, error } = await CommunityApi.load();

        // تجاهل نتيجة طلب قديم إن بدأ طلب أحدث (يمنع تكرار البطاقات عند إعادة المحاولة)
        if (currentLoad !== CommunityApp.loadId) return;

        if (error) {
            CommunityRender.error(refs.status, () => CommunityApp.load());
            return;
        }

        CommunityApp.members = members.map(member => ({
            ...member,
            searchText: CommunityUtils.searchKey(
                [member.name, member.department, member.bio, member.skills.map(s => s.label).join(' ')].join(' ')
            )
        }));

        if (!CommunityApp.members.length) {
            CommunityRender.emptySource(refs.status);
            return;
        }

        CommunityRender.filterOptions(CommunityApp.members, refs);
        refs.controls.hidden = false;
        CommunityApp.syncFiltersFromControls();
        CommunityApp.render();
    },

    // ---------- الفلاتر ----------
    syncFiltersFromControls() {
        const { refs, filters } = CommunityApp;

        // الفرقة الدراسية خاصة بالطلاب: نعطّلها عند اختيار «خريج» حتى لا تُنتج نتائج فارغة دائمًا
        const yearApplies = refs.typeFilter.value !== 'graduate';
        if (!yearApplies) refs.yearFilter.value = '';
        refs.yearFilter.disabled = !yearApplies;

        filters.search = refs.search.value;
        filters.type = refs.typeFilter.value;
        filters.department = refs.departmentFilter.value;
        filters.year = refs.yearFilter.value;
        filters.skill = refs.skillFilter.value;
    },

    // كل الفلاتر تعمل معًا (AND)
    getFiltered() {
        const { filters, members } = CommunityApp;
        const query = CommunityUtils.searchKey(filters.search);
        const year = filters.year ? Number(filters.year) : null;

        return members.filter(member =>
            (!query || member.searchText.includes(query)) &&
            (!filters.type || member.type === filters.type) &&
            (!filters.department || member.department === filters.department) &&
            (!year || (member.type === 'student' && member.studyYear === year)) &&
            (!filters.skill || member.skills.some(skill => skill.key === filters.skill))
        );
    },

    resetFilters() {
        const { refs } = CommunityApp;

        refs.search.value = '';
        refs.typeFilter.value = '';
        refs.departmentFilter.value = '';
        refs.yearFilter.value = '';
        refs.skillFilter.value = '';
        CommunityApp.afterFilterChange();
    },

    // ---------- الرسم ----------
    render() {
        const { refs, members } = CommunityApp;
        const filtered = CommunityApp.getFiltered();

        refs.resultsCount.textContent = `${filtered.length} من ${members.length}`;
        CommunityApp.renderActiveFilters();

        if (!filtered.length) {
            refs.grid.replaceChildren();
            CommunityRender.emptyResults(refs.status, () => CommunityApp.resetFilters());
            return;
        }

        refs.status.replaceChildren();
        CommunityRender.cards(refs.grid, filtered, (member, trigger) => CommunityModal.open(member, trigger));
    },

    renderActiveFilters() {
        const { refs, filters } = CommunityApp;
        const active = [];

        const add = (label, control) => active.push({
            label,
            onRemove: () => { control.value = ''; CommunityApp.afterFilterChange(); }
        });

        const selectedLabel = select => select.options[select.selectedIndex]
            ? select.options[select.selectedIndex].textContent
            : '';

        if (filters.search.trim()) add(`البحث: ${filters.search.trim()}`, refs.search);
        if (filters.type) add(`الصفة: ${selectedLabel(refs.typeFilter)}`, refs.typeFilter);
        if (filters.department) add(`القسم: ${filters.department}`, refs.departmentFilter);
        if (filters.year) add(`الفرقة: ${selectedLabel(refs.yearFilter)}`, refs.yearFilter);
        if (filters.skill) add(`المجال: ${selectedLabel(refs.skillFilter)}`, refs.skillFilter);

        CommunityRender.activeFilters(refs.activeFilters, active);
    },

    afterFilterChange() {
        CommunityApp.syncFiltersFromControls();
        CommunityApp.render();
    },

    // ---------- الأحداث ----------
    bindEvents() {
        const { refs } = CommunityApp;

        refs.search.addEventListener('input', () => {
            clearTimeout(CommunityApp.searchTimer);
            CommunityApp.searchTimer = setTimeout(CommunityApp.afterFilterChange, COMMUNITY_CONFIG.searchDebounceMs);
        });

        [refs.typeFilter, refs.departmentFilter, refs.yearFilter, refs.skillFilter]
            .forEach(select => select.addEventListener('change', CommunityApp.afterFilterChange));

        refs.resetBtn.addEventListener('click', CommunityApp.resetFilters);
    }
};

document.addEventListener('DOMContentLoaded', CommunityApp.init);
