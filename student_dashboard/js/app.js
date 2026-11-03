/**
 * لوحة إنجاز الطالب - الهندسة الزراعية
 *
 * - المواد الدراسية (عامة) تتحمل من جدول subjects في Supabase.
 * - بيانات الطالب (الأهداف، تقدمه في المواد، بياناته الشخصية، ملاحظاته) محفوظة في Supabase
 *   مرتبطة بحسابه، وتحميها سياسات RLS (انظر database/student_dashboard.sql).
 *   لم يعد localStorage مصدرًا لبيانات الطالب (يبقى فقط لتفضيل الثيم في js/header.js).
 * - الجلسة تأتي من العميل المشترك في ../js/auth.js (عميل Supabase واحد للصفحة).
 *
 * قواعد الجلسة (مهمة عند التعديل):
 *   epoch   رقم يزيد عند كل تغيّر في الحساب. أي طلب أو مؤقت يلتقط رقمه عند بدايته،
 *           وإذا اختلف عند عودته يُتجاهل — فلا تظهر بيانات حساب سابق أبدًا.
 *   الحفظ   تغييرات الطالب لا تظهر في الواجهة ولا تُعرض رسالة نجاح إلا بعد تأكيد Supabase.
 */
import { APP_CONFIG } from './config.js';
import { INITIAL_DATA } from './dashboard-data.js';
import { supabaseClient } from './supabase-client.js';

const Auth = window.PlatformAuth || null;
const T = APP_CONFIG.TABLES;
const LIMITS = APP_CONFIG.LIMITS;
const DEPARTMENT_FILTER_KEY = 'student_dashboard_department_filter';

const $ = id => document.getElementById(id);
const clone = o => JSON.parse(JSON.stringify(o));
const YEARS = { '1': 'الفرقة الأولى', '2': 'الفرقة الثانية', '3': 'الفرقة الثالثة', '4': 'الفرقة الرابعة' };
const TERMS = { '1': 'الترم الأول', '2': 'الترم الثاني' };
const invert = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [v, k]));

const freshState = () => clone(INITIAL_DATA);

let appState = freshState();      // بيانات الطالب الحالي فقط (تُفرَّغ عند أي تغيّر في الحساب)
let remoteSubjects = [];          // المواد (بيانات عامة، بلا أي بيانات طالب)
let loadStatus = 'loading';       // حالة تحميل المواد: loading | ready | error
let authStatus = 'checking';      // checking | signed-out | signed-in | error
let dataStatus = 'idle';          // بيانات الطالب: idle | loading | ready | error
let currentUserId = null;
let wasSignedIn = false;          // لرسالة «انتهت الجلسة» بدل رسالة الدخول العادية
let profileExists = false;        // هل للطالب صف في جدول البيانات الشخصية؟
let epoch = 0;
let sessionAbort = null;
let writeChain = Promise.resolve();
let notesTimer = null;
let pendingNotes = null;
let toastTimer;
let editingId = null;
const busy = new Set();           // عناصر قيد الحفظ (تمنع الضغط المتكرر)

class StaleSession extends Error {}

const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
const safeUrl = u => (/^https?:\/\//i.test(u || '') ? u : '');
const clampInt = (v, min, max) => Math.min(max, Math.max(min, parseInt(v, 10) || 0));
const icons = () => window.lucide && window.lucide.createIcons();

const isLocked = () => !(authStatus === 'signed-in' && dataStatus === 'ready');


/* ---------- حسابات مساعدة ---------- */
// بيانات المادة = المادة العامة + تقدّم الطالب الحالي (يُحسب وقت العرض، فلا يبقى شيء من حساب سابق)
function courseView(s) {
    const p = appState.progress[s.id] || {};
    const total = clampInt(p.totalFiles, 0, LIMITS.courseFiles);
    return { ...s, totalFiles: total, reviewedFiles: clampInt(p.reviewedFiles, 0, total), link: safeUrl(p.link) };
}

const getCourse = id => {
    const s = remoteSubjects.find(x => x.id === id);
    return s ? courseView(s) : null;
};

const termCourses = () => remoteSubjects
    .filter(s => s.year === String(appState.userProfile.academicYear) && s.term === String(appState.userProfile.academicTerm))
    .map(courseView);

/* ---------- الإشعارات ---------- */
const TOAST = { success: ['check-circle-2', 'success'], error: ['alert-circle', 'error'], warning: ['alert-triangle', 'warning'], info: ['info', 'info'] };

function showToast(title, message, type = 'info') {
    const box = $('toast-container');
    if (!box) return;
    const [icon, kind] = TOAST[type] || TOAST.info;
    $('toast-title').textContent = title;
    $('toast-message').textContent = message;
    $('toast-icon-wrap').innerHTML = `<i data-lucide="${icon}" class="w-5 h-5 toast-icon"></i>`;
    box.className = `toast toast--${kind}`;
    icons();
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => box.classList.add('hidden'), 4000);
}


/* ---------- العرض ---------- */
function renderHeaderAndProfile() {
    const p = appState.userProfile;
    const name = p.studentName || 'طالب هندسة زراعية';
    $('student-name-display').textContent = name;
    $('student-academic-badge').textContent = `${YEARS[p.academicYear] || ''} • ${TERMS[p.academicTerm] || ''}`;
    $('student-quote-display').textContent = `"${p.quote || INITIAL_DATA.userProfile.quote}"`;
    const notes = $('student-quick-notes');
    if (document.activeElement !== notes) notes.value = p.quickNotes || '';
    $('main-year-select').value = p.academicYear;
    $('main-term-select').value = p.academicTerm;
}

function renderStatsOverview() {
    const list = termCourses();
    const total = list.reduce((a, c) => a + c.totalFiles, 0);
    const done = list.reduce((a, c) => a + c.reviewedFiles, 0);
    const pct = total ? Math.round(done / total * 100) : 0;
    $('stat-total-courses').textContent = loadStatus === 'ready' ? list.length : '--';
    $('stat-total-files').textContent = total ? `${pct}%` : '--';
    $('stat-files-sub').textContent = total ? `${done} من ${total} محاضرة تمت مراجعتها` : 'حدّد عدد المحاضرات لكل مادة';

    const goals = appState.goals, doneGoals = goals.filter(g => g.completed).length;
    $('stat-completed-goals').textContent = `${doneGoals} / ${goals.length}`;
    $('stat-goals-ratio').textContent = `${goals.length ? Math.round(doneGoals / goals.length * 100) : 0}% نسبة الإنجاز`;
    $('stat-gpa-display').textContent = appState.userProfile.gpa || 'غير محدد';
    $('stat-academic-year-label').textContent = YEARS[appState.userProfile.academicYear] || '';
}

function courseCard(c) {
    const total = c.totalFiles, rev = c.reviewedFiles;
    const pct = total ? Math.round(rev / total * 100) : 0;
    const done = total > 0 && rev >= total;
    const link = safeUrl(c.link);
    return `
    <article class="card course-card">
        <div class="space-y-2">
            <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                    <h3>${escapeHtml(c.name)}</h3>
                    ${c.department ? `<span class="dash-caption">${escapeHtml(c.department)}</span>` : ''}
                </div>
                <button type="button" data-action="edit" data-id="${escapeHtml(c.id)}" aria-label="تعديل المادة" title="تعديل المادة" class="dash-icon-btn">
                    <i data-lucide="pencil" class="w-4 h-4"></i>
                </button>
            </div>
            <div class="flex items-center justify-between text-xs dash-muted">
                <span>مراجعة المحاضرات</span>
                <span class="dash-strong">${total ? `${rev} من ${total}` : 'غير محدد'}</span>
            </div>
            <div class="progress-bar-bg" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
        </div>
        <div class="card-footer">
            <span class="dash-status">${done ? '✓ تمت المراجعة' : `${pct}% مكتمل`}</span>
            <div class="flex items-center gap-1">
                ${link ? `<a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer" class="dash-btn dash-btn--link dash-btn--sm"><i data-lucide="external-link" class="w-3.5 h-3.5"></i>الملفات</a>` : ''}
                <button type="button" data-action="dec" data-id="${escapeHtml(c.id)}" ${rev <= 0 ? 'disabled' : ''} aria-label="تراجع عن مراجعة" title="تراجع" class="dash-btn dash-btn--icon dash-btn--sm"><i data-lucide="minus" class="w-3.5 h-3.5"></i></button>
                <button type="button" data-action="inc" data-id="${escapeHtml(c.id)}" ${rev >= total ? 'disabled' : ''} class="dash-btn dash-btn--soft dash-btn--sm"><i data-lucide="plus" class="w-3.5 h-3.5"></i>سجّل مراجعة</button>
            </div>
        </div>
    </article>`;
}

function renderCoursesList() {
    const box = $('courses-container'), empty = $('courses-empty-state');
    if (loadStatus === 'loading') {
        empty.classList.add('hidden');
        box.innerHTML = `<div class="loading-screen col-span-full"><div class="loading-spinner" aria-hidden="true">⏳</div><p>جاري تحميل المواد الدراسية...</p></div>`;
        return;
    }
    if (loadStatus === 'error') {
        empty.classList.add('hidden');
        box.innerHTML = `<div class="col-span-full py-10 text-center space-y-3"><i data-lucide="wifi-off" class="w-9 h-9 mx-auto dash-danger"></i><p class="text-sm font-semibold dash-muted">تعذر تحميل المواد. تأكد من الاتصال بالإنترنت.</p><button id="retry-load-btn" type="button" class="dash-btn dash-btn--primary">إعادة المحاولة</button></div>`;
        icons();
        return;
    }
    const q = $('course-search-input').value.trim().toLowerCase();
    const year = String(appState.userProfile.academicYear);
    const dep = $('main-department-select').value;

    const list = termCourses()
        .filter(c => {
            const matchesName = c.name.toLowerCase().includes(q);

            // أولى وثانية: كل المواد العامة بلا فلتر أقسام
            if (year === '1' || year === '2') {
                return matchesName;
            }

            // ثالثة ورابعة: التصفية حسب القسم المختار
            return matchesName && (!dep || c.department === dep);
        })
        .sort((a, b) => a.name.localeCompare(b.name, 'ar'));

    box.innerHTML = list.map(courseCard).join('');

    empty.classList.toggle('hidden', list.length > 0);

    icons();
}


function renderDepartments() {
    const sel = $('main-department-select');
    const year = String(appState.userProfile.academicYear);

    // أولى وثانية: مفيش اختيار أقسام
    if (year === '1' || year === '2') {
        sel.innerHTML = '';
        sel.value = '';
        sel.disabled = true;
        sel.classList.add('hidden');
        return;
    }

    // إظهار قائمة الأقسام
    sel.disabled = false;
    sel.classList.remove('hidden');

    const deps = [
        ...new Set(termCourses().map(s => s.department).filter(Boolean))
    ].sort((a, b) => a.localeCompare(b, 'ar'));

    // قراءة آخر قسم محفوظ
    const savedDepartment = localStorage.getItem(DEPARTMENT_FILTER_KEY) || '';

    sel.innerHTML =
        '<option value="">كل الأقسام</option>' +
        deps.map(d =>
            `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`
        ).join('');

    // استرجاع القسم إذا كان موجودًا ضمن الأقسام الحالية
    sel.value = deps.includes(savedDepartment) ? savedDepartment : '';

    // لو القسم المحفوظ لم يعد موجودًا، نرجع إلى كل الأقسام
    if (!deps.includes(savedDepartment)) {
        localStorage.removeItem(DEPARTMENT_FILTER_KEY);
    }
}
function renderGoalsList() {
    const box = $('goals-list-container'), empty = $('goals-empty-state');
    const goals = appState.goals;
    $('goals-count-badge').textContent = `${goals.filter(g => g.completed).length}/${goals.length}`;
    empty.classList.toggle('hidden', goals.length > 0);
    box.innerHTML = goals.map(g => `
        <div class="goal-item ${g.completed ? 'completed' : ''}">
            <div class="flex items-center gap-2.5 flex-grow overflow-hidden pr-1">
                <button type="button" class="toggle-goal-btn goal-check ${g.completed ? 'is-done' : ''}" data-id="${escapeHtml(g.id)}" role="checkbox" aria-checked="${!!g.completed}" aria-label="تم إنجاز: ${escapeHtml(g.title)}">${g.completed ? '<i data-lucide="check" class="w-3.5 h-3.5"></i>' : ''}</button>
                <span class="goal-title truncate" title="${escapeHtml(g.title)}">${escapeHtml(g.title)}</span>
            </div>
            <div class="flex items-center gap-2">
                <span class="goal-tag">${escapeHtml(g.category || 'عام')}</span>
                <button type="button" class="delete-goal-btn goal-delete" data-id="${escapeHtml(g.id)}" title="حذف الهدف" aria-label="حذف الهدف"><i data-lucide="x" class="w-3.5 h-3.5"></i></button>
            </div>
        </div>`).join('');
    icons();
}


/* ---------- بوابة الحساب ---------- */
function renderGate() {
    const main = $('dash-main'), gate = $('dash-gate');
    if (!main || !gate) return;

    const locked = isLocked();
    main.classList.toggle('dash-locked', locked);
    gate.classList.toggle('hidden', !locked);
    if (!locked) return;

    let icon = '⏳', title = 'جاري التحقق من حسابك...', text = '', actions = [];

    if (authStatus === 'error') {
        icon = '📡'; title = 'تعذر التحقق من حسابك';
        text = 'تأكد من اتصالك بالإنترنت ثم أعد المحاولة.';
        actions = [{ label: 'إعادة المحاولة', action: 'retry-auth' }];
    } else if (authStatus === 'signed-out') {
        icon = '🔐';
        title = wasSignedIn ? 'انتهت جلستك أو تم تسجيل الخروج' : 'سجّل الدخول لعرض لوحة إنجازك';
        text = wasSignedIn
            ? 'سجّل الدخول مرة أخرى لعرض أهدافك وتقدّمك في المواد.'
            : 'أهدافك وتقدّمك في المواد وملاحظاتك محفوظة في حسابك، ولا تظهر إلا بعد تسجيل الدخول.';
        actions = [{ label: 'تسجيل الدخول', href: '../login.html' }];
    } else if (dataStatus === 'error') {
        icon = '📡'; title = 'تعذر تحميل بياناتك';
        text = 'تحقق من اتصالك بالإنترنت وحاول مرة أخرى. لم يتغير أي شيء في بياناتك.';
        actions = [{ label: 'إعادة المحاولة', action: 'retry-data' }];
    } else {
        title = 'جاري تحميل بياناتك...';
    }

    $('dash-gate-icon').textContent = icon;
    $('dash-gate-title').textContent = title;
    $('dash-gate-text').textContent = text;

    const box = $('dash-gate-actions');
    box.textContent = '';
    actions.forEach(a => {
        const el = document.createElement(a.href ? 'a' : 'button');
        el.className = 'dash-btn dash-btn--primary';
        el.textContent = a.label;
        if (a.href) el.href = a.href;
        else { el.type = 'button'; el.dataset.gateAction = a.action; }
        box.appendChild(el);
    });
}

function renderAll() {
    renderGate();
    renderHeaderAndProfile();
    renderStatsOverview();
    renderCoursesList();
    renderGoalsList();
}

/* ---------- النوافذ المنبثقة ---------- */
function openModal(id) {
    const m = $(id);
    m.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
    const first = m.querySelector('input,select,textarea');
    if (first) setTimeout(() => first.focus(), 30);
}
function closeModal(id) {
    $(id).classList.add('hidden');
    if (!document.querySelector('.modal-backdrop:not(.hidden)')) document.body.classList.remove('overflow-hidden');
}

function openCourseModal(c) {
    editingId = c.id;
    $('course-modal-name').textContent = c.name;
    $('input-course-total').value = c.totalFiles;
    $('input-course-reviewed').value = c.reviewedFiles;
    $('input-course-link').value = c.link;
    openModal('course-modal');
}


/* ---------- الجلسة: إيقاف كل ما يخص الحساب السابق ---------- */
function closeAllModals() {
    document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.add('hidden'));
    document.body.classList.remove('overflow-hidden');
    ['goal-form', 'profile-form', 'course-form'].forEach(id => { const f = $(id); if (f) f.reset(); });
    editingId = null;
}

function resetSessionState() {
    epoch++;                                   // أي طلب/مؤقت سابق يصبح قديمًا فيُتجاهل
    if (sessionAbort) { sessionAbort.abort(); sessionAbort = null; }
    clearTimeout(notesTimer);
    notesTimer = null;
    pendingNotes = null;
    writeChain = Promise.resolve();
    busy.clear();
    profileExists = false;
    appState = freshState();
    dataStatus = 'idle';
    closeAllModals();

    const notes = $('student-quick-notes');
    if (notes) notes.value = '';
    const status = $('notes-save-status');
    if (status) status.textContent = 'محفوظ تلقائياً';
    const search = $('course-search-input');
    if (search) search.value = '';
}

function handleSession(session) {
    const userId = session && session.user ? session.user.id : null;

    // نفس الحساب (تجديد توكن / تركيز التبويب...): لا شيء يتغير
    if (userId === currentUserId && authStatus !== 'checking' && authStatus !== 'error') return;

    if (!userId && currentUserId) wasSignedIn = true;
    if (userId) wasSignedIn = false;

    resetSessionState();
    currentUserId = userId;

    if (!userId) {
        authStatus = 'signed-out';
        renderAll();
        return;
    }

    authStatus = 'signed-in';
    sessionAbort = new AbortController();
    renderAll();
    loadUserData();
}

async function bootstrapAuth() {
    authStatus = 'checking';
    renderAll();

    if (!Auth || !supabaseClient) {
        console.error('خدمة الحساب غير متاحة (لم يتم تحميل مكتبة Supabase).');
        authStatus = 'error';
        renderAll();
        return;
    }

    const { session, error } = await Auth.getSession();
    if (authStatus !== 'checking') return;    // حدث تغيّر الجلسة حسم الحالة قبلنا

    if (error) {
        console.error('تعذر التحقق من الجلسة:', error);
        authStatus = 'error';
        renderAll();
        return;
    }

    handleSession(session);
}

// إعادة فحص الجلسة بعد خطأ مصادقة (JWT منتهي...) — يحسم هل الجلسة انتهت فعلًا
async function recheckSession() {
    if (!Auth) return;
    const { session, error } = await Auth.getSession();
    if (!error) handleSession(session);
}

function isAuthError(err) {
    const msg = String((err && err.message) || '').toLowerCase();
    return Boolean(err) && (err.status === 401 || err.code === 'PGRST301' || err.code === 'PGRST303' || err.code === '42501' || msg.includes('jwt'));
}

/* ---------- تحميل بيانات الطالب من Supabase ---------- */
function buildState(profileRow, goalRows, progressRows) {
    const s = freshState();
    const d = INITIAL_DATA.userProfile;

    if (profileRow) {
        s.userProfile = {
            studentName: String(profileRow.student_name || d.studentName),
            academicYear: YEARS[profileRow.academic_year] ? String(profileRow.academic_year) : d.academicYear,
            academicTerm: TERMS[profileRow.academic_term] ? String(profileRow.academic_term) : d.academicTerm,
            gpa: String(profileRow.gpa ?? ''),
            quote: String(profileRow.quote || d.quote),
            quickNotes: String(profileRow.quick_notes ?? '')
        };
    }

    s.goals = (goalRows || []).map(r => ({
        id: String(r.id),
        title: String(r.title || ''),
        category: String(r.category || ''),
        completed: Boolean(r.completed),
        createdAt: r.created_at
    }));

    (progressRows || []).forEach(r => {
        const total = clampInt(r.total_files, 0, LIMITS.courseFiles);
        s.progress[String(r.subject_id)] = {
            totalFiles: total,
            reviewedFiles: clampInt(r.reviewed_files, 0, total),
            link: safeUrl(r.link)
        };
    });

    return s;
}

async function loadUserData() {
    const myEpoch = epoch, userId = currentUserId, signal = sessionAbort && sessionAbort.signal;
    dataStatus = 'loading';
    renderAll();

    try {
        if (!supabaseClient) throw new Error('مكتبة Supabase لم يتم تحميلها');

        // RLS هو الحارس الحقيقي؛ فلتر user_id هنا للوضوح فقط
        const [p, g, pr] = await Promise.all([
            supabaseClient.from(T.profiles)
                .select('student_name, academic_year, academic_term, gpa, quote, quick_notes')
                .eq('user_id', userId).abortSignal(signal).maybeSingle(),
            supabaseClient.from(T.goals)
                .select('id, title, category, completed, created_at')
                .eq('user_id', userId).order('created_at', { ascending: false }).abortSignal(signal),
            supabaseClient.from(T.progress)
                .select('subject_id, total_files, reviewed_files, link')
                .eq('user_id', userId).abortSignal(signal)
        ]);

        if (myEpoch !== epoch) return;            // الحساب تغيّر أثناء التحميل: تجاهل النتيجة
        for (const r of [p, g, pr]) if (r.error) throw r.error;

        appState = buildState(p.data, g.data, pr.data);
        profileExists = Boolean(p.data);
        dataStatus = 'ready';
        renderDepartments();
    } catch (err) {
        if (myEpoch !== epoch) return;
        console.error('خطأ في تحميل بيانات الطالب:', err);
        dataStatus = 'error';
        if (isAuthError(err)) recheckSession();
    }

    if (myEpoch === epoch) renderAll();
}

/* ---------- الحفظ في Supabase ---------- */
// يضمن: ترتيب الكتابات، وإلغاء ما يخص جلسة سابقة، وعدم تغيير الواجهة إلا بعد نجاح الحفظ.
// يرجع true (نجح) | false (فشل) | null (الجلسة تغيّرت فتم تجاهل العملية).
function runWrite(task, onApply) {
    const myEpoch = epoch;
    const run = writeChain.then(() => {
        if (myEpoch !== epoch) throw new StaleSession();
        return task(sessionAbort ? sessionAbort.signal : undefined);
    });
    writeChain = run.catch(() => {});

    return run.then(() => {
        if (myEpoch !== epoch) return null;
        if (onApply) onApply();
        return true;
    }).catch(err => {
        if (err instanceof StaleSession || myEpoch !== epoch) return null;
        console.error('خطأ في الحفظ:', err);
        if (isAuthError(err)) recheckSession();
        return false;
    });
}

const showSaveError = () =>
    showToast('تعذر الحفظ', 'لم يتم حفظ التغيير. تحقق من الاتصال بالإنترنت وحاول مرة أخرى.', 'error');

const PROFILE_COLUMNS = {
    studentName: 'student_name', academicYear: 'academic_year', academicTerm: 'academic_term',
    gpa: 'gpa', quote: 'quote', quickNotes: 'quick_notes'
};

function toProfileRow(fields) {
    const row = {};
    Object.keys(fields).forEach(k => { row[PROFILE_COLUMNS[k]] = fields[k]; });
    return row;
}

// يحفظ الحقول المتغيّرة فقط (upsert جزئي)، فلا تمسح كتابة متزامنة حقلًا آخر.
// أول حفظ لطالب جديد يرسل الصف كاملًا.
function saveProfile(patch) {
    const userId = currentUserId;
    return runWrite(async signal => {
        const row = { user_id: userId, ...toProfileRow(profileExists ? patch : { ...appState.userProfile, ...patch }) };
        const { error } = await supabaseClient.from(T.profiles).upsert(row, { onConflict: 'user_id' }).abortSignal(signal);
        if (error) throw error;
        profileExists = true;
    }, () => Object.assign(appState.userProfile, patch));
}

function saveCourse(c, patch) {
    const key = 'subj:' + c.id;
    if (busy.has(key)) return Promise.resolve(null);
    busy.add(key);

    const userId = currentUserId;
    const next = { totalFiles: c.totalFiles, reviewedFiles: c.reviewedFiles, link: c.link, ...patch };

    return runWrite(async signal => {
        const { error } = await supabaseClient.from(T.progress).upsert({
            user_id: userId,
            subject_id: c.id,
            total_files: next.totalFiles,
            reviewed_files: next.reviewedFiles,
            link: next.link || null
        }, { onConflict: 'user_id,subject_id' }).abortSignal(signal);
        if (error) throw error;
    }, () => { appState.progress[c.id] = next; }).then(ok => {
        busy.delete(key);
        if (ok) renderAll();
        return ok;
    });
}

function addGoal(title, category) {
    const userId = currentUserId;
    let row = null;

    return runWrite(async signal => {
        const { data, error } = await supabaseClient.from(T.goals)
            .insert({
                id: crypto.randomUUID(),
                user_id: userId,
                title,
                category
            })
            .select('id, title, category, completed, created_at')
            .abortSignal(signal).single();

        if (error) throw error;
        row = data;
    }, () => {
        appState.goals.unshift({
            id: String(row.id),
            title: String(row.title),
            category: String(row.category || ''),
            completed: Boolean(row.completed),
            createdAt: row.created_at
        });
    }).then(ok => {
        if (ok) renderAll();
        return ok;
    });
}

function toggleGoal(id) {
    const g = appState.goals.find(x => x.id === id);
    const key = 'goal:' + id;
    if (!g || busy.has(key)) return Promise.resolve(null);
    busy.add(key);

    const userId = currentUserId, next = !g.completed;

    return runWrite(async signal => {
        const { data, error } = await supabaseClient.from(T.goals)
            .update({ completed: next }).eq('id', id).eq('user_id', userId)
            .select('id').abortSignal(signal);
        if (error) throw error;
        if (!data || !data.length) throw new Error('الهدف غير موجود');
    }, () => { g.completed = next; }).then(ok => {
        busy.delete(key);
        if (ok) renderAll();
        return ok;
    });
}

function deleteGoal(id) {
    const key = 'goal:' + id;
    if (busy.has(key)) return Promise.resolve(null);
    busy.add(key);

    const userId = currentUserId;

    return runWrite(async signal => {
        const { error } = await supabaseClient.from(T.goals)
            .delete().eq('id', id).eq('user_id', userId).abortSignal(signal);
        if (error) throw error;
    }, () => { appState.goals = appState.goals.filter(x => x.id !== id); }).then(ok => {
        busy.delete(key);
        if (ok) renderAll();
        return ok;
    });
}

/* ---------- الملاحظات: حفظ تلقائي مؤجَّل ---------- */
function commitNotes() {
    clearTimeout(notesTimer);
    notesTimer = null;
    if (pendingNotes === null) return;

    const value = pendingNotes;
    pendingNotes = null;

    saveProfile({ quickNotes: value }).then(ok => {
        if (ok === null) return;                  // الجلسة تغيّرت: لا نلمس الواجهة
        const status = $('notes-save-status'), notes = $('student-quick-notes');
        const stillCurrent = notesTimer === null && notes && notes.value === value;
        if (ok) { if (stillCurrent && status) status.textContent = 'تم الحفظ ✓'; }
        else {
            if (status) status.textContent = 'تعذر الحفظ';
            showSaveError();
        }
    });
}

function scheduleNotesSave(value) {
    pendingNotes = value;
    const status = $('notes-save-status');
    if (status) status.textContent = 'جارٍ الحفظ...';
    clearTimeout(notesTimer);
    notesTimer = setTimeout(commitNotes, 600);
}

function setupModals() {
    [['profile-modal', ['close-profile-modal-btn', 'cancel-profile-btn']],
     ['goal-modal', ['close-goal-modal-btn', 'cancel-goal-btn']],
     ['course-modal', ['close-course-modal-btn', 'cancel-course-btn']]].forEach(([id, btns]) => {
        btns.forEach(b => { const el = $(b); if (el) el.addEventListener('click', () => closeModal(id)); });
        const modal = $(id);
        if (modal) modal.addEventListener('click', e => { if (e.target === modal) closeModal(id); });
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') document.querySelectorAll('.modal-backdrop:not(.hidden)').forEach(m => closeModal(m.id));
    });

    // حدود الإدخال تطابق قيود CHECK في database/student_dashboard.sql
    [['input-student-name', LIMITS.studentName], ['input-student-gpa', LIMITS.gpa],
     ['input-student-quote', LIMITS.quote], ['input-goal-title', LIMITS.goalTitle],
     ['input-course-link', LIMITS.courseLink], ['student-quick-notes', LIMITS.quickNotes]
    ].forEach(([id, max]) => { const el = $(id); if (el) el.maxLength = max; });

    // يعطّل زر الإرسال أثناء الحفظ حتى لا يُرسَل الطلب مرتين
    const withLock = async (form, fn) => {
        const btn = form.querySelector('[type="submit"]');
        if (btn) btn.disabled = true;
        try { return await fn(); } finally { if (btn) btn.disabled = false; }
    };

    const openProfile = () => {
        const p = appState.userProfile;
        const nameEl = $('input-student-name'), gpaEl = $('input-student-gpa'), quoteEl = $('input-student-quote');
        if (nameEl) nameEl.value = p.studentName || '';
        if (gpaEl) gpaEl.value = p.gpa || '';
        if (quoteEl) quoteEl.value = p.quote || '';
        openModal('profile-modal');
    };
    const openProfileBtn = $('open-profile-modal-btn');
    if (openProfileBtn) openProfileBtn.addEventListener('click', openProfile);
    const editProfileBtn = $('edit-profile-btn');
    if (editProfileBtn) editProfileBtn.addEventListener('click', openProfile);
    const profileForm = $('profile-form');
    if (profileForm) profileForm.addEventListener('submit', e => {
        e.preventDefault();
        withLock(profileForm, async () => {
            const ok = await saveProfile({
                studentName: $('input-student-name').value.trim() || INITIAL_DATA.userProfile.studentName,
                gpa: $('input-student-gpa').value.trim(),
                quote: $('input-student-quote').value.trim()
            });
            if (ok === null) return;
            if (!ok) return showSaveError();
            renderAll();
            closeModal('profile-modal');
            showToast('تم الحفظ', 'تم تحديث بياناتك الشخصية بنجاح.', 'success');
        });
    });

    const openGoal = () => openModal('goal-modal');
    const addGoalBtn = $('add-goal-btn');
    if (addGoalBtn) addGoalBtn.addEventListener('click', openGoal);
    const addFirstGoalBtn = $('add-first-goal-btn');
    if (addFirstGoalBtn) addFirstGoalBtn.addEventListener('click', openGoal);
    const goalForm = $('goal-form');
    if (goalForm) goalForm.addEventListener('submit', e => {
        e.preventDefault();
        const titleEl = $('input-goal-title');
        const catEl = $('input-goal-category');
        const title = titleEl ? titleEl.value.trim() : '';
        if (!title) return;
        withLock(goalForm, async () => {
            const ok = await addGoal(title, catEl ? catEl.value : '');
            if (ok === null) return;
            if (!ok) return showSaveError();
            goalForm.reset();
            closeModal('goal-modal');
            showToast('تمت الإضافة', 'تم إدراج الهدف الأكاديمي بنجاح.', 'success');
        });
    });

    const courseForm = $('course-form');
    if (courseForm) courseForm.addEventListener('submit', e => {
        e.preventDefault();
        const c = getCourse(editingId);
        if (!c) return closeModal('course-modal');
        const total = parseInt($('input-course-total').value, 10);
        const rev = parseInt($('input-course-reviewed').value, 10) || 0;
        const link = $('input-course-link').value.trim();
        if (!(total >= 0) || total > LIMITS.courseFiles || rev < 0 || rev > total) return showToast('بيانات غير صحيحة', 'عدد المحاضرات المراجَعة لازم يكون بين 0 والإجمالي.', 'warning');
        if (link && !safeUrl(link)) return showToast('رابط غير صحيح', 'الرابط لازم يبدأ بـ http:// أو https://', 'warning');
        withLock(courseForm, async () => {
            const ok = await saveCourse(c, { totalFiles: total, reviewedFiles: rev, link });
            if (ok === null) return;
            if (!ok) return showSaveError();
            closeModal('course-modal');
            showToast('تم التحديث', 'تم حفظ بيانات المادة.', 'success');
        });
    });
}

/* ---------- الأحداث ---------- */
function bindEvents() {
    // الثيم: منطقه في ../js/header.js (الزر يستدعي toggleTheme() من onclick)

    const toastCloseBtn = $('toast-close-btn');
    if (toastCloseBtn) toastCloseBtn.addEventListener('click', () => {
        const tc = $('toast-container');
        if (tc) tc.classList.add('hidden');
    });

    const gateActions = $('dash-gate-actions');
    if (gateActions) gateActions.addEventListener('click', e => {
        const btn = e.target.closest('[data-gate-action]');
        if (!btn) return;
        if (btn.dataset.gateAction === 'retry-auth') bootstrapAuth();
        else if (btn.dataset.gateAction === 'retry-data') loadUserData();
    });

    const changeAcademic = async (field, value) => {
        const ok = await saveProfile({ [field]: value });
        if (ok === null) return;
        if (!ok) showSaveError();
        renderDepartments();
        renderAll();                       // عند الفشل ترجع القوائم لقيمتها المحفوظة
    };

    const yearSelect = $('main-year-select');
    if (yearSelect) yearSelect.addEventListener('change', e => changeAcademic('academicYear', e.target.value));

    const termSelect = $('main-term-select');
    if (termSelect) termSelect.addEventListener('change', e => changeAcademic('academicTerm', e.target.value));

    const deptSelect = $('main-department-select');
    if (deptSelect) deptSelect.addEventListener('change', () => {
        localStorage.setItem(DEPARTMENT_FILTER_KEY, deptSelect.value);
        renderCoursesList();
    });

    const searchInput = $('course-search-input');
    if (searchInput) searchInput.addEventListener('input', renderCoursesList);

    const notes = $('student-quick-notes');
    if (notes) notes.addEventListener('input', () => {
        if (isLocked()) return;
        scheduleNotesSave(notes.value);
    });

    // محاولة أخيرة لحفظ ملاحظة لم تُحفظ بعد عند مغادرة التبويب
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden' && pendingNotes !== null) commitNotes();
    });

    const coursesContainer = $('courses-container');
    if (coursesContainer) coursesContainer.addEventListener('click', async e => {
        if (e.target.closest('#retry-load-btn')) return loadSubjects();
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const c = getCourse(btn.dataset.id);
        if (!c) return;
        if (btn.dataset.action === 'edit') return openCourseModal(c);
        const next = c.reviewedFiles + (btn.dataset.action === 'inc' ? 1 : -1);
        if (next < 0 || next > c.totalFiles) return;
        const ok = await saveCourse(c, { reviewedFiles: next });
        if (ok === null) return;
        if (!ok) return showSaveError();
        if (next === c.totalFiles) showToast('ما شاء الله 🎉', `خلصت مراجعة مادة: ${c.name}`, 'success');
    });

    const goalsContainer = $('goals-list-container');
    if (goalsContainer) goalsContainer.addEventListener('click', async e => {
        const t = e.target.closest('.toggle-goal-btn'), d = e.target.closest('.delete-goal-btn');
        const ok = t ? await toggleGoal(t.dataset.id) : d ? await deleteGoal(d.dataset.id) : null;
        if (ok === false) showSaveError();
    });

    setupModals();
}

/* ---------- تحميل المواد (بيانات عامة) ---------- */
async function loadSubjects() {
    loadStatus = 'loading';
    renderCoursesList();
    try {
        if (!supabaseClient) throw new Error('مكتبة Supabase لم يتم تحميلها');
        const { data, error } = await supabaseClient
            .from('subjects')
            .select('id, name, grade, term, department')
            .eq('program', 'الهندسة الزراعية')
            .limit(500);
        if (error) throw error;

        const gradeMap = invert(YEARS), termMap = invert(TERMS);
        remoteSubjects = (data || []).map(r => ({
            id: String(r.id),
            name: String(r.name || 'مادة بدون اسم').trim(),
            year: gradeMap[String(r.grade || '').trim()] || '',
            term: termMap[String(r.term || '').trim()] || '',
            department: String(r.department || '').trim()
        })).filter(s => s.year && s.term);
        loadStatus = 'ready';
        renderDepartments();
    } catch (err) {
        console.error('خطأ في تحميل المواد:', err);
        loadStatus = 'error';
        showToast('تعذر تحميل المواد', 'تحقق من الاتصال بالإنترنت وحاول مرة أخرى.', 'error');
    }
    renderAll();
}

document.addEventListener('DOMContentLoaded', () => {
    bindEvents();
    renderAll();                 // البوابة: «جاري التحقق من حسابك...»
    loadSubjects();

    // اشتراك واحد في تغيّر الجلسة (تسجيل خروج/دخول/تبديل حساب، من هذا التبويب أو غيره)
    if (Auth) {
        Auth.onChange((event, session) => {
            if (event === 'INITIAL_SESSION') return;   // الحالة الأولية يحسمها bootstrapAuth (يفرّق بين «لا جلسة» و«تعذر التحقق»)
            handleSession(session);
        });
    }

    bootstrapAuth();
});
