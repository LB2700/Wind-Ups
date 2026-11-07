import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockCreateClient, mockFrom, mockSelect, mockLimit } = vi.hoisted(() => ({
	mockCreateClient: vi.fn(),
	mockFrom: vi.fn(),
	mockSelect: vi.fn(),
	mockLimit: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
	createClient: mockCreateClient,
}));

import { verifySupabaseConnection } from '../../scripts/supabase-startup-check.mjs';

beforeEach(() => {
	vi.clearAllMocks();
	vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
	vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'test-publishable-key');
	mockCreateClient.mockReturnValue({ from: mockFrom });
	mockFrom.mockReturnValue({ select: mockSelect });
	mockSelect.mockReturnValue({ limit: mockLimit });
	mockLimit.mockResolvedValue({ error: null });
});

afterEach(() => {
	vi.unstubAllEnvs();
});

describe('verifySupabaseConnection', () => {
	it('queries the posts table to verify Supabase access', async () => {
		await expect(verifySupabaseConnection()).resolves.toBeUndefined();

		expect(mockCreateClient).toHaveBeenCalledWith(
			'https://example.supabase.co',
			'test-publishable-key',
			expect.objectContaining({
				auth: { autoRefreshToken: false, persistSession: false },
			}),
		);
		expect(mockFrom).toHaveBeenCalledWith('posts');
		expect(mockSelect).toHaveBeenCalledWith('id');
		expect(mockLimit).toHaveBeenCalledWith(1);
	});

	it('throws when the Supabase query fails', async () => {
		const error = new Error('Supabase is unavailable');
		mockLimit.mockResolvedValue({ error });

		await expect(verifySupabaseConnection()).rejects.toBe(error);
	});

	it('throws when Supabase configuration is missing', async () => {
		vi.stubEnv('SUPABASE_URL', '');

		await expect(verifySupabaseConnection()).rejects.toThrow(
			'Supabase URL and key must be configured.',
		);
		expect(mockCreateClient).not.toHaveBeenCalled();
	});
});
