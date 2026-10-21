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

  // Pinterest reviews the exact Main URL, not just the Privacy Policy.
  // Public product details must be visible to a brand-new, signed-out visitor.
  const rootUrl=base+'/';
  const rootResponse=await page.goto(rootUrl,{waitUntil:'domcontentloaded',timeout:30000});
  if(!rootResponse || rootResponse.status()!==200)
    throw new Error('LIVE_PUBLIC_HOME_HTTP_FAILED '+rootUrl);
  const rootHtml=await rootResponse.text();
  if(!rootHtml.includes('NestAffiliate — inteligência de afiliados e criação de Pins'))
    throw new Error('LIVE_PUBLIC_HOME_HTML_NOT_CRAWLABLE '+rootUrl);
  await page.locator('.public-home-hero h1').waitFor({state:'visible',timeout:30000});
  const rootText=await page.locator('main').innerText();
  if(!rootText.includes('NestAffiliate') || !rootText.includes('MillionsNest') ||
     await page.locator('.login-card').count()!==0)
    throw new Error('LIVE_PUBLIC_HOME_AUTH_WALL '+rootUrl);
  if(await page.locator('a[href="/privacy"]').count()===0 ||
     await page.locator('a[href="/login"]').count()===0)
    throw new Error('LIVE_PUBLIC_HOME_MISSING_LINKS '+rootUrl);
  console.log('NESTAFFILIATE_LIVE_PUBLIC_HOME_OK='+rootUrl);

  const aboutUrl=base+'/about';
  const aboutResponse=await page.goto(aboutUrl,{waitUntil:'domcontentloaded',timeout:30000});
  if(!aboutResponse || aboutResponse.status()!==200)
    throw new Error('LIVE_PUBLIC_ABOUT_HTTP_FAILED '+aboutUrl);
  await page.locator('.public-home-hero h1').waitFor({state:'visible',timeout:20000});
  console.log('NESTAFFILIATE_LIVE_PUBLIC_ABOUT_OK='+aboutUrl);
} finally {
  await browser.close();
}
