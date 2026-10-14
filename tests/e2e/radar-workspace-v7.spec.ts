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
 await expect(page.getByText('Salvos apenas neste dispositivo.',{exact:false})).toBeVisible();
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
 await bar.getByRole('button',{name:'Limpar seleção'}).click();
 await expect(bar.locator('table')).toHaveCount(0);
});
