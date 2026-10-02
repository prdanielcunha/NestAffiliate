import { expect, test } from '@playwright/test';

test('Radar keeps official Mercado Livre signals automatic and user-facing', async ({ page }) => {
  await page.goto('/radar');

  await expect(page.getByText('Mercado Livre conectado',{exact:true})).toBeVisible();
  await expect(page.getByText('Sugestões que valem testar',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'organizador de gavetas para cozinha'})).toBeVisible();

  await expect(page.getByText('JSON oficial do Mercado Livre',{exact:true})).toHaveCount(0);
  await expect(page.getByText('SINAIS OFICIAIS',{exact:true})).toHaveCount(0);

  await expect(page.getByText('ADICIONAR PRODUTO (OPCIONAL)',{exact:true})).toBeVisible();
});
