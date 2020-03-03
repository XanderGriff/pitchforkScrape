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
  const fileHeader = 'Artist,Album Name,Score,Genre,Date Posted,Author,Author Title,Label,Year Released,Album Art Description,Review Body';
  await fsWriteFile(REVIEW_DATA_FILENAME, fileHeader);
};

const extractDataFromReviewPages = async (listOfLinks) => {
  console.log("starting review extraction");

  for(link in listOfLinks) {
    console.log(`On review: ${link}`);
    const reviewPage = await fetchGivenPage(currentPageNum);

    const reviewData = extractDataFromPage(reviewPage);
    await writeUrlsToFile(reviewData);
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

const extractDataFromPage = page => {
  // const document = page.document;

  // const reviewData = {
  //   artist: document.querySelector(),
  //   albumName: document.querySelector(),
  //   score: document.querySelector(),
  //   genre: document.querySelector(),
  //   datePosted: formatDate(document.querySelector()),
  //   author: document.querySelector(),
  //   authorTitle: document.querySelector(),
  //   label: document.querySelector(),
  //   yearReleased: document.querySelector(),
  //   albumArtDescription: document.querySelector(),
  //   reviewBody: document.querySelector(),
  // }

  // return reviewData;
};

const formatDate = (date) => {

};

const waitASecond = async () => {
  await new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, 1000);
  });
};

scrapeReviews();
