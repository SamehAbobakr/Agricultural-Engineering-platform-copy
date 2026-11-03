
// =========================================
// نظام الغرف — طبقة البيانات (Supabase)
// الوحيدة التي تتكلم مع قاعدة البيانات.
// تعيد دائمًا { data, error } ولا ترمي أخطاء.
// العميل الوحيد من PlatformAuth.getClient()
// =========================================

const RoomsApi = {

    client() {
        return (window.PlatformAuth && PlatformAuth.getClient()) || null;
    },

    async run(builderFactory) {
        const client = RoomsApi.client();

        if (!client) {
            return {
                data: null,
                error: new Error('خدمة قاعدة البيانات غير متاحة')
            };
        }

        try {
            const result = await RoomsUtils.withTimeout(
                Promise.resolve(builderFactory(client)),
                ROOMS_CONFIG.requestTimeoutMs
            );

            if (result.error) {
                return { data: null, error: result.error };
            }

            return { data: result.data, error: null };

        } catch (error) {
            return { data: null, error: error };
        }
    },

    // الجلسة الحالية
    async getSession() {
        if (!window.PlatformAuth) return null;

        const result = await PlatformAuth.getSession();

        return result && result.session
            ? result.session
            : null;
    },

    // كل الغرف المنشورة ومهماتها
    listRooms() {
        const T = ROOMS_CONFIG.tables;

        return RoomsApi.run(function (c) {
            return c.from(T.rooms)
                .select(
                    ROOMS_CONFIG.roomColumns +
                    ',' + T.tasks + '(id,points)'
                )
                .eq('is_active', true)
                .order('sort_order', { ascending: true });

        }).then(function (res) {
            if (res.error) return res;

            const rooms = (res.data || [])
                .map(RoomsApi.normalizeRoom)
                .filter(Boolean);

            return { data: rooms, error: null };
        });
    },

    // غرفة واحدة بالـ slug
    getRoom(slug) {
        const T = ROOMS_CONFIG.tables;

        return RoomsApi.run(function (c) {
            return c.from(T.rooms)
                .select(
                    ROOMS_CONFIG.roomColumns +
                    ',' + T.tasks +
                    '(' + ROOMS_CONFIG.taskColumns + ')'
                )
                .eq('slug', slug)
                .eq('is_active', true)
                .maybeSingle();

        }).then(function (res) {
            if (res.error) return res;

            return {
                data: RoomsApi.normalizeRoom(res.data),
                error: null
            };
        });
    },

    // محتوى المهمة التعليمي
    getTaskContent(taskId) {
        const T = ROOMS_CONFIG.tables;

        return RoomsApi.run(function (c) {
            return c.from(T.content)
                .select('blocks')
                .eq('task_id', taskId)
                .maybeSingle();

        }).then(function (res) {
            if (res.error) return res;

            const blocks =
                res.data && Array.isArray(res.data.blocks)
                    ? res.data.blocks
                    : [];

            return { data: blocks, error: null };
        });
    },

    // جلب أسئلة المهمة من RPC
    // الإجابات الصحيحة لا تصل إلى المتصفح
    getTaskQuestions(taskId) {
        return RoomsApi.run(function (c) {
            return c.rpc('get_task_questions', {
                p_task_id: taskId
            });

        }).then(function (res) {
            if (res.error) return res;

            return {
                data: Array.isArray(res.data) ? res.data : [],
                error: null
            };
        });
    },

   // إرسال إجابة سؤال والتحقق منها على الخادم
submitTaskAnswer(questionId, optionId) {
    return RoomsApi.run(function (c) {
        return c.rpc('submit_task_answer', {
            p_question_id: questionId,
            p_option_id: optionId
        });

    }).then(function (res) {
        if (res.error) return res;

        const d = res.data || {};

        return {
            data: {
                correct: d.correct === true,
                completed: d.completed === true,
                newlyCompleted: d.newly_completed === true,
                awardedPoints: Number(d.awarded_points) || 0,
                answeredQuestions:
                    Number(d.answered_questions) || 0,
                totalQuestions:
                    Number(d.total_questions) || 0,
                completedAt: d.completed_at || null
            },
            error: null
        };
    });

    },

    // إنجازات المستخدم الحالي فقط
    getMyCompletions() {
        const T = ROOMS_CONFIG.tables;

        return RoomsApi.run(function (c) {
            return c.from(T.completions)
                .select('task_id,awarded_points,completed_at')
                .order('completed_at', { ascending: false });

        }).then(function (res) {
            if (res.error) return res;

            return {
                data: res.data || [],
                error: null
            };
        });
    },

    // عناوين المهمات لقائمة آخر الإنجازات
    getTaskTitles(ids) {
        const T = ROOMS_CONFIG.tables;

        if (!ids.length) {
            return Promise.resolve({
                data: [],
                error: null
            });
        }

        return RoomsApi.run(function (c) {
            return c.from(T.tasks)
                .select(
                    'id,title,room_id,' +
                    T.rooms + '(title,slug)'
                )
                .in('id', ids);
        });
    },

    // تصنيف الأخطاء لرسائل مناسبة
    describeError(error) {
        const text = error
            ? String(error.message || error.code || error)
            : '';

        if (
            /AUTH_REQUIRED/.test(text) ||
            (error && error.code === '28000')
        ) {
            return 'auth';
        }

        if (
            /TASK_NOT_FOUND|QUESTION_NOT_FOUND/.test(text) ||
            (error && error.code === 'P0002')
        ) {
            return 'missing';
        }

        return 'network';
    },

    // توحيد بيانات الغرفة
    normalizeRoom(raw) {
        if (!raw || typeof raw !== 'object') return null;

        const id =
            raw.id === null || raw.id === undefined
                ? ''
                : String(raw.id);

        const slug = RoomsUtils.cleanText(raw.slug);
        const title = RoomsUtils.cleanText(raw.title);

        if (!id || !title || !RoomsUtils.isValidSlug(slug)) {
            return null;
        }

        const tasks = (
            Array.isArray(raw.tasks) ? raw.tasks : []
        ).map(function (t) {
            const points = Number(t.points);
            const order = Number(t.sort_order);

            return {
                id: String(t.id),
                title: RoomsUtils.cleanText(t.title),
                description: RoomsUtils.cleanText(t.description),
                points: Number.isFinite(points) ? points : 0,
                sortOrder: Number.isFinite(order) ? order : 0
            };

        }).filter(function (t) {
            return t.id && t.id !== 'undefined';
        });

        tasks.sort(function (a, b) {
            return a.sortOrder - b.sortOrder;
        });

        const order = Number(raw.sort_order);

        return {
            id: id,
            slug: slug,
            title: title,
            description: RoomsUtils.cleanText(raw.description),
            cover: RoomsUtils.cleanText(raw.cover_image),
            icon: RoomsUtils.iconText(raw.icon),
            difficulty:
                ROOMS_CONFIG.difficultyLabels[raw.difficulty]
                    ? raw.difficulty
                    : '',
            sortOrder: Number.isFinite(order) ? order : 0,
            tasks: tasks
        };
    }
};
