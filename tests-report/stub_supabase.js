/* Supabase وهمي في الذاكرة لاختبار الواجهة فقط. يحاكي RLS للزائر: المنشور فقط. يسجّل كل الاستعلامات في window.__queries */
(function () {
  const FIX = window.__FIXTURES__ || [];
  const MODE = window.__MODE__ || 'ok';       // ok | error | empty | slow
  window.__queries = [];

  function builder(table) {
    const q = { table, filters: [], cols: '' };
    const api = {
      select(c) { q.cols = c; return api; },
      eq(k, v) { q.filters.push([k, v]); return api; },
      order() { return api; },
      maybeSingle() { q.single = true; return api; },
      then(res, rej) {
        window.__queries.push({ table: q.table, cols: q.cols, filters: q.filters.slice(), single: !!q.single });
        const done = () => {
          if (MODE === 'error') return { data: null, error: { code: 'XX000', message: 'boom' } };
          if (MODE === 'missing_table') return { data: null, error: { code: '42P01', message: 'relation does not exist' } };
          if (table !== 'graduation_projects') return { data: [], error: null };
          let rows = MODE === 'empty' ? [] : FIX.filter(r => r.is_published === true); // محاكاة RLS للزائر
          q.filters.forEach(([k, v]) => { rows = rows.filter(r => r[k] === v); });
          return { data: q.single ? (rows[0] || null) : rows, error: null };
        };
        return new Promise(r => setTimeout(() => r(done()), MODE === 'slow' ? 600 : 5)).then(res, rej);
      }
    };
    return api;
  }

  window.supabase = {
    createClient() {
      return {
        from: builder,
        rpc: () => Promise.resolve({ data: null, error: null }),
        auth: {
          getSession: () => Promise.resolve({ data: { session: null }, error: null }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
          signOut: () => Promise.resolve({ error: null })
        }
      };
    }
  };
})();
