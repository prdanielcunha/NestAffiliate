import {test,expect} from '@playwright/test';

test('ordinary user can follow copy → image prompt → review without teleportation',async({page})=>{
  await page.goto('/');
  await page.getByRole('link',{name:/Revisar 3 campanhas/i}).click();
  const workflow=page.getByRole('region',{name:'Criar Pin passo a passo'});
  await expect(workflow).toBeVisible();
  await expect(workflow.getByRole('heading',{name:/Vamos criar seu Pin, passo a passo/})).toBeVisible();
  const before=await page.evaluate(()=>window.scrollY);
  await workflow.getByRole('button',{name:/1 · Textos/}).click();
  await expect(page.getByRole('region',{name:'Próxima ação e textos do Pin'})).toBeVisible();
  await workflow.getByRole('button',{name:/2 · Imagem/}).click();
  await expect(page.locator('.pin-image-steps')).toBeVisible();
  expect(await page.evaluate(()=>location.hash)).toBe('');
  const after=await page.evaluate(()=>window.scrollY);
  expect(Math.abs(after-before)).toBeLessThan(115);
  // Existing demo product may not yet have a generated pack, unlike fresh Radar items.
  if(await page.getByRole('button',{name:'Preparar Pin',exact:true}).count()){
    await page.getByRole('button',{name:'Preparar Pin',exact:true}).click();
  }
  const prompt=page.locator('.image-prompt-panel');
  await expect(prompt).toBeVisible();
  await expect(prompt.getByRole('button',{name:/Copiar prompt em inglês/})).toBeEnabled();
  await expect(prompt.getByRole('link',{name:/Abrir ChatGPT/})).toHaveAttribute('href','https://chatgpt.com/');
  await expect(page.getByText(/somente a imagem FINAL/i).first()).toBeVisible();
  await workflow.getByRole('button',{name:/3 · Conferir e publicar/}).click();
  await expect(page.locator('.review-grid')).toBeVisible();
  await expect(page.locator('#review-product')).toBeVisible();
});

test('NestAI is a deliberate optional choice, never an automatic required step',async({page})=>{
  await page.goto('/');
  await page.getByRole('link',{name:/Revisar 3 campanhas/i}).click();
  await expect(page.locator('#review-ai')).toBeHidden();
  await page.getByRole('button',{name:/Criar textos com NestAI \(opcional\)/}).click();
  await expect(page.getByRole('region',{name:'Criar textos com NestAI'})).toBeVisible();
  await expect(page.getByRole('button',{name:/Tentar personalização com NestAI/})).toBeEnabled();
  await expect(page.locator('.pin-studio-tabs button.active')).toContainText('Textos');
});

test('Safari denied clipboard still offers a selectable English image prompt',async({page})=>{
  await page.goto('/');
  await page.getByRole('link',{name:/Revisar 3 campanhas/i}).click();
  await page.getByRole('button',{name:'2 · Imagem'}).click();
  if(await page.getByRole('button',{name:'Preparar Pin',exact:true}).count()){
    await page.getByRole('button',{name:'Preparar Pin',exact:true}).click();
  }
  await page.evaluate(()=>{
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{
      writeText:async()=>{throw new Error('clipboard denied');},
    }});
    document.execCommand=()=>false;
  });
  const panel=page.locator('.image-prompt-panel');
  await panel.getByRole('button',{name:/Copiar prompt em inglês/}).click();
  const field=panel.locator('#manual-image-prompt');
  await expect(field).toBeVisible();
  await expect(field).toHaveValue(/Pinterest/);
  await expect(panel.getByRole('link',{name:/Abrir ChatGPT/})).toHaveAttribute('target','_blank');
});
