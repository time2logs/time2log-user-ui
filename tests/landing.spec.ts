import { expect, test } from '@playwright/test';

test.describe('Landing page', () => {
	test.beforeEach(async ({ page }) => {
		// Arrange – navigate to the landing page and wait for network to settle
		await page.goto('/', { waitUntil: 'networkidle' });
	});

	test('shows the main headline', async ({ page }) => {
		// Arrange – page is loaded in beforeEach

		// Act – (no interaction; verify rendered content)

		// Assert – heading always contains "Learning" regardless of locale
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 8000 });
		await expect(page.getByRole('heading', { level: 1 })).toContainText('Learning');
	});

	test('shows a "Get Started" link pointing to /login when unauthenticated', async ({ page }) => {
		// Arrange – page is loaded in beforeEach (no session cookie set)

		// Act – (no interaction; verify rendered content)

		// Assert
		const cta = page.getByRole('link', { name: /get started/i });
		await expect(cta).toBeVisible({ timeout: 8000 });
		await expect(cta).toHaveAttribute('href', '/login');
	});

	test('shows footer with "time2log" branding', async ({ page }) => {
		// Arrange – page is loaded in beforeEach

		// Act – (no interaction; verify rendered content)

		// Assert
		await expect(page.locator('footer')).toBeVisible();
		await expect(page.locator('footer')).toContainText('time2log');
	});

	test('"Get Started" click navigates to /login', async ({ page }) => {
		// Arrange – page is loaded in beforeEach
		const cta = page.getByRole('link', { name: /get started/i });

		// Act
		await cta.click();

		// Assert
		await page.waitForURL('**/login', { timeout: 5000 });
		expect(page.url()).toContain('/login');
	});

	test('page loads without critical JavaScript errors', async ({ page }) => {
		// Arrange – collect runtime errors during page load
		const errors: string[] = [];
		page.on('pageerror', (e) => errors.push(e.message));

		// Act
		await page.reload({ waitUntil: 'networkidle' });

		// Assert – ignore expected network errors from Supabase (no real credentials in test env)
		const critical = errors.filter(
			(e) =>
				!e.toLowerCase().includes('supabase') &&
				!e.toLowerCase().includes('fetch') &&
				!e.toLowerCase().includes('network')
		);
		expect(critical).toHaveLength(0);
	});
});
