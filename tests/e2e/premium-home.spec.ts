import { test, expect } from '@playwright/test';

test.describe('Premium Home — evidence-first UX',()=>{
  test.skip(process.env.VITE_REVENUE_RADAR_3_ENABLED!=='true','Premium Home requires Revenue 3 flag');

  test('keeps the next action and real campaign counts visible',async({page})=>{
    await page.goto('/');
    const hero=page.locator('.home-hero');
    await expect(hero).toBeVisible();
    await expect(hero.getByRole('heading',{level:1})).toContainText('Encontre a oportunidade.');
    await expect(hero.locator('.home-hero-metrics>div')).toHaveCount(3);
    await expect(hero.getByRole('link',{name:/Explorar oportunidades/i})).toBeVisible();
    await expect(hero.locator('.next-action-panel')).toBeVisible();
    await expect(page.locator('.home-flow-step')).toHaveCount(4);
    await expect(page.getByRole('link',{name:/Minhas campanhas/i})).toBeVisible();
  });

  test('shows evidence and agent activity on demand',async({page})=>{
    await page.goto('/');
    const research=page.locator('.home-research-disclosure');
    await expect(research).toBeVisible();
    await expect(research).not.toHaveAttribute('open','');
    await research.locator('summary').click();
    await expect(research).toHaveAttribute('open','');
    const agent=page.locator('.home-operation-disclosure');
    await agent.locator('summary').click();
    await expect(agent).toHaveAttribute('open','');
  });

  test('premium page and bottom navigation fit narrow screens',async({page})=>{
    await page.setViewportSize({width:360,height:780});
    await page.goto('/');
    await expect(page.locator('.home-hero')).toBeVisible();
    const size=await page.evaluate(()=>({
      scroll:document.documentElement.scrollWidth,
      client:document.documentElement.clientWidth,
    }));
    expect(size.scroll).toBeLessThanOrEqual(size.client+1);
    await expect(page.locator('.bottom-nav a')).toHaveCount(4);
  });
});
