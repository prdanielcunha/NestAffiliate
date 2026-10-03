import { expect, test } from '@playwright/test';

test('Radar shows automatic market status, useful suggestions and real product cards', async ({ page }) => {
  await page.goto('/radar');

  await expect(page.getByText('Mercado Livre conectado',{exact:true})).toBeVisible();
  await expect(page.getByText(/Busca de catálogo e sinais de mercado atualizados automaticamente/)).toBeVisible();
  await expect(page.getByText('Sugestões que valem testar',{exact:true})).toBeVisible();
  await expect(page.locator('.suggestion-buttons button').first()).toBeVisible();

  await expect(page.getByText('JSON oficial do Mercado Livre',{exact:true})).toHaveCount(0);
  await expect(page.getByText('SINAIS OFICIAIS',{exact:true})).toHaveCount(0);

  await page.getByRole('button',{name:'Analisar produtos'}).click();

  await expect(page.locator('.opportunity-card')).toHaveCount(3,{timeout:10_000});
  await expect(page.getByText('Análise concluída',{exact:true})).toBeVisible();
  await expect(page.getByText(/passaram pela validação de estoque e prova social/)).toBeVisible();
  await expect(page.locator('.proof-chip.success').first()).toContainText('Disponível agora');
  await expect(page.getByText(/143 encontrados no catálogo/)).toBeVisible();
  await expect(page.getByRole('link',{name:'Organizador de Gavetas Ajustável'})).toBeVisible();
  await expect(page.getByRole('link',{name:'Prateleira Extensível para Armário'})).toBeVisible();

  await expect(page.getByText('ADICIONAR PRODUTO (OPCIONAL)',{exact:true})).toBeVisible();

  await expect(page.getByText('Shopee vinculada ao Pinterest',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Shopee',exact:true}).click();
  await expect(page.getByText('Pesquisa oficial Shopee',{exact:true})).toBeVisible();
  await expect(page.getByRole('region',{name:'Pesquisa oficial Shopee'}).getByRole('button',{name:'Abrir catálogo Shopee',exact:true})).toBeVisible();
});
