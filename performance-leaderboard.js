const lighthouse = require("lighthouse");
const chromeLauncher = require("chrome-launcher");

const NUMBER_OF_RUNS = 3;

class ResultLogger {
  constructor() {
    this.results = {};
  }

  static sortResultData(a, b) {
    if(b.lighthouseScore === a.lighthouseScore) {
      return a.speedIndex - b.speedIndex;
    }
    return b.lighthouseScore - a.lighthouseScore
  }


  add(url, rawResult) {
    if(!this.results[url]) {
      this.results[url] = [];
    }
    this.results[url].push(this.mapResult(rawResult));
  }

  mapResult(result) {
    if(result.requestedUrl.startsWith("https://github.com/")) {
      return {
        url: result.requestedUrl
      };
    }

    return {
      url: result.requestedUrl,
      finalUrl: result.finalUrl,
      lighthouseScore: result.categories.performance.score,
      firstContentfulPaint: result.audits['first-contentful-paint'].numericValue,
      firstMeaningfulPaint: result.audits['first-meaningful-paint'].numericValue,
      speedIndex: result.audits['speed-index'].numericValue,
    };
  }

  getMedianResultForUrl(url) {
    if(this.results[url] && this.results[url].length) {
      // Log all runs
      // console.log( this.results[url] );
      return this.results[url].filter(() => true).sort(ResultLogger.sortResultData)[Math.floor(this.results[url].length / 2)];
    }
  }

  getFinalSortedResults() {
    let finalResults = [];
    for(let url in this.results) {
      finalResults.push(this.getMedianResultForUrl(url));
    }
    finalResults.sort(ResultLogger.sortResultData).map((entry, index) => {
      entry.rank = index + 1;
      return entry;
    });

    return finalResults;
  }
}

async function runLighthouse(urls, numberOfRuns = NUMBER_OF_RUNS) {
  let opts = {
    onlyCategories: ["performance"]
  };
  let config = null;
  let resultLog = new ResultLogger();

  console.log( `Testing ${urls.length} sites:` );

  // SpeedIndex was much lower on repeat runs if we don’t
  // kill the chrome instance between runs of the same site
  for(let j = 0; j < numberOfRuns; j++) {
    let count = 0;
    let chrome = await chromeLauncher.launch({chromeFlags: opts.chromeFlags});
    opts.port = chrome.port;

    for(let url of urls) {
      console.log( `(Site ${++count} of ${urls.length}, run ${j+1} of ${numberOfRuns}): ${url}` );
      let rawResult = await lighthouse(url, opts, config).then(results => results.lhr);
      resultLog.add(url, rawResult);
    }

    await chrome.kill();
  }

  return resultLog.getFinalSortedResults();
}

module.exports = runLighthouse;