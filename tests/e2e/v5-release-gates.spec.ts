import AxeBuilder from '@axe-core/playwright';
import {test,expect} from '@playwright/test';

test('V5 core routes fit 360–1440px without horizontal overflow',async({page})=>{
 for(const width of [360,390,768,1024,1440]){
  await page.setViewportSize({width,height:850});
  for(const url of ['/radar','/library','/boards','/results']){
   await page.goto(url);
   await expect(page.locator('.page').first()).toBeVisible();
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
   if(overflow>1){
    const offenders=await page.locator('*').evaluateAll(elements=>elements
      .map(el=>({element:el.tagName,cls:String(el.className).slice(0,70),right:Math.round(el.getBoundingClientRect().right),scroll:el.scrollWidth,width:el.clientWidth}))
      .filter(item=>item.right>document.documentElement.clientWidth+1).sort((a,b)=>b.right-a.right).slice(0,10));
    console.error('V5_LAYOUT_OVERFLOW',JSON.stringify({url,width,overflow,offenders}));
   }
   expect(overflow, `${url} overflows by ${overflow}px at ${width}px`).toBeLessThanOrEqual(1);
  }
 }
});

test('V5 new commercial flow pages remain keyboard/AA accessible',async({page})=>{
 for(const url of ['/radar','/library','/boards']){
  await page.goto(url);
  const report=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  const serious=report.violations.filter(v=>['serious','critical'].includes(v.impact??''));
  expect(serious.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})),url).toEqual([]);
 }
});

test('V5 library and intent explorer keep PT/EN/ES labels without lost workflows',async({page})=>{
 for(const locale of ['pt-BR','en','es']){
  await page.goto('/radar');
  await page.getByRole('combobox',{name:'Language'}).selectOption(locale);
  await expect(page.locator('.intent-explorer')).toBeVisible();
  await page.goto('/library');
  await expect(page.locator('.library-controls input')).toBeVisible();
  await expect(page.locator('.library-results')).toBeVisible();
 }
});
