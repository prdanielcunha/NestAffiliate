import {test,expect} from '@playwright/test';

test('Radar problem research displays clear running and success states',async({page})=>{
 await page.goto('/radar?meliApi=slow');
 await page.getByRole('button',{name:'Mercado Livre',exact:true}).click();
 const explorer=page.getByRole('region',{name:'Encontrar oportunidades por problemas'});
 await explorer.getByRole('button',{name:/Armários de cozinha sem espaço/}).click();
 await explorer.getByRole('button',{name:/Pesquisar produtos para isso/}).click();
 await expect(explorer.getByRole('button',{name:/Pesquisando ofertas/})).toBeDisabled();
 await expect(explorer.getByRole('status')).toContainText('Consultando ofertas oficiais');
 await expect(explorer.getByRole('status')).toContainText('Pesquisa concluída');
 await expect(explorer.getByRole('status')).toContainText('3 produto');
});

test('Mercado Livre 403 shows true provider diagnosis and assisted listing fallback',async({page})=>{
 await page.goto('/radar?meliApi=restricted');
 await page.getByRole('button',{name:'Mercado Livre',exact:true}).click();
 const explorer=page.getByRole('region',{name:'Encontrar oportunidades por problemas'});
 await explorer.getByRole('button',{name:/Armários de cozinha sem espaço/}).click();
 await explorer.getByRole('button',{name:/Pesquisar produtos para isso/}).click();
 await expect(explorer.getByRole('alert')).toContainText('Não foi possível concluir');
 await expect(page.getByText(/O Mercado Livre bloqueou a pesquisa oficial \(403\)/)).toBeVisible();
 const backup=page.getByRole('region',{name:'Pesquisa alternativa Mercado Livre'});
 await expect(backup).toBeVisible();
 await expect(backup.getByRole('link',{name:/Pesquisar no site do Mercado Livre/})).toHaveAttribute('href',/lista.mercadolivre.com.br/);
 await expect(backup.getByText('ADICIONAR PRODUTO (OPCIONAL)')).toBeVisible();
});

test('Unavailable marketplace photo has a genuine source link and no broken-image icon',async({page})=>{
 await page.route('https://cf.shopee.com.br/**',route=>route.abort());
 await page.goto('/radar');
 await page.getByRole('button',{name:'Shopee',exact:true}).click();
 await page.getByRole('button',{name:'Buscar produtos Shopee'}).click();
 const first=page.locator('.radar2-card').first();
 await expect(first).toBeVisible();
 await expect(first.getByText('Imagem indisponível na fonte')).toBeVisible();
 await expect(first.getByRole('link',{name:/Ver foto no anúncio/})).toHaveAttribute('href',/^https:\/\/shopee.com.br\//);
 await expect(first.locator('img')).toHaveCount(0);
});

test('All-marketplace research distinguishes partial from complete success',async({page})=>{
 await page.goto('/radar?meliApi=restricted');
 const explorer=page.getByRole('region',{name:'Encontrar oportunidades por problemas'});
 await explorer.getByRole('button',{name:/Armários de cozinha sem espaço/}).click();
 await explorer.getByRole('button',{name:/Pesquisar produtos para isso/}).click();
 await expect(explorer.getByRole('status')).toContainText('Pesquisa parcial');
 await expect(page.getByText(/Fonte temporariamente limitada/)).toBeVisible();
});
