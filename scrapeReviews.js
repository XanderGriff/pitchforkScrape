"use strict";

const axios = require("axios");
const fs = require("fs");
const { JSDOM } = require("JSDOM");
const { promisify } = require("util");

const fsWriteFile = promisify(fs.writeFile.bind(fs));
const fsAppendFile = promisify(fs.appendFile.bind(fs));
const fsReadFile = promisify(fs.readFile.bind(fs));

const REVIEW_URLS_FILENAME = "pitchfork-urls.txt";
const REVIEW_DATA_FILENAME = "pitchfork-data.csv";

const SELECTORS = {
  artist: '.single-album-tombstone__artist-links a',
  albumName: '.single-album-tombstone__review-title',
  score: '.score',
  genre: '.genre-list__link',
  datePosted: '.article-meta--reviews time',
  author: '.authors-detail__display-name',
  authorTitle: '.authors-detail__title',
  labels: '.labels-list li',
  yearReleased: '.single-album-tombstone__meta-year',
  reviewBody: '.contents p', 
  pullQuote: '.review-detail__abstract > p',
  isBestNewMusic: '.bnm-arrows',
  isCollection: '.album-picker',
};

const scrapeReviews = async () => {
  const reviewUrls = await readUrlsFromInputFile();
  await initializeReviewDataFile();
  return extractDataFromReviewPages(reviewUrls);
};

const readUrlsFromInputFile = async () => {
  const rawData = await fsReadFile(REVIEW_URLS_FILENAME, 'utf8')
  return convertFromTextToArray(rawData);
};

const convertFromTextToArray = (listOfLinks) => {
  return listOfLinks.split(/\r?\n/).slice(1);
};

const initializeReviewDataFile = async () => {
  const fileHeader = 'ID,Artist,Album Name,Score,Genre,Date Posted,Author,Author Title,Label,Year Released,Pull Quote,Review Body,Word Count,Is Best New Music,Is Collection\n';
  await fsWriteFile(REVIEW_DATA_FILENAME, fileHeader);
};

const extractDataFromReviewPages = async (listOfLinks) => {
  console.log("starting review extraction");

  for(const [index, link] of listOfLinks.entries()) {
    console.log(`On review ${index}: ${link}`);
    const reviewPage = await fetchGivenPage(link);
    const reviewData = extractDataFromPage(reviewPage, index);
    await writeReviewDataToFile(reviewData);
    await waitASecond();
  }
  console.log("finished url extraction");
};

const fetchGivenPage = async link => {
  const { data: page } = await httpGetPage(link);
  const parsedPage = convertRawTextToDOM(page);
  return parsedPage;
};

const httpGetPage = async link => {
  return axios.get(`https://pitchfork.com${link}`);
};

const convertRawTextToDOM = rawPage => {
  return new JSDOM(rawPage);
};

const extractDataFromPage = (page, index) => {
  const document = page.window.document;

  const reviewData = {
    id: index,
    artist: getTextContentFromDOM(document, SELECTORS.artist),
    albumName: getTextContentFromDOM(document, SELECTORS.albumName),
    score: getTextContentFromDOM(document, SELECTORS.score),
    genre: getTextContentFromDOM(document, SELECTORS.genre),
    datePosted: getDateTimeFromDOM(document, SELECTORS.datePosted),
    author: getTextContentFromDOM(document, SELECTORS.author),
    authorTitle: getTextContentFromDOM(document, SELECTORS.authorTitle),
    labels: getMultipleFields(document, SELECTORS.labels),
    yearReleased: getYearReleased(document, SELECTORS.yearReleased),
    pullQuote: getTextContentFromDOM(document, SELECTORS.pullQuote),
    reviewBody: getMultipleFields(document, SELECTORS.reviewBody),
    wordCount: getWordCount(getMultipleFields(document, SELECTORS.reviewBody)),
    isBestNewMusic: selectorExists(document, SELECTORS.isBestNewMusic),
    isCollection: selectorExists(document, SELECTORS.isCollection),
  }

  return reviewData;
};

const writeReviewDataToFile = async reviewData => {
  const dataToWrite = formatReviewDataForWrite(reviewData);
  await fsAppendFile(REVIEW_DATA_FILENAME, dataToWrite);
};

const formatReviewDataForWrite = reviewData => {
  return Object.values(reviewData).join(",") + "\n";
};

const getTextContentFromDOM = (document, selector) => {
  if(document && document.querySelector(selector)) {
    return sanitizeText(document.querySelector(selector).textContent);
  } else {
    return null;
  }
};

const getDateTimeFromDOM = (document, selector) => {
  if(document && document.querySelector(selector)) {
    return sanitizeText(document.querySelector(selector).dateTime);
  } else {
    return null;
  }
};

const getNodeListFromDOM = (document, selector) => {
  return document.querySelectorAll(selector);
};

const getMultipleFields = (document, selector) => {
  const fields = [];

  const fieldElements = getNodeListFromDOM(document, selector);
  for(let field of fieldElements) {
    fields.push(sanitizeText(field.textContent));
  }

  return fields.join(';');
};

const getYearReleased = (document, selector) => {
  return getTextContentFromDOM(document, selector).replace(/[^\d]/g, '');
}

const getWordCount = (string) => {
  return string.split(' ').length;
};

const selectorExists = (document, selector) => {
  return document.querySelector(selector) !== null;
};

const sanitizeText = (text) => {
  return text.replace(/,/g, '&comma');
}

const waitASecond = async () => {
  await new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, 1000);
  });
};

scrapeReviews();
