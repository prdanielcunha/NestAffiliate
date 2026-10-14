import { expect, test } from '@playwright/test';

async function submitSearch(page:import('@playwright/test').Page){
  const input=page.getByRole('textbox',{name:'Pesquisar produtos e necessidades'});
  await input.fill('organizador cozinha pequena');
  await page.getByRole('button',{name:'Pesquisar',exact:true}).click();
}

test('Radar 6 discovers marketplace products before asking for an affiliate link', async ({ page }) => {
  await page.goto('/radar');
  await expect(page.getByRole('heading',{name:'Encontre boas oportunidades para divulgar'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Explore ideias'})).toBeVisible();
  await expect(page.getByRole('textbox',{name:'Pesquisar produtos e necessidades'})).toBeVisible();
  await expect(page.getByRole('region',{name:'Importação inteligente'})).toHaveCount(0);
  await expect(page.locator('.radar6-suggestion')).toHaveCount(6);
  await page.getByRole('button',{name:'Mercado Livre',exact:true}).click();
  await submitSearch(page);
  await expect(page.locator('.opportunity-card')).toHaveCount(3,{timeout:15000});
  await expect(page.getByText('Análise concluída',{exact:true})).toBeVisible();
  await expect(page.getByRole('link',{name:'Organizador de Gavetas Ajustável'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Preparar meu Pin →'}).first()).toBeVisible();
  await expect(page.getByText('Filtros e detalhes da pesquisa')).toBeVisible();
  await expect(page.locator('.radar6-card-details').first()).not.toHaveAttribute('open');
  await page.getByRole('button',{name:'Shopee',exact:true}).click();
  await submitSearch(page);
  await expect(page.locator('.opportunity-card')).toHaveCount(3,{timeout:15000});
  await expect(page.getByRole('link',{name:'Organizador Giratório Multiuso Shopee'})).toBeVisible();
  await expect(page.locator('.search-source')).toContainText('Shopee Affiliate Open API');
});

test('Importing by link remains available on demand without dominating the Radar',async({page})=>{
  await page.goto('/radar');
  await page.getByRole('button',{name:/Adicionar por link ou print/}).click();
  await expect(page.getByRole('region',{name:'Importação inteligente'})).toBeVisible();
});

test('Radar keeps Shopee usable while Open API credentials are pending', async ({ page }) => {
  await page.goto('/radar?shopeeApi=pending');
  await page.getByRole('button',{name:'Shopee',exact:true}).click();
  await expect(page.getByText('Use a Shopee agora — sem esperar a API',{exact:true})).toBeVisible();
  await expect(page.getByText('Cole um produto da Shopee',{exact:true})).toBeVisible();
  const shared=['Organizador Giratório Multiuso','R$ 59,90','https://shopee.com.br/Organizador-Giratorio-Multiuso-i.12345.987654321'].join('\n');
  await page.getByLabel('Cole aqui o produto da Shopee').fill(shared);
  await page.getByRole('button',{name:'Analisar e criar oportunidade',exact:true}).click();
  await expect(page).toHaveURL(/\/review\/campaign-/);
});

test('Radar gives Shopee-specific recovery when the API is unavailable',async({page})=>{
  await page.goto('/radar?shopeeApi=error');
  await page.getByRole('button',{name:'Shopee',exact:true}).click();
  await submitSearch(page);
  await expect(page.getByText('Shopee temporariamente em modo rápido',{exact:true})).toBeVisible();
  await expect(page.getByText('Cole um produto da Shopee',{exact:true})).toBeVisible();
});
