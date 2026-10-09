import { test, expect } from '@playwright/test';

test('Today → Review → edit → approve → guided publish', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'NestAffiliate trabalhou por você.' })).toBeVisible();

  await page.getByRole('link', { name: /Revisar 3 campanhas/i }).click();
  await expect(page.getByText('PIN PREVIEW')).toBeVisible();
  await expect(page.locator('.score-badge')).toBeVisible();

  const edit = page.getByPlaceholder(/Peça qualquer alteração/i);
  await edit.fill('Troque a headline para: Uma cozinha mais organizada');
  await edit.press('Enter');
  await expect(page.getByRole('heading',{name:'Veja antes de aplicar'})).toBeVisible();
  await expect(page.locator('.save-state')).toContainText('v1');
  await page.getByRole('button',{name:'Aplicar alteração'}).click();
  await expect(page.locator('.save-state')).toContainText('v2');

  await page.getByRole('button', { name: 'Aprovar e ir para publicação →' }).click();
  await expect(page.getByRole('heading', { name: 'Seu Pin está pronto.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Baixar imagem PNG' })).toBeVisible();
  await expect(page.getByText('MODO GUIADO')).toBeVisible();
});

test('mobile exposes the four primary destinations', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile');
  await page.goto('/');
  const nav = page.locator('.bottom-nav');
  await expect(nav).toBeVisible();
  await expect(nav.getByRole('link')).toHaveCount(4);
  await expect(nav.getByRole('link', { name: 'Hoje' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Radar' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Campanhas' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Resultados' })).toBeVisible();
});


test('creative preview preserves Pinterest 2:3 output contract', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /Revisar 3 campanhas/i }).click();
  const canvas=page.locator('canvas.pin-canvas');
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute('width','1000');
  await expect(canvas).toHaveAttribute('height','1500');
  const data=await canvas.evaluate((node:HTMLCanvasElement)=>({
    width:node.width,
    height:node.height,
    url:node.toDataURL('image/png'),
  }));
  expect(data.width/data.height).toBeCloseTo(2/3,5);
  expect(data.url.startsWith('data:image/png;base64,')).toBe(true);
  expect(data.url.length).toBeGreaterThan(1000);
});

test('light mode and language switching keep primary navigation usable', async ({ page }) => {
  await page.goto('/');
  const theme=page.getByRole('button',{name:'Theme'});
  await theme.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme','light');

  const language=page.getByRole('combobox',{name:'Language'});
  await language.selectOption('en');
  await expect(page.getByRole('link',{name:'Today'}).first()).toBeVisible();
  await expect(page.getByRole('link',{name:'Campaigns'}).first()).toBeVisible();

  await language.selectOption('es');
  await expect(page.getByRole('link',{name:'Hoy'}).first()).toBeVisible();
  await expect(page.getByRole('link',{name:'Campañas'}).first()).toBeVisible();
});

test('review is usable without horizontal overflow on mobile', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile');
  await page.goto('/');
  await page.getByRole('link',{name:/Revisar 3 campanhas/i}).click();
  const sizes=await page.evaluate(()=>({
    scrollWidth:document.documentElement.scrollWidth,
    clientWidth:document.documentElement.clientWidth,
  }));
  expect(sizes.scrollWidth).toBeLessThanOrEqual(sizes.clientWidth+1);
  await expect(page.getByPlaceholder(/Peça qualquer alteração/i)).toBeVisible();
});


test('scheduled publication returns to Today as an upcoming action', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /Revisar 3 campanhas/i }).click();
  await page.getByRole('button', { name: 'Aprovar e ir para publicação →' }).click();
  await expect(page.getByRole('heading', { name: 'Seu Pin está pronto.' })).toBeVisible();

  await page.locator('input[type="datetime-local"]').fill('2030-01-01T10:00');
  await page.getByRole('button', { name: 'Agendar', exact: true }).click();
  await expect(page.getByText('Agendado', { exact: true })).toBeVisible();

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Próximas publicações' })).toBeVisible();
  await expect(page.getByText(/2030/)).toBeVisible();
});


test('Review can prepare a full Pinterest Creative Pack and blocks approval until the generated image is validated', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /Revisar 3 campanhas/i }).click();

  await expect(page.getByRole('heading', { name: 'Transforme este produto em um Pin completo.' })).toBeVisible();
  await page.getByRole('button', { name: 'Preparar Pin', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Seu Creative Pack está pronto.' })).toBeVisible();
  await expect(page.locator('.concept-card')).toHaveCount(3);
  await expect(page.getByText('PROMPT DE IMAGEM')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copiar e abrir ChatGPT' })).toBeVisible();
  await expect(page.getByText('1000 × 1500', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Aprovar e ir para publicação →' }).click();
  await expect(page.getByRole('heading',{name:/Ainda faltam algumas coisas antes de aprovar/})).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('A aprovação ainda não foi realizada');
  await expect(page).toHaveURL(/\/review\//);
});


test('unsupported creative command is explicit and cannot alter the campaign', async ({page})=>{
  await page.goto('/');
  await page.getByRole('link',{name:/Revisar 3 campanhas/i}).click();
  const edit=page.getByPlaceholder(/Peça qualquer alteração/i);
  await edit.fill('Coloque um astronauta voando do lado da cadeira');
  await edit.press('Enter');
  await expect(page.getByRole('alert')).toContainText('Ainda não consigo executar');
  await expect(page.locator('.save-state')).toContainText('v1');
  await expect(page.getByText(/Ajuste solicitado:/i)).toHaveCount(0);
});

test('final Pinterest screen explains every field and offers independent copy buttons',async({page})=>{
 await page.goto('/');
 await page.getByRole('link',{name:/Revisar 3 campanhas/i}).click();
 await page.getByRole('button',{name:'Aprovar e ir para publicação →'}).click();
 const guide=page.getByRole('region',{name:'Dados para criar seu Pin'});
 await expect(guide).toBeVisible();
 await expect(guide.getByRole('button',{name:'Baixar tudo (.zip)'})).toBeVisible();
 await expect(guide.getByRole('button',{name:'Baixar imagem PNG'})).toBeVisible();
 await expect(guide.getByRole('heading',{name:'Título do Pin'})).toBeVisible();
 await expect(guide.getByRole('heading',{name:'Descrição + aviso de afiliado'})).toBeVisible();
 await expect(guide.getByRole('heading',{name:'Link de destino afiliado'})).toBeVisible();
 await expect(guide.getByRole('heading',{name:'Pasta do Pinterest'})).toBeVisible();
 await expect(guide.getByRole('heading',{name:'Texto alternativo'})).toBeVisible();
 await expect(guide.getByText(/No Pinterest: Criar → Criar Pin/)).toBeVisible();
 await expect(guide.getByText(/não confirmam postagem/)).toBeVisible();
});
test('custom ChatGPT image prompt preserves mandatory source rules in visible final prompt',async({page})=>{
 await page.goto('/');
 await page.getByRole('link',{name:/Revisar 3 campanhas/i}).click();
 await page.getByRole('button',{name:'Preparar Pin',exact:true}).click();
 await page.getByLabel('Suas instruções extras para a IA (opcional)').fill('Luz natural suave, manter forma e cor da referência.');
 const prompt=page.locator('.image-prompt-box');
 await expect(prompt).toContainText('Luz natural suave');
 await expect(page.getByText('Como gerar com seu ChatGPT (sem API)')).toBeVisible();
 await expect(page.getByText(/assinatura ChatGPT Pro e API são produtos separados/i)).toBeVisible();
});

test('Approval with incomplete creative shows actionable blockers and preserves campaign',async({page})=>{
 await page.goto('/');
 await page.getByRole('link',{name:/Revisar 3 campanhas/i}).click();
 await expect(page.getByRole('region',{name:'Etapas para publicar seu Pin'})).toBeVisible();
 await expect(page.getByText('DO RADAR AO PIN · PASSO A PASSO')).toBeVisible();
 await page.getByRole('button',{name:'Preparar Pin',exact:true}).click();
 await page.getByRole('button',{name:'Aprovar e ir para publicação →'}).click();
 const errors=page.locator('#review-blockers');
 await expect(errors).toContainText('ainda não foi realizada');
 await expect(errors.getByRole('link',{name:/Resolver esta etapa/}).first()).toHaveAttribute('href','#review-creative');
 await expect(page).toHaveURL(/\/review\//);
 await expect(page.locator('.save-state')).toContainText('v2');
 await page.goto('/campaigns');
 await expect(page.locator('.campaign-grid .campaign-card').first()).toBeVisible();
});
test('Review explains affiliate link source and image workflow without claiming automatic commission',async({page})=>{
 await page.goto('/');
 await page.getByRole('link',{name:/Revisar 3 campanhas/i}).click();
 const guide=page.getByRole('region',{name:'Etapas para publicar seu Pin'});
 await expect(guide.getByText('Conferir link',{exact:true}).first()).toBeVisible();
 await expect(guide.getByText('Imagem com ChatGPT')).toBeVisible();
 await expect(page.getByText(/Seu link de comissão não vem automaticamente do Radar/)).toBeVisible();
 await expect(page.getByRole('link',{name:/Abrir instruções oficiais do Mercado Livre/})).toHaveAttribute('href',/mercadolivre.com.br\/l\/afiliados-portal-do-afiliado/);
 await expect(page.getByText(/a prévia com apenas texto ainda NÃO é a imagem final/i)).toBeVisible();
});
test('Approved campaign list leads to publishing rather than a confusing review loop',async({page})=>{
 await page.goto('/');
 await page.getByRole('link',{name:/Revisar 3 campanhas/i}).click();
 await page.getByRole('button',{name:'Aprovar e ir para publicação →'}).click();
 await page.goto('/campaigns');
 await page.getByRole('button',{name:'Aprovadas'}).click();
 const ready=page.locator('.campaign-card').first();
 await expect(ready).toHaveAttribute('href',/\/publish\//);
 await expect(ready).toContainText('Ir para publicação');
});
