

function toggleScrollBtn() {
    const btn = document.getElementById('scrollTopBtn');

    if (window.scrollY > 200) {
        btn.style.display = 'flex';
    } else {
        btn.style.display = 'none';
    }
}

function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}
function showLoading(callback) {
    document.getElementById('contentArea').innerHTML = `
        <div class="loading-screen">
            <div class="loading-spinner">⚙️</div>
            <p>جاري تحميل المحتوى...</p>
        </div>
    `;

    setTimeout(callback, 250);
}
// =========================================
// حماية أي نص قادم من قاعدة البيانات قبل
// إدراجه داخل HTML (منع XSS)
// =========================================

function escapeHtml(text) {
    if (text === null || text === undefined) return '';

    // يهرّب النص للاستخدام داخل HTML وداخل قيم الـ attributes معًا
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// =========================================
// تمرير القيم إلى أزرار onclick بأمان
// بدل كتابة بيانات قاعدة البيانات داخل HTML،
// نحفظ القيمة في مصفوفة ونمرر رقمها فقط (رقم لا يمكن حقنه).
// =========================================

const inlineArgStore = [];

function inlineArg(value) {
    inlineArgStore.push(value);
    return `getInlineArg(${inlineArgStore.length - 1})`;
}

function getInlineArg(index) {
    return inlineArgStore[index];
}

// =========================================
// روابط آمنة: تقبل http و https فقط
// (تمنع javascript: و data: وغيرها)
// =========================================

function safeUrl(url) {
    if (typeof url !== 'string') return '';

    const trimmed = url.trim();
    if (!trimmed) return '';

    try {
        const parsed = new URL(trimmed, window.location.href);
        return (parsed.protocol === 'http:' || parsed.protocol === 'https:')
            ? trimmed
            : '';
    } catch (error) {
        return '';
    }
}

function openExternal(url) {
    const clean = safeUrl(url);
    if (!clean) return;

    window.open(clean, '_blank', 'noopener,noreferrer');
}

function normalizeCategory(cat) {
    if (!cat) return '';

    return normalizeText(cat).replace(/\s+/g, '');
}

function normalizeText(text) {
    if (!text) return '';

    return text.toLowerCase()
        .replace(/[أإآا]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .trim();
}
function renderGrades() {

    const html = `
        <div class="fade-in">

            <h2 class="section-title">
                اختر الفرقة الدراسية
            </h2>

            <div class="grid-container">

                <div class="card"
                    onclick="selectGrade('الفرقة الأولى')"
                    style="border-top: 4px solid var(--grade-1)">

                    <img
                        src="assets/images/icons/Grade1.jfif"
                        alt="الفرقة الأولى"
                        style="
                            width: 120px;
                            height: 120px;
                            object-fit: contain;
                        ">

                    <h3>الفرقة الأولى</h3>

                    <p class="card-info">
                        المقررات الدراسية الخاصة بالفرقة الأولى.
                    </p>

                    <div class="card-footer">
                        <span>الدخول للفرقة</span>
                        <span>←</span>
                    </div>

                </div>


                <div class="card"
                    onclick="selectGrade('الفرقة الثانية')"
                    style="border-top: 4px solid var(--grade-2)">

                    <img
                        src="assets/images/icons/Grade2.jfif"
                        alt="الفرقة الثانية"
                        style="
                            width: 120px;
                            height: 120px;
                            object-fit: contain;
                        ">

                    <h3>الفرقة الثانية</h3>

                    <p class="card-info">
                        المقررات الدراسية الخاصة بالفرقة الثانية.
                    </p>

                    <div class="card-footer">
                        <span>الدخول للفرقة</span>
                        <span>←</span>
                    </div>

                </div>


                <div class="card"
                    onclick="selectGrade('الفرقة الثالثة')"
                    style="border-top: 4px solid var(--grade-3)">

                    <img
                        src="assets/images/icons/Grade3.jfif"
                        alt="الفرقة الثالثة"
                        style="
                            width: 120px;
                            height: 120px;
                            object-fit: contain;
                        ">

                    <h3>الفرقة الثالثة</h3>

                    <p class="card-info">
                        المقررات الدراسية الخاصة بالفرقة الثالثة.
                    </p>

                    <div class="card-footer">
                        <span>الدخول للفرقة</span>
                        <span>←</span>
                    </div>

                </div>


                <div class="card"
                    onclick="selectGrade('الفرقة الرابعة')"
                    style="border-top: 4px solid var(--grade-4)">

                    <img
                        src="assets/images/icons/Grade4.jfif"
                        alt="الفرقة الرابعة"
                        style="
                            width: 120px;
                            height: 120px;
                            object-fit: contain;
                        ">

                    <h3>الفرقة الرابعة</h3>

                    <p class="card-info">
                        المقررات الدراسية الخاصة بالفرقة الرابعة.
                    </p>

                    <div class="card-footer">
                        <span>الدخول للفرقة</span>
                        <span>←</span>
                    </div>

                </div>

            </div>

        </div>
    `;

    document.getElementById('contentArea').innerHTML = html;
}
async function renderMore() {

    const contentArea = document.getElementById('contentArea');

    contentArea.innerHTML = `
        <div class="loading-screen">
            <div class="loading-spinner">⚙️</div>
            <p>جاري تحميل المزيد...</p>
        </div>
    `;

    try {

        const { data, error } = await supabaseClient
            .from('more_items')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) throw error;

        let html = `
            <div class="fade-in">

                <div class="breadcrumb">
                    <span onclick="resetView()">
                        🏠 الرئيسية
                    </span>
                    >
                    <span>
                        ➕ المزيد
                    </span>
                </div>

                <h2 class="section-title">
                    ➕ المزيد
                </h2>

                <div class="grid-container">
        `;

        if (!data || data.length === 0) {

            html += `
                <p style="
                    text-align:center;
                    color:var(--text-muted);
                    padding:30px;
                    grid-column:1 / -1;
                ">
                    لا يوجد محتوى متاح حالياً.
                </p>
            `;

        } else {

            data.forEach(item => {

                html += `
                    <div
                        class="card"
                        onclick="showLoading(() => openMoreItem(${inlineArg(item.id)}))"                    >

                        <div class="card-header-icon">
                            ${escapeHtml(item.icon || '📌')}
                        </div>

                        <h3>
                            ${escapeHtml(item.title)}
                        </h3>

                        ${
                            item.description
                            ? `
                                <p class="card-info">
                                    ${escapeHtml(item.description)}
                                </p>
                            `
                            : ''
                        }

                        <div class="card-footer">

                            <span style="
                                color:var(--primary-color)
                            ">
                                ${escapeHtml(item.category || 'قسم')}
                            </span>

                            <span style="
                                font-weight:bold;
                                color:var(--secondary-color)
                            ">
                                [دخول]
                            </span>

                        </div>

                    </div>
                `;
            });
        }

        html += `
                </div>
            </div>
        `;

        contentArea.innerHTML = html;

    } catch (error) {

        console.error(
            '❌ خطأ في تحميل أقسام المزيد:',
            error
        );

        contentArea.innerHTML = `
            <div class="fade-in">

                <p style="
                    text-align:center;
                    color:red;
                    padding:30px;
                ">
                    حدث خطأ أثناء تحميل أقسام المزيد.
                </p>

            </div>
        `;
    }
}
async function renderTopYears() {

    const contentArea = document.getElementById('contentArea');

    contentArea.innerHTML = `
        <div class="loading-screen">
            <div class="loading-spinner">⚙️</div>
            <p>جاري تحميل سنوات الأوائل...</p>
        </div>
    `;

    try {

        const { data, error } = await supabaseClient
            .from('top_years')
            .select('*')
            .order('year', { ascending: false });

        if (error) throw error;

        let html = `
            <div class="fade-in">

                <div class="breadcrumb">
                    <span onclick="resetView()">🏠 الرئيسية</span>
                    >
                    <span onclick="selectProgram('المزيد')">
                        ➕ المزيد
                    </span>
                    >
                    <span>🏆 الأوائل</span>
                </div>

                <h2 class="section-title">
                    🏆 الأوائل
                </h2>

                <div class="grid-container">
        `;

        if (!data || data.length === 0) {

            html += `
                <p style="
                    text-align:center;
                    color:var(--text-muted);
                    padding:30px;
                    grid-column:1 / -1;
                ">
                    لا توجد سنوات متاحة حالياً.
                </p>
            `;

        } else {

            data.forEach(item => {

                const itemJson =
                    inlineArg(item);

                html += `
                    <div
                        class="card"
                        onclick="openTopYear(${itemJson})"
                    >

                        <div class="card-header-icon">
                            🏆
                        </div>

                        <h3>
                            ${escapeHtml(item.title)}
                        </h3>

                        <p class="card-info">
                            أوائل العام ${escapeHtml(item.year)}
                        </p>

                        <div class="card-footer">

                            <span style="color:var(--primary-color)">
                                📄 PDF
                            </span>

                            <span style="
                                font-weight:bold;
                                color:var(--secondary-color)
                            ">
                                [فتح]
                            </span>

                        </div>

                    </div>
                `;
            });
        }

        html += `
                </div>
            </div>
        `;

        contentArea.innerHTML = html;

    } catch (error) {

        console.error(
            '❌ خطأ في تحميل سنوات الأوائل:',
            error
        );

        contentArea.innerHTML = `
            <div class="fade-in">
                <p style="
                    text-align:center;
                    color:red;
                    padding:30px;
                ">
                    حدث خطأ أثناء تحميل سنوات الأوائل.
                </p>
            </div>
        `;
    }
}
async function openTopYear(item) {

    if (!item || !item.pdf_url) {
        alert("رابط ملف الـ PDF غير متوفر.");
        return;
    }

    const contentArea = document.getElementById('contentArea');

    contentArea.innerHTML = `
        <div class="fade-in material-view" style="direction: rtl; text-align: right;">

            <div class="breadcrumb">
                <span onclick="resetView()">🏠 الرئيسية</span>
                >
                <span onclick="selectProgram('المزيد')">
                    ➕ المزيد
                </span>
                >
                <span onclick="renderTopYears()">
                    🏆 الأوائل
                </span>
                >
                <span>${escapeHtml(item.title)}</span>
            </div>

            <h2 class="section-title" style="margin-top:10px;">
                🏆 ${escapeHtml(item.title)}
            </h2>

            <p style="
                color:var(--text-muted);
                margin-bottom:25px;
                text-align:center;
            ">
                أوائل العام ${escapeHtml(item.year)}
            </p>

            <div class="material-file-card">

                <div class="material-file-top">

                    <div class="material-file-icon">
                        📕
                    </div>

                    <h3 class="material-file-title">
                        ${escapeHtml(item.title)}
                    </h3>

                </div>

                <p class="material-file-description">
                    ملف أوائل العام ${escapeHtml(item.year)}
                </p>

                <div class="material-file-info">

                    <span>
                        📄 PDF
                    </span>

                    <span>
                        أوائل الطلاب
                    </span>

                </div>

                <div class="material-file-actions">

                    <!-- فتح الملف -->
                    <a
                        href="${escapeHtml(safeUrl(item.pdf_url) || '#')}"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="material-open-btn"
                    >
                        <span>👁️</span>
                        <span>فتح الملف</span>
                    </a>

                    <!-- تحميل الملف -->
                    <button
                        type="button"
                        class="material-download-btn"
                        onclick="downloadMaterialFile(
                            ${inlineArg(item.pdf_url)},
                            ${inlineArg(item.title)}
                        )"
                    >
                        <span>⬇️</span>
                        <span>تحميل الملف</span>
                    </button>

                </div>

            </div>

        </div>
    `;
}

function renderExamSchedulesFromMore() {

    const contentArea = document.getElementById('contentArea');

    contentArea.innerHTML = `
        <div class="fade-in">

            <div class="breadcrumb">

                <span onclick="resetView()">
                    🏠 الرئيسية
                </span>

                >

                <span onclick="renderMore()">
                    ➕ المزيد
                </span>

                >

                <span>
                    🏫 شؤون الطلاب
                </span>

                >

                <span>
                    📅 جداول الامتحانات
                </span>

            </div>

            <h2 class="section-title">
                📅 جداول الامتحانات
            </h2>

            <div class="grid-container">

                ${
                    currentExamSchedules.length > 0

                    ? currentExamSchedules.map(item => `

                        <div
                            class="card"
                            onclick="openMorePdf(
                                ${inlineArg(item)},
                                'جداول الامتحانات',
                                '📅'
                            )"
                        >

                            <div class="card-header-icon">
                                📅
                            </div>

                            <h3>
                                ${escapeHtml(item.title)}
                            </h3>

                            <p class="card-info">
                                ${
                                    item.year
                                        ? `العام ${escapeHtml(item.year)}`
                                        : ''
                                }
                            </p>

                            <div class="card-footer">

                                <span style="
                                    color:var(--primary-color)
                                ">
                                    📄 PDF
                                </span>

                                <span style="
                                    font-weight:bold;
                                    color:var(--secondary-color)
                                ">
                                    [فتح]
                                </span>

                            </div>

                        </div>

                    `).join('')

                    : `
                        <p style="
                            text-align:center;
                            color:var(--text-muted);
                            padding:30px;
                            grid-column:1 / -1;
                        ">
                            لا توجد جداول امتحانات حالياً.
                        </p>
                    `
                }

            </div>

        </div>
    `;
}

async function openMoreItem(id) {

    try {

        const { data, error } = await supabaseClient
            .from('more_items')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        if (!data) {
            console.error('❌ لم يتم العثور على القسم');
            return;
        }

        // =========================================
        // حفظ القسم في سجل التنقل
        // =========================================

        navigationHistory.push({
            program: 'المزيد',
            grade: '',
            dept: '',
            term: '',
            subject: null,
            moreItemId: data.id,
            moreItemTitle: data.title
        });

        navigationIndex = navigationHistory.length - 1;

        


        // =========================================
        // شؤون الطلاب
        // =========================================

        if (data.title === 'شؤون الطلاب') {

            const [
                { data: topYears, error: topYearsError },
                { data: examSchedules, error: examSchedulesError }
            ] = await Promise.all([

                supabaseClient
                    .from('top_years')
                    .select('*')
                    .eq('more_item_id', data.id)
                    .order('year', { ascending: false }),

                supabaseClient
                    .from('exam_schedules')
                    .select('*')
                    .eq('more_item_id', data.id)
                    .order('year', { ascending: false })

            ]);

            if (topYearsError) throw topYearsError;
            if (examSchedulesError) throw examSchedulesError;

            currentTopYears = topYears || [];
            currentExamSchedules = examSchedules || [];

            renderStudentAffairs(
                data,
                currentTopYears,
                currentExamSchedules
            );

            return

        }
        // =========================================
        // المصادر الخارجية
        // =========================================

            if (data.title === 'مصادر خارجية') {
                await renderAdditionalResources();
                return;
            }


        // =========================================
        // باقي الأقسام
        // العلم الشرعي + البرمجة
        // =========================================

        const {
            data: contents,
            error: contentsError
        } = await supabaseClient
            .from('more_contents')
            .select('*')
            .eq('more_item_id', data.id)
            .order('created_at', { ascending: true });

        if (contentsError) throw contentsError;

        renderMoreContents(data, contents || []);

    } catch (error) {

        console.error(
            '❌ خطأ في فتح قسم المزيد:',
            error
        );

        document.getElementById('contentArea').innerHTML = `
            <div class="fade-in">

                <p style="
                    text-align:center;
                    color:red;
                    padding:30px;
                ">
                    حدث خطأ أثناء تحميل القسم.
                </p>

            </div>
        `;
    }
}

function renderStudentAffairs(parentItem, topYears, examSchedules) {

    const contentArea = document.getElementById('contentArea');

    contentArea.innerHTML = `
        <div class="fade-in">

            <div class="breadcrumb">
                <span onclick="resetView()">
                    🏠 الرئيسية
                </span>

                >

                <span onclick="renderMore()">
                    ➕ المزيد
                </span>

                >

                <span>
                    🏫 شؤون الطلاب
                </span>
            </div>

            <h2 class="section-title">
                🏫 ${escapeHtml(parentItem.title)}
            </h2>

            <div class="grid-container">

                <!-- الأوائل -->
                <div
                    class="card"
                    onclick="showLoading(() => renderTopYears())"                >

                    <div class="card-header-icon">
                        🏆
                    </div>

                    <h3>
                        الأوائل
                    </h3>

                    <p class="card-info">
                        قوائم أوائل الطلاب
                    </p>

                    <div class="card-footer">

                        <span style="color:var(--primary-color)">
                            ${topYears.length} ملف
                        </span>

                        <span style="
                            font-weight:bold;
                            color:var(--secondary-color);
                        ">
                            [دخول]
                        </span>

                    </div>

                </div>


                <!-- جداول الامتحانات -->
                <div
                    class="card"
                    onclick="renderExamSchedulesFromMore()"
                >

                    <div class="card-header-icon">
                        📅
                    </div>

                    <h3>
                        جداول الامتحانات
                    </h3>

                    <p class="card-info">
                        جداول الامتحانات للطلاب
                    </p>

                    <div class="card-footer">

                        <span style="color:var(--primary-color)">
                            ${examSchedules.length} ملف
                        </span>

                        <span style="
                            font-weight:bold;
                            color:var(--secondary-color);
                        ">
                            [دخول]
                        </span>

                    </div>

                </div>

            </div>

        </div>
    `;
}

function renderMoreContents(parentItem, contents) {

    const contentArea = document.getElementById('contentArea');

    let html = `
        <div class="fade-in">

            <div class="breadcrumb">

                <span onclick="resetView()">
                    🏠 الرئيسية
                </span>

                >

                <span onclick="renderMore()">
                    ➕ المزيد
                </span>

                >

                <span>
                    ${escapeHtml(parentItem.icon || '📚')}
                    ${escapeHtml(parentItem.title)}
                </span>

            </div>

            <h2 class="section-title">
                ${escapeHtml(parentItem.icon || '📚')}
                ${escapeHtml(parentItem.title)}
            </h2>

            <div class="grid-container">
    `;

    if (!contents || contents.length === 0) {

        html += `
            <p style="
                text-align:center;
                color:var(--text-muted);
                padding:30px;
                grid-column:1 / -1;
            ">
                لا يوجد محتوى متاح حالياً.
            </p>
        `;

    } else {

        contents.forEach(item => {

            html += `
                <div
                    class="card"
                    onclick="openMoreContent(${inlineArg(item.id)})"
                >

                    <div class="card-header-icon">
                        ${escapeHtml(item.icon || parentItem.icon || '📌')}
                    </div>

                    <h3>
                        ${escapeHtml(item.title)}
                    </h3>

                    ${
                        item.description
                        ? `
                            <p class="card-info">
                                ${escapeHtml(item.description)}
                            </p>
                        `
                        : ''
                    }

                    <div class="card-footer">

                        <span style="
                            color:var(--primary-color)
                        ">
                            ${
                                item.link
                                ? '🔗 رابط'
                                : '📚 محتوى'
                            }
                        </span>

                        <span style="
                            font-weight:bold;
                            color:var(--secondary-color)
                        ">
                            [دخول]
                        </span>

                    </div>

                </div>
            `;

        });

    }

    html += `
            </div>
        </div>
    `;

    contentArea.innerHTML = html;
}
async function openMoreContent(id) {

    const contentArea = document.getElementById('contentArea');

    contentArea.innerHTML = `
        <div class="loading-screen">
            <div class="loading-spinner">⚙️</div>
            <p>جاري تحميل المحتوى...</p>
        </div>
    `;

    try {

        const { data, error } = await supabaseClient
            .from('more_contents')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        if (!data) {
            console.error('❌ لم يتم العثور على المحتوى');
            return;
        }

        contentArea.innerHTML = `
            <div class="fade-in">

                <div class="breadcrumb">

                    <span onclick="resetView()">
                        🏠 الرئيسية
                    </span>

                    >

                    <span onclick="renderMore()">
                        ➕ المزيد
                    </span>

                    >

                    <span>
                        📚 ${escapeHtml(data.title)}
                    </span>

                </div>

                <h2 class="section-title">
                    ${escapeHtml(data.icon || '📚')}
                    ${escapeHtml(data.title)}
                </h2>

                ${
                    data.description
                    ? `
                        <p style="
                            text-align:center;
                            color:var(--text-muted);
                            margin:20px 0 30px;
                        ">
                            ${escapeHtml(data.description)}
                        </p>
                    `
                    : ''
                }

                <div class="grid-container">

                    <!-- المسار الأول -->
                    ${
                        data.link_1
                        ? `
                            <div
                                class="card"
                                onclick="openExternal(${inlineArg(data.link_1)})"
                            >

                                <div class="card-header-icon">
                                    📖
                                </div>

                                <h3>
                                    المسار الأول
                                </h3>

                                <p class="card-info">
                                    ${escapeHtml(data.title)}
                                </p>

                                <div class="card-footer">

                                    <span style="
                                        color:var(--primary-color)
                                    ">
                                        🔗 المسار الأول
                                    </span>

                                    <span style="
                                        font-weight:bold;
                                        color:var(--secondary-color)
                                    ">
                                        [دخول]
                                    </span>

                                </div>

                            </div>
                        `
                        : ''
                    }

                    <!-- المسار الثاني -->
                    ${
                        data.link_2
                        ? `
                            <div
                                class="card"
                                onclick="openExternal(${inlineArg(data.link_2)})"
                            >

                                <div class="card-header-icon">
                                    🎧
                                </div>

                                <h3>
                                    المسار الثاني
                                </h3>

                                <p class="card-info">
                                    ${escapeHtml(data.title)}
                                </p>

                                <div class="card-footer">

                                    <span style="
                                        color:var(--primary-color)
                                    ">
                                        🔗 المسار الثاني
                                    </span>

                                    <span style="
                                        font-weight:bold;
                                        color:var(--secondary-color)
                                    ">
                                        [دخول]
                                    </span>

                                </div>

                            </div>
                        `
                        : ''
                    }

                    ${
                        !data.link_1 && !data.link_2
                        ? `
                            <p style="
                                text-align:center;
                                color:var(--text-muted);
                                padding:30px;
                                grid-column:1 / -1;
                            ">
                                لا توجد مسارات متاحة حالياً.
                            </p>
                        `
                        : ''
                    }

                </div>

            </div>
        `;

    } catch (error) {

        console.error(
            '❌ خطأ في فتح محتوى المزيد:',
            error
        );

        contentArea.innerHTML = `
            <div class="fade-in">

                <p style="
                    text-align:center;
                    color:red;
                    padding:30px;
                ">
                    حدث خطأ أثناء تحميل المحتوى.
                </p>
            </div>
        `;
    }
}
// =========================================
// المصادر الخارجية
// البيانات كلها من Supabase
// =========================================

async function renderAdditionalResources() {
    const contentArea = document.getElementById('contentArea');

    contentArea.innerHTML = `
        <div class="loading-screen">
            <div class="loading-spinner">🌐</div>
            <p>جاري تحميل المصادر الخارجية...</p>
        </div>
    `;

    try {
        const { data, error } = await supabaseClient
            .from('additional_resources')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // استخراج التصنيفات الموجودة في Supabase فقط
        const categories = [
            ...new Set(
                (data || [])
                    .map(item => item.category)
                    .filter(Boolean)
            )
        ];

        let html = `
            <div class="fade-in">

                <div class="breadcrumb">
                    <span onclick="resetView()">
                        🏠 الرئيسية
                    </span>
                    >
                    <span>
                        🌐 مصادر خارجية
                    </span>
                </div>

                <h2 class="section-title">
                    🌐 مصادر خارجية
                </h2>

                <div class="grid-container">
        `;

        if (categories.length === 0) {

            html += `
                <p style="
                    text-align:center;
                    color:var(--text-muted);
                    padding:30px;
                    grid-column:1 / -1;
                ">
                    لا توجد مصادر خارجية متاحة حالياً.
                </p>
            `;

        } else {

            categories.forEach(category => {

                const categoryResources = data.filter(
                    item => item.category === category
                );

                // ناخد أيقونة أول مصدر في التصنيف
                const categoryIcon =
                    categoryResources.find(item => item.icon)?.icon || '📚';

                html += `
                    <div
                        class="card"
                        onclick="renderExternalResourcesByCategory(${inlineArg(category)})"
                    >

                        <div class="card-header-icon">
                            ${escapeHtml(categoryIcon)}
                        </div>

                        <h3>
                            ${escapeHtml(category)}
                        </h3>

                        <p class="card-info">
                            ${categoryResources.length} مصدر متاح
                        </p>

                        <div class="card-footer">

                            <span style="
                                color:var(--primary-color);
                                font-weight:bold;
                            ">
                                ${categoryResources.length} مصدر
                            </span>

                            <span style="
                                color:var(--secondary-color);
                                font-weight:bold;
                            ">
                                [دخول]
                            </span>

                        </div>

                    </div>
                `;
            });
        }

        html += `
                </div>
            </div>
        `;

        contentArea.innerHTML = html;

    } catch (error) {

        console.error(
            '❌ خطأ في تحميل المصادر الخارجية:',
            error
        );

        contentArea.innerHTML = `
            <div class="fade-in">
                <p style="
                    text-align:center;
                    color:red;
                    padding:30px;
                ">
                    حدث خطأ أثناء تحميل المصادر الخارجية.
                </p>
            </div>
        `;
    }
}
// =========================================
// عرض مصادر التصنيف
// البيانات كلها من Supabase
// =========================================

async function renderExternalResourcesByCategory(category) {

    const contentArea = document.getElementById('contentArea');

    contentArea.innerHTML = `
        <div class="loading-screen">
            <div class="loading-spinner">📚</div>
            <p>جاري تحميل المصادر...</p>
        </div>
    `;

    try {

        const { data, error } = await supabaseClient
            .from('additional_resources')
            .select('*')
            .eq('category', category)
            .order('created_at', { ascending: false });

        if (error) throw error;

        let html = `
            <div class="fade-in">

                <div class="breadcrumb">

                    <span onclick="resetView()">
                        🏠 الرئيسية
                    </span>

                    >

                    <span onclick="renderAdditionalResources()">
                        🌐 مصادر خارجية
                    </span>

                    >

                    <span>
                        ${escapeHtml(category)}
                    </span>

                </div>

                <h2 class="section-title">
                    ${escapeHtml(category)}
                </h2>

                <div class="grid-container">
        `;

        if (!data || data.length === 0) {

            html += `
                <p style="
                    text-align:center;
                    color:var(--text-muted);
                    padding:30px;
                    grid-column:1 / -1;
                ">
                    لا توجد مصادر متاحة في هذا التصنيف حالياً.
                </p>
            `;

        } else {

            data.forEach(item => {

                html += `
                <div 
                    class="card external-resource-card"
                    onclick="openAdditionalResource(${inlineArg(item.id)})"
                >

                    <div class="card-header-icon">
                        ${escapeHtml(item.content_icon || item.icon || '📚')}
                    </div>

                    <h3>
                        ${escapeHtml(item.title)}
                    </h3>

                    ${
                        item.description
                        ? `
                            <p class="card-info">
                                ${escapeHtml(item.description)}
                            </p>
                        `
                        : ''
                    }

                    <div class="card-footer">

                        <span>
                            ${escapeHtml(item.category || '')}
                        </span>

                        <span class="external-resource-arrow">
                            فتح ↗
                        </span>

                    </div>

                </div>
            `;

            });

        }

        html += `
                </div>
            </div>
        `;

        contentArea.innerHTML = html;

    } catch (error) {

        console.error(
            '❌ خطأ في تحميل مصادر التصنيف:',
            error
        );

        contentArea.innerHTML = `
            <div class="fade-in">

                <p style="
                    text-align:center;
                    color:red;
                    padding:30px;
                ">
                    حدث خطأ أثناء تحميل المصادر.
                </p>

            </div>
        `;
    }
}
async function openAdditionalResource(id) {

    try {

        const { data, error } = await supabaseClient
            .from('additional_resources')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        if (!data) {
            console.error('❌ لم يتم العثور على المصدر');
            return;
        }

        document.getElementById('contentArea').innerHTML = `
            <div class="fade-in">

                <div class="breadcrumb">
                    <span onclick="resetView()">🏠 الرئيسية</span>
                    >
                    <span onclick="renderAdditionalResources()">
                        🌐 مصادر خارجية
                    </span>
                    >
                    <span>${escapeHtml(data.title)}</span>
                </div>

                <div class="external-resource-card">

            <div class="external-resource-icon">
                    ${escapeHtml(data.content_icon || '📚')}
            </div>

    <h2 class="external-resource-title">
        ${escapeHtml(data.title)}
    </h2>

    ${
        data.description
        ? `
            <p class="external-resource-description">
                ${escapeHtml(data.description)}
            </p>
        `
        : ''
    }
            ${
            data.created_at
            ? `
                <div class="external-resource-date">
                    تاريخ الإضافة:
                    ${new Date(data.created_at).toLocaleDateString('ar-EG', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })}
                </div>
            `
            : ''
        }

    ${
        data.link
        ? `
            <div class="external-resource-action">
                <a
                    href="${escapeHtml(safeUrl(data.link) || '#')}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="external-resource-button"
                >
                    فتح المصدر
                </a>
            </div>
        `
        : ''
    }

</div>
            </div>
        `;

    } catch (error) {

        console.error(
            '❌ خطأ في فتح المصدر الإضافي:',
            error
        );

    }
}
function openMorePdf(item, title, icon) {

    if (!item || !item.pdf_url) {
        alert("رابط ملف الـ PDF غير متوفر.");
        return;
    }

    const contentArea = document.getElementById('contentArea');

    contentArea.innerHTML = `
        <div class="fade-in material-view">

            <div class="breadcrumb">

                <span onclick="resetView()">
                    🏠 الرئيسية
                </span>

                >

                <span onclick="renderMore()">
                    ➕ المزيد
                </span>

                >

                <span>
                    🏫 شؤون الطلاب
                </span>

                >

                <span>
                    ${escapeHtml(icon)} ${escapeHtml(title)}
                </span>

                >

                <span>
                    ${escapeHtml(item.title)}
                </span>

            </div>

            <h2 class="section-title">
                ${escapeHtml(icon)} ${escapeHtml(item.title)}
            </h2>

            <div class="material-file-card">

                <div class="material-file-top">

                    <div class="material-file-icon">
                        📄
                    </div>

                    <h3 class="material-file-title">
                        ${escapeHtml(item.title)}
                    </h3>

                </div>

                <p class="material-file-description">
                    ${item.year ? `العام ${escapeHtml(item.year)}` : ''}
                </p>

                <div class="material-file-info">
                    <span>📄 PDF</span>
                    <span>${escapeHtml(title)}</span>
                </div>

                <div class="material-file-actions">

                    <a
                        href="${escapeHtml(safeUrl(item.pdf_url) || '#')}"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="material-open-btn"
                    >
                        <span>👁️</span>
                        <span>فتح الملف</span>
                    </a>

                    <button
                        type="button"
                        class="material-download-btn"
                        onclick="downloadMaterialFile(
                            ${inlineArg(item.pdf_url)},
                            ${inlineArg(item.title)}
                        )"
                    >
                        <span>⬇️</span>
                        <span>تحميل الملف</span>
                    </button>

                </div>

            </div>

        </div>
    `;
}

/* الوضع الليلي/النهاري: منطقه في js/header.js (toggleTheme) — لا تكرره هنا */

/* =========================================
   تحديد رابط الهيدر النشط تلقائيًا
========================================= */

function updateHeaderActiveLink() {
    const links = document.querySelectorAll('.main-nav .nav-link');
    const currentPath = window.location.pathname.toLowerCase();

    let activeNav = 'home';

    if (/\/student_dashboard(?:\.html)?\/?$/.test(currentPath)) {
        activeNav = 'dashboard';
    } else if (/\/about\/about\.html$/.test(currentPath)) {
        activeNav = 'about';
    } else if (/\/faculty\/faculty\.html$/.test(currentPath)) {
        activeNav = 'faculty';
    } else if (/\/community\/community\.html$/.test(currentPath)) {
        activeNav = 'community';
    } else if (/\/tools\/tools\.html$/.test(currentPath)) {
        activeNav = 'tools';
    }

    links.forEach(link => {
        const isActive = link.dataset.nav === activeNav;

        link.classList.toggle('active', isActive);

        if (isActive) {
            link.setAttribute('aria-current', 'page');
        } else {
            link.removeAttribute('aria-current');
        }
    });

    // على الموبايل شريط الروابط قابل للتمرير الأفقي: نُظهر الرابط النشط داخله
    const nav = document.querySelector('.main-nav');
    const activeLink = nav && nav.querySelector('.nav-link.active');

    if (activeLink && nav.scrollWidth > nav.clientWidth) {
        activeLink.scrollIntoView({ block: 'nearest', inline: 'center' });
    }
}

document.addEventListener('DOMContentLoaded', updateHeaderActiveLink);