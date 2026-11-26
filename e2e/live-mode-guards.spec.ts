import { expect, test } from '@playwright/test';

// This build has no VITE_OIDC_* values, so live sign-in must refuse to proceed and
// explain the configuration gap rather than silently falling back to demo data.
test.describe('live mode configuration guards (no identity provider configured)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => window.sessionStorage.setItem('wattscape.app-mode', 'live'));
  });

  test('shows a safe configuration message and disables Keycloak sign-in', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Connect to your organization' })).toBeVisible();
    await expect(page.getByRole('alert').filter({ hasText: 'OIDC configuration is missing' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue with Keycloak' })).toBeDisabled();
  });

  test('can switch from live sign-in back to the demo landing page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Switch to Demo Mode' }).click();
    await expect(page.getByRole('heading', { name: /Understand Every Resource/ })).toBeVisible();
  });

  test('never calls a localhost API from a build without configuration', async ({ page }) => {
    const localhostCalls: string[] = [];
    page.on('request', (req) => { if (/localhost:8080|127\.0\.0\.1:8080/.test(req.url())) localhostCalls.push(req.url()); });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Connect to your organization' })).toBeVisible();
    expect(localhostCalls).toEqual([]);
  });
});
