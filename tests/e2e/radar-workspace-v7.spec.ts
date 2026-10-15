import {test,expect} from '@playwright/test';

test('Radar research remembers explicit interests, search history and saved offers',async({page})=>{
 await page.goto('/radar');
 await page.locator('#radar7-preferred-category').selectOption('pet');
 await page.getByRole('textbox',{name:'Pesquisar produtos e necessidades'}).fill('organizador cozinha pequena');
 await page.getByRole('button',{name:'Mercado Livre',exact:true}).click();
 await page.getByRole('button',{name:'Pesquisar',exact:true}).click();
 await expect(page.locator('.opportunity-card')).toHaveCount(3,{timeout:15000});
 const save=page.getByRole('button',{name:'Salvar para depois'}).first();
 await save.click();
 await expect(page.getByRole('button',{name:'✓ Salvo para depois'})).toHaveCount(1);
 await page.locator('.radar7-library > summary').click();
 await expect(page.getByText('Produtos salvos para depois')).toBeVisible();
 await page.reload();
 await expect(page.locator('#radar7-preferred-category')).toHaveValue('pet');
 await page.locator('.radar7-library > summary').click();
 await expect(page.getByRole('button',{name:'Pesquisar novamente'})).toBeVisible();
 await expect(page.getByText('Pesquisas salvas são registros históricos.',{exact:false})).toBeVisible();
 await expect(page.getByRole('button',{name:'Exportar backup JSON'})).toBeVisible();
 await expect(page.getByText('Dados antigos ou desconhecidos — confira o anúncio original')).toBeVisible();
});

test('Radar allows controlled side-by-side comparison and sorting',async({page})=>{
 await page.goto('/radar');
 await page.getByRole('button',{name:'Mercado Livre',exact:true}).click();
 await page.getByRole('textbox',{name:'Pesquisar produtos e necessidades'}).fill('organizador cozinha pequena');
 await page.getByRole('button',{name:'Pesquisar',exact:true}).click();
 await expect(page.locator('.opportunity-card')).toHaveCount(3,{timeout:15000});
 const bar=page.getByRole('region',{name:'Ferramentas para comparar produtos'});
 await bar.getByLabel('Ordenar por').selectOption('priceAsc');
 const checks=page.locator('.radar7-compare-option input');
 await checks.nth(0).check();
 await checks.nth(1).check();
 await expect(bar.getByRole('heading',{name:'Sua comparação (2/3)'})).toBeVisible();
 await expect(bar.locator('table')).toContainText('Preço');
 await expect(bar.getByText('Não estimamos preço, vendas ou comissão')).toBeVisible();
 await expect(bar.getByText('Equivalência não verificada')).toBeVisible();
 await expect(bar.getByText('Rever preço e disponibilidade').first()).toBeVisible();
 await bar.getByRole('button',{name:'Limpar seleção'}).click();
 await expect(bar.locator('table')).toHaveCount(0);
});

test('Private cloud sync remains opt-in and exposes a way to remove remote research',async({page})=>{
 await page.goto('/radar');
 const library=page.locator('.radar7-library');
 await library.locator('summary').first().click();
 const toggle=library.getByRole('checkbox',{name:'Ativar sincronização privada'});
 await expect(toggle).not.toBeChecked();
 await expect(library.getByText('Somente sua conta acessa a cópia privada.')).toBeVisible();
 // No remote requests should be needed for the default locally stored research flow.
 await expect(library.getByRole('button',{name:'Sincronizar agora'})).toHaveCount(0);
});

test('Radar safely restores a local backup without enabling cloud sync',async({page})=>{
 await page.goto('/radar');
 await page.locator('.radar7-library > summary').click();
 page.on('dialog',dialog=>void dialog.accept());
 const now=new Date().toISOString();
 const backup={
  version:1,recentSearches:['cadeira ergonomica'],
  saved:[{id:'MELI:MLB-99',marketplace:'MELI',title:'Cadeira home office',
   keyword:'cadeira ergonomica',url:'https://www.mercadolivre.com.br/p/MLB-99',
   price:199,currency:'BRL',observedAt:now,savedAt:now}],
  preferredCategory:'home',
 };
 await page.getByLabel('Restaurar pesquisas JSON').setInputFiles({
  name:'research.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup)),
 });
 await expect(page.getByRole('heading',{name:'Produtos salvos para depois'})).toBeVisible();
 await expect(page.getByRole('button',{name:'cadeira ergonomica ↗'})).toBeVisible();
 await expect(page.getByRole('checkbox',{name:'Ativar sincronização privada'})).not.toBeChecked();
});
