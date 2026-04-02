import { expect, test } from '@playwright/test';

test.describe('Landing page', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/', { waitUntil: 'networkidle' });
	});

	test('shows headline', async ({ page }) => {
		// Heading always contains "Learning" regardless of locale
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 8000 });
		await expect(page.getByRole('heading', { level: 1 })).toContainText('Learning');
	});

	test('unauthenticated – shows "Get Started" link to /login', async ({ page }) => {
		// "Get Started" only appears when the user is NOT logged in
		const cta = page.getByRole('link', { name: /get started/i });
		await expect(cta).toBeVisible({ timeout: 8000 });
		await expect(cta).toHaveAttribute('href', '/login');
	});

	test('footer is visible with branding', async ({ page }) => {
		await expect(page.locator('footer')).toBeVisible();
		await expect(page.locator('footer')).toContainText('time2log');
	});

	test('"Get Started" click navigates to /login', async ({ page }) => {
		await page.getByRole('link', { name: /get started/i }).click();
		await page.waitForURL('**/login', { timeout: 5000 });
		expect(page.url()).toContain('/login');
	});

	test('page has no critical JS errors', async ({ page }) => {
		const errors: string[] = [];
		page.on('pageerror', (e) => errors.push(e.message));
		await page.reload({ waitUntil: 'networkidle' });
		const critical = errors.filter(
			(e) =>
				!e.toLowerCase().includes('supabase') &&
				!e.toLowerCase().includes('fetch') &&
				!e.toLowerCase().includes('network')
		);
		expect(critical).toHaveLength(0);
	});
});
