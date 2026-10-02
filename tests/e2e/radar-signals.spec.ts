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
  let brokerCalls=0;
  await page.route('**/api/v1/nestaffiliate/mercadolivre/search**',async (route)=>{
    brokerCalls+=1;
    const url=new URL(route.request().url());
    const query=url.searchParams.get('q') || 'organizador cozinha pequena';
    const products=[
      product('MLB-A1','Organizador de Gavetas Ajustável',49.9,'https://http2.mlstatic.com/D_1.jpg'),
      product('MLB-B2','Prateleira Extensível para Armário',79.9,'https://http2.mlstatic.com/D_2.jpg'),
      product('MLB-C3','Kit de Potes Herméticos para Mantimentos',119.9,'https://http2.mlstatic.com/D_3.jpg'),
    ];
    await route.fulfill({
      status:200,
      contentType:'application/json',
      body:JSON.stringify({
        products,
        query,
        provider:'MELI',
        source:'mercadolivre-catalog-api',
        observedAt:'2026-10-02T20:10:00.000Z',
        meta:{catalogTotal:143,candidates:20,detailed:18,usable:3},
      }),
    });
  });

  await page.goto('/radar');

  await expect(page.getByText('Mercado Livre conectado',{exact:true})).toBeVisible();
  await expect(page.getByText(/Busca de catálogo e sinais de mercado atualizados automaticamente/)).toBeVisible();
  await expect(page.getByText('Sugestões que valem testar',{exact:true})).toBeVisible();
  await expect(page.locator('.suggestion-buttons button').first()).toBeVisible();

  await expect(page.getByText('JSON oficial do Mercado Livre',{exact:true})).toHaveCount(0);
  await expect(page.getByText('SINAIS OFICIAIS',{exact:true})).toHaveCount(0);

  await page.getByRole('button',{name:'Analisar produtos'}).click();

  await expect.poll(()=>brokerCalls).toBeGreaterThanOrEqual(1);
  await expect(page.locator('.opportunity-card')).toHaveCount(3,{timeout:10_000});
  await expect(page.getByText(/143 encontrados no catálogo/)).toBeVisible();
  await expect(page.getByRole('link',{name:'Organizador de Gavetas Ajustável'})).toBeVisible();
  await expect(page.getByRole('link',{name:'Prateleira Extensível para Armário'})).toBeVisible();

  await expect(page.getByText('ADICIONAR PRODUTO (OPCIONAL)',{exact:true})).toBeVisible();
});
