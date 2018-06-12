# craigslist-jobs-scraper

Install dependencies with

> `yarn`

Get all the pages link into `all-pages.txt`

> `yarn scrape get-pages https://sfbay.craigslist.org/d/food-beverage-hospitality/search/fbh all-pages.txt`

Get specific page description into `output.txt`

> `yarn scrape scrape-page "https://sfbay.craigslist.org/search/fbh?s=2280" output.txt`

Get bash script

> `yarn scrape generate-script all-pages.txt output.txt commands.sh`
