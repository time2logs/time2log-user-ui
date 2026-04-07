import { expect, test } from '@playwright/test';

// ---------------------------------------------------------------------------
// The onboarding page is a protected route – the layout redirects unauthenticated
// visitors to /login.  Guest-mode tests can only verify the redirect.
//
// Authenticated tests cover the "no invite token" error state and the
// onboarding form with a mocked invite RPC.
//
// Full happy-path tests (valid invite → account creation → redirect) require
// a real Supabase invite token and are covered by manual QA / staging tests.
// ---------------------------------------------------------------------------

test.describe('Onboarding – unauthenticated redirect', () => {
	test('redirects to /login when accessed without a session (no token)', async ({ page }) => {
		await page.goto('/onboarding', { waitUntil: 'networkidle' });
		expect(page.url()).toContain('/login');
	});

	test('redirects to /login when accessed without a session (with token)', async ({ page }) => {
		await page.goto('/onboarding?invite_token=fake-token', { waitUntil: 'networkidle' });
		expect(page.url()).toContain('/login');
	});
});

// ---------------------------------------------------------------------------
// Authenticated onboarding tests – only run when real credentials are supplied.
// These simulate a user who is authenticated but hasn't completed onboarding,
// visiting /onboarding with an invite token via Supabase RPC mocking.
//
//   TEST_USER_EMAIL=... TEST_USER_PASSWORD=... npx playwright test
// ---------------------------------------------------------------------------

test.describe('Onboarding – authenticated, no invite token', () => {
	test.beforeEach(async ({ page }) => {
		test.skip(
			!process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD,
			'Set TEST_USER_EMAIL + TEST_USER_PASSWORD to run authenticated tests'
		);

		await page.goto('/login', { waitUntil: 'networkidle' });
		await page.locator('input[type="email"]').fill(process.env.TEST_USER_EMAIL!);
		await page.locator('input[type="password"]').fill(process.env.TEST_USER_PASSWORD!);
		await page.locator('form button[type="submit"]').click();
		// After login, user may end up at /dashboard or /onboarding
		await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 10_000 });
		await page.goto('/onboarding', { waitUntil: 'networkidle' });
	});

	test('shows the "invalid invite" error card when no token is provided', async ({ page }) => {
		// "Invalid invitation" (en) | "Ungültige Einladung" (de-ch) | key: onboarding_invalid_invite
		await expect(
			page.getByText(/invalid invitation|ungültige einladung/i).first()
		).toBeVisible({ timeout: 8000 });
	});

	test('does not show the onboarding form without a token', async ({ page }) => {
		await expect(page.locator('input[name="first_name"]')).not.toBeVisible({ timeout: 5000 });
		await expect(page.locator('input[name="password"]')).not.toBeVisible();
	});

	test('shows the site header with "time2log" branding', async ({ page }) => {
		await expect(page.locator('header')).toContainText('time2log', { timeout: 8000 });
	});
});

test.describe('Onboarding form – authenticated, stubbed valid invite', () => {
	test.beforeEach(async ({ page }) => {
		test.skip(
			!process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD,
			'Set TEST_USER_EMAIL + TEST_USER_PASSWORD to run authenticated tests'
		);

		await page.goto('/login', { waitUntil: 'networkidle' });
		await page.locator('input[type="email"]').fill(process.env.TEST_USER_EMAIL!);
		await page.locator('input[type="password"]').fill(process.env.TEST_USER_PASSWORD!);
		await page.locator('form button[type="submit"]').click();
		await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 10_000 });

		// Stub the Supabase RPC so the server returns valid invite details
		// Note: route() intercepts browser-side requests; SSR calls are not intercepted.
		// With a real Supabase backend, this stub applies to client-hydration requests.
		await page.route('**/rest/v1/rpc/get_invite_details*', (route) =>
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					organization_name: 'Acme GmbH',
					email: process.env.TEST_USER_EMAIL,
					role: 'apprentice'
				})
			})
		);

		await page.goto('/onboarding?invite_token=stub-valid-token', { waitUntil: 'networkidle' });
	});

	test('shows the onboarding form with all required inputs', async ({ page }) => {
		await expect(page.locator('input[name="first_name"]')).toBeVisible({ timeout: 8000 });
		await expect(page.locator('input[name="last_name"]')).toBeVisible();
		await expect(page.locator('input[name="password"]')).toBeVisible();
	});

	test('email field is pre-filled and read-only', async ({ page }) => {
		const emailInput = page.locator('input[name="email"]');
		await expect(emailInput).toHaveAttribute('readonly', { timeout: 8000 });
	});

	test('submit button is present', async ({ page }) => {
		await expect(page.locator('form button[type="submit"]')).toBeVisible({ timeout: 8000 });
	});
});
