import { expect, test } from '@playwright/test';

// ---------------------------------------------------------------------------
// The layout server redirects all unauthenticated visitors of protected routes
// to /login.  The only guest-mode tests that make sense here are the redirect
// itself and a basic "no JS errors on login" check.
// Authenticated tests require real credentials via environment variables.
// ---------------------------------------------------------------------------

test.describe('Absences page – unauthenticated redirect', () => {
	test('redirects to /login when accessed without a session', async ({ page }) => {
		await page.goto('/absences', { waitUntil: 'networkidle' });
		expect(page.url()).toContain('/login');
	});

	test('renders without critical JavaScript errors after redirect', async ({ page }) => {
		const errors: string[] = [];
		page.on('pageerror', (e) => errors.push(e.message));

		await page.goto('/absences', { waitUntil: 'networkidle' });

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

test.describe('Absences page – authenticated UI', () => {
	test.beforeEach(async ({ page }) => {
		test.skip(
			!process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD,
			'Set TEST_USER_EMAIL + TEST_USER_PASSWORD to run authenticated tests'
		);

		await page.goto('/login', { waitUntil: 'networkidle' });
		await page.locator('input[type="email"]').fill(process.env.TEST_USER_EMAIL!);
		await page.locator('input[type="password"]').fill(process.env.TEST_USER_PASSWORD!);
		await page.locator('form button[type="submit"]').click();
		await page.waitForURL('**/dashboard', { timeout: 10_000 });
		await page.goto('/absences', { waitUntil: 'networkidle' });
	});

	test('renders the absences heading', async ({ page }) => {
		await expect(page.locator('h1').first()).toBeVisible({ timeout: 8000 });
	});

	test('shows an "add absence" button', async ({ page }) => {
		// "New Absence" (en) | "Neue Abwesenheit" (de-ch)
		await expect(
			page
				.getByRole('button')
				.filter({ hasText: /add|hinzufügen|neue/i })
				.first()
		).toBeVisible({ timeout: 8000 });
	});

	test('add absence dialog opens when the add button is clicked', async ({ page }) => {
		const addBtn = page
			.getByRole('button')
			.filter({ hasText: /add|hinzufügen|neue/i })
			.first();
		await addBtn.click();
		await expect(page.getByRole('dialog').first()).toBeVisible({ timeout: 5000 });
	});

	test('shows a link back to the dashboard', async ({ page }) => {
		await expect(page.locator('a[href*="dashboard"]').first()).toBeVisible({ timeout: 8000 });
	});

	test('back link navigates to /dashboard', async ({ page }) => {
		await page.locator('a[href*="dashboard"]').first().click();
		await page.waitForURL('**/dashboard', { timeout: 5000 });
		expect(page.url()).toContain('/dashboard');
	});

	test('shows the empty-state or absences list', async ({ page }) => {
		// Either the empty state card or at least one absence card must be present
		const emptyText = page.getByText(/no absences|keine abwesenheiten/i);
		const absenceCard = page.locator('[data-slot="card-content"]');

		await expect(emptyText.or(absenceCard).first()).toBeVisible({ timeout: 10_000 });
	});

	test('page loads without critical JavaScript errors', async ({ page }) => {
		const errors: string[] = [];
		page.on('pageerror', (e) => errors.push(e.message));

		await page.reload({ waitUntil: 'networkidle' });

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
