import puppeteer from 'puppeteer';

const logic = async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://sfbay.craigslist.org/search/fbh');

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

      console.log(description);
      await page.close();
      return Promise.resolve(description);
    } catch (e) {
      console.error(e);
      return Promise.resolve('');
    }
  });

  Promise.all(descriptions).then(result => {
    browser.close();
  });
};

logic();
