import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{
 await page.route('**/v1/run',async route=>{
  let req:{task?:string}={};
  try{req=route.request().postDataJSON() as {task?:string};}catch{/* leave request unchanged */}
  if(req.task==='affiliate.pin.strategy')
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({result:{"productType":"Jogo de panelas","buyerIntent":"Comparar conjuntos de panelas para a cozinha","audience":"Pessoas que cozinham em casa","positioning":"Visual do conjunto e composição de peças","factsUsed":["10 peças"],"unknowns":["Composição de cada peça não confirmada"],"angles":["Visual na cozinha","Conhecer itens do conjunto","Pesquisar novos utensílios"],"titles":["Jogo de panelas 10 peças: conheça este conjunto","Vai trocar suas panelas? Veja este conjunto","Panelas para cozinha: veja o jogo de 10 peças"],"descriptions":["Conheça este jogo de panelas de 10 peças. Confira as fotos e a composição do kit no anúncio antes de escolher. Conteúdo com link de afiliado.","Buscando um jogo de panelas para sua cozinha? Compare as peças, veja as imagens e as condições atuais na página do produto. Conteúdo com link de afiliado."],"keywords":["jogo de panelas","panelas 10 peças","conjunto de panelas","utensílios de cozinha","panelas domésticas"],"recommendedBoard":"Jogos de Panelas para Cozinha","headline":"Conheça este jogo de panelas","cta":"Ver detalhes"}})});
  else await route.continue();
 });
});

test('Smart Import keeps a declared affiliate URL and prepares Pin copy automatically', async ({page})=>{
  await page.route('**/api/v1/nestaffiliate/mercadolivre/resolve',async route=>{
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
      status:'SOURCE_LIMITED',reason:'OFFICIAL_SOURCE_UNAVAILABLE',
    })});
  });
  await page.goto('/radar');
  const smart=page.getByRole('region',{name:'Importação inteligente'});
  await expect(smart).toBeVisible();
  await smart.getByPlaceholder('https://meli.la/...').fill('https://meli.la/2GDhhKL');
  await smart.getByLabel('Sim, já é meu link afiliado').check();
  await smart.getByText('Caso a fonte não identifique o produto').click();
  await smart.getByPlaceholder('Nome do produto').fill('Conjunto de panelas antiaderente 10 peças');
  await smart.getByRole('button',{name:/Salvar produto e preparar Pin/}).click();
  await expect(page).toHaveURL(/\/review\/campaign-/);
  await page.getByRole('button',{name:'3 · Conferir e publicar'}).click();
  await page.getByRole('button',{name:'3 · Conferir e publicar'}).click();
 await expect(page.getByRole('textbox',{name:'Link afiliado'})).toHaveValue('https://meli.la/2GDhhKL');
  await expect(page.getByText('NestScore pendente', {exact:false})).toBeVisible();
  await page.getByRole('button',{name:'1 · Textos'}).click();
  await expect(page.getByRole('region',{name:'Próxima ação e textos do Pin'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Copiar título'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Copiar descrição'})).toBeVisible();
  await page.getByRole('button',{name:'2 · Imagem'}).click();
  await expect(page.locator('#review-images')).toBeVisible();
});
test('Smart Import defaults to ordinary link and never labels it as an affiliate URL', async ({page})=>{
  await page.goto('/radar');
  const smart=page.getByRole('region',{name:'Importação inteligente'});
  await expect(smart.getByLabel('Não, é um link comum')).toBeChecked();
  await expect(smart.getByLabel('Sim, já é meu link afiliado')).not.toBeChecked();
});
test('Smart Import preserves an unresolved meli.la affiliate link without claiming product identification',async ({page})=>{
 await page.route('**/api/v1/nestaffiliate/mercadolivre/resolve',async route=>
   route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'UNRESOLVED',reason:'SHORTLINK_UNRESOLVED'})}));
 await page.goto('/radar');
 const smart=page.getByRole('region',{name:'Importação inteligente'});
 await smart.getByPlaceholder('https://meli.la/...').fill('https://meli.la/2GDhhKL');
 await smart.getByLabel('Sim, já é meu link afiliado').check();
 await smart.getByRole('button',{name:/Salvar produto e preparar Pin/}).click();
 await expect(smart.getByRole('region',{name:'Link preservado para revisão'})).toBeVisible();
 await expect(smart.getByText(/produto ainda não identificado/i).first()).toBeVisible();
 await expect(page).toHaveURL(/\/radar/);
 await smart.getByRole('button',{name:/Salvar link como rascunho/}).click();
 await expect(page).toHaveURL(/\/review\/campaign-/);
 await page.getByRole('button',{name:'3 · Conferir e publicar'}).click();
 await expect(page.getByRole('textbox',{name:'Link afiliado'})).toHaveValue('https://meli.la/2GDhhKL');
 await expect(page.getByText(/produto ainda não identificado|identificação pendente/i).first()).toBeVisible();
});

test('Shopee canonical link resolves an exact official item and preserves official affiliate offer',async({page})=>{
 await page.goto('/radar');
 const smart=page.getByRole('region',{name:'Importação inteligente'});
 await smart.getByPlaceholder(/https:\/\/meli\.la/).fill('https://shopee.com.br/Organizador-Giratorio-Multiuso-Shopee-i.12345.98765001');
 await expect(smart.getByLabel('Não, é um link comum')).toBeChecked();
 await smart.getByRole('button',{name:/Salvar produto e preparar Pin/}).click();
 await expect(page).toHaveURL(/\/review\/campaign-/);
 await page.getByRole('button',{name:'3 · Conferir e publicar'}).click();
 await expect(page.getByRole('textbox',{name:'Link afiliado'})).toHaveValue('https://s.shopee.com.br/98765001');
 await expect(page.locator('#review-product').getByText('Organizador Giratório Multiuso Shopee').first()).toBeVisible();
 await page.getByRole('button',{name:'2 · Imagem'}).click();
 await expect(page.locator('.pin-image-steps')).toBeVisible();
 await expect(page.locator('.image-prompt-panel')).toBeVisible();
 await expect(page.locator('.image-prompt-panel').getByRole('button',{name:/Copiar prompt em inglês/})).toBeEnabled();
 await expect(page.locator('.image-prompt-panel').getByRole('link',{name:/Abrir ChatGPT/})).toHaveAttribute('href','https://chatgpt.com/');
 await expect(page.getByText(/somente a imagem FINAL/i).first()).toBeVisible();
});

test('Opaque Shopee affiliate shortlink stays as a pending draft, never masquerades as a verified product',async({page})=>{
 await page.goto('/radar');
 const smart=page.getByRole('region',{name:'Importação inteligente'});
 await smart.getByPlaceholder(/https:\/\/meli\.la/).fill('https://s.shopee.com.br/abc123');
 await smart.getByLabel('Sim, já é meu link afiliado').check();
 await smart.getByRole('button',{name:/Salvar produto e preparar Pin/}).click();
 await expect(smart.getByRole('region',{name:'Link preservado para revisão'})).toBeVisible();
 await smart.getByRole('button',{name:/Salvar link como rascunho/}).click();
 await expect(page).toHaveURL(/\/review\/campaign-/);
 await page.getByRole('button',{name:'3 · Conferir e publicar'}).click();
 await expect(page.getByRole('textbox',{name:'Link afiliado'})).toHaveValue('https://s.shopee.com.br/abc123');
 await expect(page.locator('#review-product').getByText(/identificação pendente/i).first()).toBeVisible();
});

test('mobile review starts with copy, next action and collapsed detailed journey, without blocking on NestAI',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.route('**/api/v1/nestaffiliate/mercadolivre/resolve',async route=>{
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'SOURCE_LIMITED'})});
 });
 // A hanging AI request must never block the import navigation.
 await page.route('**/v1/run',async route=>{
  const data=route.request().postDataJSON() as {task?:string};
  if(data.task==='affiliate.pin.strategy')return new Promise<void>(()=>{});
  await route.continue();
 });
 await page.goto('/radar');
 const smart=page.getByRole('region',{name:'Importação inteligente'});
 await smart.getByPlaceholder(/https:\/\/meli\.la/).fill('https://meli.la/2GDhhKL');
 await smart.getByText('Caso a fonte não identifique o produto').click();
 await smart.getByPlaceholder('Nome do produto').fill('Conjunto panelas 10 peças preto e bege');
 await smart.getByRole('button',{name:/Salvar produto e preparar Pin/}).click();
 await expect(page).toHaveURL(/\/review\/campaign-/,{timeout:10000});
 const actions=page.getByRole('region',{name:'Próxima ação e textos do Pin'});
 await expect(actions).toBeVisible();
 await expect(actions.getByRole('button',{name:'Copiar título'})).toBeVisible();
 await expect(actions.getByRole('button',{name:'Copiar descrição'})).toBeVisible();
 await page.getByRole('button',{name:/Criar textos com NestAI/}).click();
 await expect(page.getByRole('region',{name:'Criar textos com NestAI'})).toBeVisible();
 const waiting=page.locator('.nestai-nonblocking-status');
 // In mocked E2E auth, the Hub may reject immediately instead of waiting on
 // the intercepted provider; either outcome must remain nonblocking.
 // App Check can fail promptly (or finish) between visibility and tap.
 // Regardless of transient inference state, the user can still use local copy.
 if(await waiting.isVisible()){
  await page.getByRole('button',{name:'Continuar com textos locais'})
   .click({timeout:1200}).catch(()=>{/* request finished while button was detaching */});
 }
 await expect(page.getByRole('button',{name:/Tentar personalização com NestAI|Consultando IA/})).toBeVisible();
 await expect(actions.getByRole('button',{name:'Copiar título'})).toBeVisible();
});

test('Shopee short share URL resolves through Hub while preserving affiliate attribution',async({page})=>{
 await page.route('**/api/v1/nestaffiliate/shopee/resolve',async route=>{
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
   status:'IDENTIFIED_URL',canonicalUrl:'https://shopee.com.br/Organizador-Giratorio-Multiuso-Shopee-i.12345.98765001',
   shopId:'12345',itemId:'98765001',titleHint:'Organizador Giratorio Multiuso Shopee',listingVerified:false,affiliateVerified:false,
  })});
 });
 await page.goto('/radar');
 const smart=page.getByRole('region',{name:'Importação inteligente'});
 await smart.getByPlaceholder(/https:\/\/meli\.la/).fill('https://s.shopee.com.br/ABC123');
 await smart.getByLabel('Sim, já é meu link afiliado').check();
 await smart.getByRole('button',{name:/Salvar produto e preparar Pin/}).click();
 await expect(page).toHaveURL(/\/review\/campaign-/);
 await page.getByRole('button',{name:'3 · Conferir e publicar'}).click();
 await expect(page.getByRole('textbox',{name:'Link afiliado'})).toHaveValue('https://s.shopee.com.br/ABC123');
 await page.getByRole('button',{name:'1 · Textos'}).click();
 await expect(page.getByRole('region',{name:'Próxima ação e textos do Pin'})).toBeVisible();
 await expect(page.getByText(/Shopee: a marcação de afiliado é conferida na publicação/i)).toBeVisible();
});


test('mobile visual concept and new direction NEVER change selected title or description',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.route('**/api/v1/nestaffiliate/mercadolivre/resolve',async route=>
  route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'SOURCE_LIMITED'})}));
 await page.goto('/radar');
 const smart=page.getByRole('region',{name:'Importação inteligente'});
 await smart.getByPlaceholder(/https:\/\/meli\.la/).fill('https://meli.la/2GDhhKL');
 await smart.getByText('Caso a fonte não identifique o produto').click();
 await smart.getByPlaceholder('Nome do produto').fill('Jogo de panelas 10 peças');
 await smart.getByRole('button',{name:/Salvar produto e preparar Pin/}).click();
 await expect(page).toHaveURL(/\/review\/campaign-/);
 await page.getByRole('button',{name:'2 · Imagem'}).click();
 const copy=page.locator('#review-copy-editor');
 await expect(copy.locator('.copy-option')).toHaveCount(6);
 const chosen=copy.locator('.copy-option.selected');
 const title=await chosen.first().innerText();
 const description=await chosen.last().innerText();
 await page.locator('.concept-grid-v5 .concept-card').nth(1).click();
 await expect(copy.locator('.copy-option.selected').first()).toHaveText(title);
 await expect(copy.locator('.copy-option.selected').last()).toHaveText(description);
 await page.getByRole('button',{name:/Gerar outra direção/}).click();
 await expect(copy.locator('.copy-option.selected').first()).toHaveText(title);
 await expect(copy.locator('.copy-option.selected').last()).toHaveText(description);
 await expect(page.getByText(/Escolher um visual muda apenas a composição/)).toBeVisible();
});
