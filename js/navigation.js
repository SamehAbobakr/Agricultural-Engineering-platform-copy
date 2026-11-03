// =========================================
// سجل التنقل الخاص بالمنصة
// =========================================
let currentProgram = '';
let navigationHistory = [
    {
        program: '',
        grade: '',
        dept: '',
        term: '',
        subject: null
    }
];
let currentTopYears = [];
let currentExamSchedules = [];

let navigationIndex = 0;

let currentSubject = null;
// =========================================
// حفظ حالة التنقل
// =========================================

function saveNavigationState() {

    const state = {
        program: currentProgram || '',
        grade: currentGrade || '',
        dept: currentDept || '',
        term: currentTerm || '',
        subject: currentSubject || null
    };

    // لو رجعنا للخلف ثم اخترنا مسارًا جديدًا
    if (navigationIndex < navigationHistory.length - 1) {
        navigationHistory =
            navigationHistory.slice(0, navigationIndex + 1);
    }

    // منع تسجيل نفس الحالة مرتين
    const currentState = navigationHistory[navigationIndex];

    if (
        currentState &&
        currentState.program === state.program &&
        currentState.grade === state.grade &&
        currentState.dept === state.dept &&
        currentState.term === state.term &&
        (
            currentState.subject?.id || null
        ) === (
            state.subject?.id || null
        )
    ) {
        
        return;
    }

    navigationHistory.push(state);

    navigationIndex = navigationHistory.length - 1;

    
}



// =========================================
// الانتقال إلى حالة سابقة من الـBreadcrumb
// =========================================

function goToHistoryState(index) {

    if (
        index < 0 ||
        index >= navigationHistory.length ||
        index === navigationIndex
    ) {
        return;
    }

    navigationIndex = index;

    const state = navigationHistory[navigationIndex];

    currentProgram = state.program || '';
    currentGrade = state.grade || '';
    currentDept = state.dept || '';
    currentTerm = state.term || '';
    currentSubject = state.subject || null;

    renderNavigationState();

    
}
// =========================================
// الانتقال إلى مستوى معين في الـHistory
// =========================================

function goToHistoryLevel(level) {

    for (let i = navigationIndex - 1; i >= 0; i--) {

        const state = navigationHistory[i];

        // الرئيسية
        if (level === 'home') {
            if (
                !state.program &&
                !state.grade &&
                !state.dept &&
                !state.term &&
                !state.subject
            ) {
                goToHistoryState(i);
                return;
            }
        }

        // البرنامج
        if (level === 'program') {
            if (
                state.program === currentProgram &&
                !state.grade &&
                !state.dept &&
                !state.term &&
                !state.subject
            ) {
                goToHistoryState(i);
                return;
            }
        }

        // الفرقة
        if (level === 'grade') {
            if (
                state.program === currentProgram &&
                state.grade === currentGrade &&
                !state.dept &&
                !state.term &&
                !state.subject
            ) {
                goToHistoryState(i);
                return;
            }
        }

        // القسم
        if (level === 'dept') {
            if (
                state.program === currentProgram &&
                state.grade === currentGrade &&
                state.dept === currentDept &&
                !state.term &&
                !state.subject
            ) {
                goToHistoryState(i);
                return;
            }
        }

        // الترم
        if (level === 'term') {
            if (
                state.program === currentProgram &&
                state.grade === currentGrade &&
                state.dept === currentDept &&
                state.term === currentTerm &&
                !state.subject
            ) {
                goToHistoryState(i);
                return;
            }
        }
    }
}

function renderNavigationState() {

    showLoading(() => {

        // داخل مادة
        if (currentSubject) {
            renderMaterialPage(currentSubject);
            return;
        }

        // الرئيسية
        if (!currentProgram) {
            renderHome();
            return;
        }

        // المصادر الإضافية
        if (currentProgram === 'مصادر إضافية') {
            renderAdditionalResources();
            return;
        }
  
        // المزيد
        if (currentProgram === 'المزيد') {
            renderMore();
            return;
        }
        // الأوائل
        if (currentProgram === 'الأوائل') {
                renderTopYears();
                return;
            }

        // برنامج تم اختياره ولم يتم اختيار فرقة
        if (!currentGrade) {
            renderGrades();
            return;
        }

        // الفرقة الثالثة أو الرابعة في الهندسة الزراعية فقط
            if (
                currentProgram === 'الهندسة الزراعية' &&
                (currentGrade === 'الفرقة الثالثة' ||
                currentGrade === 'الفرقة الرابعة') &&
                !currentDept
            ) {
                renderDepartments();
                return;
            }
        // لا يوجد ترم
        if (!currentTerm) {
            renderTerms();
            return;
        }

        // عرض المواد
        renderSubjects();
    });
}

function selectGrade(grade) {
    currentGrade = grade;
    currentDept = '';
    currentTerm = '';

    saveNavigationState();

    showLoading(() => {

        // اللاندسكيب: كل الفرق بدون أقسام
        if (currentProgram === 'اللاندسكيب والمسطحات الخضراء') {
            renderTerms();
            return;
        }

        // الهندسة الزراعية: الثالثة والرابعة بها أقسام
        if (
            grade === 'الفرقة الثالثة' ||
            grade === 'الفرقة الرابعة'
        ) {
            renderDepartments();
        } else {
            renderTerms();
        }

    });
}

function selectDepartment(deptName) {
    currentDept = deptName;
    currentTerm = '';

    saveNavigationState();

    showLoading(() => renderTerms());
}

function selectTerm(termName) {
    currentTerm = termName;

    saveNavigationState();

    showLoading(() => renderSubjects());
}

function resetView() {

    navigationIndex = 0;

    const state = navigationHistory[0];

    currentProgram = state.program || '';
    currentGrade = state.grade || '';
    currentDept = state.dept || '';
    currentTerm = state.term || '';
    currentSubject = state.subject || null;

    renderNavigationState();

    
}

function selectProgram(program) {
    currentProgram = program;
    currentGrade = '';
    currentDept = '';
    currentTerm = '';
    currentSubject = null;

    saveNavigationState();

    showLoading(() => {

        // المصادر الإضافية
        if (program === 'مصادر إضافية') {
            renderAdditionalResources();
            return;
        }

        // المزيد
        if (program === 'المزيد') {
            renderMore();
            return;
        }

        // الهندسة الزراعية أو اللاندسكيب
        renderGrades();
    });
}