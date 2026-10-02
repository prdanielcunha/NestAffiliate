import { expect, test } from '@playwright/test';

test('Radar 2.0 imports official Mercado Livre signals without exposing credentials', async ({ page }) => {
  await page.goto('/radar');

  await expect(page.getByText('SINAIS OFICIAIS')).toBeVisible();

  const payload=[
    {keyword:'organizador cozinha',url:'https://lista.mercadolivre.com.br/organizador-cozinha'},
    {keyword:'prateleira cozinha',url:'https://lista.mercadolivre.com.br/prateleira-cozinha'},
  ];

  await page.getByLabel('JSON oficial do Mercado Livre').fill(JSON.stringify(payload));
  await page.getByRole('button',{name:'Importar sinais'}).click();

  await expect(page.getByText('2 sinais oficiais importados.')).toBeVisible();
  await expect(page.getByText('2 sinais oficiais')).toBeVisible();
  await expect(page.getByText(/Nunca cole access token/i)).toBeVisible();
});
