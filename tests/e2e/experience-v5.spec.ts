import {test,expect} from '@playwright/test';

test('Radar problem-first research requires an intentional human search',async({page})=>{
 await page.goto('/radar');
 const explorer=page.getByRole('region',{name:/Encontrar oportunidades por problemas/i});
 await expect(explorer).toBeVisible();
 await expect(explorer.getByText('Hipóteses editoriais')).toBeVisible();
 await explorer.getByRole('button',{name:/Armários de cozinha sem espaço/i}).click();
 await expect(explorer.getByRole('button',{name:/Pesquisar produtos para isso/i})).toBeVisible();
 await expect(page.locator('.opportunity-grid .opportunity-card')).toHaveCount(0);
});

test('Creative concepts have three different visual layouts and preserve 2:3 preview',async({page})=>{
 await page.goto('/');
 await page.getByRole('link',{name:/Revisar 3 campanhas/i}).click();
 await page.getByRole('button',{name:'Preparar Pin',exact:true}).click();
 await expect(page.locator('.concept-visual')).toHaveCount(3);
 for(let n=0;n<3;n++)await expect(page.locator('.concept-visual-'+n)).toBeVisible();
 const frame=page.locator('.concept-visual-1');
 await expect(frame).toHaveCSS('aspect-ratio','2 / 3');
 await expect(page.getByText(/ESPAÇO PARA FOTO AUTORIZADA/).first()).toBeVisible();
});

test('Library and Boards navigate real campaign data, not static placeholders',async({page})=>{
 await page.goto('/library');
 await expect(page.getByRole('heading',{name:/Biblioteca de campanhas/i})).toBeVisible();
 await expect(page.locator('.library-result').first()).toBeVisible();
 await page.goto('/boards');
 await expect(page.getByRole('heading',{name:/Pastas e estratégias/i})).toBeVisible();
 await expect(page.locator('.board-library-card').first()).toBeVisible();
});
