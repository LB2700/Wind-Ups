import type { APIContext } from 'astro';
import { signOutUser } from './auth';
import type { SupabaseRequestContext } from './supabase';

type LogoutContext = SupabaseRequestContext & Pick<APIContext, 'redirect'>;

function getReturnTo(value: FormDataEntryValue | null, request: Request): string {
	if (typeof value !== 'string') {
		return '/';
	}

	try {
		const destination = new URL(value, request.url);
		if (destination.origin !== new URL(request.url).origin) {
			return '/';
		}

		return `${destination.pathname}${destination.search}`;
	} catch {
		return '/';
	}
}

function withLogoutError(returnTo: string): string {
	const destination = new URL(returnTo, 'http://localhost');
	destination.searchParams.set('error', 'logout-failed');
	return `${destination.pathname}${destination.search}`;
}

function logLogoutFailure(error: unknown) {
	// eslint-disable-next-line no-console
	console.error(
		JSON.stringify({
			event: 'auth_logout_failed',
			error_name: error instanceof Error ? error.name : 'UnknownError',
			error_message: error instanceof Error ? error.message : 'Non-Error thrown',
		}),
	);
}

export async function logoutUser({
	request,
	cookies,
	redirect,
}: LogoutContext): Promise<Response> {
	let returnTo: string;
	try {
		const formData = await request.formData();
		returnTo = getReturnTo(formData.get('returnTo'), request);
	} catch (error) {
		logLogoutFailure(error);
		return redirect('/?error=logout-failed', 303);
	}

	try {
		const { error } = await signOutUser({ request, cookies });
		if (error) {
			logLogoutFailure(error);
			return redirect(withLogoutError(returnTo), 303);
		}

		return redirect(returnTo, 303);
	} catch (error) {
		logLogoutFailure(error);
		return redirect(withLogoutError(returnTo), 303);
	}
}
