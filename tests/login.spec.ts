import { expect, test } from '@playwright/test';

const SUBMIT_BTN = 'form button[type="submit"]';

test.describe('Login page', () => {
	test.beforeEach(async ({ page }) => {
		// Arrange – navigate to login and wait for the form to be interactive
		await page.goto('/login');
		await page.waitForSelector(SUBMIT_BTN);
	});

	test('renders email and password inputs', async ({ page }) => {
		// Arrange – page is loaded in beforeEach

		// Act – (page renders on navigation, no further action needed)

		// Assert
		await expect(page.locator('input[type="email"]')).toBeVisible();
		await expect(page.locator('input[type="password"]')).toBeVisible();
	});

	test('submit button is present and enabled by default', async ({ page }) => {
		// Arrange – page is loaded in beforeEach

		// Act – (no interaction; verify initial state)

		// Assert
		await expect(page.locator(SUBMIT_BTN)).toBeVisible();
		await expect(page.locator(SUBMIT_BTN)).toBeEnabled();
	});

	test('submit button is disabled while the auth request is in flight', async ({ page }) => {
		// Arrange – fill valid credentials and stall the Supabase token endpoint
		await page.locator('input[type="email"]').fill('test@example.com');
		await page.locator('input[type="password"]').fill('somepassword');
		// Keep the request pending long enough to assert, then resolve it cleanly.
		// NOT aborted – aborting causes Supabase SDK to catch the error and reset isLoading.
		await page.route('**/auth/v1/token*', async (route) => {
			await new Promise<void>((r) => setTimeout(r, 10_000));
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({})
			});
		});

		// Act
		await page.locator(SUBMIT_BTN).click();

		// Assert – button must become disabled while the request is still pending
		await expect(page.locator(SUBMIT_BTN)).toBeDisabled({ timeout: 2000 });
	});

	test('displays an error message on failed login', async ({ page }) => {
		// Arrange – fill credentials and mock a 400 Supabase response
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

		// Act
		await page.locator(SUBMIT_BTN).click();

		// Assert – the error div has class "text-destructive"; appears only when errorMessage is set
		await expect(page.locator('[class*="text-destructive"]').first()).toBeVisible({ timeout: 5000 });
	});

	test('email input blocks submission for invalid format (HTML5 validation)', async ({ page }) => {
		// Arrange – enter a non-email value
		await page.locator('input[type="email"]').fill('not-an-email');
		await page.locator('input[type="password"]').fill('password');

		// Act
		await page.locator(SUBMIT_BTN).click();
		await page.waitForTimeout(400); // give browser validation time to act

		// Assert – HTML5 validation prevents navigation; URL stays at /login
		expect(page.url()).toContain('/login');
	});

	test('password field masks its input', async ({ page }) => {
		// Arrange – page is loaded in beforeEach

		// Act – (no interaction; verify field attribute)

		// Assert
		await expect(page.locator('input[type="password"]')).toHaveAttribute('type', 'password');
	});

	test('shows "time2log" branding in the header', async ({ page }) => {
		// Arrange – page is loaded in beforeEach

		// Act – (no interaction; verify rendered content)

		// Assert
		await expect(page.locator('header')).toContainText('time2log');
	});

	test('shows a login card title', async ({ page }) => {
		// Arrange – page is loaded in beforeEach
		// Card.Title renders with data-slot="card-title"
		// "Welcome Back" (en) | "Willkommen zurück" (de-ch)

		// Act – (no interaction; verify rendered content)

		// Assert
		await expect(page.locator('[data-slot="card-title"]').first()).toBeVisible({ timeout: 5000 });
	});
});
