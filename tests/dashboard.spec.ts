import { expect, test } from '@playwright/test';

// ---------------------------------------------------------------------------
// The layout server redirects all unauthenticated visitors to /login.
// Guest-mode tests verify that redirect and the absence of JS errors.
// ---------------------------------------------------------------------------

test.describe('Dashboard – unauthenticated redirect', () => {
	test.beforeEach(async ({ page }) => {
		// Arrange – navigate to dashboard without a session cookie
		await page.goto('/dashboard', { waitUntil: 'networkidle' });
	});

	test('redirects to /login when accessed without a session', async ({ page }) => {
		// Arrange – page is loaded in beforeEach

		// Act – (no interaction; verify URL after redirect)

		// Assert
		expect(page.url()).toContain('/login');
	});

	test('renders login page without crashing after redirect', async ({ page }) => {
		// Arrange – page is loaded in beforeEach

		// Act – (no interaction; verify rendered content)

		// Assert – login page has a main element
		await expect(page.locator('main').first()).toBeVisible({ timeout: 8000 });
	});

	test('page loads without critical JavaScript errors', async ({ page }) => {
		// Arrange – attach error listener before reload
		const errors: string[] = [];
		page.on('pageerror', (e) => errors.push(e.message));

		// Act
		await page.reload({ waitUntil: 'networkidle' });

		// Assert – ignore expected Supabase network errors (no real credentials in test env)
		const critical = errors.filter(
			(e) =>
				!e.toLowerCase().includes('supabase') &&
				!e.toLowerCase().includes('fetch') &&
				!e.toLowerCase().includes('network') &&
				!e.toLowerCase().includes('failed to load')
		);
		expect(critical).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// Authenticated tests – only run when real credentials are supplied:
//   TEST_USER_EMAIL=... TEST_USER_PASSWORD=... npx playwright test
// ---------------------------------------------------------------------------

test.describe('Dashboard – authenticated UI', () => {
	test.beforeEach(async ({ page }) => {
		// Arrange – skip unless credentials are available
		test.skip(
			!process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD,
			'Set TEST_USER_EMAIL + TEST_USER_PASSWORD to run authenticated tests'
		);

		// Arrange – log in via the real login form so the server gets a valid session cookie
		await page.goto('/login', { waitUntil: 'networkidle' });
		await page.locator('input[type="email"]').fill(process.env.TEST_USER_EMAIL!);
		await page.locator('input[type="password"]').fill(process.env.TEST_USER_PASSWORD!);

		// Act
		await page.locator('form button[type="submit"]').click();
		await page.waitForURL('**/dashboard', { timeout: 10_000 });
	});

	test('shows a personalised greeting in h1 (not "Guest")', async ({ page }) => {
		// Arrange – user is logged in via beforeEach

		// Act – (no interaction; verify rendered content)

		// Assert
		await expect(page.locator('h1').first()).toBeVisible({ timeout: 8000 });
		const text = await page.locator('h1').first().textContent();
		expect(text?.trim()).not.toBe('');
		expect(text).not.toMatch(/guest/i);
	});

	test('logout confirmation dialog opens when the logout button is clicked', async ({ page }) => {
		// Arrange – user is logged in via beforeEach
		// "Logout" (en) | "Abmelden" (de-ch)
		const logoutBtn = page.getByRole('button', { name: /^(Logout|Abmelden)$/i }).first();

		// Act
		await logoutBtn.click();

		// Assert
		await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: 5000 });
	});

	test('settings link navigates to /settings', async ({ page }) => {
		// Arrange – user is logged in via beforeEach

		// Act
		await page.locator('a[href="/settings"]').first().click();

		// Assert
		await page.waitForURL('**/settings', { timeout: 5000 });
		expect(page.url()).toContain('/settings');
	});
});
