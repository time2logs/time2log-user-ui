import { expect, test } from '@playwright/test';

// ---------------------------------------------------------------------------
// The layout server does NOT redirect unauthenticated users – it returns
// { profile: null, teamMember: null, curriculumNodes: [] } so the dashboard
// renders in "Guest" mode.  Tests reflect this actual behaviour.
// ---------------------------------------------------------------------------

// Selector shared across tests:
// Both buttons (desktop header + mobile FAB) use the orange gradient class.
// Using :visible ensures we only interact with the one rendered for the
// current viewport.
const ADD_BTN = 'button[class*="from-orange-400"]:visible';

test.describe('Dashboard – guest mode (unauthenticated)', () => {
	test.beforeEach(async ({ page }) => {
		// Arrange – navigate to dashboard without a session cookie
		await page.goto('/dashboard', { waitUntil: 'networkidle' });
	});

	test('renders the page without crashing', async ({ page }) => {
		// Arrange – page is loaded in beforeEach

		// Act – (no interaction; verify rendered content)

		// Assert
		await expect(page.locator('main, [class*="gradient"]').first()).toBeVisible({ timeout: 8000 });
	});

	test('renders the calendar widget', async ({ page }) => {
		// Arrange – page is loaded in beforeEach

		// Act – (no interaction; verify rendered content)

		// Assert
		await expect(
			page.locator('[data-bits-calendar-root], [class*="calendar"]').first()
		).toBeVisible({ timeout: 8000 });
	});

	test('renders the activity log section', async ({ page }) => {
		// Arrange – page is loaded in beforeEach
		// "Activity Log" (en) | "Aktivitätsprotokoll" (de-ch)

		// Act – (no interaction; verify rendered content)

		// Assert
		await expect(
			page.getByText(/activity log|aktivitätsprotokoll/i).first()
		).toBeVisible({ timeout: 8000 });
	});

	test('shows the add-activity button', async ({ page }) => {
		// Arrange – page is loaded in beforeEach
		// Desktop: labelled button with text; Mobile: circular FAB.
		// Both share the orange gradient class "from-orange-400".

		// Act – (no interaction; verify rendered content)

		// Assert – at least one add-activity button exists in the DOM
		await expect(
			page.locator('button[class*="from-orange-400"]').first()
		).toBeAttached({ timeout: 8000 });
	});

	test('opens the activity form dialog when the add-button is clicked', async ({ page }) => {
		// Arrange
		// bits-ui Dialog.Content renders with data-slot="dialog-content".
		// On mobile the FAB is visible; on desktop the header button is visible.
		// :visible filters out the hidden counterpart automatically.

		// Act
		await page.locator(ADD_BTN).first().click();

		// Assert
		await expect(page.locator('[data-slot="dialog-content"]')).toBeVisible({ timeout: 6000 });
	});

	test('closes the activity form dialog when Escape is pressed', async ({ page }) => {
		// Arrange – open the dialog first using the viewport-appropriate button
		await page.locator(ADD_BTN).first().click();
		await expect(page.locator('[data-slot="dialog-content"]')).toBeVisible({ timeout: 6000 });

		// Act
		await page.keyboard.press('Escape');

		// Assert
		await expect(page.locator('[data-slot="dialog-content"]')).not.toBeVisible({ timeout: 3000 });
	});

	test('h1 greeting is visible', async ({ page }) => {
		// Arrange – page is loaded in beforeEach

		// Act – (no interaction; verify rendered content)

		// Assert
		await expect(page.locator('h1').first()).toBeVisible({ timeout: 8000 });
	});

	test('settings icon link is present', async ({ page }) => {
		// Arrange – page is loaded in beforeEach
		// On desktop the settings link is visible in the header.
		// On mobile it lives inside the closed Sheet drawer (in DOM but hidden).

		// Act – (no interaction; verify DOM presence)

		// Assert – link exists in the DOM on every viewport
		await expect(page.locator('a[href="/settings"]').first()).toBeAttached({ timeout: 8000 });
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
