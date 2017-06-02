const request = require('request');
const cheerio = require('cheerio');
const async = require('async');
const download = require('image-downloader');
const fs = require('fs');

const HomeUrl = 'https://www.seatguru.com';
const browseAirlinesUrl = 'https://www.seatguru.com/browseairlines/browseairlines.php';

class SeatGuru {
  constructor() {
    this.dir = './images/';
    if (!fs.existsSync(this.dir)) {
      fs.mkdirSync(this.dir);
    }
  }

  // set All Airlines Urls
  setRequestUrls(data) {
    return new Promise((resolve) => {
      this.mainPageCheerio(data)
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
  allRequest(urls) {
    return new Promise((resolve, reject) => {
      const arr = [];
      const limit = 4;
      async.eachLimit(urls, limit, (file, cb) => {
        this.request(HomeUrl + file)
        .then((data) => {
          this.eachPageCheerio(data)
          .then((obj) => {
            console.log(obj);

            // download images to local
            const url = obj.imgUrl;
            const name = obj.airlineName.replace(' ', '_');
            const shortname = obj.imgUrl.split('/')[8];
            const dest = this.dir + name + '_' + shortname;
            this.download(url, dest)
            .then(() => {
              const lastObj = obj;
              lastObj.localUrl = dest;
              arr.push(lastObj);
              cb();
            });
          });
        });
      }, (err) => {
        if (err) throw err;
        resolve(arr);
      });
    });
  }


  download(url, dest) {
    return new Promise((resolve, reject) => {
      const options = { url, dest };
      download.image(options)
        .then(({ filename, image }) => {
          console.log('File saved to', filename);
          resolve();
        }).catch((err) => {
          throw err;
        });
    });
  }
  // Main Page Selector (for get airlines url)
  mainPageCheerio(data) {
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
  eachPageCheerio(data) {
    return new Promise((resolve, reject) => {
      const $ = cheerio.load(data);
      const imgUrl = $('img', '.airlineBannerLargeLeft').attr('src');
      const airlineCode = $('.ai-info', '.airlineBannerLargeRight').html();
      const airlineName = $('h1', '.title').text().split('(')[0].trim();
      resolve({ imgUrl, airlineCode, airlineName });
    });
  }
}

const obj = new SeatGuru();
obj.request(browseAirlinesUrl)
.then(data => obj.setRequestUrls(data))
.then(urls => obj.allRequest(urls))
.then(console.log)
.catch(console.log);
