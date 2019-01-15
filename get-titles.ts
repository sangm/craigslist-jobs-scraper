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
  let count = 0;
  let previousUrl: string = '';

  if (!nextButtonExists) {
    console.log('Next button was not found!');
  }

  while (nextButtonExists) {
    try {
      await page.click(nextButtonSelector);
      if (previousUrl === page.url()) {
        console.log('same page again');
        break;
      }
      previousUrl = page.url();
      count += 1;
      titles = titles.concat(await extractTitles(page, titleSelector));
      nextButtonExists = await page.$(nextButtonSelector) != null;
      console.log(`Going to page: ${count} after 1.2s`);
      await sleep(1200);
    } catch (err) {
      console.log('Some error happpened, exiting gracefully', err);
      break;
    }
  }

  const uniqueTitles = generateUniqueTitles(titles);
  uniqueTitles.forEach(title => {
    console.log(`${title.text}\t${title.link}`);
  })
  browser.close();
}

const url = process.argv[2];
const titleSelector = process.argv[3];
const nextButtonSelector = process.argv[4];

scrapeTitles(url, titleSelector, nextButtonSelector);
