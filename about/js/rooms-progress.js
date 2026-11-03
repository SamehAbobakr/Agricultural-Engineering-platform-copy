// =========================================
// نظام الغرف — حالة تقدم المستخدم الحالي (في الذاكرة فقط)
// لا يُخزَّن شيء في localStorage: المصدر الوحيد هو جدول user_task_completions عبر RLS،
// فلا يتسرب تقدم مستخدم إلى آخر عند تبديل الحساب في نفس المتصفح.
// =========================================

const RoomsProgress = {

    userId: null,
    completions: new Map(),   // taskId -> { points, completedAt }

    reset() {
        RoomsProgress.userId = null;
        RoomsProgress.completions = new Map();
    },

    // تحميل إنجازات المستخدم؛ يرجع true عند النجاح
    async load(session) {
        RoomsProgress.reset();
        if (!session || !session.user) return true;

        const res = await RoomsApi.getMyCompletions();
        if (res.error) return false;

        RoomsProgress.userId = session.user.id;
        res.data.forEach(function (row) {
            RoomsProgress.completions.set(String(row.task_id), {
                points: Number(row.awarded_points) || 0,
                completedAt: row.completed_at
            });
        });
        return true;
    },

    isSignedIn() {
        return Boolean(RoomsProgress.userId);
    },

    isDone(taskId) {
        return RoomsProgress.completions.has(String(taskId));
    },

    mark(taskId, points, completedAt) {
        RoomsProgress.completions.set(String(taskId), {
            points: points,
            completedAt: completedAt || new Date().toISOString()
        });
    },

    // تقدم غرفة: عدد المنجز من مهماتها الحالية
    forRoom(room) {
        const total = room.tasks.length;
        let done = 0;
        let points = 0;
        let totalPoints = 0;

        room.tasks.forEach(function (t) {
            totalPoints += t.points;
            const c = RoomsProgress.completions.get(t.id);
            if (c) { done += 1; points += c.points; }
        });

        return {
            total: total,
            done: done,
            percent: RoomsUtils.percent(done, total),
            points: points,
            totalPoints: totalPoints
        };
    },

    // ملخص عام فوق كل الغرف المنشورة
    overall(rooms) {
        let total = 0;
        let done = 0;
        let totalPoints = 0;

        rooms.forEach(function (room) {
            const p = RoomsProgress.forRoom(room);
            total += p.total;
            done += p.done;
            totalPoints += p.totalPoints;
        });

        // النقاط = مجموع awarded_points من كل إنجازات المستخدم (كما في قاعدة البيانات)
        let points = 0;
        RoomsProgress.completions.forEach(function (c) { points += c.points; });

        return {
            total: total,
            done: done,
            remaining: Math.max(total - done, 0),
            percent: RoomsUtils.percent(done, total),
            points: points,
            totalPoints: totalPoints
        };
    },

    // آخر الإنجازات (معرّفات) من الأحدث للأقدم
    recentIds(limit) {
        return Array.from(RoomsProgress.completions.entries())
            .sort(function (a, b) {
                return new Date(b[1].completedAt) - new Date(a[1].completedAt);
            })
            .slice(0, limit)
            .map(function (entry) { return entry[0]; });
    }
};
