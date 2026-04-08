import { expect, test } from '@playwright/test';

test.describe('Dashboard – authenticated UI', () => {
	test.beforeEach(async ({ page }) => {
		// Arrange
		test.skip(
			!process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD,
			'Set TEST_USER_EMAIL + TEST_USER_PASSWORD to run authenticated tests'
		);

		// Arrange
		await page.goto('/login', { waitUntil: 'networkidle' });
		await page.locator('input[type="email"]').fill(process.env.TEST_USER_EMAIL!);
		await page.locator('input[type="password"]').fill(process.env.TEST_USER_PASSWORD!);

		// Act
		await page.locator('form button[type="submit"]').click();
		await page.waitForURL('**/dashboard', { timeout: 10_000 });
	});

	test('shows a personalised greeting in h1 (not "Guest")', async ({ page }) => {
		// Arrange

		// Assert
		await expect(page.locator('h1').first()).toBeVisible({ timeout: 8000 });
		const text = await page.locator('h1').first().textContent();
		expect(text?.trim()).not.toBe('');
		expect(text).not.toMatch(/guest/i);
	});

	test('logout confirmation dialog opens when the logout button is clicked', async ({ page }) => {
		const logoutBtn = page.getByRole('button', { name: /^(Logout|Abmelden)$/i }).first();

		// Act
		await logoutBtn.click();

		// Assert
		await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: 5000 });
	});

	test('settings link navigates to /settings', async ({ page }) => {
		// Arrange

		// Act
		await page.locator('a[href="/settings"]').first().click();

		// Assert
		await page.waitForURL('**/settings', { timeout: 5000 });
		expect(page.url()).toContain('/settings');
	});
});
