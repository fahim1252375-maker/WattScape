import { expect, test } from '@playwright/test';
import { PRIMARY_NAV, enterDemoTwin } from './helpers';

const CORE_SCREENS = [
  'Org Workspace',
  'Multi-Resource Monitor',
  'Maintenance Center',
  'Analytics & Reporting',
  'Security & Governance',
  'Settings',
];

test.describe('application boot and demo navigation', () => {
  test('landing page renders with no uncaught runtime errors', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Understand Every Resource/ })).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test('demo twin opens with the primary navigation rail', async ({ page }) => {
    await enterDemoTwin(page);
    await expect(page.getByRole('complementary', PRIMARY_NAV)).toBeVisible();
  });

  test('core demo screens render without the error boundary or live API traffic', async ({ page }) => {
    const pageErrors: string[] = [];
    const apiCalls: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('request', (req) => { if (/\/api\/v1\//.test(req.url())) apiCalls.push(req.url()); });

    await enterDemoTwin(page);
    const rail = page.getByRole('complementary', PRIMARY_NAV);
    for (const label of CORE_SCREENS) {
      await rail.getByRole('button', { name: label, exact: true }).click();
      await expect(page.getByText('WattScape could not render this view')).toHaveCount(0);
    }
    expect(pageErrors).toEqual([]);
    expect(apiCalls).toEqual([]);
  });

  test('mobile and tablet navigation stays usable without horizontal page overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await enterDemoTwin(page);
    const menu = page.getByRole('button', { name: 'Toggle navigation drawer' });
    await expect(menu).toBeVisible();
    await menu.click();
    await page.getByRole('button', { name: 'Settings', exact: true }).last().click();
    await expect(page.getByText('Workspace Preferences & Accessibility Settings')).toBeVisible();
    for (const width of [390, 768, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(overflow, `horizontal overflow at ${width}px`).toBe(false);
    }
    await page.setViewportSize({ width: 768, height: 844 });
    await expect(menu).toBeVisible();
    await menu.click();
    await expect(page.getByRole('button', { name: 'Analytics & Reporting', exact: true }).last()).toBeVisible();
  });
});
