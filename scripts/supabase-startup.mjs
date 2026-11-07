import { verifySupabaseConnection } from './supabase-startup-check.mjs';

function getErrorDetails(error) {
	if (error instanceof Error) {
		return { error_name: error.name, error_message: error.message };
	}

	if (typeof error === 'object' && error !== null) {
		return {
			error_name: 'name' in error && typeof error.name === 'string' ? error.name : 'UnknownError',
			error_message:
				'message' in error && typeof error.message === 'string'
					? error.message
					: String(error),
		};
	}

	return { error_name: 'UnknownError', error_message: String(error) };
}

try {
	await verifySupabaseConnection();
	console.info(JSON.stringify({ event: 'supabase_startup_check', status: 'ok' }));
} catch (error) {
	console.error(
		JSON.stringify({
			event: 'supabase_startup_check',
			status: 'failed',
			...getErrorDetails(error),
		}),
	);
}
