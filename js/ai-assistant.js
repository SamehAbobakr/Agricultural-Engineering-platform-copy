// js/ai-assistant.js

/**
 * نظام المساعد الذكي الخاص بالمادة الدراسية
 * مسؤول بالكامل عن واجهة وإدارة تفاعلات الذكاء الاصطناعي مع الطالب داخل المادة.
 * مهيأ للربط المستقبلي مع Supabase, OpenAI API, و Gemini API.
 */
class SubjectAIAssistant {
    constructor(subject, metadata = {}) {
        if (!subject) {
            console.error("خطأ: لم يتم تمرير بيانات المادة إلى المساعد الذكي.");
            this.subject = { name: 'مادة غير معروفة', content: {} };
        } else {
            this.subject = subject;
        }

        this.metadata = {
            grade: metadata.grade || subject.grade || 'غير محدد',
            department: metadata.department || subject.dept || 'غير محدد',
            term: metadata.term || subject.term || 'غير محدد'
        };
    }

    /**
     * استخراج سياق وبيانات المادة كاملة لاستخدامها في نماذج الذكاء الاصطناعي أو Supabase
     */
    getSubjectContext() {
        return {
            name: this.subject.name || 'مادة غير محددة',
            grade: this.metadata.grade,
            department: this.metadata.department,
            term: this.metadata.term,
            lecturesCount: this.subject.lectures || 0,
            pdfsCount: this.subject.pdfs || 0,
            prof: this.subject.prof || 'غير متوفر',
            content: this.subject.content || {}
        };
    }

    /**
     * توليد واجهة المستخدم الخاصة بالمساعد الذكي متوافقة مع تصميم المنصة و RTL
     */
    renderAssistantUI() {
        const context = this.getSubjectContext();

        return `
            <div class="fade-in material-view" style="margin-top: 15px; margin-bottom: 20px; direction: rtl; text-align: right; border: 1px solid var(--primary-color, #2e7d32); background: var(--card-bg, #fff);">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color, #eaeaea); padding-bottom: 10px; margin-bottom: 15px;">
                    <h3 style="margin: 0; color: var(--primary-color);">🤖 المساعد الذكي لمادة: ${context.name}</h3>
                    <button class="tab-btn" onclick="closeAIAssistant()" style="padding: 4px 10px; font-size: 12px; cursor: pointer;">✕ إغلاق</button>
                </div>
                
                <p class="card-info" style="margin-bottom: 15px;">
                    <strong>الفرقة:</strong> ${context.grade} | <strong>القسم:</strong> ${context.department} | <strong>الترم:</strong> ${context.term} | <strong>المحاضرات:</strong> ${context.lecturesCount} | <strong>الملفات:</strong> ${context.pdfsCount}
                </p>

                <div style="margin-bottom: 15px;">
                    <p style="font-weight: bold; margin-bottom: 8px; font-size: 14px;">أزرار اقتراح جاهزة:</p>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                        <button class="tab-btn" style="padding: 6px 12px; font-size: 12px; cursor: pointer;" onclick="aiAssistantInstance.handlePresetQuery('شرح المحاضرة')">شرح المحاضرة</button>
                        <button class="tab-btn" style="padding: 6px 12px; font-size: 12px; cursor: pointer;" onclick="aiAssistantInstance.handlePresetQuery('تلخيص المادة')">تلخيص المادة</button>
                        <button class="tab-btn" style="padding: 6px 12px; font-size: 12px; cursor: pointer;" onclick="aiAssistantInstance.handlePresetQuery('إنشاء أسئلة امتحان')">إنشاء أسئلة امتحان</button>
                        <button class="tab-btn" style="padding: 6px 12px; font-size: 12px; cursor: pointer;" onclick="aiAssistantInstance.handlePresetQuery('مراجعة أهم النقاط')">مراجعة أهم النقاط</button>
                        <button class="tab-btn" style="padding: 6px 12px; font-size: 12px; cursor: pointer;" onclick="aiAssistantInstance.handlePresetQuery('حل استفسار الطالب')">حل استفسار الطالب</button>
                    </div>
                </div>

                <div style="margin-bottom: 15px;">
                    <textarea id="aiQueryInput" class="inner-search" placeholder="اكتب سؤالك أو استفسارك هنا..." style="width: 100%; height: 90px; padding: 10px; resize: vertical; border-radius: 6px; box-sizing: border-box;"></textarea>
                </div>

                <div style="display: flex; justify-content: flex-end; margin-bottom: 15px;">
                    <button class="tab-btn active" style="padding: 8px 20px; cursor: pointer;" onclick="triggerAIAssistantQuery()">زر إرسال</button>
                </div>

                <div id="aiResponseArea" class="card" style="margin: 0; background: var(--bg-color, #f9f9f9); min-height: 80px; border: 1px dashed var(--border-color, #ccc);">
                    <p class="card-info" style="margin: 0; text-align: center; color: var(--text-muted);">منطقة عرض الإجابة: ستظهر إجابة المساعد الذكي هنا بناءً على محتوى المادة...</p>
                </div>
            </div>
        `;
    }

    /**
     * إدراج النصوص الجاهزة في صندوق الكتابة عند النقر على الأزرار المقترحة
     */
    handlePresetQuery(queryType) {
        const inputField = document.getElementById('aiQueryInput');
        if (inputField) {
            inputField.value = queryType;
        }
    }

    /**
     * معالجة الاستعلام وإرساله مع سياق المادة
     * @param {string} query 
     */
    async processQuery(query) {
        const responseArea = document.getElementById('aiResponseArea');
        if (!responseArea) return;

        if (!query || !query.trim()) {
            responseArea.innerHTML = `<p class="card-info" style="margin: 0; text-align: center; color: var(--secondary-color);">⚠️ الرجاء كتابة سؤال أو اختيار اقتراح أولاً.</p>`;
            return;
        }

        responseArea.innerHTML = `<p class="card-info" style="margin: 0; text-align: center; color: var(--primary-color);">⏳ جاري تحليل سياق المادة ومعالجة السؤال...</p>`;

        const context = this.getSubjectContext();

        // =========================================================================
        // [مكان مخصص مستقبلاً للربط مع Supabase Edge Functions أو OpenAI / Gemini API]
        // مثال للربط الفعلي مع قاعدة بيانات Supabase واسترجاع ملفات PDF والمحتوى:
        // try {
        //     const response = await fetch('YOUR_SUPABASE_EDGE_FUNCTION_URL', {
        //         method: 'POST',
        //         headers: {
        //             'Content-Type': 'application/json',
        //             'Authorization': 'Bearer YOUR_SUPABASE_ANON_KEY'
        //         },
        //         body: JSON.stringify({ query: query, subjectContext: context })
        //     });
        //     const data = await response.json();
        //     // عرض النتيجة القادمة من الـ API
        // } catch (error) {
        //     // التعامل مع الأخطاء
        // }
        // =========================================================================

        // محاكاة إجابة تجريبية (Mock Response) متوافقة مع محتوى المادة
        setTimeout(() => {
            let mockAnswer = `تم استلام استفسارك (${query}) لمادة (${context.name}). يعتمد هذا الرد التجريبي على بيانات الفرقة (${context.grade}) والقسم (${context.department}). النظام مستقل وجاهز تماماً للربط مع Supabase أو نماذج الذكاء الاصطناعي لاسترجاع الإجابات من ملفات الـ PDF والمحاضرات.`;

            if (query === 'شرح المحاضرة') {
                mockAnswer = `شرح مبدئي لمحتوى مادة ${context.name}: تتناول المقررات الأساسيات والأساليب الهندسية المعتمدة بإشراف ${context.prof}.`;
            } else if (query === 'تلخيص المادة') {
                mockAnswer = `ملخص المادة: تتضمن المادة (${context.lecturesCount}) محاضرة رئيسية و (${context.pdfsCount}) ملفات مرجعية تغطي المنهج الدراسي للترم (${context.term}).`;
            } else if (query === 'إنشاء أسئلة امتحان') {
                mockAnswer = `سؤال مقترح للامتحان في ${context.name}: وضح بالتفصيل الأسس النظرية والتطبيقات العملية المرتبطة بموضوعات المنهج.`;
            } else if (query === 'مراجعة أهم النقاط') {
                mockAnswer = `نقاط المراجعة الهامة لمادة ${context.name}: التركيز على العلاقات الرياضية، الرسومات التوضيحية، وتطبيقات الهندسة الزراعية ذات الصلة.`;
            }

            responseArea.innerHTML = `
                <h3 style="margin-top: 0; font-size: 15px; color: var(--primary-color);">منطقة عرض الإجابة:</h3>
                <p class="card-info" style="margin: 0; color: var(--text-main, #333); line-height: 1.6;">${mockAnswer}</p>
            `;
        }, 600);
    }
}

// متغير عام لإدارة حالة المساعد الحالي داخل الصفحة
let aiAssistantInstance = null;

/**
 * فتح واجهة المساعد الذكي للمادة داخل عنصر aiAssistantArea المحدد
 * @param {Object} subject 
 */
function openAIAssistant(subject) {
    if (!subject) {
        console.error("خطأ: بيانات المادة غير متوفرة لفتح المساعد الذكي.");
        return;
    }

    const metadata = {
        grade: typeof currentGrade !== 'undefined' ? currentGrade : (subject.grade || 'غير محدد'),
        department: typeof currentDept !== 'undefined' ? currentDept : (subject.dept || 'غير محدد'),
        term: typeof currentTerm !== 'undefined' ? currentTerm : (subject.term || 'غير محدد')
    };

    aiAssistantInstance = new SubjectAIAssistant(subject, metadata);
    
    const assistantArea = document.getElementById('aiAssistantArea');
    if (assistantArea) {
        assistantArea.innerHTML = aiAssistantInstance.renderAssistantUI();
        assistantArea.style.display = 'block';
    } else {
        console.error("خطأ: عنصر واجهة المساعد (aiAssistantArea) غير موجود في الصفحة.");
    }
}

/**
 * إغلاق وإخفاء واجهة المساعد الذكي دون إعادة تحميل الصفحة
 */
function closeAIAssistant() {
    const assistantArea = document.getElementById('aiAssistantArea');
    if (assistantArea) {
        assistantArea.innerHTML = '';
        assistantArea.style.display = 'none';
    }
    aiAssistantInstance = null;
}

/**
 * معالجة وإرسال السؤال المكتوب عبر واجهة المساعد
 */
function triggerAIAssistantQuery() {
    const inputField = document.getElementById('aiQueryInput');
    if (!inputField) return;

    const query = inputField.value.trim();
    if (!query) return;

    if (aiAssistantInstance) {
        aiAssistantInstance.processQuery(query);
    } else {
        console.error("خطأ: لم يتم تهيئة كلاس المساعد الذكي بعد.");
    }
}