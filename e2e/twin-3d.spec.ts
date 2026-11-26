import { expect, test } from '@playwright/test';
import { enterDemoTwin } from './helpers';

// The 3D twin is lazy-loaded. Headless Chromium uses SwiftShader (software WebGL), so the
// view must either mount a canvas or show an explicit, recoverable fallback. Both are asserted.
const FALLBACK = /WebGL rendering context paused or unavailable/;
const LOADING = /Loading 3D Resource Twin scene/;

test.describe('3D building twin', () => {
  test('mounts a WebGL canvas or shows the recoverable WebGL fallback', async ({ page }) => {
    await enterDemoTwin(page);
    await expect.poll(async () => {
      const canvases = await page.locator('canvas').count();
      const fallback = await page.getByText(FALLBACK).count();
      return canvases > 0 || fallback > 0;
    }, { timeout: 30_000 }).toBe(true);
    await expect(page.getByText(LOADING)).toHaveCount(0, { timeout: 30_000 });
  });

  test('OrbitControls pointer drag and wheel do not crash the 3D scene', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
    await enterDemoTwin(page);
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 30_000 });
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    const cx = box!.x + box!.width / 2;
    const cy = box!.y + box!.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 80, cy + 30, { steps: 10 });
    await page.mouse.up();
    await page.mouse.wheel(0, -240);
    await page.waitForTimeout(300);
    await expect(canvas).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test('the twin stays mounted across viewport resizes', async ({ page }) => {
    await enterDemoTwin(page);
    await expect.poll(async () => (await page.locator('canvas').count()) + (await page.getByText(FALLBACK).count()), { timeout: 30_000 }).toBeGreaterThan(0);
    await page.setViewportSize({ width: 900, height: 800 });
    await page.setViewportSize({ width: 1400, height: 900 });
    await expect.poll(async () => (await page.locator('canvas').count()) + (await page.getByText(FALLBACK).count()), { timeout: 15_000 }).toBeGreaterThan(0);
    await expect(page.getByText('WattScape could not render this view')).toHaveCount(0);
  });
});
