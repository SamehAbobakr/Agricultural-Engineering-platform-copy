// الكود الكامل المحدث والجاهز للاستبدال المباشر
async function loadSubjectsFromSupabase() {
    try {
        console.log("========== LOAD SUBJECTS ==========");
        console.log("🎓 Grade:", currentGrade);
        console.log("📖 Term:", currentTerm);

        const { data, error } = await supabaseClient
            .from('subjects')
            .select('*')
            .ilike('grade', `%${currentGrade.trim()}%`)
            .ilike('term', `%${currentTerm.trim()}%`);

        if (error) throw error;

        console.log("📘 المواد المسترجعة من Supabase:", data);

        return data || [];

    } catch (error) {
        console.error("❌ خطأ في جلب المواد من Supabase:", error);
        return [];
    }
}
function renderHome() {
    currentGrade = '';
    currentDept = '';
    currentTerm = '';

    updateSidebarActive();

    const html = `
        <div class="fade-in">

            <div class="stats-grid">
                <div class="stat-card">
                    <h3>44</h3>
                    <p>📚 إجمالي المواد المتاحة</p>
                </div>

                <div class="stat-card">
                    <h3>480</h3>
                    <p>🎥 إجمالي المحاضرات</p>
                </div>

                <div class="stat-card">
                    <h3>720</h3>
                    <p>📄 ملفات PDF</p>
                </div>

                <div class="stat-card">
                    <h3>35</h3>
                    <p>👨‍🏫 أعضاء هيئة التدريس</p>
                </div>
            </div>


            <h2 class="section-title">اختر الفرقة الدراسية</h2>

            <!-- كروت الفرق -->
            <div class="grid-container">

                <!-- الفرقة الأولى -->
                <div class="card"
                    onclick="selectGrade('الفرقة الأولى')"
                    style="border-top: 4px solid var(--grade-1)">

                    <div class="card-header-icon">📘</div>

                    <h3>الفرقة الأولى</h3>

                    <p class="card-info">
                        المقررات الأساسية العامة وتأسيس العلوم الهندسية.
                    </p>

                    <div class="card-footer">
                        <span>الدخول للفرقة</span>
                        <span>←</span>
                    </div>

                </div>


                <!-- الفرقة الثانية -->
                <div class="card"
                    onclick="selectGrade('الفرقة الثانية')"
                    style="border-top: 4px solid var(--grade-2)">

                    <div class="card-header-icon">📗</div>

                    <h3>الفرقة الثانية</h3>

                    <p class="card-info">
                        المقررات الهندسية التأسيسية والرياضيات المتقدمة.
                    </p>

                    <div class="card-footer">
                        <span>الدخول للفرقة</span>
                        <span>←</span>
                    </div>

                </div>


                <!-- الفرقة الثالثة -->
                <div class="card"
                    onclick="selectGrade('الفرقة الثالثة')"
                    style="border-top: 4px solid var(--grade-3)">

                    <div class="card-header-icon">📙</div>

                    <h3>الفرقة الثالثة</h3>

                    <p class="card-info">
                        بداية التخصص والتفرع للأقسام العلمية الستة.
                        <br>
                        <strong style="color:var(--primary-color)">
                            متاح: هندسة القوى والآلات (الترم الأول)
                        </strong>
                    </p>

                    <div class="card-footer">
                        <span>الدخول للفرقة</span>
                        <span>←</span>
                    </div>

                </div>


                <!-- الفرقة الرابعة -->
                <div class="card"
                    onclick="selectGrade('الفرقة الرابعة')"
                    style="border-top: 4px solid var(--grade-4)">

                    <div class="card-header-icon">📕</div>

                    <h3>الفرقة الرابعة</h3>

                    <p class="card-info">
                        التخصص الدقيق ومشاريع التخرج والتطبيقات الهندسية.
                    </p>

                    <div class="card-footer">
                        <span>الدخول للفرقة</span>
                        <span>←</span>
                    </div>

                </div>

            </div>


            <!-- أدوات المنصة -->
            <h2 class="section-title" style="margin-top: 35px;">
                أدوات المنصة
            </h2>

            <!-- سبورة الشرح -->
            <div class="card"
                onclick="openWhiteboard()"
                style="
                    border-top: 4px solid var(--primary-color);
                    cursor: pointer;
                    width: 100%;
                ">

                <div class="card-header-icon">🖊️</div>

                <h3>سبورة الشرح</h3>

                <p class="card-info">
                    سبورة تفاعلية للشرح والمذاكرة والمحاضرات.
                </p>

                <div class="card-footer">
                    <span>فتح السبورة</span>
                    <span>←</span>
                </div>

            </div>

        </div>
    `;

    document.getElementById('contentArea').innerHTML = html;
}
function openWhiteboard() {
    const whiteboardUrl = 'https://spahboard.ninjascribe.workers.dev/';

    // فتح السبورة في صفحة مستقلة على جميع الأجهزة
    window.open(whiteboardUrl, '_blank', 'noopener,noreferrer');
}
function renderDepartments() {
    let html = `
        <div class="fade-in">
            <div class="breadcrumb">
                <span onclick="resetView()">🏠 الرئيسية</span> > 
                <span>🎓 ${currentGrade}</span>
            </div>
            <h2 class="section-title">اختر القسم العلمي (${currentGrade})</h2>
            <div class="grid-container">
    `;
    departmentsList.forEach(dept => {
        html += `
            <div class="card" onclick="selectDepartment('${dept.name}')">
                <div class="card-header-icon">${dept.icon}</div>
                <h3>${dept.name}</h3>
                <p class="card-info">${dept.desc}</p>
                <div class="card-footer"><span>استعراض المواد</span><span>←</span></div>
            </div>
        `;
    });
    html += `</div></div>`;
    document.getElementById('contentArea').innerHTML = html;
}

function renderTerms() {
    let html = `
        <div class="fade-in">
            <div class="breadcrumb">
                <span onclick="resetView()">🏠 الرئيسية</span> > 
                <span onclick="selectGrade('${currentGrade}')">🎓 ${currentGrade}</span>
                ${currentDept ? ` > <span onclick="renderDepartments()">🏢 ${currentDept}</span>` : ''}
            </div>
            <h2 class="section-title">اختر الفصل الدراسي</h2>
            <div class="grid-container">
                <div class="card" onclick="selectTerm('الترم الأول')">
                    <div class="card-header-icon">📖</div>
                    <h3>الترم الأول</h3>
                    <p class="card-info">مقررات ومحاضرات الفصل الدراسي الأول</p>
                    <div class="card-footer"><span>عرض المواد</span><span>←</span></div>
                </div>
                <div class="card" onclick="selectTerm('الترم الثاني')">
                    <div class="card-header-icon">📘</div>
                    <h3>الترم الثاني</h3>
                    <p class="card-info">مقررات ومحاضرات الفصل الدراسي الثاني</p>
                    <div class="card-footer"><span>عرض المواد</span><span>←</span></div>
                </div>
            </div>
        </div>
    `;
    document.getElementById('contentArea').innerHTML = html;
}

async function renderSubjects() {
    document.getElementById('contentArea').innerHTML = `
        <div class="loading-screen">
            <div class="loading-spinner">⚙️</div>
            <p>جاري تحميل المواد من Supabase...</p>
        </div>
    `;

    const subjectsToDisplay = await loadSubjectsFromSupabase();

    let html = `
        <div class="fade-in">
            <div class="breadcrumb">
                <span onclick="resetView()">🏠 الرئيسية</span> > 
                <span onclick="selectGrade('${currentGrade}')">🎓 ${currentGrade}</span>
                ${currentDept ? ` <span onclick="renderDepartments()">🏢 ${currentDept}</span>` : ''}
                > <span>📘 ${currentTerm}</span>
            </div>
            <h2 class="section-title">المواد الدراسية (<span style="color:var(--primary-color)">${subjectsToDisplay.length} مواد</span>)</h2>
            <input type="text" class="inner-search" placeholder="🔍 ابحث عن مادة..." oninput="filterSubjects(this.value)">
            <div class="grid-container" id="subjectsGridContainer">
    `;

    if (!subjectsToDisplay || subjectsToDisplay.length === 0) {
        html += `<p style="text-align: center; color: var(--text-muted); padding: 30px; grid-column: 1 / -1;">لا توجد مواد متاحة حالياً.</p>`;
    } else {
        subjectsToDisplay.forEach(sub => {
            const subJson = JSON.stringify(sub).replace(/"/g, '&quot;');
            const profName = sub.professor || sub.prof || 'غير متوفر';
            const updatedText = sub.updated || 'حديث';
            html += `
                <div class="card" onclick="openMaterialView(${subJson})">
                    <div class="card-header-icon">${sub.icon || '📘'}</div>
                    <h3>${sub.name}</h3>
                    <p class="card-info">👨‍🏫 ${profName}</p>
                    <div class="card-footer">
                        <span style="color:var(--primary-color)">🟢 ${updatedText}</span>
                        <span style="font-weight:bold; color:var(--secondary-color)">[دخول المادة]</span>
                    </div>
                </div>
            `;
        });
    }
    html += `</div></div>`;
    document.getElementById('contentArea').innerHTML = html;
}

function openMaterialView(subject) {
    if (!subject || !subject.id) {
        console.error("❌ بيانات المادة غير صالحة أو مفقود معرف المادة (id):", subject);
        alert("حدث خطأ: بيانات المادة غير صالحة.");
        return;
    }
    showLoading(() => {
        renderMaterialPage(subject);
    });
}

async function renderMaterialPage(subject) {
    const deptName = currentDept ? currentDept : (subject.department || subject.dept || currentGrade);
    const lastUpdated = subject.updated || 'غير متوفرة';
    const subJson = JSON.stringify(subject).replace(/"/g, '&quot;');

    // شاشة تحميل مؤقتة
    document.getElementById('contentArea').innerHTML = `
        <div class="loading-screen">
            <div class="loading-spinner">⚙️</div>
            <p>جاري تحميل محتوى المادة...</p>
        </div>
    `;

    try {
        // جلب ملفات المادة لمعرفة الأقسام الموجودة فعليًا
        const { data: files, error } = await supabaseClient
            .from('material_files')
            .select('category, file_order')
            .eq('subject_id', subject.id)
            .order('file_order', { ascending: true });

        if (error) throw error;

        // ترتيب الأقسام الأساسي
        const categoryOrder = [
            'المحاضرات',
            'الكتاب الاكترونى',
            'السكاشن',
            'الملخصات',
            'حل الشيت',
            'الفيديوهات',
            'الامتحانات',
            'أخرى'
        ];

        // معرفة الأقسام الموجودة فعليًا في قاعدة البيانات
        const existingCategories = [];

        (files || []).forEach(file => {
            if (!file.category) return;

            const normalized = normalizeCategory(file.category);

            // منع تكرار نفس القسم
            if (!existingCategories.some(
                cat => normalizeCategory(cat) === normalized
            )) {
                existingCategories.push(file.category);
            }
        });

        // ترتيب الأقسام حسب الترتيب المحدد، مع إبقاء أي قسم جديد في النهاية
        const orderedCategories = [];

        categoryOrder.forEach(category => {
            const found = existingCategories.find(
                existing => normalizeCategory(existing) === normalizeCategory(category)
            );

            if (found) {
                orderedCategories.push(found);
            }
        });

        // أي تصنيف جديد غير موجود في القائمة الأساسية يظهر تلقائيًا
        existingCategories.forEach(category => {
            if (!orderedCategories.some(
                existing => normalizeCategory(existing) === normalizeCategory(category)
            )) {
                orderedCategories.push(category);
            }
        });

        let html = `
            <div class="fade-in material-view" style="direction: rtl; text-align: right;">
                <div class="breadcrumb">
                    <span onclick="resetView()">🏠 الرئيسية</span> > 
                    <span onclick="renderSubjects()">رجوع للمواد</span>
                </div>

                <h2 class="section-title" style="margin-top:10px;">
                    مادة: ${subject.name}
                </h2>

                <p style="color:var(--text-muted); margin-bottom:5px;">
                    <strong>القسم التابع لها:</strong> ${deptName} |
                    <strong>الفرقة:</strong> ${currentGrade || subject.grade || 'غير محدد'}
                </p>

                <p style="color:var(--text-muted); margin-bottom:15px;">
                    <strong>آخر تحديث:</strong> ${lastUpdated}
                </p>

                <div class="card"
                    style="margin-bottom: 20px; border-right: 4px solid var(--primary-color); cursor: pointer;"
                    onclick="openAIAssistant(${subJson})">

                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div>
                            <h3 style="margin-bottom: 5px;">
                                المساعد الذكي للمادة 🤖
                            </h3>

                            <p class="card-info" style="margin: 0;">
                                انقر هنا لاستخدام المساعد الذكي في شرح وتلخيص محتوى المادة.
                            </p>
                        </div>

                        <span style="font-size: 24px; color: var(--primary-color);">
                            💬
                        </span>
                    </div>
                </div>

                <div id="aiAssistantArea"></div>

                <div class="material-tabs" id="materialTabsContainer">
        `;

        // إنشاء التابات من قاعدة البيانات
        if (orderedCategories.length > 0) {

            orderedCategories.forEach((category, index) => {

                const activeClass = index === 0 ? ' active' : '';
                const defaultId = index === 0 ? ' id="defaultTabBtn"' : '';

                html += `
                    <button
                        class="tab-btn${activeClass}"
                        ${defaultId}
                        onclick="switchMaterialTab(this, '${category.replace(/'/g, "\\'")}', ${subJson})">
                        ${category}
                    </button>
                `;
            });

        } else {

            html += `
                <span style="color:var(--text-muted); padding:10px;">
                    لا توجد أقسام متاحة حاليًا.
                </span>
            `;
        }

        html += `
                </div>

                <div id="tabContentArea" style="margin-top:20px;"></div>
            </div>
        `;

        document.getElementById('contentArea').innerHTML = html;

        // فتح أول قسم موجود تلقائيًا
        const firstTabBtn = document.getElementById('defaultTabBtn');

        if (firstTabBtn && orderedCategories.length > 0) {
            switchMaterialTab(
                firstTabBtn,
                orderedCategories[0],
                subject
            );
        }

    } catch (error) {

        console.error("❌ خطأ في تحميل أقسام المادة:", error);

        document.getElementById('contentArea').innerHTML = `
            <div class="fade-in">
                <p style="text-align:center; color:var(--text-muted); padding:30px;">
                    حدث خطأ أثناء تحميل محتوى المادة.
                </p>
            </div>
        `;
    }
}
async function switchMaterialTab(btnElement, type, subject) {

    // =========================================
    // تفعيل التبويب الحالي
    // =========================================

    const buttons = document.querySelectorAll('#materialTabsContainer .tab-btn');

    buttons.forEach(btn => btn.classList.remove('active'));

    if (btnElement) {
        btnElement.classList.add('active');
    }

    // =========================================
    // منطقة المحتوى
    // =========================================

    const contentArea = document.getElementById('tabContentArea');

    if (!contentArea) return;

    contentArea.innerHTML = `
        <div class="loading-screen">
            <div class="loading-spinner">⚙️</div>
            <p>جاري جلب الملفات...</p>
        </div>
    `;

    // =========================================
    // التأكد من وجود المادة
    // =========================================

    if (!subject || !subject.id) {

        contentArea.innerHTML = `
            <p style="
                text-align: center;
                color: var(--text-muted);
                padding: 30px;
            ">
                معرف المادة غير متوفر.
            </p>
        `;

        return;
    }

    try {

        console.log("📘 المادة الحالية:", subject);
        console.log("🏷️ التصنيف المطلوب:", type);

        // =========================================
        // جلب الملفات من Supabase
        // =========================================

        const { data: files, error } = await supabaseClient
            .from('material_files')
            .select('*')
            .eq('subject_id', subject.id)
            .order('file_order', { ascending: true });

        if (error) throw error;

        console.log("📂 ملفات المادة المسترجعة:", files);

        // =========================================
        // فلترة الملفات
        // =========================================

        const normalizedTargetType = normalizeCategory(type);

        const filteredFiles = (files || []).filter(
            file =>
                normalizeCategory(file.category) === normalizedTargetType
        );

        console.log("📚 الملفات بعد الفلترة:", filteredFiles);

        // =========================================
        // لا توجد ملفات
        // =========================================

        if (!filteredFiles || filteredFiles.length === 0) {

            contentArea.innerHTML = `
                <p style="
                    text-align: center;
                    color: var(--text-muted);
                    padding: 30px;
                ">
                    لا توجد ملفات متاحة في هذا القسم حالياً.
                </p>
            `;

            return;
        }

        // =========================================
        // HTML + CSS
        // =========================================

        let html = `

        <style>

            /* =========================================
               شبكة الملفات
            ========================================= */

            .material-files-grid {

                display: grid;

                grid-template-columns:
                    repeat(auto-fill, minmax(250px, 1fr));

                gap: 18px;

                width: 100%;
            }


            /* =========================================
               الكارت
            ========================================= */

            .material-file-card {

                background:
                    linear-gradient(
                        145deg,
                        rgba(30, 41, 59, 0.98),
                        rgba(25, 36, 53, 0.98)
                    );

                border: 1px solid var(--border-color);

                border-radius: 16px;

                padding: 18px;

                display: flex;

                flex-direction: column;

                min-width: 0;

                overflow: hidden;

                transition:
                    transform 0.2s ease,
                    border-color 0.2s ease,
                    box-shadow 0.2s ease;
            }


            /* =========================================
               تفاعل الكمبيوتر فقط
            ========================================= */

            @media (hover: hover) {

                .material-file-card:hover {

                    transform: translateY(-4px);

                    border-color:
                        rgba(16, 185, 129, 0.55);

                    box-shadow:
                        0 10px 25px
                        rgba(0, 0, 0, 0.28);
                }
            }


            /* =========================================
               الجزء العلوي
            ========================================= */

            .material-file-top {

                display: flex;

                align-items: flex-start;

                gap: 12px;

                margin-bottom: 14px;
            }


            /* =========================================
               أيقونة الملف
            ========================================= */

            .material-file-icon {

                width: 48px;

                height: 48px;

                min-width: 48px;

                display: flex;

                align-items: center;

                justify-content: center;

                border-radius: 12px;

                background:
                    rgba(239, 68, 68, 0.12);

                border:
                    1px solid rgba(239, 68, 68, 0.18);

                font-size: 24px;
            }


            /* =========================================
               عنوان الملف
            ========================================= */

            .material-file-title {

                color: var(--text-main);

                font-size: 1rem;

                font-weight: 700;

                line-height: 1.6;

                margin: 0;

                word-break: break-word;
            }


            /* =========================================
               وصف الملف
            ========================================= */

            .material-file-description {

                color: var(--text-muted);

                font-size: 0.82rem;

                line-height: 1.7;

                margin: 0 0 16px;

                min-height: 45px;

                display: -webkit-box;

                -webkit-line-clamp: 3;

                -webkit-box-orient: vertical;

                overflow: hidden;

                word-break: break-word;
            }


            /* =========================================
               معلومات بسيطة
            ========================================= */

            .material-file-info {

                display: flex;

                align-items: center;

                gap: 7px;

                margin-bottom: 14px;

                padding-bottom: 12px;

                border-bottom:
                    1px solid var(--border-color);

                color: var(--text-muted);

                font-size: 0.72rem;
            }


            .material-file-info span {

                background:
                    rgba(255, 255, 255, 0.04);

                border:
                    1px solid var(--border-color);

                border-radius: 6px;

                padding: 4px 7px;
            }


            /* =========================================
               منطقة الأزرار
            ========================================= */

            .material-file-actions {

                display: flex;

                flex-direction: column;

                gap: 8px;

                width: 100%;

                margin-top: auto;
            }


            /* =========================================
               زر فتح الملف
            ========================================= */

            .material-open-btn {

                width: 100%;

                min-height: 44px;

                display: flex;

                align-items: center;

                justify-content: center;

                gap: 8px;

                background: var(--primary-color);

                color: #06130e;

                border:
                    1px solid var(--primary-color);

                border-radius: 9px;

                text-decoration: none;

                font-family: inherit;

                font-size: 0.86rem;

                font-weight: 800;

                cursor: pointer;

                touch-action: manipulation;

                -webkit-tap-highlight-color: transparent;

                transition:
                    transform 0.2s ease,
                    box-shadow 0.2s ease;
            }


            .material-open-btn:hover {

                transform: translateY(-2px);

                box-shadow:
                    0 6px 16px
                    rgba(16, 185, 129, 0.22);
            }


            .material-open-btn:active {

                transform: scale(0.98);
            }


            /* =========================================
               زر التحميل
            ========================================= */

            .material-download-btn {

                width: 100%;

                min-height: 40px;

                display: flex;

                align-items: center;

                justify-content: center;

                gap: 7px;

                background:
                    rgba(255, 255, 255, 0.025);

                color: var(--secondary-color);

                border:
                    1px solid rgba(59, 130, 246, 0.38);

                border-radius: 9px;

                font-family: inherit;

                font-size: 0.8rem;

                font-weight: 700;

                cursor: pointer;

                touch-action: manipulation;

                -webkit-tap-highlight-color: transparent;

                transition:
                    transform 0.2s ease,
                    background-color 0.2s ease,
                    border-color 0.2s ease;
            }


            .material-download-btn:hover {

                transform: translateY(-1px);

                background:
                    rgba(59, 130, 246, 0.1);

                border-color:
                    var(--secondary-color);
            }


            .material-download-btn:active {

                transform: scale(0.98);
            }


            /* =========================================
               ضمان التفاعل
            ========================================= */

            .material-file-card a,
            .material-file-card button {

                position: relative;

                z-index: 5;

                pointer-events: auto;

                -webkit-user-select: none;

                user-select: none;
            }


            /* =========================================
               الموبايل
            ========================================= */

            @media (max-width: 600px) {

                .material-files-grid {

                    grid-template-columns:
                        repeat(2, minmax(0, 1fr));

                    gap: 9px;
                }


                .material-file-card {

                    padding: 11px;

                    border-radius: 12px;
                }


                .material-file-top {

                    gap: 7px;

                    margin-bottom: 9px;
                }


                .material-file-icon {

                    width: 35px;

                    height: 35px;

                    min-width: 35px;

                    border-radius: 8px;

                    font-size: 18px;
                }


                .material-file-title {

                    font-size: 0.76rem;

                    line-height: 1.45;
                }


                .material-file-description {

                    font-size: 0.63rem;

                    line-height: 1.5;

                    min-height: 34px;

                    margin-bottom: 9px;

                    -webkit-line-clamp: 2;
                }


                .material-file-info {

                    gap: 4px;

                    margin-bottom: 9px;

                    padding-bottom: 8px;

                    font-size: 0.55rem;
                }


                .material-file-info span {

                    padding: 3px 5px;
                }


                .material-file-actions {

                    gap: 5px;
                }


                .material-open-btn {

                    min-height: 37px;

                    border-radius: 7px;

                    font-size: 0.69rem;

                    gap: 5px;
                }


                .material-download-btn {

                    min-height: 34px;

                    border-radius: 7px;

                    font-size: 0.64rem;

                    gap: 4px;
                }
            }


            /* =========================================
               الموبايل الصغير جداً
            ========================================= */

            @media (max-width: 380px) {

                .material-files-grid {

                    gap: 7px;
                }


                .material-file-card {

                    padding: 9px;
                }


                .material-file-icon {

                    width: 31px;

                    height: 31px;

                    min-width: 31px;

                    font-size: 16px;
                }


                .material-file-title {

                    font-size: 0.7rem;
                }


                .material-file-description {

                    font-size: 0.58rem;
                }


                .material-open-btn {

                    min-height: 35px;

                    font-size: 0.64rem;
                }


                .material-download-btn {

                    min-height: 32px;

                    font-size: 0.59rem;
                }
            }

        </style>


        <div class="material-files-grid">
        `;

        window.currentViewerSubject = subject;
        // =========================================
        // إنشاء كروت الملفات
        // =========================================

        filteredFiles.forEach(file => {

            const targetUrl =
                file.file_url || '#';

            const fileTitle =
                file.title || 'بدون عنوان';

            const fileDesc =
                file.description || 'ملف تعليمي';

            const fileType =
                file.file_type || 'PDF';


            html += `

                <div class="material-file-card">

                    <!-- رأس الملف -->

                    <div class="material-file-top">

                        <div class="material-file-icon">
                            📕
                        </div>

                        <h3 class="material-file-title">
                            ${fileTitle}
                        </h3>

                    </div>


                    <!-- الوصف -->

                    <p class="material-file-description">
                        ${fileDesc}
                    </p>


                    <!-- معلومات الملف -->

                    <div class="material-file-info">

                        <span>
                            📄 ${fileType.toUpperCase()}
                        </span>

                        <span>
                            ملف دراسي
                        </span>

                    </div>


                            <!-- الأزرار -->

                            <div class="material-file-actions">

                                <!-- فتح -->

                                <button
            type="button"
            class="material-open-btn"
            onclick="openMaterialViewer(
                '${targetUrl}',
                '${fileTitle.replace(/'/g, "\\'")}'
            )"
        >
            <span>👁️</span>
            <span>معاينة الملف</span>
        </button>


                        <!-- تحميل -->

                        <button
                            type="button"
                            class="material-download-btn"
                            onclick="downloadMaterialFile(
                                '${targetUrl}',
                                '${fileTitle.replace(/'/g, "\\'")}'
                            )"
                        >

                            <span>⬇️</span>

                            <span>
                                تحميل الملف
                            </span>

                        </button>

                    </div>

                </div>

            `;

        });


        // =========================================
        // إنهاء الشبكة
        // =========================================

        html += `
            </div>
        `;


        contentArea.innerHTML = html;


    } catch (error) {

        console.error(
            "❌ خطأ في جلب ملفات المادة من Supabase:",
            error
        );

        contentArea.innerHTML = `
            <p style="
                text-align: center;
                color: var(--text-muted);
                padding: 30px;
            ">
                حدث خطأ أثناء تحميل الملفات.
            </p>
        `;
    }
}
function openMaterialViewer(url, title = 'معاينة الملف') {

    if (!url || url === '#') {
        alert('رابط الملف غير متوفر.');
        return;
    }

    const contentArea = document.getElementById('contentArea');

    if (!contentArea) return;

    // حفظ المادة الحالية للرجوع إليها
    window.currentViewerSubject =
        window.currentViewerSubject || null;

    contentArea.innerHTML = `

        <div class="material-viewer">

            <!-- ================================
                 رأس العارض
            ================================= -->

            <div class="material-viewer-header">

                <button
                    type="button"
                    class="viewer-back-btn"
                    onclick="
                        if (window.currentViewerSubject) {
                            renderMaterialPage(
                                window.currentViewerSubject
                            );
                        } else {
                            renderSubjects();
                        }
                    "
                >
                    ← رجوع
                </button>


                <h2 title="${title}">
                    ${title}
                </h2>


                <a
                    href="${url}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="viewer-new-tab-btn"
                >
                    فتح ↗
                </a>

            </div>


            <!-- ================================
                 منطقة المعاينة
            ================================= -->

            <div class="material-viewer-body">

                <div class="viewer-loading" id="viewerLoading">

                    <div class="viewer-loading-icon">
                        📄
                    </div>

                    <p>
                        جاري تجهيز الملف...
                    </p>

                </div>


                <iframe
                    id="materialViewerFrame"
                    src="${url}"
                    title="${title}"
                    allow="fullscreen"
                    loading="eager"
                ></iframe>


                <!-- يظهر في حالة عدم إمكانية العرض -->

                <div
                    class="viewer-fallback"
                    id="viewerFallback"
                >

                    <div class="viewer-fallback-icon">
                        📄
                    </div>

                    <h3>
                        لا يمكن عرض الملف داخل الموقع
                    </h3>

                    <p>
                        يمكنك فتح الملف مباشرة في المتصفح.
                    </p>

                    <a
                        href="${url}"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="viewer-fallback-btn"
                    >
                        فتح الملف
                    </a>

                </div>

            </div>

        </div>


        <style>

            /* =========================================
               العارض الرئيسي
            ========================================= */

            .material-viewer {

                width: 100%;

                min-height:
                    calc(100vh - 100px);

                background:
                    var(--card-bg);

                border:
                    1px solid var(--border-color);

                border-radius: 15px;

                overflow: hidden;

                display: flex;

                flex-direction: column;
            }


            /* =========================================
               رأس العارض
            ========================================= */

            .material-viewer-header {

                min-height: 60px;

                padding: 10px 15px;

                display: flex;

                align-items: center;

                gap: 10px;

                background:
                    rgba(15, 23, 42, 0.98);

                border-bottom:
                    1px solid var(--border-color);
            }


            .material-viewer-header h2 {

                flex: 1;

                min-width: 0;

                margin: 0;

                color:
                    var(--text-main);

                font-size: 1rem;

                text-align: center;

                overflow: hidden;

                text-overflow: ellipsis;

                white-space: nowrap;
            }


            /* =========================================
               أزرار الرأس
            ========================================= */

            .viewer-back-btn,
            .viewer-new-tab-btn {

                min-height: 40px;

                padding: 8px 13px;

                display: inline-flex;

                align-items: center;

                justify-content: center;

                border-radius: 8px;

                font-family: inherit;

                font-size: 0.8rem;

                font-weight: 700;

                cursor: pointer;

                text-decoration: none;

                white-space: nowrap;

                box-sizing: border-box;

                touch-action: manipulation;

                -webkit-tap-highlight-color: transparent;
            }


            .viewer-back-btn {

                background:
                    rgba(255,255,255,0.06);

                color:
                    var(--text-main);

                border:
                    1px solid var(--border-color);
            }


            .viewer-new-tab-btn {

                background:
                    rgba(59,130,246,0.10);

                color:
                    var(--secondary-color);

                border:
                    1px solid
                    rgba(59,130,246,0.35);
            }


            /* =========================================
               جسم العارض
            ========================================= */

            .material-viewer-body {

                position: relative;

                flex: 1;

                width: 100%;

                min-height: 75vh;

                background:
                    #111827;

                overflow: hidden;
            }


            /* =========================================
               iframe
            ========================================= */

            .material-viewer-body iframe {

                position: relative;

                z-index: 2;

                display: block;

                width: 100%;

                height: 75vh;

                min-height: 500px;

                border: none;

                background: #fff;
            }


            /* =========================================
               التحميل
            ========================================= */

            .viewer-loading {

                position: absolute;

                inset: 0;

                z-index: 1;

                display: flex;

                flex-direction: column;

                align-items: center;

                justify-content: center;

                gap: 10px;

                color:
                    var(--text-muted);
            }


            .viewer-loading-icon {

                font-size: 38px;
            }


            .viewer-loading p {

                margin: 0;

                font-size: 0.85rem;
            }


            /* =========================================
               البديل
            ========================================= */

            .viewer-fallback {

                display: none;

                position: absolute;

                inset: 0;

                z-index: 10;

                padding: 25px;

                align-items: center;

                justify-content: center;

                flex-direction: column;

                text-align: center;

                background:
                    var(--card-bg);
            }


            .viewer-fallback-icon {

                font-size: 48px;

                margin-bottom: 10px;
            }


            .viewer-fallback h3 {

                margin: 0 0 8px;

                color:
                    var(--text-main);

                font-size: 1rem;
            }


            .viewer-fallback p {

                margin: 0 0 18px;

                color:
                    var(--text-muted);

                font-size: 0.8rem;
            }


            .viewer-fallback-btn {

                min-height: 42px;

                padding: 9px 20px;

                display: inline-flex;

                align-items: center;

                justify-content: center;

                border-radius: 8px;

                background:
                    var(--primary-color);

                color: #06130e;

                border:
                    1px solid var(--primary-color);

                text-decoration: none;

                font-family: inherit;

                font-size: 0.8rem;

                font-weight: 800;
            }


            /* =========================================
               الموبايل
            ========================================= */

            @media (max-width: 600px) {

                .material-viewer {

                    min-height:
                        calc(100vh - 80px);

                    border-radius: 10px;
                }


                .material-viewer-header {

                    min-height: 52px;

                    padding: 7px;

                    gap: 5px;
                }


                .material-viewer-header h2 {

                    font-size: 0.72rem;
                }


                .viewer-back-btn,
                .viewer-new-tab-btn {

                    min-height: 34px;

                    padding: 6px 8px;

                    font-size: 0.62rem;

                    border-radius: 7px;
                }


                .material-viewer-body {

                    min-height:
                        calc(100vh - 132px);

                    overflow: auto;
                }


                .material-viewer-body iframe {

                    width: 100%;

                    height:
                        calc(100vh - 132px);

                    min-height: 500px;
                }


                .viewer-fallback {

                    padding: 20px;
                }


                .viewer-fallback-icon {

                    font-size: 40px;
                }


                .viewer-fallback h3 {

                    font-size: 0.85rem;
                }


                .viewer-fallback p {

                    font-size: 0.68rem;
                }


                .viewer-fallback-btn {

                    min-height: 38px;

                    padding: 8px 16px;

                    font-size: 0.7rem;
                }
            }


            /* =========================================
               موبايلات صغيرة جدًا
            ========================================= */

            @media (max-width: 380px) {

                .material-viewer-header h2 {

                    font-size: 0.65rem;
                }


                .viewer-back-btn,
                .viewer-new-tab-btn {

                    padding: 5px 6px;

                    font-size: 0.58rem;
                }


                .material-viewer-body iframe {

                    min-height: 450px;
                }
            }

        </style>
    `;


    // =========================================
    // التعامل مع iframe
    // =========================================

    const iframe =
        document.getElementById('materialViewerFrame');

    const loading =
        document.getElementById('viewerLoading');

    const fallback =
        document.getElementById('viewerFallback');


    if (!iframe) return;


    // لو تم تحميل الـ iframe
    iframe.addEventListener('load', function () {

        if (loading) {
            loading.style.display = 'none';
        }

    });


    // =========================================
    // مهلة احتياطية
    // =========================================

    setTimeout(function () {

        if (loading) {
            loading.style.display = 'none';
        }

    }, 5000);

}
async function downloadMaterialFile(url, fileName) {
    if (!url || url === '#') {
        alert("رابط التحميل غير متوفر.");
        return;
    }

    try {
        const response = await fetch(url, {
            mode: 'cors'
        });

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const blob = await response.blob();

        // إنشاء رابط مؤقت للملف
        const blobUrl = window.URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = blobUrl;

        // اسم الملف عند التحميل
        a.download = fileName.toLowerCase().endsWith('.pdf')
            ? fileName
            : `${fileName}.pdf`;

        document.body.appendChild(a);
        a.click();

        // تنظيف
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);
        }, 1000);

    } catch (error) {
        console.error("❌ فشل تحميل الملف:", error);

        // لو CORS منع التحميل المباشر
        alert("تعذر التحميل المباشر. سيتم فتح الملف، ويمكنك تحميله من عارض PDF.");

        window.open(url, '_blank');
    }
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

function showLoading(callback) {
    document.getElementById('contentArea').innerHTML = `
        <div class="loading-screen">
            <div class="loading-spinner">⚙️</div>
            <p>جاري تحميل المحتوى...</p>
        </div>
    `;
    setTimeout(callback, 250);
}

function filterSubjects(query) {
    const cards = document.querySelectorAll('#subjectsGridContainer .card');
    cards.forEach(card => {
        const titleElement = card.querySelector('h3');
        if (titleElement) {
            const title = titleElement.textContent.toLowerCase();
            if (title.includes(query.toLowerCase())) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        }
    });
}

function handleGlobalSearch(query) {
    if (!query || !query.trim()) return;
}