// const puppeteer = require("puppeteer");
const fs = require("fs");
const axios = require("axios");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const { promisify } = require("util");
const fsOpen = promisify(fs.open.bind(fs));
const fsWriteFile = promisify(fs.writeFile.bind(fs));
const fsAppendFile = promisify(fs.appendFile.bind(fs));

const FILENAME_URI = "pitchfork-urls.txt";

const REVIEW_LINK_SELECTOR = ".review > a";

const getUrls = async () => {
  await initializeUrlFile();
  await extractUrlsFromReviewPages();
}

const initializeUrlFile = async () => {
  await fsOpen(FILENAME_URI);
  await fsWriteFile(FILENAME_URI, "Pitchfork URLS");
};

const extractUrlsFromReviewPages = async () => {
  console.log('starting url extraction')
  let thereAreMoreReviews = true;
  let currentPageNum = 1;

  while (thereAreMoreReviews) {
    console.log(`On page ${currentPageNum}`);
    const [ reviewPage, httpStatus ] = await fetchGivenPage(currentPageNum);

    const urls = extractUrlsFromPage(reviewPage);
    await writeUrlsToFile(urls);
    await waitTwoSeconds();

    thereAreMoreReviews = checkForMoreReviews(httpStatus);
    currentPageNum++;
  }
  console.log('finished url extraction');
};

const fetchGivenPage = async (pageNum) => {
  const { data: page, status: responseStatusCode } = await httpGetPage(pageNum);
  const parsedPage = convertRawTextToDOM(page);
  return [ parsedPage, responseStatusCode ];
}

const httpGetPage = async (pageNum) => {
  let response;
  try {
    response = await axios.get(`https://pitchfork.com/reviews/albums/?page=${pageNum}`);
  } catch (err) {
    response = { data: null, status: 404 };
  }
  return response
};

const waitTwoSeconds = async () => {
  await new Promise(resolve => {
    setTimeout(() => {
      resolve()
    }, 2000);
  });
};

const convertRawTextToDOM = (rawPage) => {
  return new JSDOM(rawPage);
};

const extractUrlsFromPage = (page) => {
  const links = [];
  const linkSelectors = page.window.document.querySelectorAll(REVIEW_LINK_SELECTOR);
  for(let linkSelector of linkSelectors) {
    links.push(linkSelector.href);
  }
  return links;
};

const writeUrlsToFile = async (urls) => {
  const urlsToWrite = formatUrlsForWrite(urls);
  await fsAppendFile(FILENAME_URI, urlsToWrite);
};

const formatUrlsForWrite = (urlsToFormat) => {
  return "\n" + urlsToFormat.join("\n");
};

const checkForMoreReviews = (status) => {
  return status !== 404;
};

getUrls();

/* 
  Compare the list of 50 highest rated albums in a year to the 50 best albums
  do by genre as well

  Can you find the release year for every album?

  Readers poll?

  Per author scores?

  sentiment?

  seasonality?

  number of reviews?

  trends in genre?

  length of review to score?

  can u get metadata on the album?

  get links to how often they're mentioned on the site

  pre/post acquisition

  pre/post-editorship

  time series? best new music?

  attributes:
    * title
    * author
    * body
    * date
    * genre
    * bnm?
    * collection?
    * alt text
    * word count
    * label
    * release year
    * writer status
*/
