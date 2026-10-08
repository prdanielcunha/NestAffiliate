import {test,expect} from '@playwright/test';

test.describe('Radar 4.0 opt-in design and gates',()=>{
  test.skip(process.env.VITE_RADAR_V4_DISCOVERY_ENABLED!=='true','V4-specific tests require explicit opt-in flags.');
  test('search exposes honest evidence, recoverable statuses and real source links',async({page})=>{
    await page.goto('/radar');
    await page.getByRole('button',{name:'Mercado Livre',exact:true}).click();
    await page.getByRole('button',{name:'Analisar produtos'}).click();
    await expect(page.locator('.v4-funnel')).toBeVisible();
    await expect(page.locator('.v4-funnel')).toContainText('RADAR 4.0');
    await expect(page.locator('.opportunity-v4-panel')).toHaveCount(3);
    await expect(page.locator('.opportunity-v4-panel').first()).toContainText('Potencial editorial');
    await expect(page.locator('.opportunity-card').first().getByRole('link',{name:'Abrir anúncio original'})).toHaveAttribute('href',/^https:\/\/www\.mercadolivre\.com\.br\//);
    await page.getByRole('button',{name:'Quase prontas',exact:true}).click();
    await expect(page.locator('.v4-filter-options button.active')).toContainText('Quase prontas');
    await page.getByRole('button',{name:'Todas',exact:true}).click();
    await expect(page.locator('.opportunity-v4-panel')).toHaveCount(3);
  });
  test('research draft is editable but never labeled publication-ready without proof',async({page})=>{
    await page.goto('/radar');
    await page.getByRole('button',{name:'Mercado Livre',exact:true}).click();
    await page.getByRole('button',{name:'Analisar produtos'}).click();
    await page.getByRole('button',{name:'Criar rascunho de pesquisa'}).first().click();
    await expect(page).toHaveURL(/\/review\/campaign-/);
    await expect(page.getByRole('link',{name:'Abrir anúncio original'})).toBeVisible();
    await expect(page.getByText('RIGHTS UNKNOWN')).toBeVisible();
  });
});
