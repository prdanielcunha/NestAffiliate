import { test, expect } from '@playwright/test';

test('Today → Review → edit → approve → guided publish', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'NestAffiliate trabalhou por você.' })).toBeVisible();

  await page.getByRole('link', { name: /Revisar 3 campanhas/i }).click();
  await expect(page.getByText('PIN PREVIEW')).toBeVisible();
  await expect(page.getByText(/NestScore/)).toBeVisible();

  const edit = page.getByPlaceholder(/Peça qualquer alteração/i);
  await edit.fill('mais premium');
  await edit.press('Enter');
  await expect(page.locator('.save-state')).toContainText('v2');

  await page.getByRole('button', { name: 'Aprovar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Seu Pin está pronto.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Baixar imagem PNG' })).toBeVisible();
  await expect(page.getByText('MODO GUIADO')).toBeVisible();
});

test('mobile exposes the four primary destinations', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile');
  await page.goto('/');
  const nav = page.locator('.bottom-nav');
  await expect(nav).toBeVisible();
  await expect(nav.getByRole('link')).toHaveCount(4);
  await expect(nav.getByRole('link', { name: 'Hoje' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Radar' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Campanhas' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Resultados' })).toBeVisible();
});
