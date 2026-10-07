import {test,expect} from '@playwright/test';

test.describe('Revenue 3 feature flags',()=>{
  test('Revenue 3: next best action and truthful revenue metrics',async({page})=>{
    await page.goto('/');
    await expect(page.getByLabel('SUA MELHOR PRÓXIMA AÇÃO')).toBeVisible();
    await expect(page.getByText('Comissão ainda não confirmada.').first()).toBeVisible();
    await page.goto('/results');
    await expect(page.getByText('Comissões informadas pelo programa')).toBeVisible();
    await expect(page.getByText('Aprovadas (informadas)')).toBeVisible();
  });
  test('Revenue 3: offers have separate evidence and functional filters',async({page})=>{
    await page.goto('/radar');
    await page.getByRole('button',{name:'Mercado Livre',exact:true}).click();
    await page.getByRole('button',{name:'Analisar produtos'}).click();
    await expect(page.getByText('Trilha comercial').first()).toBeVisible({timeout:12000});
    await expect(page.getByText('Quantidade de ofertas não é volume de buscas.').first()).not.toBeVisible();
    await page.getByLabel('Só ofertas validadas').check();
    await expect(page.getByLabel('Só ofertas validadas')).toBeChecked();
    await page.getByLabel('Só ofertas validadas').uncheck();
    await expect(page.locator('.opportunity-card').first()).toBeVisible();
  });
});
