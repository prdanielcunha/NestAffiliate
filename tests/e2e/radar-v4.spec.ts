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
  test('evidence-first cards hide legacy scoring behind explanation',async({page})=>{
    await page.goto('/radar');
    await page.getByRole('button',{name:'Mercado Livre',exact:true}).click();
    await page.getByRole('button',{name:'Analisar produtos'}).click();
    const card=page.locator('.opportunity-card').first();
    await expect(card.locator('.radar-score-v4')).toContainText(/\d+–\d+/);
    await expect(card.locator('.legacy-radar-score')).toContainText('Nota histórica');
    await expect(card.locator('.product-proof-row')).not.toContainText('Vendas verificadas');
  });
  test('V4 Today diagnostics work across PT/EN/ES at narrow mobile width',async({page})=>{
    await page.setViewportSize({width:360,height:800});
    await page.goto('/');
    const panel=page.locator('.today-research-section');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('O que a última pesquisa realmente encontrou');
    const selector=page.getByRole('combobox',{name:'Language'});
    await selector.selectOption('en');
    await expect(panel).toContainText('What the last research actually found');
    await selector.selectOption('es');
    await expect(panel).toContainText('Lo que encontró la última investigación');
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
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
