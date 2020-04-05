const AxeTester = require("./AxeTester");

class ResultLogger {
  constructor() {
    this.results = {};
  }

  set writeLogs(doWrite) {
    this._writeLogs = doWrite;
  }

  get writeLogs() {
    return this._writeLogs;
  }

  set logDirectory(dir) {
    this._logDir = dir;
  }

  get logDirectory() {
    return this._logDir;
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
      if( b.axe.violtions === a.axe.violations ) {
        // higher is better
        // TODO if this is equal, sort by performance?
        return b.axe.passes - a.axe.passes;
      }

      // lower is better
      return a.axe.violations - b.axe.violations;
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
      totalWeight: result.audits.diagnostics.details.items[0].totalByteWeight,
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

  async getFinalSortedResults() {
    let perfResults = [];
    let sortByPerfFn = this.sortByPerformance.bind(this);
    for(let url in this.results) {
      perfResults.push(this.getMedianResultForUrl(url, sortByPerfFn));
    }
    perfResults.sort(sortByPerfFn).map((entry, index) => {
      if(entry) {
        entry.rank = index + 1;
        entry.performanceRank = index + 1;
      }
      return entry;
    });

    // Insert accessibilityRank into perfResults
    let a11yResults = [];
    let axeTester = new AxeTester();
    axeTester.logDirectory = this.logDirectory;
    axeTester.writeLogs = this.writeLogs;

    await axeTester.start();

    let sortByA11yFn = this.sortByAccessibility.bind(this);
    for(let url in this.results) {
      let result = this.getMedianResultForUrl(url, sortByA11yFn);
      result.axe = await axeTester.fetchResults(url);
      a11yResults.push(result);
    }

    await axeTester.finish();

    a11yResults.sort(sortByA11yFn).forEach((entry, index) => {
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