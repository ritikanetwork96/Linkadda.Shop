import puppeteer from 'puppeteer';

async function main() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      console.log(`[CONSOLE ${msg.type().toUpperCase()}]:`, msg.text());
    }
  });

  page.on('pageerror', err => {
    console.log('[PAGE ERROR]:', err.message);
  });

  console.log('Navigating to storefront...');
  await page.goto('http://localhost:8000/index.html');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  await browser.close();
  console.log('Done.');
}

main().catch(console.error);
