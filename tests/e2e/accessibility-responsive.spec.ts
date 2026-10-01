import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

async function seriousAccessibilityViolations(page: import('@playwright/test').Page) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  return result.violations.filter((violation) =>
    violation.impact === 'critical' || violation.impact === 'serious'
  );
}

test('primary surfaces have no serious automated accessibility violations', async ({ page }) => {
  await page.goto('/');
  expect(await seriousAccessibilityViolations(page)).toEqual([]);

  await page.getByRole('link', { name: 'Radar' }).first().click();
  expect(await seriousAccessibilityViolations(page)).toEqual([]);

  await page.getByRole('link', { name: 'Campanhas' }).first().click();
  expect(await seriousAccessibilityViolations(page)).toEqual([]);
});

test('responsive matrix has no horizontal overflow', async ({ page }) => {
  const widths = [360, 390, 768, 1024, 1440, 1920];
  for (const width of widths) {
    await page.setViewportSize({ width, height: width < 600 ? 844 : 1000 });
    await page.goto('/');
    const home = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(home.scrollWidth, `home overflow at ${width}px`).toBeLessThanOrEqual(home.clientWidth + 1);

    await page.getByRole('link', { name: /Revisar 3 campanhas/i }).click();
    const review = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(review.scrollWidth, `review overflow at ${width}px`).toBeLessThanOrEqual(review.clientWidth + 1);
  }
});

test('keyboard focus can reach primary actions', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  let reachedInteractive = false;
  for (let index = 0; index < 20; index += 1) {
    const tag = await page.evaluate(() => document.activeElement?.tagName ?? '');
    if (['A', 'BUTTON', 'INPUT', 'SELECT'].includes(tag)) {
      reachedInteractive = true;
      break;
    }
    await page.keyboard.press('Tab');
  }
  expect(reachedInteractive).toBe(true);
});

test('reduced motion preference keeps the application usable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'NestAffiliate trabalhou por você.' })).toBeVisible();
  await page.getByRole('link', { name: /Revisar 3 campanhas/i }).click();
  await expect(page.getByText('PIN PREVIEW')).toBeVisible();
});
