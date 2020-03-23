class ResultLogger {
  constructor() {
    this.results = {};
  }

  static sortResultData(a, b) {
    if(b.error && a.error) {
      return 0;
    } else if(b.error) {
      return -1;
    } else if(a.error) {
      return 1;
    }

    if(b.lighthouseScore === a.lighthouseScore) {
      return a.speedIndex - b.speedIndex;
    }
    return b.lighthouseScore - a.lighthouseScore
  }

  _add(url, result) {
    if(!this.results[url]) {
      this.results[url] = [];
    }
    this.results[url].push(result);
  }

  add(url, rawResult) {
    let result = this.mapResult(rawResult);
    this._add(url, result);
  }

  addError(url, error) {
    this._add(url, {
      url: url,
      error: JSON.stringify(error)
    });
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
      if(entry) {
        entry.rank = index + 1;
      }
      return entry;
    });

    return finalResults;
  }
}

module.exports = ResultLogger;