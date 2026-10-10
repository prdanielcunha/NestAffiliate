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
  await smart.getByRole('button',{name:/Entender produto com NestAI e criar Pin/}).click();
  await expect(page).toHaveURL(/\/review\/campaign-/);
  await expect(page.getByRole('textbox',{name:'Link afiliado'})).toHaveValue('https://meli.la/2GDhhKL');
  await expect(page.getByText('NestScore pendente', {exact:false})).toBeVisible();
  await expect(page.getByText('NestAI personalizou esta campanha')).toBeVisible();
  await expect(page.getByText(/PIN (TITLE|COPY|PREVIEW)|Creative Pack|CONCEITOS|3 CONCEITOS/i).first()).toBeVisible();
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
 await smart.getByRole('button',{name:/Entender produto com NestAI e criar Pin/}).click();
 await expect(smart.getByRole('region',{name:'Link preservado para revisão'})).toBeVisible();
 await expect(smart.getByText(/produto ainda não identificado/i).first()).toBeVisible();
 await expect(page).toHaveURL(/\/radar/);
 await smart.getByRole('button',{name:/Salvar link como rascunho/}).click();
 await expect(page).toHaveURL(/\/review\/campaign-/);
 await expect(page.getByRole('textbox',{name:'Link afiliado'})).toHaveValue('https://meli.la/2GDhhKL');
 await expect(page.getByText(/produto ainda não identificado|identificação pendente/i).first()).toBeVisible();
});
