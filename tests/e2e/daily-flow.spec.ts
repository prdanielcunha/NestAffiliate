import { test, expect } from '@playwright/test';

test('Today → Review → edit → approve → guided publish', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'NestAffiliate trabalhou por você.' })).toBeVisible();

  await page.getByRole('link', { name: /Revisar 3 campanhas/i }).click();
  await expect(page.getByText('PIN PREVIEW')).toBeVisible();
  await expect(page.locator('.score-badge')).toBeVisible();

  const edit = page.getByPlaceholder(/Peça qualquer alteração/i);
  await edit.fill('Troque a headline para: Uma cozinha mais organizada');
  await edit.press('Enter');
  await expect(page.getByRole('heading',{name:'Veja antes de aplicar'})).toBeVisible();
  await expect(page.locator('.save-state')).toContainText('v1');
  await page.getByRole('button',{name:'Aplicar alteração'}).click();
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


test('scheduled publication returns to Today as an upcoming action', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /Revisar 3 campanhas/i }).click();
  await page.getByRole('button', { name: 'Aprovar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Seu Pin está pronto.' })).toBeVisible();

  await page.locator('input[type="datetime-local"]').fill('2030-01-01T10:00');
  await page.getByRole('button', { name: 'Agendar', exact: true }).click();
  await expect(page.getByText('Agendado', { exact: true })).toBeVisible();

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Próximas publicações' })).toBeVisible();
  await expect(page.getByText(/2030/)).toBeVisible();
});


test('Review can prepare a full Pinterest Creative Pack and blocks approval until the generated image is validated', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /Revisar 3 campanhas/i }).click();

  await expect(page.getByRole('heading', { name: 'Transforme este produto em um Pin completo.' })).toBeVisible();
  await page.getByRole('button', { name: 'Preparar Pin', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Seu Creative Pack está pronto.' })).toBeVisible();
  await expect(page.locator('.concept-card')).toHaveCount(3);
  await expect(page.getByText('PROMPT DE IMAGEM')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copiar para ChatGPT' })).toBeVisible();
  await expect(page.getByText('1000 × 1500', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Aprovar', exact: true }).click();
  await expect(page.getByText(/Importe e revise a imagem gerada antes de aprovar/i)).toBeVisible();
  await expect(page).toHaveURL(/\/review\//);
});


test('unsupported creative command is explicit and cannot alter the campaign', async ({page})=>{
  await page.goto('/');
  await page.getByRole('link',{name:/Revisar 3 campanhas/i}).click();
  const edit=page.getByPlaceholder(/Peça qualquer alteração/i);
  await edit.fill('Coloque um astronauta voando do lado da cadeira');
  await edit.press('Enter');
  await expect(page.getByRole('alert')).toContainText('Ainda não consigo executar');
  await expect(page.locator('.save-state')).toContainText('v1');
  await expect(page.getByText(/Ajuste solicitado:/i)).toHaveCount(0);
});
