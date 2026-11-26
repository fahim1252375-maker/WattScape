import type { Page } from '@playwright/test';

/** Synthetic demo entry: the landing CTA opens the twin viewer without any identity provider. */
export async function enterDemoTwin(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Explore Interactive 3D Twin' }).click();
}

export const PRIMARY_NAV = { name: 'Primary Platform Navigation' } as const;
