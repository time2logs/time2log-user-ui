import { expect, test } from '@playwright/test';

// ---------------------------------------------------------------------------
// The layout server does NOT redirect unauthenticated users – it returns
// { profile: null, teamMember: null, curriculumNodes: [] } so the dashboard
// renders in "Guest" mode.  Tests reflect this actual behaviour.
// ---------------------------------------------------------------------------

test.describe('Dashboard – guest mode (unauthenticated)', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/dashboard', { waitUntil: 'networkidle' });
	});

	test('renders the page without crashing', async ({ page }) => {
		// Page must not show an error page / 500
		await expect(page.locator('main, [class*="gradient"]').first()).toBeVisible({ timeout: 8000 });
	});

	test('renders the calendar widget', async ({ page }) => {
		await expect(
			page.locator('[data-bits-calendar-root], [class*="calendar"]').first()
		).toBeVisible({ timeout: 8000 });
	});

	test('renders the activity log section', async ({ page }) => {
		// "Activity Log" (en) | "Aktivitätsprotokoll" (de-ch)
		await expect(
			page.getByText(/activity log|aktivitätsprotokoll/i).first()
		).toBeVisible({ timeout: 8000 });
	});

	test('shows the add-activity button', async ({ page }) => {
		// "Log Activity" (en) | "Aktivität protokollieren" (de-ch) – desktop button
		const addBtn = page
			.getByRole('button', { name: /log activity|aktivität protokollieren/i })
			.first();
		await expect(addBtn).toBeVisible({ timeout: 8000 });
	});

	test('opens the activity form dialog on button click', async ({ page }) => {
		const addBtn = page
			.getByRole('button', { name: /log activity|aktivität protokollieren/i })
			.first();
		await addBtn.click();

		// bits-ui Dialog.Content renders with data-slot="dialog-content"
		await expect(page.locator('[data-slot="dialog-content"]')).toBeVisible({ timeout: 6000 });
	});

	test('activity form dialog closes with Escape', async ({ page }) => {
		const addBtn = page
			.getByRole('button', { name: /log activity|aktivität protokollieren/i })
			.first();
		await addBtn.click();
		await expect(page.locator('[data-slot="dialog-content"]')).toBeVisible({ timeout: 6000 });

		await page.keyboard.press('Escape');
		await expect(page.locator('[data-slot="dialog-content"]')).not.toBeVisible({ timeout: 3000 });
	});

	test('h1 greeting is visible', async ({ page }) => {
		await expect(page.locator('h1').first()).toBeVisible({ timeout: 8000 });
	});

	test('settings icon link is present', async ({ page }) => {
		// The settings link is an <a href="/settings">
		await expect(page.locator('a[href="/settings"]').first()).toBeVisible({ timeout: 8000 });
	});

	test('no critical JS errors on load', async ({ page }) => {
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

// ---------------------------------------------------------------------------
// Authenticated tests – only run when real test credentials are supplied:
//   TEST_USER_EMAIL=... TEST_USER_PASSWORD=... npx playwright test
// ---------------------------------------------------------------------------

test.describe('Dashboard – authenticated UI', () => {
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
	});

	test('shows personalised greeting in h1', async ({ page }) => {
		await expect(page.locator('h1').first()).toBeVisible({ timeout: 8000 });
		const text = await page.locator('h1').first().textContent();
		expect(text?.trim()).not.toBe('');
		// Must NOT say "Guest" for a real user
		expect(text).not.toMatch(/guest/i);
	});

	test('logout confirmation dialog opens', async ({ page }) => {
		// "Logout" (en) | "Abmelden" (de-ch)
		await page.getByRole('button', { name: /^(Logout|Abmelden)$/i }).first().click();
		await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: 5000 });
	});

	test('settings link navigates to /settings', async ({ page }) => {
		await page.locator('a[href="/settings"]').first().click();
		await page.waitForURL('**/settings', { timeout: 5000 });
		expect(page.url()).toContain('/settings');
	});
});
