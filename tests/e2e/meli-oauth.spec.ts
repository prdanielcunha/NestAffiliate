import { expect, test } from '@playwright/test';

test('Mercado Livre OAuth callback validates state and hides query credentials', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    sessionStorage.setItem('na_meli_oauth_state','state-123');
    sessionStorage.setItem('na_meli_pkce_verifier','verifier-123');
  });

  await page.goto('/integrations/meli/callback?code=code-abc&state=state-123');

  await expect(page.getByRole('heading',{name:'Autorização recebida com segurança.'})).toBeVisible();
  await expect(page.getByLabel('Mercado Livre bootstrap bundle')).toContainText('code-abc');
  await expect(page).toHaveURL(/\/integrations\/meli\/callback$/);
  await expect(page.getByText(/Não envie pelo chat/i)).toBeVisible();
});

test('Mercado Livre OAuth callback rejects mismatched state', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    sessionStorage.setItem('na_meli_oauth_state','expected-state');
    sessionStorage.setItem('na_meli_pkce_verifier','verifier-123');
  });

  await page.goto('/integrations/meli/callback?code=code-abc&state=wrong-state');

  await expect(page.getByRole('heading',{name:'Não foi possível validar esta autorização.'})).toBeVisible();
  await expect(page.getByText(/não corresponde à sessão/i)).toBeVisible();
});
