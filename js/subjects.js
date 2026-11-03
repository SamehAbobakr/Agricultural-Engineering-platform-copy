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

                        <span onclick="goToHistoryLevel('home')">
                            🏠 الرئيسية
                        </span>

                        >

                        <span onclick="goToHistoryLevel('grade')">
                            🎓 ${escapeHtml(currentGrade)}
                        </span>

                        ${
                            currentDept
                                ? `
                                    >

                                    <span onclick="goToHistoryLevel('dept')">
                                        🏢 ${escapeHtml(currentDept)}
                                    </span>
                                `
                                : ''
                        }

                        >

                        <span>
                            📘 ${escapeHtml(currentTerm)}
                        </span>

                    </div>

            <h2 class="section-title">
                المواد الدراسية
                (<span style="color:var(--primary-color)">
                    ${subjectsToDisplay.length} مواد
                </span>)
            </h2>

            <input
                type="text"
                class="inner-search"
                placeholder="🔍 ابحث عن مادة..."
                oninput="filterSubjects(this.value)"
            >

            <div
                class="grid-container"
                id="subjectsGridContainer"
            >
    `;

        if (subjectsToDisplay.length === 0) {

        html += `
            <p style="
                text-align: center;
                color: var(--text-muted);
                padding: 30px;
                grid-column: 1 / -1;
            ">
                لا توجد مواد متاحة حالياً.
            </p>
        `;

    } else {

        subjectsToDisplay.forEach(sub => {

            const subJson =
                inlineArg(sub);

            const profName =
                sub.professor || 'غير متوفر';

            const updatedText = sub.updated_at
                ? new Date(sub.updated_at).toLocaleDateString('ar-EG')
                : 'حديث';

            html += `
                <div
                    class="card"
                    onclick="openMaterialView(${subJson})"
                >

                    <div class="card-header-icon">
                        ${escapeHtml(sub.icon || '📘')}
                    </div>

                    <h3>${escapeHtml(sub.name)}</h3>

                    <p class="card-info">
                        👨‍🏫 ${escapeHtml(profName)}
                    </p>

                    <div class="card-footer">

                        <span style="color:var(--primary-color)">
                            🟢 ${updatedText}
                        </span>

                        <span style="
                            font-weight:bold;
                            color:var(--secondary-color)
                        ">
                            [دخول المادة]
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

    document.getElementById('contentArea').innerHTML = html;
}