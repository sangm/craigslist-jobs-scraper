import puppeteer from 'puppeteer';

interface ScrapedData {
  text: string
  link: string
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const extractTitles = async (page: puppeteer.Page, selector: string): Promise<[ScrapedData]> => {
  return await page.evaluate((selector) => {
    return [...document.querySelectorAll(selector)].map(node => ({ text: node.innerText, link: node.href }));
  }, selector);
}

const generateUniqueTitles = (titles: Array<ScrapedData>): Array<ScrapedData> => {
  const cache: { [key: string]: boolean } = { }
  const result: Array<ScrapedData> = [];

  titles.forEach(title => {
    if (!(title.text in cache)) {
      result.push(title);
      cache[title.text] = true;
    }
  })

  return result;
}

const scrapeTitles = async (url: string, titleSelector: string, nextButtonSelector: string) => {

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  // page.on('console', consoleObj => console.log(consoleObj.text()));

  await page.goto(url);
  await page.waitForSelector(nextButtonSelector);

  let nextButtonExists: boolean = await page.$(nextButtonSelector) != null;
  let titles: Array<ScrapedData> = await extractTitles(page, titleSelector);
  let previousUrl: string = '';

  if (!nextButtonExists) {
    console.log('Next button was not found!');
  }

  while (true) {
    try {
      if (previousUrl === page.url()) {
        console.log('Exiting due to the same page again', previousUrl);
        break;
      }
      previousUrl = page.url();
      console.log(`Scraping ${page.url()}`);

      await page.waitForSelector(nextButtonSelector, { timeout: 15000 });
      titles = titles.concat(await extractTitles(page, titleSelector));
      await page.click(nextButtonSelector);
    } catch(err) {
      console.log('Error happened. Exiting gracefully: ', err);
      break;
    }
  }

  const uniqueTitles = generateUniqueTitles(titles);
  uniqueTitles
    .sort((a, b) => a.text <= b.text ? -1 : 1)
    .forEach(title => {
      console.log(`${title.text}\t${title.link}`);
    })
  browser.close();
}

const url = process.argv[2];
const titleSelector = process.argv[3];
const nextButtonSelector = process.argv[4];

scrapeTitles(url, titleSelector, nextButtonSelector);
