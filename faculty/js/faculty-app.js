// =========================================
// دليل أعضاء هيئة التدريس — تشغيل الصفحة
// يربط الواجهة بطبقة البيانات: تحميل ← بحث وفلاتر ← رسم.
// =========================================

const FacultyApp = {

    members: [],
    filters: { search: '', department: '', title: '' },
    refs: {},
    searchTimer: null,
    loadId: 0,

    init() {
        const byId = id => document.getElementById(id);

        FacultyApp.refs = {
            demoNotice: byId('facultyDemoNotice'),
            
            controls: byId('facultyControls'),
            search: byId('facultySearch'),
            departmentFilter: byId('facultyDepartmentFilter'),
            titleFilter: byId('facultyTitleFilter'),
            resetBtn: byId('facultyResetBtn'),
            resultsCount: byId('facultyResultsCount'),
            activeFilters: byId('facultyActiveFilters'),
            status: byId('facultyStatus'),
            grid: byId('facultyGrid'),
        };

        FacultyModal.init();
        FacultyApp.bindEvents();
        FacultyApp.refs.demoNotice.hidden = FACULTY_CONFIG.dataSource !== 'demo';

        FacultyApp.load();
    },

    // ---------- تحميل البيانات ----------
    async load() {
        const { refs } = FacultyApp;
        const currentLoad = ++FacultyApp.loadId;

        FacultyApp.setReady(false);
        refs.grid.replaceChildren();
        FacultyRender.loading(refs.status);

        const { members, error } = await FacultyApi.load();

        // تجاهل نتيجة طلب قديم إن بدأ طلب أحدث (يمنع تكرار البطاقات عند إعادة المحاولة)
        if (currentLoad !== FacultyApp.loadId) return;

        if (error) {
            FacultyRender.error(refs.status, () => FacultyApp.load());
            return;
        }

        FacultyApp.members = members.map(member => ({
            ...member,
            searchText: FacultyUtils.searchKey(
                [member.name, member.specialization, member.department, member.title, member.bio].join(' ')
            )
        }));

        if (!FacultyApp.members.length) {
            FacultyRender.emptySource(refs.status);
            return;
        }

        FacultyRender.filterOptions(FacultyApp.members, refs);
        FacultyApp.setReady(true);
        FacultyApp.syncFiltersFromControls();
        FacultyApp.render();
    },

    // إظهار/إخفاء الإحصائيات وأدوات البحث (تظهر فقط عند وجود بيانات)
    setReady(isReady) {
    FacultyApp.refs.controls.hidden = !isReady;
},

    // ---------- الفلاتر ----------
    syncFiltersFromControls() {
        const { refs, filters } = FacultyApp;

        filters.search = refs.search.value;
        filters.department = refs.departmentFilter.value;
        filters.title = refs.titleFilter.value;
    },

    getFiltered() {
        const { filters, members } = FacultyApp;
        const query = FacultyUtils.searchKey(filters.search);

        return members.filter(member =>
            (!query || member.searchText.includes(query)) &&
            (!filters.department || member.department === filters.department) &&
            (!filters.title || member.title === filters.title)
        );
    },

    resetFilters() {
        const { refs } = FacultyApp;

        refs.search.value = '';
        refs.departmentFilter.value = '';
        refs.titleFilter.value = '';
        FacultyApp.syncFiltersFromControls();
        FacultyApp.render();
    },

    // ---------- الرسم ----------
    render() {
        const { refs, members } = FacultyApp;
        const filtered = FacultyApp.getFiltered();

        refs.resultsCount.textContent = `${filtered.length} من ${members.length}`;
        FacultyApp.renderActiveFilters();

        if (!filtered.length) {
            refs.grid.replaceChildren();
            FacultyRender.emptyResults(refs.status, () => FacultyApp.resetFilters());
            return;
        }

        refs.status.replaceChildren();
        FacultyRender.cards(refs.grid, filtered, (member, trigger) => FacultyModal.open(member, trigger));
    },

    renderActiveFilters() {
        const { refs, filters } = FacultyApp;
        const active = [];

        if (filters.search.trim()) {
            active.push({
                label: `البحث: ${filters.search.trim()}`,
                onRemove: () => { refs.search.value = ''; FacultyApp.afterFilterChange(); }
            });
        }
        if (filters.department) {
            active.push({
                label: `القسم: ${filters.department}`,
                onRemove: () => { refs.departmentFilter.value = ''; FacultyApp.afterFilterChange(); }
            });
        }
        if (filters.title) {
            active.push({
                label: `الدرجة: ${filters.title}`,
                onRemove: () => { refs.titleFilter.value = ''; FacultyApp.afterFilterChange(); }
            });
        }

        FacultyRender.activeFilters(refs.activeFilters, active);
    },

    afterFilterChange() {
        FacultyApp.syncFiltersFromControls();
        FacultyApp.render();
    },

    // ---------- الأحداث ----------
    bindEvents() {
        const { refs } = FacultyApp;

        refs.search.addEventListener('input', () => {
            clearTimeout(FacultyApp.searchTimer);
            FacultyApp.searchTimer = setTimeout(FacultyApp.afterFilterChange, FACULTY_CONFIG.searchDebounceMs);
        });

        refs.departmentFilter.addEventListener('change', FacultyApp.afterFilterChange);
        refs.titleFilter.addEventListener('change', FacultyApp.afterFilterChange);
        refs.resetBtn.addEventListener('click', FacultyApp.resetFilters);
    }
};

document.addEventListener('DOMContentLoaded', FacultyApp.init);
