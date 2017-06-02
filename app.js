const request = require('request');
const cheerio = require('cheerio');
const async = require('async');

const HomeUrl = 'https://www.seatguru.com';
const browseAirlinesUrl = 'https://www.seatguru.com/browseairlines/browseairlines.php';

class SeatGuru {

  // set All Airlines Urls
  setRequestUrls(data) {
    return new Promise((resolve) => {
      this.MainPageCheerio(data)
      .then((response) => {
        resolve(response);
      });
    });
  }

  // request
  request(url) {
    return new Promise((resolve, reject) => {
      request(url, (error, response, body) => {
        resolve(body);
      });
    });
  }

  // run All url's request
  AllRequest(urls) {
    return new Promise((resolve, reject) => {
      const arr = [];
      const limit = 4;
      async.eachLimit(urls, limit, (file, cb) => {
        this.request(HomeUrl + file)
        .then((data) => {
          this.EachPageCheerio(data)
          .then((obj) => {
            console.log(obj);
            arr.push(obj);
            cb();
          });
        });
      }, (err) => {
        if (err) throw err;
        resolve(arr);
      });
    });
  }

  // Main Page Selector (for get airlines url)
  MainPageCheerio(data) {
    return new Promise((resolve, reject) => {
      const $ = cheerio.load(data);
      const arr = [];
      $('a', '.browseAirlines').each((i, e) => {
        const item = $(e).attr('href');
        arr.push(item);
      });
      resolve(arr);
    });
  }

  // Each Airline Page Selector (for get each airline's information)
  EachPageCheerio(data) {
    return new Promise((resolve, reject) => {
      const $ = cheerio.load(data);
      const imgUrl = $('img', '.airlineBannerLargeLeft').attr('src');
      const airlineCode = $('.ai-info', '.airlineBannerLargeRight').html();
      const airlineName = $('h1', '.title').text().split('(')[0];
      resolve({ imgUrl, airlineCode, airlineName });
    });
  }
}

const obj = new SeatGuru();
obj.request(browseAirlinesUrl)
.then(data => obj.setRequestUrls(data))
.then(urls => obj.AllRequest(urls))
.then(console.log)
.catch(console.log);
