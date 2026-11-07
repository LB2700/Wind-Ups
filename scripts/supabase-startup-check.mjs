import { createClient } from '@supabase/supabase-js';

export async function verifySupabaseConnection() {
	const supabaseUrl = process.env.SUPABASE_URL;
	const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;
	if (!supabaseUrl || !supabaseKey) {
		throw new Error('Supabase URL and key must be configured.');
	}

	const supabase = createClient(supabaseUrl, supabaseKey, {
		auth: { autoRefreshToken: false, persistSession: false },
		global: {
			fetch: (input, init) =>
				fetch(input, { ...init, signal: AbortSignal.timeout(10_000) }),
		},
	});
	const { error } = await supabase.from('posts').select('id').limit(1);
	if (error) {
		console.log("Supabase not available")
		throw error;
	}
}
