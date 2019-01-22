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

const scrapeTitles = async (url: string, titleSelector: string, nextButtonSelector: string, nextPageRequest: string, sleepTime?: number) => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  // page.on('console', consoleObj => console.log(consoleObj.text()));

  await page.goto(url);
  await page.waitForSelector(nextButtonSelector);
  await page.setRequestInterception(true);

  let titles: Array<ScrapedData> = await extractTitles(page, titleSelector);
  let previousUrl: string = '';
  let previousAjaxRequestUrl: string = '';
  let ajaxRequestUrl: string = '';

  page.on('request', request => {
    if (nextPageRequest !== '' && request.url().includes(nextPageRequest)) {
      ajaxRequestUrl = request.url();
    }

    request.continue();
  });

  while (true) {
    try {
      const pageUrl = page.url();
      if (!nextPageRequest && previousUrl === pageUrl) {
        console.log('Exiting due to the same page again', previousUrl);
        break;
      }

      previousUrl = pageUrl;

      if (nextPageRequest) {
        console.log(`Scraping ${ajaxRequestUrl}`);
      } else {
        console.log(`Scraping ${pageUrl}`);
      }

      await page.waitForSelector(nextButtonSelector, { timeout: 15000 });
      await page.waitForSelector(titleSelector, { timeout: 15000 });

      titles = titles.concat(await extractTitles(page, titleSelector));
      await page.click(nextButtonSelector);

      if (nextPageRequest && previousAjaxRequestUrl === ajaxRequestUrl) {
        console.log('End of page', ajaxRequestUrl);
        break;
      }

      previousAjaxRequestUrl = ajaxRequestUrl;
      if (sleepTime) {
        await sleep(sleepTime * 1000);
      }
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
const nextPageRequest = process.argv[5];
const sleepTime: string = process.argv[6];

console.log(url, titleSelector, nextButtonSelector, nextPageRequest, sleepTime)

scrapeTitles(url, titleSelector, nextButtonSelector, nextPageRequest || '', parseInt(sleepTime) || undefined);
