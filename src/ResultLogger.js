class ResultLogger {
  constructor() {
    this.results = {};
  }

  _getErrorSort(a, b) {
    if(b.error && a.error) {
      return 0;
    } else if(b.error) {
      return -1;
    } else if(a.error) {
      return 1;
    }
  }

  sortByAccessibility(a, b) {
    if(a.error || b.error) {
      return this._getErrorSort(a, b);
    }

    if(b.accessibilityScore === a.accessibilityScore) {
      return this.sortByPerformance(a, b);
    }
    return b.accessibilityScore - a.accessibilityScore;
  }

  sortByPerformance(a, b) {
    if(a.error || b.error) {
      return this._getErrorSort(a, b);
    }

    if(b.lighthouseScore === a.lighthouseScore) {
      // lower speed index scores are better
      return a.speedIndex - b.speedIndex;
    }
    // higher lighthouse scores are better
    return b.lighthouseScore - a.lighthouseScore;
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
      accessibilityScore: result.categories.accessibility.score,
      firstContentfulPaint: result.audits['first-contentful-paint'].numericValue,
      firstMeaningfulPaint: result.audits['first-meaningful-paint'].numericValue,
      speedIndex: result.audits['speed-index'].numericValue,
      totalWeight: result.audits['speed-index'].numericValue,
      diagnostics: result.audits.diagnostics.details.items[0],
      // TODO size of HTML, JS, CSS, Web Fonts
      // weights: {
      //   mainDocument: result.audits.diagnostics.details.items[0].mainDocumentTransferSize
      // }
    };
  }

  getMedianResultForUrl(url, sortFn) {
    if(this.results[url] && this.results[url].length) {
      // Log all runs
      // console.log( this.results[url] );
      return this.results[url].filter(() => true).sort(sortFn)[Math.floor(this.results[url].length / 2)];
    }
  }

  getFinalSortedResults() {
    let perfResults = [];
    let sortFn = this.sortByPerformance.bind(this);
    for(let url in this.results) {
      perfResults.push(this.getMedianResultForUrl(url, sortFn));
    }
    perfResults.sort(sortFn).map((entry, index) => {
      if(entry) {
        entry.rank = index + 1;
        entry.performanceRank = index + 1;
      }
      return entry;
    });

    // Insert accessibilityRank into perfResults
    let a11yResults = [];
    sortFn = this.sortByAccessibility.bind(this);
    for(let url in this.results) {
      a11yResults.push(this.getMedianResultForUrl(url, sortFn));
    }
    a11yResults.sort(sortFn).forEach((entry, index) => {
      if(entry) {
        for(let perfResult of perfResults) {
          if(perfResult.url === entry.url) {
            entry.accessibilityRank = index + 1;
            perfResult.accessibilityRank = index + 1;
            return;
          }
        }
      }
    });

    return perfResults;
  }
}

module.exports = ResultLogger;