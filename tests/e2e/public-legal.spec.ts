import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const route of ['/privacy','/terms','/data-deletion']) {
  test(route+' is public, complete and accessible without auth', async ({ page }) => {
    await page.goto(route);
    await expect(page.locator('.legal-document h1')).toBeVisible();
    await expect(page.getByText('MILLIONSNEST · NESTAFFILIATE')).toBeVisible();
    await expect(page.getByRole('link', { name: 'nestaffiliate@millionsnest.com' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'EN', exact: true })).toBeVisible();

    const result=await new AxeBuilder({page})
      .withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa'])
      .analyze();
    const serious=result.violations.filter((violation)=>violation.impact==='critical'||violation.impact==='serious');
    expect(serious).toEqual([]);
  });
}

test('privacy page changes language without requiring login',async({page})=>{
  await page.goto('/privacy');
  await page.getByRole('button',{name:'EN',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Privacy Policy'})).toBeVisible();
  await page.getByRole('button',{name:'ES',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Política de Privacidad'})).toBeVisible();
});
