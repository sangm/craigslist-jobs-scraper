import puppeteer from 'puppeteer';
import fs from 'fs';

type SupportedModes = "get-pages" | "scrape-page" | "generate-script"
// Since we only support "scrapePage" or "getPages", something like
// `commander.js` is probably over-kill.
const mode: SupportedModes = process.argv[2] as SupportedModes;

const scrapePage = async (craigslistPage: string, filename: string) => {
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
    fs.writeFileSync(filename, result.join('\n\n================================================\n\n'));
    browser.close();
  });
};

const getPages = async (craigslistPage: string, filename: string) => {
  const browser = await puppeteer.launch({ slowMo: 100, args: ['--no-sandbox'] });
  const nextButtonSelector = '.button.next';
  const page = await browser.newPage();
  let urls: string[] = [];
  await page.goto(craigslistPage);

  try {
    while (true) {
      urls.push(page.url());
      const nextButtonExists: boolean = await page.$(nextButtonSelector) != null;
      if (nextButtonExists) {
        await page.click(nextButtonSelector);
      } else {
        break;
      }
    }
  } catch (e) {
    console.log(e);
  }

  fs.appendFileSync(filename, '\n');
  fs.appendFileSync(filename, urls.join('\n'));
  browser.close()
}

const scrapePages = async (inputFileName: string, outputFileName: string, resultFileName: string) => {
  const urlStrings = fs.readFileSync(inputFileName, 'utf-8');
  const urls: string[] = urlStrings
    .split('\n')
    .filter(Boolean)
    .map(url => `yarn scrape scrape-page ${url} ${outputFileName}`);
  fs.writeFileSync(resultFileName, urls.join('\n'));
};

if (process.argv.length === 5 || process.argv.length === 6) {
  if (mode === 'scrape-page') {
    const craigslistPage = process.argv[3];
    const filename = process.argv[4];
    scrapePage(craigslistPage, filename);
  } else if(mode === 'get-pages') {
    const craigslistPage = process.argv[3];
    const filename = process.argv[4];
    getPages(craigslistPage, filename);
  } else if (mode === 'generate-script') {
    const urlFile = process.argv[3];
    const outputFileName = process.argv[4];
    scrapePages(urlFile, outputFileName, process.argv[5]);
  } else {
    console.log('Mode not supported');
  }
} else {
  console.log('Wrong number of args');
}
