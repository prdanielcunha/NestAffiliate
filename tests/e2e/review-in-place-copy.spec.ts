import {test,expect} from '@playwright/test';

test('review copy button opens choices in place without anchor teleport',async({page})=>{
  await page.goto('/');
  await page.getByRole('link',{name:/Revisar 3 campanhas/i}).click();
  const block=page.getByRole('region',{name:'Próxima ação e textos do Pin'});
  await expect(block).toBeVisible();
  const top=await page.evaluate(()=>window.scrollY);
  await block.getByRole('button',{name:'Escolher textos'}).click();
  const picker=page.locator('.inline-copy-chooser');
  await expect(picker).toBeVisible();
  await expect(picker.getByRole('heading',{name:'Escolha aqui, sem sair desta tela'})).toBeVisible();
  expect(await page.evaluate(()=>location.hash)).toBe('');
  const after=await page.evaluate(()=>window.scrollY);
  expect(Math.abs(after-top)).toBeLessThan(110);
  await expect(picker.locator('input[name="inline-pin-title"]')).toHaveCount(3);
  await expect(picker.locator('input[name="inline-pin-description"]')).toHaveCount(3);
  await picker.locator('input[name="inline-pin-title"]').first().check();
  await picker.locator('input[name="inline-pin-description"]').first().check();
  await picker.getByRole('button',{name:'Aplicar título e descrição'}).click();
  await expect(picker).toHaveCount(0);
  await expect(block).toContainText(/Textos escolhidos e aplicados|Texto aplicado, mas a sincronização/);
  await expect(block.getByRole('button',{name:'Copiar descrição'})).toBeEnabled();
});

test('review image shortcut gives explicit location and return action',async({page})=>{
  await page.goto('/');
  await page.getByRole('link',{name:/Revisar 3 campanhas/i}).click();
  const shortcuts=page.getByRole('navigation',{name:'Ir para uma tarefa'});
  await shortcuts.getByRole('link',{name:'Imagem',exact:true}).click();
  const guide=page.locator('.review-location-guide');
  await expect(guide).toBeVisible();
  await expect(guide).toContainText(/Você está em:/);
  await guide.getByRole('button',{name:/Voltar às ações/i}).click();
  await expect(guide).toHaveCount(0);
  await expect(page.locator('#review-next-action')).toBeInViewport();
});
