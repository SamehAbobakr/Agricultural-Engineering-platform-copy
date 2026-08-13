let currentGrade = '';
let currentDept = '';
let currentTerm = '';

function selectGrade(grade) {
    currentGrade = grade;
    currentDept = ''; 
    currentTerm = '';
    updateSidebarActive();
    showLoading(() => {
        if (grade === 'الفرقة الثالثة' || grade === 'الفرقة الرابعة') {
            renderDepartments();
        } else {
            renderTerms();
        }
    });
}

function selectDeptDirect(grade, dept) {
    currentGrade = grade;
    currentDept = dept;
    currentTerm = '';
    updateSidebarActive();
    showLoading(() => renderTerms());
}

function selectDepartment(deptName) {
    currentDept = deptName;
    currentTerm = '';
    showLoading(() => renderTerms());
}

function selectTerm(termName) {
    currentTerm = termName;
    showLoading(() => renderSubjects());
}

function resetView() {
    renderHome();
}

function updateSidebarActive() {
    document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
    if (!currentGrade) {
        const homeEl = document.getElementById('side-home');
        if(homeEl) homeEl.classList.add('active');
    } else if (currentGrade === 'الفرقة الأولى') {
        const g1 = document.getElementById('side-g1');
        if(g1) g1.classList.add('active');
    } else if (currentGrade === 'الفرقة الثانية') {
        const g2 = document.getElementById('side-g2');
        if(g2) g2.classList.add('active');
    } else if (currentGrade === 'الفرقة الثالثة') {
        const g3 = document.getElementById('side-g3');
        if(g3) g3.classList.add('active');
    } else if (currentGrade === 'الفرقة الرابعة') {
        const g4 = document.getElementById('side-g4');
        if(g4) g4.classList.add('active');
    }
}

function toggleScrollBtn() {
    const btn = document.getElementById('scrollTopBtn');
    if (window.scrollY > 200) {
        btn.style.display = 'flex';
    } else {
        btn.style.display = 'none';
    }
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleDarkMode() {
    // ميزة الوضع الليلي/النهار المستقبلية
    alert('خاصية تبديل المظهر قيد التفعيل');
}