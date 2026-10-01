import { chromium } from '@playwright/test';

const base = 'https://' + (process.env.LIVE_DOMAIN || 'nestaffiliate.millionsnest.com');
const checks = [
  ['/privacy', /Privacy Policy|Política de Privacidade/],
  ['/terms', /Terms of Use|Termos de Uso/],
  ['/data-deletion', /Data Deletion and Unlinking|Exclusão de Dados e Desconexão/],
];

const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ locale: 'en-US' });
  for (const [path, headingPattern] of checks) {
    const url = base + path;
    const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    if (!response || response.status() !== 200) {
      throw new Error('LIVE_LEGAL_HTTP_FAILED ' + url + ' status=' + (response?.status() ?? 'none'));
    }

    const heading = (await page.locator('.legal-document h1').textContent())?.trim() ?? '';
    if (!headingPattern.test(heading)) {
      throw new Error('LIVE_LEGAL_HEADING_FAILED ' + url + ' heading=' + heading);
    }

    const body = await page.locator('body').innerText();
    if (!body.includes('MILLIONSNEST · NESTAFFILIATE')) {
      throw new Error('LIVE_LEGAL_BRAND_FAILED ' + url);
    }
    if (!body.includes('nestaffiliate@millionsnest.com')) {
      throw new Error('LIVE_LEGAL_CONTACT_FAILED ' + url);
    }
    if (/Continue with Google|Continuar com Google|Continuar con Google/.test(body)) {
      throw new Error('LIVE_LEGAL_AUTH_WALL_DETECTED ' + url);
    }

    console.log('NESTAFFILIATE_LIVE_LEGAL_OK=' + url + ' heading=' + heading);
  }
} finally {
  await browser.close();
}
