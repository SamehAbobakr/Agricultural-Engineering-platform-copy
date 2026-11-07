
// js/ai-assistant.js

// المساعد الذكي (Edge Function باسم smart-service) باقٍ كما هو على مشروعه الأصلي.
// مفتاحه العام خاص بذلك المشروع، فلا يُستخدم معه SUPABASE_KEY الخاص بقاعدة بيانات الموقع (js/config.js).
// لنقله لاحقًا إلى مشروع الموقع الجديد: انشر الدالة هناك وغيّر الثابتين التاليين فقط.
const SMART_SERVICE_URL =
    "https://kegawnvzoimaddnziotv.supabase.co/functions/v1/smart-service";
const SMART_SERVICE_KEY = "sb_publishable_0crKHKVfwNCtP5ieWDUpzg_4BeMZLkg";


class SubjectAIAssistant {

    constructor(subject, metadata = {}) {

        if (!subject) {
            console.error("خطأ: لم يتم تمرير بيانات المادة إلى المساعد الذكي.");

            this.subject = {
                name: "مادة غير معروفة",
                content: {}
            };

        } else {
            this.subject = subject;
        }

        this.metadata = {
            grade: metadata.grade || this.subject.grade || "غير محدد",
            department: metadata.department || this.subject.department || "غير محدد",
            term: metadata.term || this.subject.term || "غير محدد"
        };
    }


    getSubjectContext() {

        return {
            name: this.subject.name || "مادة غير محددة",
            grade: this.metadata.grade,
            department: this.metadata.department,
            term: this.metadata.term,
            prof: this.subject.professor || "غير متوفر"
        };
    }


    renderAssistantUI() {

        const context = this.getSubjectContext();

        return `
            <section class="ai-assistant-shell" dir="rtl">

                <!-- Header -->
                <header class="ai-assistant-header">

                    <div class="ai-assistant-brand">

                        <div class="ai-assistant-logo">
                            <span class="ai-cap-icon">✦</span>
                        </div>

                        <div class="ai-assistant-brand-text">
                            <h2>المساعد الأكاديمي</h2>
                            <p>مساعدك في فهم مواد الكلية</p>
                        </div>

                    </div>

                    <div class="ai-assistant-header-actions">

                        <span class="ai-assistant-status">
                            <span class="ai-status-dot"></span>
                            جاهز للمساعدة
                        </span>

                        <button
                            type="button"
                            class="ai-close-btn"
                            onclick="closeAIAssistant()"
                            aria-label="إغلاق المساعد"
                            title="إغلاق"
                        >
                            &times;
                        </button>

                    </div>

                </header>


                <!-- Main Content -->
                <div class="ai-assistant-content">

                    <div class="ai-welcome-section">

                        <span class="ai-welcome-label">
                            مساعدك الدراسي
                        </span>

                        <h3>أهلاً بك، كيف يمكنني مساعدتك؟</h3>

                        <p>
                            اسأل عن أي موضوع في المادة، وسأساعدك على فهمه
                            وتبسيطه خطوة بخطوة.
                        </p>

                    </div>


                    <!-- Subject Information -->
                    <div class="ai-subject-card">

                        <div class="ai-subject-icon">📚</div>

                        <div class="ai-subject-details">

                            <span class="ai-subject-label">
                                المادة الحالية
                            </span>

                            <h4>${escapeHtml(context.name)}</h4>

                            <div class="ai-subject-meta">

                                <span>
                                    الفرقة: ${escapeHtml(context.grade)}
                                </span>

                                <span>
                                    القسم: ${escapeHtml(context.department)}
                                </span>

                                <span>
                                    الترم: ${escapeHtml(context.term)}
                                </span>

                            </div>

                        </div>

                    </div>


                    <!-- Suggestions -->
                    <div class="ai-suggestions-section">

                        <h4>يمكنك البدء بأحد هذه الأسئلة</h4>

                        <div class="ai-suggestions-grid">

                            <button
                                type="button"
                                class="ai-suggestion-btn"
                                onclick="setAIPrompt('اشرح لي أهم المفاهيم الأساسية في هذه المادة')"
                            >
                                <span class="ai-suggestion-icon">📖</span>
                                <span>
                                    <strong>شرح موضوع</strong>
                                    <small>بسّط لي أحد موضوعات المادة</small>
                                </span>
                            </button>

                            <button
                                type="button"
                                class="ai-suggestion-btn"
                                onclick="setAIPrompt('ساعدني في حل سؤال من هذه المادة مع شرح الخطوات')"
                            >
                                <span class="ai-suggestion-icon">✍️</span>
                                <span>
                                    <strong>حل سؤال</strong>
                                    <small>اشرح لي الحل خطوة بخطوة</small>
                                </span>
                            </button>

                        </div>

                    </div>


                    <!-- Question Input -->
                    <div class="ai-input-section">

                        <label for="aiQueryInput">
                            اكتب سؤالك هنا
                        </label>

                        <div class="ai-input-wrapper">

                            <textarea
                                id="aiQueryInput"
                                placeholder="مثلاً: اشرح لي هذا الموضوع بطريقة مبسطة..."
                                rows="3"
                            ></textarea>

                            <button
                                type="button"
                                class="ai-send-btn"
                                onclick="triggerAIAssistantQuery()"
                                aria-label="إرسال السؤال"
                                title="إرسال السؤال"
                            >
                                <span>➤</span>
                            </button>

                        </div>

                        <p class="ai-input-hint">
                            حاول كتابة سؤالك بشكل واضح للحصول على إجابة أدق.
                        </p>

                    </div>


                    <!-- Response -->
                    <div
                        id="aiResponseArea"
                        class="ai-response-area"
                        aria-live="polite"
                    >

                        <div class="ai-empty-response">

                            <div class="ai-response-icon">✧</div>

                            <strong>الإجابة ستظهر هنا</strong>

                            <p>
                                اكتب سؤالك واضغط إرسال لبدء المحادثة.
                            </p>

                        </div>

                    </div>

                </div>

            </section>
        `;
    }


    async processQuery(query) {

        const responseArea =
            document.getElementById("aiResponseArea");

        if (!responseArea) return;


        if (!query || !query.trim()) {

            responseArea.innerHTML = `
                <div class="ai-message ai-error-message">
                    الرجاء كتابة سؤالك أولاً.
                </div>
            `;

            return;
        }


        responseArea.innerHTML = `
            <div class="ai-loading-state">

                <span class="ai-loading-spinner"></span>

                <div>
                    <strong>جاري التفكير في إجابتك...</strong>
                    <p>قد يستغرق الأمر بضع لحظات.</p>
                </div>

            </div>
        `;


        const context = this.getSubjectContext();


        try {

            const response = await fetch(
                SMART_SERVICE_URL,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                        "apikey": SMART_SERVICE_KEY,
                        "Authorization": `Bearer ${SMART_SERVICE_KEY}`
                    },

                    body: JSON.stringify({

                        query: query.trim(),

                        subjectContext: {
                            name: context.name,
                            grade: context.grade,
                            department: context.department,
                            term: context.term
                        }

                    })
                }
            );


            let data = {};

            try {
                data = await response.json();
            } catch (jsonError) {
                data = {};
            }


            if (!response.ok) {

                throw new Error(
                    data.error ||
                    `فشل الاتصال بالخدمة. رمز الخطأ: ${response.status}`
                );
            }


            if (!data.answer) {
                throw new Error(
                    "لم يتم استلام إجابة من المساعد الذكي."
                );
            }


            responseArea.innerHTML = `
                <div class="ai-answer-container">

                    <div class="ai-answer-heading">

                        <div class="ai-answer-icon">✦</div>

                        <div>
                            <strong>إجابة المساعد الأكاديمي</strong>
                            <small>بناءً على سؤالك</small>
                        </div>

                    </div>

                    <div
                        id="aiAnswerText"
                        class="ai-answer-text"
                    ></div>

                </div>
            `;


            const answerElement =
                document.getElementById("aiAnswerText");

            if (answerElement) {
                answerElement.textContent = data.answer;
            }


        } catch (error) {

            console.error("AI Assistant Error:", error);

            responseArea.innerHTML = `
                <div class="ai-error-container">

                    <strong>تعذر الحصول على الإجابة</strong>

                    <p id="aiErrorText"></p>

                </div>
            `;

            const errorElement =
                document.getElementById("aiErrorText");

            if (errorElement) {
                errorElement.textContent =
                    error.message || "حدث خطأ غير معروف.";
            }
        }
    }
}


// Global Functions

let aiAssistantInstance = null;


function openAIAssistant(subject) {

    aiAssistantInstance =
        new SubjectAIAssistant(subject);


    const aiArea =
        document.getElementById("aiAssistantArea");


    if (!aiArea) {

        console.error(
            "لم يتم العثور على aiAssistantArea"
        );

        return;
    }


    aiArea.innerHTML =
        aiAssistantInstance.renderAssistantUI();


    aiArea.style.display = "block";

    aiArea.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


function closeAIAssistant() {

    const aiArea =
        document.getElementById("aiAssistantArea");


    if (aiArea) {

        aiArea.innerHTML = "";

        aiArea.style.display = "none";
    }


    aiAssistantInstance = null;
}


function setAIPrompt(prompt) {

    const inputField =
        document.getElementById("aiQueryInput");

    if (!inputField) return;

    inputField.value = prompt;

    inputField.focus();
}


function triggerAIAssistantQuery() {

    if (!aiAssistantInstance) {

        console.error("المساعد الذكي غير مهيأ.");

        return;
    }


    const inputField =
        document.getElementById("aiQueryInput");


    if (!inputField) {

        console.error(
            "لم يتم العثور على حقل السؤال."
        );

        return;
    }


    const query = inputField.value.trim();


    aiAssistantInstance.processQuery(query);
}
