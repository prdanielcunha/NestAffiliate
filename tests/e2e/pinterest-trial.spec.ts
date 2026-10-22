import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('Pinterest Trial setup preserves individual consent, private secret and mobile layout',async({page})=>{
  await page.route('**/api/v1/nestaffiliate/pinterest/**',async route=>{
    const path=new URL(route.request().url()).pathname;
    if(path.endsWith('/status'))return route.fulfill({json:{appId:'1625057',accessTier:'TRIAL',environment:'SANDBOX',
      configured:true,connected:true,canConfigure:false,publicPublishing:false}});
    if(path.endsWith('/sandbox/boards')&&route.request().method()==='POST'){
      expect(route.request().postDataJSON()).toMatchObject({organizationId:'demo-org',consent:true,name:'NestAffiliate Sandbox'});
      return route.fulfill({json:{id:'123',name:'NestAffiliate Sandbox',environment:'SANDBOX'}});
    }
    return route.fulfill({json:{items:[],bookmark:null}});
  });
  await page.goto('/connections');
  const panel=page.getByRole('region',{name:'Pinterest Trial Sandbox'});
  await expect(panel.getByRole('heading',{name:'Conectar e testar o Pinterest'})).toBeVisible();
  await expect(panel.getByText('Conexão autorizada · ambiente Sandbox')).toBeVisible();
  await expect(panel.locator('input[type="password"]')).toHaveCount(0);
  const create=panel.getByRole('button',{name:'Criar pasta Sandbox',exact:true});
  await expect(create).toBeDisabled();
  await panel.getByLabel('Quero criar esta pasta no Sandbox.').check();
  await create.click();
  await expect(panel.getByRole('status')).toContainText('Pasta criada no Sandbox');
  await expect(panel.getByLabel('Pasta Sandbox',{exact:true})).toHaveValue('123');
  await expect(panel.getByRole('button',{name:'Criar somente este Pin no Sandbox'})).toBeDisabled();
  await expect(panel.getByLabel('Quero criar esta pasta no Sandbox.')).not.toBeChecked();
  const result=await new AxeBuilder({page}).include('.pinterest-setup').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(result.violations.filter(x=>x.impact==='critical'||x.impact==='serious')).toEqual([]);
  const sizes=await panel.evaluate(el=>({width:el.getBoundingClientRect().width,scroll:el.scrollWidth}));
  expect(sizes.scroll).toBeLessThanOrEqual(sizes.width+1);
});

test('a forged OAuth callback never reaches the token broker and strips history',async({page})=>{
  let exchanges=0;
  await page.route('**/api/v1/nestaffiliate/pinterest/oauth/complete',async route=>{
    exchanges++;await route.fulfill({status:400,json:{error:'PINTEREST_STATE_INVALID'}});
  });
  await page.goto('/integrations/pinterest/callback?code=synthetic-code&state=forged');
  await expect(page.getByRole('heading',{name:'A conexão não foi concluída.'})).toBeVisible();
  expect(page.url()).not.toContain('code=');
  expect(page.url()).not.toContain('state=');
  expect(exchanges).toBe(0);
});
