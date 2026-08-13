
const SUPABASE_URL = "https://kegawnvzoimaddnziotv.supabase.co";
const SUPABASE_KEY = "sb_publishable_0crKHKVfwNCtP5ieWDUpzg_4BeMZLkg";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);
async function testSupabaseConnection() {
    const { data, error } = await supabaseClient
        .from('subjects')
        .select('*')
        .limit(5);

    if (error) {
        console.error('❌ Supabase Error:', error);
        return;
    }

    console.log('✅ Supabase Connected:', data);
}

testSupabaseConnection();