// node
const fs = require('fs');
const path = require('path');

// npm
const request = require('request');
const cheerio = require('cheerio');
const async = require('async');
const download = require('image-downloader');

const HomeUrl = 'https://www.seatguru.com';
const browseAirlinesUrl = 'https://www.seatguru.com/browseairlines/browseairlines.php';

class SeatGuru {
  constructor(outputDir) {
    this.dir = outputDir;
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
//    console.log(url);
    return new Promise((resolve, reject) => {
      request(url, (error, response, body) => {
        resolve(body);
      });
    });
  }

  postRequest(url, form) {
    return new Promise((resolve, reject) => {
      request.post({
        url,
        form,
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
      }, (err, httpResponse, body) => {
        if (err) {
//          console.error('upload failed:', err);
          throw err;
        }
        resolve(body);
//        console.log('Post successful!  Server responded with:', body);
      });
    });
  }

  // run All url's request
  allRequest(urls) {
    console.log(urls);
    return new Promise((resolve, reject) => {
      const limit = 4;
      async.eachLimit(urls, limit, (file, cb) => {
        this.request(HomeUrl + file)
        .then((data) => {
          this.eachPageCheerio(data)
          .then((obj) => {
//            console.log(obj);

            // download images to local
            const url = obj.imgUrl;
            const name = obj.airlineName.replace(' ', '_');
            const image = obj.imgUrl.split('/')[8];
            const dest = this.dir + name + '_' + image;
            const formData = {
              name: obj.airlineName,
              image: dest,
              short_code: obj.airlineCode,
            };
            this.download(url, dest)
            .then(() => { cb(); });
          });
        });
      }, (err) => {
        if (err) throw err;
        resolve('All process finished!');
      });
    });
  }


  download(url, dest) {
    return new Promise((resolve, reject) => {
      const options = { url, dest };
      download.image(options)
        .then(({ filename, image }) => {
//          console.log('File saved to', filename);
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
      const aircraftSummaries = $('div.chartsTitle').filter((i, el) => /aircraft summary/i.test($(el).text()) === false)
      const aircraftObj = {};
      aircraftSummaries.each((i, el) => {
        const planeType = $(el).find('h3').text().replace('KEY', '');
        aircraftObj[planeType] = [];

        const aircraftSeats = $(el).next().find('.aircraft_seats > a');
        aircraftSeats.each((i, el) => {
          const aircraft = $(el).text().match(/([^(]+) \(([^)]+)\)/);
          const name = aircraft[1];
          const code = aircraft[2];
          const aircraftInfo = { name, code };
          aircraftObj[planeType].push(aircraftInfo);
        })

        const aircraftAmenitiesList = $(el).next().find('.amenities-list');
        aircraftAmenitiesList.each((i, el) => {
          const aircraftAmenities = $(el).find('.sprite-amenities');
          aircraftAmenities.each((j, el) => {
            const amenity = $(el).removeClass('sprite-amenities').attr('class').replace('sprite-', '');
            aircraftObj[planeType][i][amenity] = true;
          })
        })
      })

      console.log(JSON.stringify({ [airlineCode]: aircraftObj }, null, 2));
      resolve({ imgUrl, airlineCode, airlineName });
    });
  }
}

const obj = new SeatGuru('./seatguru');
obj.request(browseAirlinesUrl)
.then(data => obj.setRequestUrls(data))
.then(urls => obj.allRequest(urls))
////.then(console.log)
//.catch(console.log);
