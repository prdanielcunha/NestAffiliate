import {test,expect} from '@playwright/test';

async function searchProblem(page: import('@playwright/test').Page) {
  const discovery=page.getByRole('region',{name:'Pesquisar oportunidades'});
  await discovery.getByRole('button',{name:'Resolver problemas'}).click();
  await discovery.getByRole('button',{name:/Armários de cozinha sem espaço/}).click();
}

test('Radar 6 research starts from a real-life problem and explains its results',async({page})=>{
  await page.goto('/radar?meliApi=slow');
  await page.getByRole('button',{name:'Mercado Livre',exact:true}).click();
  await searchProblem(page);
  await expect(page.locator('.opportunity-card')).toHaveCount(3,{timeout:15000});
  await expect(page.getByText('Análise concluída',{exact:true})).toBeVisible();
});

test('Mercado Livre 403 gives a useful assisted search fallback',async({page})=>{
  await page.goto('/radar?meliApi=restricted');
  await page.getByRole('button',{name:'Mercado Livre',exact:true}).click();
  await searchProblem(page);
  await expect(page.getByText(/O Mercado Livre bloqueou a pesquisa oficial \(403\)/)).toBeVisible();
  const backup=page.getByRole('region',{name:'Pesquisa alternativa Mercado Livre'});
  await expect(backup).toBeVisible();
  await expect(backup.getByRole('link',{name:/Pesquisar no site do Mercado Livre/})).toHaveAttribute('href',/lista.mercadolivre.com.br/);
});

test('Unavailable marketplace photo has a genuine source link and no broken-image icon',async({page})=>{
  await page.route('https://cf.shopee.com.br/**',route=>route.abort());
  await page.goto('/radar');
  await page.getByRole('button',{name:'Shopee',exact:true}).click();
  await page.getByRole('textbox',{name:'Pesquisar produtos e necessidades'}).fill('organizador cozinha pequena');
  await page.getByRole('button',{name:'Pesquisar',exact:true}).click();
  const first=page.locator('.radar2-card').first();
  await expect(first).toBeVisible();
  await expect(first.getByText('Imagem indisponível na fonte')).toBeVisible();
  await expect(first.getByRole('link',{name:/Ver foto no anúncio/})).toHaveAttribute('href',/^https:\/\/shopee.com.br\//);
  await expect(first.locator('img')).toHaveCount(0);
});

test('Partial marketplace research keeps valid results without inventing missing data',async({page})=>{
  await page.goto('/radar?meliApi=restricted');
  await searchProblem(page);
  await expect(page.locator('.opportunity-card').first()).toBeVisible({timeout:15000});
  await expect(page.getByText(/Fonte temporariamente limitada/)).toBeVisible();
});
