import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('public product overview is accessible without any auth provider or session',async({page})=>{
  await page.goto('/about');
  await expect(page.getByRole('heading',{level:1,name:/Da pesquisa de produtos à criação de Pins/})).toBeVisible();
  await expect(page.getByRole('heading',{name:'O que o NestAffiliate oferece'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Como funciona'})).toBeVisible();
  await expect(page.getByRole('link',{name:'Política de privacidade'}).first()).toHaveAttribute('href','/privacy');
  await expect(page.getByRole('link',{name:'Entrar no aplicativo'})).toHaveAttribute('href','/login');
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  await expect(page.getByText('Um produto do ecossistema MillionsNest.')).toBeVisible();
});

test('public overview has complete PT, EN, ES content and public policy links',async({page})=>{
  await page.goto('/about');
  await page.getByRole('combobox',{name:'Language'}).selectOption('en');
  await expect(page.getByRole('heading',{name:/From product research to Pinterest-ready creative/})).toBeVisible();
  await expect(page.getByRole('link',{name:'Privacy Policy'}).first()).toHaveAttribute('href','/privacy');
  await page.getByRole('combobox',{name:'Language'}).selectOption('es');
  await expect(page.getByRole('heading',{name:/De investigar productos a preparar Pins/})).toBeVisible();
  await expect(page.getByRole('link',{name:'Política de privacidad'}).first()).toHaveAttribute('href','/privacy');
});

test('public product overview is accessible and mobile responsive',async({page})=>{
  await page.goto('/about');
  const results=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
  expect(results.violations.filter(x=>x.impact==='critical'||x.impact==='serious')).toEqual([]);
  for(const width of [360,390,768,1024,1440]){
    await page.setViewportSize({width,height:850});
    const metrics=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));
    expect(metrics.scrollWidth,'public overview overflow at '+width+'px').toBeLessThanOrEqual(metrics.clientWidth+1);
  }
});

test('HTML sent to a new visitor includes a crawlable product overview and public links',async({request})=>{
  const response=await request.get('/');
  expect(response.ok()).toBeTruthy();
  const html=await response.text();
  expect(html).toContain('<h1>NestAffiliate — inteligência de afiliados e criação de Pins</h1>');
  expect(html).toContain('https://nestaffiliate.millionsnest.com/');
  expect(html).toContain('href="/privacy"');
  expect(html).toContain('href="/login"');
  expect(html).toContain('name="robots" content="index,follow"');
});
