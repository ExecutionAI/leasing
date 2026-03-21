import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CHROME = 'C:/Users/execu/.cache/puppeteer/chrome/win64-146.0.7680.31/chrome-win64/chrome.exe';
const URL = 'http://localhost:3000';

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile',  width: 375,  height: 812 },
];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox'],
});

for (const vp of viewports) {
  const page = await browser.newPage();
  await page.setViewport({ width: vp.width, height: vp.height });
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 15000 });

  // Trigger all IntersectionObservers by scrolling through the page
  await page.evaluate(async () => {
    await new Promise(resolve => {
      const distance = 400;
      const delay = 80;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        if (window.scrollY + window.innerHeight >= document.body.scrollHeight) {
          clearInterval(timer);
          window.scrollTo(0, 0);
          resolve();
        }
      }, delay);
    });
  });

  // Wait for reveal animations to complete
  await new Promise(r => setTimeout(r, 1200));

  // Full-page screenshot
  const outPath = path.join(__dirname, `screenshot-${vp.name}.png`);
  await page.screenshot({ path: outPath, fullPage: true });
  console.log(`Saved: ${outPath}`);

  await page.close();
}

await browser.close();
