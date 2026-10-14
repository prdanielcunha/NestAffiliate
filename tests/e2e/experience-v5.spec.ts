import {test,expect} from '@playwright/test';

test('Radar 6 starts with discovery, not a product import form',async({page})=>{
  await page.goto('/radar');
  const discovery=page.getByRole('region',{name:'Pesquisar oportunidades'});
  await expect(discovery.getByRole('heading',{name:'Encontre boas oportunidades para divulgar'})).toBeVisible();
  await expect(discovery.getByRole('button',{name:'Resolver problemas'})).toBeVisible();
  await expect(page.locator('.opportunity-grid .opportunity-card')).toHaveCount(0);
  await expect(page.getByRole('region',{name:'Importação inteligente'})).toHaveCount(0);
});

test('Creative concepts have three different visual layouts and preserve 2:3 preview',async({page})=>{
 await page.goto('/');
 await page.getByRole('link',{name:/Revisar 3 campanhas/i}).click();
 await page.getByRole('button',{name:'2 · Imagem'}).click();
 await page.getByRole('button',{name:'Preparar Pin',exact:true}).click();
 await expect(page.locator('.concept-visual')).toHaveCount(3);
 for(let n=0;n<3;n++)await expect(page.locator('.concept-visual-'+n)).toBeVisible();
 const frame=page.locator('.concept-visual-1');
 await expect(frame).toHaveCSS('aspect-ratio','2 / 3');
 await expect(page.locator('.concept-rendered-canvas')).toHaveCount(3);
 await expect.poll(async()=>{
   const data=await page.locator('.concept-rendered-canvas').evaluateAll((canvases)=>canvases.map((el)=>(el as HTMLCanvasElement).toDataURL('image/png')));
   return new Set(data).size;
 },{timeout:10000}).toBe(3);
});

test('Library and Boards navigate real campaign data, not static placeholders',async({page})=>{
 await page.goto('/library');
 await expect(page.getByRole('heading',{name:/Biblioteca de campanhas/i})).toBeVisible();
 await expect(page.locator('.library-result').first()).toBeVisible();
 await page.goto('/boards');
 await expect(page.getByRole('heading',{name:/Pastas e estratégias/i})).toBeVisible();
 await expect(page.locator('.board-library-card').first()).toBeVisible();
});
