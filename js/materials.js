function openMaterialView(subject) {
    if (!subject || !subject.id) {
        console.error(
            "❌ بيانات المادة غير صالحة أو مفقود معرف المادة (id):",
            subject
        );

        alert("حدث خطأ: بيانات المادة غير صالحة.");
        return;
    }
    currentSubject = subject;

    saveNavigationState();

    showLoading(() => {
        renderMaterialPage(subject);
    });
}

async function renderMaterialPage(subject) {
    const deptName = currentDept
    ? currentDept
    : (subject.department || currentGrade);
    const lastUpdated = subject.updated_at
    ? new Date(subject.updated_at).toLocaleDateString('ar-EG')
    : 'غير متوفرة';
    const subJson = inlineArg(subject);

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
            .order('file_order', { ascending: true })
            .limit(100);
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
                    <span onclick="currentSubject = null; renderSubjects()">رجوع للمواد</span>
                </div>

                <h2 class="section-title" style="margin-top:10px;">
                    مادة: ${escapeHtml(subject.name)}
                </h2>

                <p style="color:var(--text-muted); margin-bottom:5px;">
                    <strong>القسم التابع لها:</strong> ${escapeHtml(deptName)} |
                    <strong>الفرقة:</strong> ${escapeHtml(currentGrade || subject.grade || 'غير محدد')}
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

                // إصلاح: استخدام JSON.stringify + ترميز الاقتباسات كـ HTML entity
                // بدل الـ escaping اليدوي الناقص (كان بيهرب علامة الاقتباس المفردة
                // بس، ومش بيتعامل مع الـ backslash، ده كان بيفتح ثغرة XSS)
                const categoryJson =
                    inlineArg(category);

                html += `
                    <button
                        class="tab-btn${activeClass}"
                        ${defaultId}
                        onclick="switchMaterialTab(this, ${categoryJson}, ${subJson})">
                        ${escapeHtml(category)}
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

        // =========================================
        // جلب الملفات من Supabase
        // =========================================

        const { data: files, error } = await supabaseClient
            .from('material_files')
            .select('*')
            .eq('subject_id', subject.id)
            .order('file_order', { ascending: true });

        if (error) throw error;

        // =========================================
        // فلترة الملفات
        // =========================================

        const normalizedTargetType = normalizeCategory(type);

        const filteredFiles = (files || []).filter(
            file =>
                normalizeCategory(file.category) === normalizedTargetType
        );

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
        // HTML
        // =========================================

        let html = `

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
                            ${escapeHtml(fileTitle)}
                        </h3>

                    </div>


                    <!-- الوصف -->

                    <p class="material-file-description">
                        ${escapeHtml(fileDesc)}
                    </p>


                    <!-- معلومات الملف -->

                    <div class="material-file-info">

                        <span>
                            📄 ${escapeHtml(String(fileType).toUpperCase())}
                        </span>

                        <span>
                            ملف دراسي
                        </span>

                    </div>


                    <!-- الأزرار -->

                    <div class="material-file-actions">

                        <!-- فتح -->

                        <a
                            href="${escapeHtml(safeUrl(targetUrl) || '#')}"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="material-open-btn"
                        >
                            <span>👁️</span>
                            <span>فتح الملف</span>
                        </a>


                        <!-- تحميل -->

                        <button
                            type="button"
                            class="material-download-btn"
                            onclick="downloadMaterialFile(
                                ${inlineArg(targetUrl)},
                                ${inlineArg(fileTitle)}
                            )"
                        >
                            <span>⬇️</span>
                            <span>تحميل الملف</span>
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
async function downloadMaterialFile(url, fileName) {
    const cleanUrl = safeUrl(url);

    if (!cleanUrl || cleanUrl === '#') {
        alert("رابط التحميل غير متوفر.");
        return;
    }

    try {
        const response = await fetch(cleanUrl, {
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

        // اسم الملف عند التحميل: نستخدم امتداد الملف الفعلي من الرابط،
        // وإذا لم نجد امتدادًا نفترض أنه PDF (السلوك السابق).
        const title = String(fileName || 'file');
        const extMatch = new URL(cleanUrl, window.location.href)
            .pathname.match(/\.([a-z0-9]{2,5})$/i);
        const ext = extMatch ? extMatch[1].toLowerCase() : 'pdf';

        a.download = title.toLowerCase().endsWith('.' + ext)
            ? title
            : `${title}.${ext}`;

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

        window.open(cleanUrl, '_blank', 'noopener,noreferrer');
    }
}
