import { expect, test } from '@playwright/test';

// ---------------------------------------------------------------------------
// The settings page.server.ts redirects unauthenticated visitors to /login.
// Authenticated tests cover the main settings UI and interaction flows.
// ---------------------------------------------------------------------------

test.describe('Settings page – unauthenticated redirect', () => {
	test('redirects to /login when accessed without a session', async ({ page }) => {
		await page.goto('/settings', { waitUntil: 'networkidle' });
		expect(page.url()).toContain('/login');
	});

	test('renders without critical JavaScript errors after redirect', async ({ page }) => {
		const errors: string[] = [];
		page.on('pageerror', (e) => errors.push(e.message));

		await page.goto('/settings', { waitUntil: 'networkidle' });

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

test.describe('Settings page – authenticated UI', () => {
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
		await page.goto('/settings', { waitUntil: 'networkidle' });
	});

	test('renders the settings heading', async ({ page }) => {
		// "Settings" (en) | "Einstellungen" (de-ch)
		await expect(page.locator('h1').first()).toBeVisible({ timeout: 8000 });
	});

	test('shows first name and last name inputs', async ({ page }) => {
		await expect(page.locator('input#first_name')).toBeVisible({ timeout: 8000 });
		await expect(page.locator('input#last_name')).toBeVisible();
	});

	test('shows the theme toggle button', async ({ page }) => {
		await expect(
			page.getByRole('button', { name: /switch to (dark|light) mode/i }).first()
		).toBeVisible({ timeout: 8000 });
	});

	test('theme toggle switches between light and dark', async ({ page }) => {
		const toggle = page.getByRole('button', { name: /switch to (dark|light) mode/i }).first();
		const initialLabel = await toggle.getAttribute('aria-label');

		await toggle.click();

		// The label should have flipped
		await expect(toggle).not.toHaveAttribute('aria-label', initialLabel!, { timeout: 3000 });
	});

	test('shows the language switcher section', async ({ page }) => {
		// "Language" (en) | "Sprache" (de-ch)
		await expect(page.getByText(/language|sprache/i).first()).toBeVisible({ timeout: 8000 });
	});

	test('shows the danger zone section', async ({ page }) => {
		// "Danger Zone" (en) | "Gefahrenzone" (de-ch)
		await expect(page.getByText(/danger zone|gefahrenzone/i).first()).toBeVisible({
			timeout: 8000
		});
	});

	test('shows the change email form in the danger zone', async ({ page }) => {
		await expect(page.locator('input#email')).toBeVisible({ timeout: 8000 });
	});

	test('shows the change password form in the danger zone', async ({ page }) => {
		await expect(page.locator('input#password')).toBeVisible({ timeout: 8000 });
		await expect(page.locator('input#confirm_password')).toBeVisible();
	});

	test('logout dialog opens when the logout button is clicked', async ({ page }) => {
		// "Logout" (en) | "Abmelden" (de-ch)
		const logoutBtn = page.getByRole('button', { name: /^(Logout|Abmelden)$/i }).first();
		await logoutBtn.click();
		await expect(page.getByRole('alertdialog')).toBeVisible({ timeout: 5000 });
	});

	test('cancelling the logout dialog keeps the user on settings', async ({ page }) => {
		const logoutBtn = page.getByRole('button', { name: /^(Logout|Abmelden)$/i }).first();
		await logoutBtn.click();

		// "Cancel" (en) | "Abbrechen" (de-ch)
		const cancelBtn = page.getByRole('button', { name: /^(Cancel|Abbrechen)$/i }).first();
		await cancelBtn.click();

		await expect(page.getByRole('alertdialog')).not.toBeVisible({ timeout: 3000 });
		expect(page.url()).toContain('/settings');
	});

	test('profile save button is disabled while saving', async ({ page }) => {
		// Stall the form POST so we can observe the loading state
		await page.route('**/settings*', async (route) => {
			if (route.request().method() === 'POST') {
				await new Promise<void>((r) => setTimeout(r, 8_000));
				await route.continue();
			} else {
				await route.continue();
			}
		});

		await page.locator('input#first_name').fill('Test');
		await page.locator('input#last_name').fill('User');

		// "Save" (en) | "Speichern" (de-ch)
		const saveBtn = page.getByRole('button', { name: /^(Save|Speichern)$/i }).first();
		await saveBtn.click();

		await expect(saveBtn).toBeDisabled({ timeout: 3000 });
	});

	test('back link navigates to /dashboard', async ({ page }) => {
		await page.locator('a[href="/dashboard"]').first().click();
		await page.waitForURL('**/dashboard', { timeout: 5000 });
		expect(page.url()).toContain('/dashboard');
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
