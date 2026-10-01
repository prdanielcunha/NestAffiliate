import { test, expect } from '@playwright/test';

test('Today → Review → edit → approve → guided publish', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'NestAffiliate trabalhou por você.' })).toBeVisible();

  await page.getByRole('link', { name: /Revisar 3 campanhas/i }).click();
  await expect(page.getByText('PIN PREVIEW')).toBeVisible();
  await expect(page.locator('.score-badge')).toBeVisible();

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


test('creative preview preserves Pinterest 2:3 output contract', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /Revisar 3 campanhas/i }).click();
  const canvas=page.locator('canvas.pin-canvas');
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute('width','1000');
  await expect(canvas).toHaveAttribute('height','1500');
  const data=await canvas.evaluate((node:HTMLCanvasElement)=>({
    width:node.width,
    height:node.height,
    url:node.toDataURL('image/png'),
  }));
  expect(data.width/data.height).toBeCloseTo(2/3,5);
  expect(data.url.startsWith('data:image/png;base64,')).toBe(true);
  expect(data.url.length).toBeGreaterThan(1000);
});

test('light mode and language switching keep primary navigation usable', async ({ page }) => {
  await page.goto('/');
  const theme=page.getByRole('button',{name:'Theme'});
  await theme.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme','light');

  const language=page.getByRole('combobox',{name:'Language'});
  await language.selectOption('en');
  await expect(page.getByRole('link',{name:'Today'}).first()).toBeVisible();
  await expect(page.getByRole('link',{name:'Campaigns'}).first()).toBeVisible();

  await language.selectOption('es');
  await expect(page.getByRole('link',{name:'Hoy'}).first()).toBeVisible();
  await expect(page.getByRole('link',{name:'Campañas'}).first()).toBeVisible();
});

test('review is usable without horizontal overflow on mobile', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile');
  await page.goto('/');
  await page.getByRole('link',{name:/Revisar 3 campanhas/i}).click();
  const sizes=await page.evaluate(()=>({
    scrollWidth:document.documentElement.scrollWidth,
    clientWidth:document.documentElement.clientWidth,
  }));
  expect(sizes.scrollWidth).toBeLessThanOrEqual(sizes.clientWidth+1);
  await expect(page.getByPlaceholder(/Peça qualquer alteração/i)).toBeVisible();
});
