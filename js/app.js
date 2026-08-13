document.addEventListener("DOMContentLoaded", () => {
    renderHome();
});

window.addEventListener("scroll", toggleScrollBtn);

window.addEventListener("resize", () => {
    // إجراءات إضافية عند تغيير حجم النافذة إن وجدت
});

async function testSupabaseConnection() {
    const { data, error } = await supabaseClient
        .from("subjects")
        .select("*")
        .limit(1);

    if (error) {
        console.error("Supabase Error:", error);
        return;
    }

    console.log("Supabase Connected Successfully:", data);
}

testSupabaseConnection();