import {test,expect} from '@playwright/test';

test.describe('Revenue 3 feature flags',()=>{
  test.skip(process.env.VITE_REVENUE_RADAR_3_ENABLED!=='true','Revenue 3 suite only runs in opt-in builds.');
  test('Revenue 3: next best action and revenue statement UI',async({page})=>{
    await page.goto('/');
    await expect(page.getByRole('heading',{name:/Encontre a oportunidade.*Crie com confiança/i})).toBeVisible();
    await expect(page.locator('.next-action-panel')).toBeVisible({timeout:10000});
    await page.goto('/results');
    await expect(page.getByText('Comissões informadas pelo programa')).toBeVisible();
    await expect(page.getByText('Aprovadas (informadas)')).toBeVisible();
    await expect(page.getByText('Sem exportações importadas ainda.')).toBeVisible();
  });

  test('Revenue 3: marketplace evidence and progressive filters',async({page})=>{
    await page.goto('/radar');
    await page.getByRole('button',{name:'Mercado Livre',exact:true}).click();
    await page.getByRole('textbox',{name:'Pesquisar produtos e necessidades'}).fill('organizador cozinha pequena');
    await page.getByRole('button',{name:'Pesquisar',exact:true}).click();
    await expect(page.locator('.opportunity-card').first()).toBeVisible({timeout:15000});
    await page.locator('.radar6-research-tools > summary').click();
    const onlyVerified=page.getByLabel('Só ofertas validadas');
    await expect(onlyVerified).toBeVisible();
    await onlyVerified.check();
    await expect(onlyVerified).toBeChecked();
    await onlyVerified.uncheck();
    await page.locator('.radar6-card-details > summary').first().click();
    await expect(page.locator('.opportunity-card .revenue-assessment').first()).toBeVisible();
    await expect(page.locator('.revenue-assessment').first()).toContainText('Trilha comercial');
  });

});
