import { expect, test } from '@playwright/test';

const SUBMIT_BTN = 'form button[type="submit"]';

test.describe('Login page', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/login');
		await page.waitForSelector(SUBMIT_BTN);
	});

	test('renders email and password inputs', async ({ page }) => {
		await expect(page.locator('input[type="email"]')).toBeVisible();
		await expect(page.locator('input[type="password"]')).toBeVisible();
	});

	test('submit button is present and enabled by default', async ({ page }) => {
		await expect(page.locator(SUBMIT_BTN)).toBeVisible();
		await expect(page.locator(SUBMIT_BTN)).toBeEnabled();
	});

	test('submit button is disabled while the auth request is in flight', async ({ page }) => {
		await page.locator('input[type="email"]').fill('test@example.com');
		await page.locator('input[type="password"]').fill('somepassword');

		// Delay the Supabase token endpoint so the loading state stays visible long enough
		await page.route('**/auth/v1/token*', async (route) => {
			await new Promise((r) => setTimeout(r, 3000));
			await route.abort();
		});

		await page.locator(SUBMIT_BTN).click();

		// Button must become disabled immediately after click
		await expect(page.locator(SUBMIT_BTN)).toBeDisabled({ timeout: 2000 });
	});

	test('displays error message on failed login', async ({ page }) => {
		await page.locator('input[type="email"]').fill('wrong@example.com');
		await page.locator('input[type="password"]').fill('wrongpassword');

		await page.route('**/auth/v1/token*', (route) =>
			route.fulfill({
				status: 400,
				contentType: 'application/json',
				body: JSON.stringify({
					error: 'invalid_grant',
					error_description: 'Invalid login credentials'
				})
			})
		);

		await page.locator(SUBMIT_BTN).click();

		// A red error container must appear
		await expect(page.locator('[class*="red-50"],[class*="red-700"],[class*="red-950"]').first()).toBeVisible({
			timeout: 5000
		});
	});

	test('email input enforces valid format (HTML5 validation)', async ({ page }) => {
		await page.locator('input[type="email"]').fill('not-an-email');
		await page.locator('input[type="password"]').fill('password');
		await page.locator(SUBMIT_BTN).click();

		// HTML5 validation blocks submission – URL must still be /login
		await page.waitForTimeout(400);
		expect(page.url()).toContain('/login');
	});

	test('password field masks input', async ({ page }) => {
		await expect(page.locator('input[type="password"]')).toHaveAttribute('type', 'password');
	});

	test('shows "time2log" branding in header', async ({ page }) => {
		await expect(page.locator('header')).toContainText('time2log');
	});

	test('shows a login card title', async ({ page }) => {
		// Card.Title renders with data-slot="card-title"
		// "Welcome Back" (en) | "Willkommen zurück" (de-ch)
		await expect(
			page.locator('[data-slot="card-title"]').first()
		).toBeVisible({ timeout: 5000 });
	});
});
