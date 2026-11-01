import {test,expect} from '@playwright/test';

test('video preparation stays outside the Pinterest editor and handles blocked clipboard',async({page})=>{
 await page.goto('/');
 await page.getByRole('link',{name:/Revisar 3 campanhas/i}).click();
 await page.getByRole('button',{name:'2 · Imagem'}).click();
 await expect(page.locator('.pin-advanced-reel')).toHaveCount(0);
 const before=await page.evaluate(()=>localStorage.getItem('nestaffiliate_campaigns_v1:demo-org'));
 await page.goto('/video-studio');
 await expect(page.getByRole('heading',{name:'Prepare seu vídeo de afiliado'})).toBeVisible();
 await page.getByLabel('Onde você quer publicar?').selectOption('TIKTOK');
 await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('blocked');}}}));
 await page.getByRole('button',{name:'Copiar prompt da cena'}).first().click();
 await expect(page.getByLabel('Texto para copiar manualmente')).toHaveValue(/TIKTOK/);
 await expect(page.getByLabel('Texto para copiar manualmente')).toHaveValue(/must attach/);
 expect(await page.evaluate(()=>localStorage.getItem('nestaffiliate_campaigns_v1:demo-org'))).toBe(before);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('Pinterest image handoff offers the original photo and requires the actual attachment',async({page})=>{
 await page.goto('/');
 await page.getByRole('link',{name:/Revisar 3 campanhas/i}).waitFor();
 await page.evaluate(()=>{
   const key='nestaffiliate_campaigns_v1:demo-org';
   const campaigns=JSON.parse(localStorage.getItem(key)??'[]');
   for(const campaign of campaigns)campaign.currentVersion.product.imageUrl={value:'https://example.com/product.png',source:'authorized-test-photo',observedAt:new Date().toISOString()};
   localStorage.setItem(key,JSON.stringify(campaigns));
 });
 await page.reload();await page.getByRole('link',{name:/Revisar 3 campanhas/i}).click();
 await page.getByRole('button',{name:'2 · Imagem'}).click();
 if(await page.getByRole('button',{name:'Preparar Pin',exact:true}).count())await page.getByRole('button',{name:'Preparar Pin',exact:true}).click();
 const prompt=page.locator('.image-prompt-panel');
 await expect(prompt.getByRole('link',{name:'Abrir foto original para salvar'})).toBeVisible();
 await prompt.getByRole('button',{name:'Ver em português'}).click();
 await expect(prompt.getByRole('button',{name:'1. Copiar prompt em português'})).toBeVisible();
 await prompt.locator('.prompt-raw-details>summary').click();
 await expect(prompt.locator('.image-prompt-box')).toContainText('ANEXO DE REFERÊNCIA OBRIGATÓRIO');
});

test('image preparation resumes after returning to a reloaded tab',async({page})=>{
 await page.goto('/');await page.getByRole('link',{name:/Revisar 3 campanhas/i}).click();
 await page.getByRole('button',{name:'2 · Imagem'}).click();
 await page.reload();
 await expect(page.locator('.pin-studio-tabs button.active')).toContainText('Imagem');
 await expect(page.locator('.pin-image-steps')).toBeVisible();
});

test('Shopee tagging and direct-link controls are never mixed',async({page})=>{
 await page.goto('/campaigns');
 await page.locator('.campaign-card').filter({hasText:'SHOPEE'}).first().click();
 await page.getByRole('button',{name:'3 · Conferir e publicar'}).click();
 const method=page.getByLabel('Forma de afiliação Shopee');
 await method.selectOption('SHOPEE_TAG');
 await expect(page.getByRole('textbox',{name:'Link afiliado'})).toBeHidden();
 await method.selectOption('AFFILIATE_LINK');
 await expect(page.getByRole('textbox',{name:'Link afiliado'})).toBeVisible();
 await expect(page.getByText('Conferi este anúncio e gerei/validei este link na minha Central de Afiliados para divulgação no Pinterest.')).toBeVisible();
});
