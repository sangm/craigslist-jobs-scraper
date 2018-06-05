import puppeteer from 'puppeteer';
import fs from 'fs';

const craigslistPage = process.argv[2];
const filename = process.argv[3];

const logic = async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto(craigslistPage);

  const urls: [string] = await page.evaluate(() => {
    return [...document.querySelectorAll('.result-row > a')].map(anchor => {
      const href = anchor.attributes.getNamedItem('href');
      if (href == null) {
        return '';
      }

      return href.value;
    });
  });

  const descriptions = urls.map(async (url, i) => {
    try {
      const page = await browser.newPage();

      await page.goto(url, {
        waitUntil: 'networkidle0',
        timeout: 240000,
      });

      const description = await page.evaluate(() => {
        const element: HTMLElement | null = document.querySelector(
          '#postingbody'
        );

        if (element) {
          return element.innerText;
        }
        return '';
      });

      await page.close();
      return Promise.resolve(description);
    } catch (e) {
      console.error(e);
      return Promise.resolve('');
    }
  });

  Promise.all(descriptions).then(result => {
    fs.writeFileSync(filename, result.join('\n'));
    browser.close();
  });
};

logic();
