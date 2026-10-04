import { expect, test } from '@playwright/test';

test('Radar shows automatic market status, useful suggestions and real product cards', async ({ page }) => {
  await page.goto('/radar');

  await expect(page.getByText('Mercado Livre conectado',{exact:true})).toBeVisible();
  await expect(page.getByText(/Busca de catálogo e sinais de mercado atualizados automaticamente/)).toBeVisible();
  await expect(page.getByText('Sugestões que valem testar',{exact:true})).toBeVisible();
  await expect(page.locator('.suggestion-buttons button').first()).toBeVisible();

  await expect(page.getByText('JSON oficial do Mercado Livre',{exact:true})).toHaveCount(0);
  await expect(page.getByText('SINAIS OFICIAIS',{exact:true})).toHaveCount(0);

  await page.getByRole('button',{name:'Mercado Livre',exact:true}).click();
  await page.getByRole('button',{name:'Analisar produtos'}).click();

  await expect(page.locator('.opportunity-card')).toHaveCount(3,{timeout:10_000});
  await expect(page.getByText('Análise concluída',{exact:true})).toBeVisible();
  await expect(page.getByText(/passaram pela validação de estoque e prova social/)).toBeVisible();
  await expect(page.locator('.proof-chip.success').first()).toContainText('Disponível agora');
  await expect(page.getByText(/143 encontrados no catálogo/)).toBeVisible();
  await expect(page.getByRole('link',{name:'Organizador de Gavetas Ajustável'})).toBeVisible();
  await expect(page.getByRole('link',{name:'Prateleira Extensível para Armário'})).toBeVisible();

  await expect(page.getByText('ADICIONAR PRODUTO (OPCIONAL)',{exact:true})).toBeVisible();

  await page.getByRole('button',{name:'Shopee',exact:true}).click();
  await expect(page).toHaveURL(/\/radar$/);
  await page.getByRole('button',{name:'Buscar produtos Shopee',exact:true}).click();

  await expect(page.locator('.opportunity-card')).toHaveCount(3,{timeout:10_000});
  await expect(page.getByRole('link',{name:'Organizador Giratório Multiuso Shopee'})).toBeVisible();
  await expect(page.getByRole('link',{name:'Prateleira Extensível para Cozinha Shopee'})).toBeVisible();
  await expect(page.getByText('Link afiliado oficial pronto').first()).toBeVisible();
  await expect(page.getByText(/Comissão 12%/).first()).toBeVisible();
  await expect(page.locator('.search-source')).toContainText('Shopee Affiliate Open API');
  await expect(page.getByRole('button',{name:'Abrir catálogo Shopee',exact:true})).toHaveCount(0);
  await expect(page).toHaveURL(/\/radar$/);
});


test('Radar keeps Shopee usable while Open API credentials are pending', async ({ page }) => {
  await page.goto('/radar?shopeeApi=pending');

  await page.getByRole('button',{name:'Shopee',exact:true}).click();

  await expect(page.getByText('Use a Shopee agora — sem esperar a API',{exact:true})).toBeVisible();
  await expect(page.getByText('MODO RÁPIDO ATIVO',{exact:true}).first()).toBeVisible();
  await expect(page.getByRole('button',{name:'Continuar sem API',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Pesquisar na Shopee ↗',exact:true})).toBeVisible();
  await expect(page.getByText('Cole um produto da Shopee',{exact:true})).toBeVisible();
  await expect(page.locator('.opportunity-card')).toHaveCount(0);

  const shared=[
    'Organizador Giratório Multiuso',
    'R$ 59,90',
    'https://shopee.com.br/Organizador-Giratorio-Multiuso-i.12345.987654321',
  ].join('\n');
  await page.getByLabel('Cole aqui o produto da Shopee').fill(shared);
  await expect(page.getByDisplayValue('Organizador Giratório Multiuso')).toBeVisible();
  await expect(page.getByDisplayValue('59,90')).toBeVisible();

  await page.getByRole('button',{name:'Analisar e criar oportunidade',exact:true}).click();
  await expect(page).toHaveURL(/\/review\/campaign-/);
  await expect(page.getByText('Organizador Giratório Multiuso',{exact:true}).first()).toBeVisible();
});
