import {test,expect} from '@playwright/test';

test('review copy button opens choices in place without anchor teleport',async({page})=>{
  await page.goto('/');
  await page.getByRole('link',{name:/Revisar 3 campanhas/i}).click();
  const block=page.getByRole('region',{name:'Próxima ação e textos do Pin'});
  await expect(block).toBeVisible();
  // Automatically filled copy is a suggestion, not user approval.
  await expect(block.getByRole('heading',{name:'Escolha o título e a descrição'})).toBeVisible();
  await expect(block.getByText('PRÉVIA · SUGESTÕES AINDA NÃO CONFIRMADAS')).toBeVisible();
  await expect(block.getByRole('button',{name:/Continuar para imagem/})).toHaveCount(0);
  await expect(block.getByRole('button',{name:/Preparar imagem/})).toHaveCount(0);
  const top=await page.evaluate(()=>window.scrollY);
  await block.getByRole('button',{name:/Escolher título e descrição/}).click();
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
  // Do not collapse a long selector: the browser would re-anchor the page
  // and reproduce the disorientation after clicking Apply.
  await expect(picker).toBeVisible();
  await expect(picker.getByText('Textos aplicados à campanha')).toBeVisible();
  await expect(picker.getByRole('button',{name:'Copiar descrição'})).toBeEnabled();
  await picker.getByRole('button',{name:'Concluir e fechar'}).click();
  await expect(picker).toHaveCount(0);
  await expect(block).toContainText(/Textos escolhidos e aplicados|Texto aplicado, mas a sincronização/);
  await expect(block.getByRole('button',{name:/Continuar para imagem/})).toBeVisible();
  await expect(block.getByRole('button',{name:'Copiar descrição'})).toBeEnabled();
});

test('review image shortcut gives explicit location and return action',async({page})=>{
  await page.goto('/');
  await page.getByRole('link',{name:/Revisar 3 campanhas/i}).click();
  await page.getByRole('button',{name:'2 · Imagem'}).click();
  await expect(page.locator('.pin-image-steps')).toBeVisible();
  await expect(page.locator('.pin-studio-tabs button.active')).toContainText('Imagem');
  await page.getByRole('button',{name:'1 · Textos'}).click();
  await expect(page.locator('#review-next-action')).toBeInViewport();
});
