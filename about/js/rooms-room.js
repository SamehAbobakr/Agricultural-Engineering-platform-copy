
// =========================================
// صفحة الغرفة المستقلة (room.html?room=<slug>)
// نظام إكمال المهمات عن طريق Quiz
//
// يعتمد على:
// auth.js
// rooms-config.js
// rooms-utils.js
// rooms-api.js
// rooms-progress.js
// rooms-blocks.js
// rooms-viewer.js
//
// API المطلوب:
// RoomsApi.getTaskQuestions(taskId)
// RoomsApi.submitTaskAnswer(questionId, optionId)
//
// لا يتم التحقق من الإجابات أو منح النقاط في المتصفح.
// =========================================

const RoomsRoomApp = {

    slug: '',
    room: null,
    loading: false,
    lastUserId: null,
    progressOk: true,

    tasks: [],
    contentCache: new Map(),

    headProgress: null,
    els: {},

    // =========================================
    // التهيئة
    // =========================================

    init() {
        const app = RoomsRoomApp;
        const byId = function (id) {
            return document.getElementById(id);
        };

        app.els = {
            head: byId('rmRoomHead'),
            tasks: byId('rmTasks')
        };

        if (!app.els.head || !app.els.tasks) return;

        const slug =
            new URLSearchParams(window.location.search).get('room') || '';

        if (!RoomsUtils.isValidSlug(slug)) {
            app.renderNotFound();
            return;
        }

        app.slug = slug;
        app.load();

        if (window.PlatformAuth) {
            PlatformAuth.onChange(function (event, session) {

                if (event === 'TOKEN_REFRESHED') return;

                const userId =
                    session && session.user ? session.user.id : null;

                if (app.loading || !app.room || userId === app.lastUserId) {
                    return;
                }

                app.lastUserId = userId;

                RoomsProgress.load(session).then(function (ok) {

                    app.progressOk = ok;

                    // إعادة ضبط الاختبارات المفتوحة عند تغيير المستخدم.
                    app.tasks.forEach(function (ref) {
                        if (!ref.started) return;

                        RoomsUtils.clear(ref.inner);
                        ref.contentBox = null;
                        ref.quizBox = null;
                        ref.quizMessage = null;
                        ref.quizStats = null;
                        ref.quizList = null;
                        ref.started = false;

                        if (ref.btn.getAttribute('aria-expanded') === 'true') {
                            app.loadContent(ref);
                        }
                    });

                    app.refreshAll();
                });
            });
        }
    },

    // =========================================
    // تحميل الغرفة
    // =========================================

    async load() {
        const app = RoomsRoomApp;

        app.loading = true;
        app.renderLoading();

        const results = await Promise.all([
            RoomsApi.getRoom(app.slug),
            RoomsApi.getSession()
        ]);

        const roomRes = results[0];
        const session = results[1];

        if (roomRes.error) {
            console.error('تعذّر جلب الغرفة:', roomRes.error);

            app.loading = false;
            app.renderError();
            return;
        }

        if (!roomRes.data) {
            app.loading = false;
            app.renderNotFound();
            return;
        }

        app.room = roomRes.data;

        app.lastUserId =
            session && session.user ? session.user.id : null;

        app.progressOk = await RoomsProgress.load(session);

        app.loading = false;

        document.title =
            app.room.title +
            ' | المسار التعليمي  | منصة الهندسة الزراعية';

        app.renderHead();
        app.renderTasks();
        app.openFromHash();
    },

    // =========================================
    // حالات التحميل والخطأ
    // =========================================

    renderLoading() {
        const el = RoomsUtils.el;
        const app = RoomsRoomApp;

        RoomsUtils.clear(app.els.head);
        RoomsUtils.clear(app.els.tasks);

        app.els.tasks.setAttribute('aria-busy', 'true');

        app.els.head.appendChild(
            el('div', {
                className: 'rm-skeleton rm-sk-head',
                attrs: { 'aria-hidden': 'true' }
            }, [
                el('span', {
                    className: 'rm-sk rm-sk-line rm-sk-title'
                }),
                el('span', {
                    className: 'rm-sk rm-sk-line'
                }),
                el('span', {
                    className: 'rm-sk rm-sk-line rm-sk-short'
                })
            ])
        );

        for (let i = 0; i < 3; i++) {
            app.els.tasks.appendChild(
                el('div', {
                    className: 'rm-task rm-skeleton',
                    attrs: { 'aria-hidden': 'true' }
                }, [
                    el('span', {
                        className: 'rm-sk rm-sk-line'
                    })
                ])
            );
        }
    },

    stateBox(icon, title, text, extra, isError) {
        const el = RoomsUtils.el;
        const app = RoomsRoomApp;

        RoomsUtils.clear(app.els.head);
        RoomsUtils.clear(app.els.tasks);

        app.els.tasks.setAttribute('aria-busy', 'false');

        const back = el('a', {
            className: 'rm-btn rm-btn-ghost',
            text: 'العودة إلى كل الغرف',
            attrs: { href: 'about.html' }
        });

        app.els.head.appendChild(
            el('div', {
                className: 'rm-state' + (isError ? ' rm-state-error' : ''),
                attrs: isError ? { role: 'alert' } : {}
            }, [
                el('span', {
                    className: 'rm-state-icon',
                    text: icon,
                    attrs: { 'aria-hidden': 'true' }
                }),
                el('h1', {
                    className: 'rm-state-title',
                    text: title
                }),
                el('p', { text: text }),
                el('div', {
                    className: 'rm-state-actions'
                }, [extra, back])
            ])
        );
    },

    renderNotFound() {
        RoomsRoomApp.stateBox(
            '🧭',
            'الغرفة غير موجودة',
            'قد يكون الرابط غير صحيح أو أن الغرفة لم تعد متاحة.',
            null,
            false
        );
    },

    renderError() {
        const retry = RoomsUtils.el('button', {
            className: 'rm-btn',
            text: 'إعادة المحاولة',
            attrs: { type: 'button' }
        });

        retry.addEventListener('click', function () {
            RoomsRoomApp.load();
        });

        RoomsRoomApp.stateBox(
            '⚠️',
            'تعذّر تحميل الغرفة',
            'تأكد من اتصالك بالإنترنت ثم حاول مرة أخرى.',
            retry,
            true
        );
    },

    // =========================================
    // حالة تسجيل الدخول
    // =========================================

    signedIn() {
        return RoomsProgress.isSignedIn() && RoomsRoomApp.progressOk;
    },

    // =========================================
    // رأس الغرفة
    // =========================================

    renderHead() {
        const el = RoomsUtils.el;
        const app = RoomsRoomApp;
        const room = app.room;

        RoomsUtils.clear(app.els.head);

        const totalPoints = room.tasks.reduce(function (sum, task) {
            return sum + task.points;
        }, 0);

        const taskLabel = RoomsUtils.taskCount(room.tasks.length);

        const crumbs = el('nav', {
            className: 'rm-crumbs',
            attrs: { 'aria-label': 'مسار التنقل' }
        }, [
            el('a', {
                text: 'المسار التعليمي',
                attrs: { href: 'about.html' }
            }),
            el('span', {
                text: '›',
                attrs: { 'aria-hidden': 'true' }
            }),
            el('span', {
                text: room.title,
                attrs: { 'aria-current': 'page' }
            })
        ]);

        const meta = el('div', {
            className: 'rm-card-meta'
        }, [
            el('span', {
                className: 'rm-chip',
                text: '📋 ' + taskLabel
            }),

            room.difficulty
                ? el('span', {
                    className:
                        'rm-chip rm-level rm-level-' + room.difficulty,
                    text:
                        ROOMS_CONFIG.difficultyLabels[room.difficulty]
                })
                : null,

            totalPoints > 0
                ? el('span', {
                    className: 'rm-chip rm-chip-points',
                    text:
                        '⭐ ' + RoomsUtils.num(totalPoints) + ' نقطة'
                })
                : null
        ]);

        app.headProgress = el('div', {
            className: 'rm-room-progress'
        });

        const info = el('div', {
            className: 'rm-room-info'
        }, [
            el('div', {
                className: 'rm-room-titlerow'
            }, [
                
                el('h1', {
                    className: 'rm-room-title',
                    text: room.title
                })
            ]),

            room.description
                ? el('p', {
                    className: 'rm-room-desc',
                    text: room.description
                })
                : null,

            meta,
            app.headProgress
        ]);

        const wrap = el('div', {
            className: 'rm-room-head'
        }, [info]);

        const coverUrl = RoomsUtils.httpUrl(room.cover);

        if (coverUrl) {
            const img = el('img', {
                attrs: {
                    src: coverUrl,
                    alt: '',
                    decoding: 'async'
                }
            });

            const figure = el('figure', {
                className: 'rm-room-cover'
            }, [img]);

            img.addEventListener('error', function () {
                figure.remove();
                wrap.classList.add('no-cover');
            });

            wrap.appendChild(figure);
        } else {
            wrap.classList.add('no-cover');
        }

        app.els.head.appendChild(crumbs);
        app.els.head.appendChild(wrap);

        app.renderHeadProgress();
    },

    renderHeadProgress() {
        const el = RoomsUtils.el;
        const app = RoomsRoomApp;
        const box = app.headProgress;

        if (!box) return;

        RoomsUtils.clear(box);

        if (app.signedIn()) {
            const p = RoomsProgress.forRoom(app.room);

            box.appendChild(
                el('div', {
                    className: 'rm-room-progress-row'
                }, [
                    el('span', {
                        text:
                            'تقدمك: ' +
                            RoomsUtils.num(p.done) +
                            ' من ' +
                            RoomsUtils.num(p.total) +
                            ' مهمات · ' +
                            RoomsUtils.num(p.points) +
                            ' من ' +
                            RoomsUtils.num(p.totalPoints) +
                            ' نقطة'
                    }),

                    el('strong', {
                        text: RoomsUtils.num(p.percent) + '٪'
                    })
                ])
            );

            box.appendChild(
                RoomsUtils.progressBar(
                    p.percent,
                    'تقدمك في هذه الغرفة'
                )
            );

        } else if (app.progressOk) {

            box.appendChild(
                el('p', {
                    className: 'rm-guest-hint'
                }, [
                    document.createTextNode('تصفّح بحرية. '),

                    el('a', {
                        text: 'سجّل الدخول',
                        attrs: {
                            href: PlatformAuth.loginUrl(window.location.href)
                        }
                    }),

                    document.createTextNode(
                        ' لحفظ تقدمك وجمع النقاط.'
                    )
                ])
            );

        } else {

            box.appendChild(
                el('p', {
                    className: 'rm-guest-hint',
                    text: 'تعذّر تحميل تقدمك الآن. يمكنك متابعة القراءة.'
                })
            );
        }
    },

    // =========================================
    // المهمات - Accordion
    // =========================================

    renderTasks() {
        const el = RoomsUtils.el;
        const app = RoomsRoomApp;
        const list = app.els.tasks;

        list.setAttribute('aria-busy', 'false');

        RoomsUtils.clear(list);
        app.tasks = [];

        if (!app.room.tasks.length) {
            list.appendChild(
                el('div', {
                    className: 'rm-state'
                }, [
                    el('span', {
                        className: 'rm-state-icon',
                        text: '📭',
                        attrs: { 'aria-hidden': 'true' }
                    }),
                    el('h2', {
                        className: 'rm-state-title',
                        text: 'لا توجد مهمات في هذه الغرفة بعد'
                    }),
                    el('p', {
                        text: 'سيتم إضافة المهمات قريبًا.'
                    })
                ])
            );

            return;
        }

        app.room.tasks.forEach(function (task, index) {
            const ref = app.buildTask(task, index);

            app.tasks.push(ref);
            list.appendChild(ref.root);
        });

        app.refreshStatuses();
    },

    buildTask(task, index) {
        const el = RoomsUtils.el;
        const app = RoomsRoomApp;

        const n = index + 1;

        const btnId = 'rm-task-btn-' + n;
        const panelId = 'rm-task-panel-' + n;

        const status = el('span', {
            className: 'rm-task-status'
        });

        const btn = el('button', {
            className: 'rm-task-btn',
            attrs: {
                type: 'button',
                id: btnId,
                'aria-expanded': 'false',
                'aria-controls': panelId
            }
        }, [
            el('span', {
                className: 'rm-task-num',
                text: RoomsUtils.num(n),
                attrs: { 'aria-hidden': 'true' }
            }),

            el('span', {
                className: 'rm-task-main'
            }, [
                el('span', {
                    className: 'rm-task-title',
                    text: task.title
                }),

                task.description
                    ? el('span', {
                        className: 'rm-task-desc',
                        text: task.description
                    })
                    : null
            ]),

            el('span', {
                className: 'rm-task-meta'
            }, [
                task.points > 0
                    ? el('span', {
                        className: 'rm-chip rm-chip-points',
                        text:
                            '+' + RoomsUtils.num(task.points) + ' نقطة'
                    })
                    : null,

                status
            ]),

            el('span', {
                className: 'rm-task-chevron',
                attrs: { 'aria-hidden': 'true' }
            }, [
                el('span', {
                    className: 'rm-task-play-icon'
                })
            ])
        ]);

        const inner = el('div', {
            className: 'rm-task-inner'
        });

        const panel = el('div', {
            className: 'rm-task-panel',
            attrs: {
                id: panelId,
                role: 'region',
                'aria-labelledby': btnId
            }
        }, [inner]);

        const root = el('article', {
            className: 'rm-task',
            attrs: { id: 'task-' + n }
        }, [
            el('h3', {
                className: 'rm-task-head'
            }, [btn]),

            panel
        ]);

        const ref = {
            task: task,
            n: n,
            root: root,
            btn: btn,
            panel: panel,
            inner: inner,
            status: status,

            contentBox: null,

            quizBox: null,
            quizMessage: null,
            quizStats: null,
            quizList: null,
            quizQuestions: [],

            started: false,
            busy: false
        };

        btn.addEventListener('click', function () {
            app.toggle(ref);
        });

        return ref;
    },

    toggle(ref, forceOpen) {
        const open = forceOpen === undefined
            ? ref.btn.getAttribute('aria-expanded') !== 'true'
            : forceOpen;

        ref.btn.setAttribute(
            'aria-expanded',
            open ? 'true' : 'false'
        );

        ref.root.classList.toggle('is-open', open);

        if (open && !ref.started) {
            RoomsRoomApp.loadContent(ref);
        }
    },

    openFromHash() {
        const match = window.location.hash.match(/^#task-(\d{1,3})$/);

        if (!match) return;

        const ref =
            RoomsRoomApp.tasks[parseInt(match[1], 10) - 1];

        if (!ref) return;

        RoomsRoomApp.toggle(ref, true);

        ref.root.scrollIntoView({
            block: 'start'
        });
    },

    // =========================================
    // تحميل محتوى المهمة
    // =========================================

    async loadContent(ref) {
        const el = RoomsUtils.el;
        const app = RoomsRoomApp;

        if (ref.started) return;

        ref.started = true;

        RoomsUtils.clear(ref.inner);

        let blocks = app.contentCache.get(ref.task.id);

        if (!blocks) {
            ref.inner.appendChild(
                el('p', {
                    className: 'rm-muted rm-loading',
                    text: 'جارٍ تحميل المحتوى…',
                    attrs: { role: 'status' }
                })
            );

            ref.panel.setAttribute('aria-busy', 'true');

            const res = await RoomsApi.getTaskContent(ref.task.id);

            ref.panel.setAttribute('aria-busy', 'false');

            RoomsUtils.clear(ref.inner);

            if (res.error) {
                console.error(
                    'تعذّر جلب محتوى المهمة:',
                    res.error
                );

                ref.started = false;

                const retry = el('button', {
                    className: 'rm-btn rm-btn-ghost',
                    text: 'إعادة المحاولة',
                    attrs: { type: 'button' }
                });

                retry.addEventListener('click', function () {
                    app.loadContent(ref);
                });

                ref.inner.appendChild(
                    el('div', {
                        className: 'rm-inline-error',
                        attrs: { role: 'alert' }
                    }, [
                        el('p', {
                            text: 'تعذّر تحميل محتوى هذه المهمة.'
                        }),
                        retry
                    ])
                );

                return;
            }

            blocks = Array.isArray(res.data) ? res.data : [];

            app.contentCache.set(ref.task.id, blocks);
        }

        ref.contentBox = el('div', {
            className: 'rm-task-content'
        });

        if (blocks.length) {
            ref.contentBox.appendChild(
                RoomsBlocks.render(blocks)
            );
        } else {
            ref.contentBox.appendChild(
                el('p', {
                    className: 'rm-muted',
                    text: 'لا يوجد محتوى إضافي لهذه المهمة بعد.'
                })
            );
        }

        ref.inner.appendChild(ref.contentBox);

        await app.buildQuiz(ref);
    },

    // =========================================
    // تسجيل الدخول داخل الاختبار
    // =========================================

    loginPrompt(ref, text) {
        const el = RoomsUtils.el;

        if (!ref.quizMessage) return;

        RoomsUtils.clear(ref.quizMessage);

        ref.quizMessage.className =
            'rm-quiz-feedback is-error';

        ref.quizMessage.appendChild(
            document.createTextNode(text + ' ')
        );

        ref.quizMessage.appendChild(
            el('a', {
                className: 'rm-link',
                text: 'تسجيل الدخول',
                attrs: {
                    href: PlatformAuth.loginUrl(window.location.href)
                }
            })
        );
    },

    setQuizMessage(ref, text, kind) {
        if (!ref.quizMessage) return;

        RoomsUtils.clear(ref.quizMessage);

        ref.quizMessage.className =
            'rm-quiz-feedback' +
            (kind ? ' is-' + kind : '');

        ref.quizMessage.textContent = text;
    },

    // =========================================
    // بناء الاختبار
    // =========================================

    async buildQuiz(ref) {
        const app = RoomsRoomApp;
        const el = RoomsUtils.el;

        // منع تكرار بناء الاختبار.
        if (ref.quizBox) return;

        ref.quizBox = el('section', {
            className: 'rm-quiz',
            attrs: {
                'aria-label': 'اختبار إكمال المهمة'
            }
        });

        ref.quizMessage = el('p', {
            className: 'rm-quiz-feedback',
            attrs: {
                role: 'status',
                'aria-live': 'polite'
            }
        });

        ref.quizBox.appendChild(
            el('h3', {
                className: 'rm-quiz-title',
                text: 'اختبر فهمك لإكمال المهمة'
            })
        );

        ref.quizBox.appendChild(ref.quizMessage);

        ref.inner.appendChild(ref.quizBox);

        // الحفاظ على الإنجازات السابقة.
        const existing =
            RoomsProgress.completions.get(ref.task.id);

        if (existing) {
            app.showQuizCompleted(ref, existing.points);
            return;
        }

        // لا يمكن عرض الأسئلة المحمية للزائر.
        if (!app.signedIn()) {
            app.loginPrompt(
                ref,
                'سجّل الدخول لعرض أسئلة المهمة وحفظ إجاباتك.'
            );
            return;
        }

        app.setQuizMessage(
            ref,
            'جارٍ تحميل الأسئلة…',
            ''
        );

        const res =
            await RoomsApi.getTaskQuestions(ref.task.id);

        if (res.error) {
            console.error(
                'تعذّر تحميل أسئلة المهمة:',
                res.error
            );

            app.setQuizMessage(
                ref,
                'تعذّر تحميل الأسئلة. حاول مرة أخرى.',
                'error'
            );

            const retry = el('button', {
                className: 'rm-btn rm-btn-ghost',
                text: 'إعادة المحاولة',
                attrs: { type: 'button' }
            });

            retry.addEventListener('click', async function () {
                ref.quizBox.remove();

                ref.quizBox = null;
                ref.quizMessage = null;
                ref.quizStats = null;
                ref.quizList = null;

                await app.buildQuiz(ref);
            });

            ref.quizBox.appendChild(retry);

            return;
        }

        const questions = Array.isArray(res.data)
            ? res.data
            : [];

        RoomsUtils.clear(ref.quizMessage);

        if (!questions.length) {
            app.setQuizMessage(
                ref,
                'لا توجد أسئلة مضافة لهذه المهمة حتى الآن.',
                'error'
            );
            return;
        }

        ref.quizQuestions = questions;

        ref.quizStats = el('div', {
            className: 'rm-quiz-progress'
        });

        ref.quizList = el('div', {
            className: 'rm-quiz-list'
        });

        ref.quizBox.appendChild(ref.quizStats);
        ref.quizBox.appendChild(ref.quizList);

        questions.forEach(function (question, index) {
            app.renderQuizQuestion(
                ref,
                question,
                index
            );
        });

        app.updateQuizProgress(ref);
    },

    // =========================================
    // عرض حالة إكمال المهمة
    // =========================================

    showQuizCompleted(ref, points) {
        const el = RoomsUtils.el;

        if (!ref.quizBox) return;

        RoomsUtils.clear(ref.quizBox);

        ref.quizBox.appendChild(
            el('div', {
                className: 'rm-quiz-complete',
                text:
                    '✓ هذه المهمة مكتملة بالفعل. ' +
                    'النقاط المسجلة: ' +
                    RoomsUtils.num(Number(points || 0)) +
                    '.'
            })
        );
    },

    // =========================================
    // بناء سؤال واحد
    // =========================================

    renderQuizQuestion(ref, question, index) {
        const app = RoomsRoomApp;
        const el = RoomsUtils.el;

        const questionBox = el('article', {
            className:
                'rm-quiz-question' +
                (question.answered ? ' is-correct' : '')
        });

        const questionTitle = el('h4', {
            text:
                (index + 1) + '. ' + question.question
        });

        const optionsBox = el('div', {
            className: 'rm-quiz-options'
        });

        const feedback = el('p', {
            className:
                'rm-quiz-feedback' +
                (question.answered ? ' is-success' : ''),
            attrs: {
                role: 'status',
                'aria-live': 'polite'
            }
        });

        const submit = el('button', {
            className: 'rm-btn rm-quiz-submit',
            text: 'تحقق من الإجابة',
            attrs: { type: 'button' }
        });

        let selectedOption = null;
        let busy = false;
        let answered = Boolean(question.answered);

        const optionButtons = [];

        const options = Array.isArray(question.options)
            ? question.options
            : [];

        options.forEach(function (option) {
            const optionId =
                option.id !== undefined
                    ? option.id
                    : option.value;

            const optionText =
                option.text !== undefined
                    ? option.text
                    : option.label;

            if (optionId === undefined || optionText === undefined) {
                return;
            }

            const optionButton = el('button', {
                className: 'rm-quiz-option',
                text: String(optionText),
                attrs: {
                    type: 'button',
                    disabled: answered
                }
            });

            optionButton.addEventListener('click', function () {
                if (answered || busy) return;

                selectedOption = String(optionId);

                optionButtons.forEach(function (item) {
                    item.classList.toggle(
                        'is-selected',
                        item === optionButton
                    );
                });

                feedback.textContent = '';
                feedback.className = 'rm-quiz-feedback';
            });

            optionButtons.push(optionButton);

            optionsBox.appendChild(optionButton);
        });

        if (!optionButtons.length) {
            feedback.className =
                'rm-quiz-feedback is-error';

            feedback.textContent =
                'تنسيق اختيارات هذا السؤال غير صالح.';

            submit.disabled = true;

        } else if (answered) {

            feedback.textContent =
                '✓ سبق أن أجبت عن هذا السؤال إجابة صحيحة.';

            submit.disabled = true;
        }

        submit.addEventListener('click', async function () {

            if (busy || answered) return;

            if (selectedOption === null) {
                feedback.className =
                    'rm-quiz-feedback is-error';

                feedback.textContent =
                    'اختر إجابة أولًا.';

                return;
            }

            // التأكد من وجود جلسة.
            const session = await RoomsApi.getSession();

            if (!session || !session.user) {
                app.loginPrompt(
                    ref,
                    'سجّل الدخول لحفظ إجابتك.'
                );
                return;
            }

            busy = true;

            submit.disabled = true;

            optionButtons.forEach(function (item) {
                item.disabled = true;
            });

            feedback.className = 'rm-quiz-feedback';
            feedback.textContent = 'جارٍ التحقق من الإجابة…';

            // التحقق الحقيقي يتم داخل PostgreSQL.
            const result =
                await RoomsApi.submitTaskAnswer(
                    question.id,
                    selectedOption
                );

            busy = false;

            if (result.error) {
                console.error(
                    'تعذّر التحقق من الإجابة:',
                    result.error
                );

                submit.disabled = false;

                optionButtons.forEach(function (item) {
                    item.disabled = false;
                });

                feedback.className =
                    'rm-quiz-feedback is-error';

                feedback.textContent =
                    'تعذّر التحقق من الإجابة. حاول مرة أخرى.';

                return;
            }

            const data = result.data || {};

            const correct = data.correct === true;

            if (!correct) {
                // الخطأ لا يسجل إجابة ولا يمنح نقاطًا.
                submit.disabled = false;

                optionButtons.forEach(function (item) {
                    item.disabled = false;
                });

                feedback.className =
                    'rm-quiz-feedback is-error';

                feedback.textContent =
                    'إجابة غير صحيحة. حاول مرة أخرى.';

                return;
            }

            // الإجابة الصحيحة.
            answered = true;
            question.answered = true;

            optionButtons.forEach(function (item) {
                item.disabled = true;
                item.classList.remove('is-selected');
            });

            questionBox.classList.add('is-correct');

            feedback.className =
                'rm-quiz-feedback is-success';

            feedback.textContent =
                '✓ إجابة صحيحة. تم تسجيل إجابتك.';

            submit.disabled = true;

            app.updateQuizProgress(ref);

            const completed = data.completed === true;

            if (!completed) return;

            const newlyCompleted =
                data.newly_completed === true ||
                data.newlyCompleted === true;

            if (newlyCompleted) {

                const points = Number(
                    data.awarded_points ??
                    data.awardedPoints ??
                    0
                );

                const completedAt =
                    data.completedAt || new Date().toISOString();

                RoomsProgress.mark(
                    ref.task.id,
                    points,
                    completedAt
                );

                app.showQuizCompleted(ref, points);

            } else {

                // لا نمنح نقاطًا مرة ثانية.
                await RoomsProgress.load(session);

                const existing =
                    RoomsProgress.completions.get(ref.task.id);

                if (existing) {
                    app.showQuizCompleted(
                        ref,
                        existing.points
                    );
                } else {
                    app.showQuizCompleted(
                        ref,
                        data.awarded_points || 0
                    );
                }
            }

            app.refreshStatuses();
            app.renderHeadProgress();
        });

        questionBox.appendChild(questionTitle);
        questionBox.appendChild(optionsBox);
        questionBox.appendChild(submit);
        questionBox.appendChild(feedback);

        ref.quizList.appendChild(questionBox);
    },

    // =========================================
    // تحديث تقدم الاختبار
    // =========================================

    updateQuizProgress(ref) {
        if (!ref.quizStats || !Array.isArray(ref.quizQuestions)) {
            return;
        }

        const total = ref.quizQuestions.length;

        const solved = ref.quizQuestions.filter(function (question) {
            return question.answered === true;
        }).length;

        ref.quizStats.textContent =
            'الأسئلة المحلولة: ' +
            RoomsUtils.num(solved) +
            ' من ' +
            RoomsUtils.num(total);
    },

    // =========================================
    // تحديث حالات المهمات
    // =========================================

    refreshStatuses() {
        const app = RoomsRoomApp;
        const signedIn = app.signedIn();

        app.tasks.forEach(function (ref) {

            const done =
                signedIn &&
                RoomsProgress.isDone(ref.task.id);

            ref.root.classList.toggle('is-done', done);

            RoomsUtils.clear(ref.status);

            ref.status.className = 'rm-task-status';

            if (signedIn) {
                ref.status.classList.add(
                    done ? 'is-done' : 'is-todo'
                );

                ref.status.textContent =
                    done ? '✓ مكتملة' : 'غير مكتملة';
            }
        });
    },

    // =========================================
    // تحديث الصفحة بعد تغيير المستخدم
    // =========================================

    refreshAll() {
        const app = RoomsRoomApp;

        app.renderHeadProgress();
        app.refreshStatuses();

        app.tasks.forEach(function (ref) {

            if (!ref.started || !ref.quizBox) return;

            const done =
                RoomsProgress.completions.get(ref.task.id);

            if (done) {
                app.showQuizCompleted(
                    ref,
                    done.points
                );
            }
        });
    }
};

// =========================================
// تشغيل التطبيق
// =========================================

document.addEventListener(
    'DOMContentLoaded',
    RoomsRoomApp.init
);
