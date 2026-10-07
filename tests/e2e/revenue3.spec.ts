import {test,expect} from '@playwright/test';

test.describe('Revenue 3 feature flags',()=>{
  test.skip(process.env.VITE_REVENUE_RADAR_3_ENABLED!=='true','Revenue 3 suite only runs in opt-in builds.');
  test('Revenue 3: next best action and revenue statement UI',async({page})=>{
    await page.goto('/');
    await expect(page.getByRole('heading',{name:'NestAffiliate trabalhou por você.'})).toBeVisible();
    await expect(page.locator('.next-action-panel')).toBeVisible({timeout:10000});
    await page.goto('/results');
    await expect(page.getByText('Comissões informadas pelo programa')).toBeVisible();
    await expect(page.getByText('Aprovadas (informadas)')).toBeVisible();
    await expect(page.getByText('Sem exportações importadas ainda.')).toBeVisible();
  });

  test('Revenue 3: marketplace evidence and filters',async({page})=>{
    await page.goto('/radar');
    await expect(page.locator('.r3-filters')).toBeVisible();
    const onlyVerified=page.getByLabel('Só ofertas validadas');
    await onlyVerified.check();
    await expect(onlyVerified).toBeChecked();
    await onlyVerified.uncheck();
    await expect(onlyVerified).not.toBeChecked();
    await page.getByRole('button',{name:'Mercado Livre',exact:true}).click();
    await page.getByRole('button',{name:'Analisar produtos'}).click();
    await expect(page.locator('.opportunity-card').first()).toBeVisible({timeout:15000});
    await expect(page.locator('.opportunity-card .revenue-assessment').first()).toBeVisible();
    await expect(page.locator('.revenue-assessment').first()).toContainText('Trilha comercial');
  });
});
