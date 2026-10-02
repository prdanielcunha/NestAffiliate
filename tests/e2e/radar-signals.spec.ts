import { expect, test } from '@playwright/test';

function product(id:string,title:string,price:number,image:string){
  const observedAt='2026-10-02T20:10:00.000Z';
  return {
    productId:`meli:${id}`,
    organizationId:'demo-org',
    marketplace:'MELI',
    externalId:id,
    title:{value:title,source:'mercadolivre-catalog-api',observedAt},
    url:{value:`https://www.mercadolivre.com.br/p/${id}`,source:'mercadolivre-catalog-api',observedAt},
    price:{value:price,source:'mercadolivre-buy-box',observedAt},
    currency:{value:'BRL',source:'mercadolivre-buy-box',observedAt},
    availability:{value:'available',source:'mercadolivre-catalog-api',observedAt},
    imageUrl:{value:image,source:'mercadolivre-catalog-api',observedAt},
    assetRights:'UNKNOWN',
  };
}

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
  await expect(page.getByText(/143 encontrados no catálogo/)).toBeVisible();
  await expect(page.getByRole('link',{name:'Organizador de Gavetas Ajustável'})).toBeVisible();
  await expect(page.getByRole('link',{name:'Prateleira Extensível para Armário'})).toBeVisible();

  await expect(page.getByText('ADICIONAR PRODUTO (OPCIONAL)',{exact:true})).toBeVisible();
});
