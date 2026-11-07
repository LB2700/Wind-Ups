import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import {
	getCurrentUser,
	signOutUser,
	signInUser,
	signUpNewUser,
} from '../../src/services/auth';
import type { SupabaseRequestContext } from '../../src/services/supabase';

const siteUrl = process.env.SITE_URL;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const testPassword = `Integration-${randomUUID()}-9!`;
let testEmail: string | undefined;

function makeContext(cookieHeader = '') {
	const writtenCookies = new Map<string, string>();
	const context = {
		request: new Request(siteUrl ?? 'http://localhost:4321', {
			headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
		}),
		cookies: {
			set(name: string, value: string) {
				if (value) {
					writtenCookies.set(name, value);
				} else {
					writtenCookies.delete(name);
				}
			},
		},
	} satisfies SupabaseRequestContext;

	return {
		context,
		cookieHeader: () =>
			Array.from(writtenCookies, ([name, value]) => `${name}=${value}`).join('; '),
	};
}

function getTestEmail() {
	if (!testEmail) {
		throw new Error('The integration test user has not been created.');
	}

	return testEmail;
}

function getLocalServiceRoleKey() {
	const output = execSync('npx supabase status --output env', {
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe'],
	});
	const line = output.split(/\r?\n/).find((entry) => entry.startsWith('SERVICE_ROLE_KEY='));
	const key = line?.slice('SERVICE_ROLE_KEY='.length).replace(/^["']|["']$/g, '');

	if (!key) {
		throw new Error('Could not read the local Supabase service role key for test cleanup.');
	}

	return key;
}

beforeAll(async () => {
	console.info(`Integration test SITE_URL: ${siteUrl ?? '(unset)'}`);
	console.info(`Integration test SUPABASE_URL: ${supabaseUrl ?? '(unset)'}`);

	if (!siteUrl || !supabaseUrl || !supabaseKey) {
		throw new Error('SITE_URL, SUPABASE_URL, and SUPABASE_PUBLISHABLE_KEY must be configured.');
	}

	const supabaseHost = new URL(supabaseUrl).hostname;
	if (!['localhost', '127.0.0.1', '::1'].includes(supabaseHost)) {
		throw new Error('Auth integration tests require a local Supabase URL to avoid changing remote data.');
	}

	const supabase = createClient(supabaseUrl, supabaseKey, {
		auth: { autoRefreshToken: false, persistSession: false },
	});
	const { error } = await supabase.from('posts').select('id').limit(1);

	expect(error, 'Expected a successful query against the configured Supabase database').toBeNull();
});

afterAll(async () => {
	if (!testEmail || !supabaseUrl) {
		return;
	}

	const supabase = createClient(supabaseUrl, getLocalServiceRoleKey(), {
		auth: { autoRefreshToken: false, persistSession: false },
	});
	const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
	if (error) {
		throw error;
	}

	const testUser = data.users.find((user) => user.email === testEmail);
	if (testUser) {
		const { error: deleteError } = await supabase.auth.admin.deleteUser(testUser.id);
		if (deleteError) {
			throw deleteError;
		}
	}
});

describe('auth service integration with local Supabase', () => {
	it('returns a Supabase error for a weak signup password', async () => {
		const { error } = await signUpNewUser(
			{ email: `weak-${randomUUID()}@example.com`, password: 'x' },
			makeContext().context,
		);

		expect(error).not.toBeNull();
	});

	it('signs up a user successfully', async () => {
		testEmail = `integration-${randomUUID()}@example.com`;
		const { error } = await signUpNewUser(
			{ email: testEmail, password: testPassword },
			makeContext().context,
		);

		expect(error).toBeNull();
	});

	it('returns a Supabase error for invalid sign-in credentials', async () => {
		const { error } = await signInUser(
			{ email: getTestEmail(), password: `${testPassword}-wrong` },
			makeContext().context,
		);

		expect(error).not.toBeNull();
	});

	it('signs in the registered user', async () => {
		const { error } = await signInUser(
			{ email: getTestEmail(), password: testPassword },
			makeContext().context,
		);

		expect(error).toBeNull();
	});

	it('returns null when no auth session is present', async () => {
		await expect(getCurrentUser(makeContext().context)).resolves.toBeNull();
	});

	it('returns the authenticated user for a valid session', async () => {
		const signInContext = makeContext();
		const { error } = await signInUser(
			{ email: getTestEmail(), password: testPassword },
			signInContext.context,
		);
		expect(error).toBeNull();

		const user = await getCurrentUser(makeContext(signInContext.cookieHeader()).context);
		expect(user?.email).toBe(getTestEmail());
	});

	it('clears the session cookies when signing out', async () => {
		const signInContext = makeContext();
		const { error: signInError } = await signInUser(
			{ email: getTestEmail(), password: testPassword },
			signInContext.context,
		);
		expect(signInError).toBeNull();

		const signOutContext = makeContext(signInContext.cookieHeader());
		const { error: signOutError } = await signOutUser(signOutContext.context);

		expect(signOutError).toBeNull();
		expect(signOutContext.cookieHeader()).toBe('');
	});
});
