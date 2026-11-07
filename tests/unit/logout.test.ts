import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockSignOut } = vi.hoisted(() => ({
	mockSignOut: vi.fn(),
}));

vi.mock('../../src/services/supabase', () => ({
	createServerClient: vi.fn(() => ({
		auth: {
			signOut: mockSignOut,
		},
	})),
}));

import type { APIContext } from 'astro';
import { logoutUser } from '../../src/services/logout';

function makeContext(fields: Record<string, string>) {
	const request = new Request('http://localhost:4321/api/logout', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams(fields),
	});

	return {
		request,
		cookies: { set: vi.fn() },
		redirect: (location: string, status = 302) =>
			new Response(null, { status, headers: { location } }),
	} satisfies Pick<APIContext, 'redirect'> & {
		request: Request;
		cookies: Pick<APIContext['cookies'], 'set'>;
	};
}

beforeEach(() => {
	vi.clearAllMocks();
	mockSignOut.mockResolvedValue({ error: null });
});

describe('POST /api/logout', () => {
	it('revokes the signed-in session and redirects back to the current page', async () => {
		const response = await logoutUser(makeContext({ returnTo: '/blog?tag=astro' }));

		expect(mockSignOut).toHaveBeenCalledWith({ scope: 'global' });
		expect(response.status).toBe(303);
		expect(response.headers.get('location')).toBe('/blog?tag=astro');
	});

	it('falls back to the home page for an external redirect target', async () => {
		const response = await logoutUser(makeContext({ returnTo: 'https://example.com' }));

		expect(response.headers.get('location')).toBe('/');
		expect(mockSignOut).toHaveBeenCalledWith({ scope: 'global' });
	});

	it('returns to the page with an error when Supabase sign-out fails', async () => {
		mockSignOut.mockResolvedValue({
			error: { name: 'AuthApiError', message: 'Sign-out failed' },
		});

		const response = await logoutUser(makeContext({ returnTo: '/blog' }));

		expect(response.status).toBe(303);
		expect(response.headers.get('location')).toBe('/blog?error=logout-failed');
	});

	it('preserves the original query parameters when sign-out fails', async () => {
		mockSignOut.mockResolvedValue({
			error: { name: 'AuthApiError', message: 'Sign-out failed' },
		});

		const response = await logoutUser(makeContext({ returnTo: '/blog?tag=astro' }));

		expect(response.headers.get('location')).toBe('/blog?tag=astro&error=logout-failed');
	});
});
