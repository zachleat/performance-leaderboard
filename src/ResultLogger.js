const AxeTester = require("./AxeTester");

class ResultLogger {
  constructor() {
    this.results = {};
  }

  set readFromLogs(doRead) {
    this._readFromLogs = doRead;
  }

  get readFromLogs() {
    return this._readFromLogs;
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

  _getGoodKeyCheckSort(a, b, key) {
    if(b[key] && a[key]) {
      return 0;
    } else if(a[key]) {
      return -1;
    } else if(b[key]) {
      return 1;
    }
  }
  _getBadKeyCheckSort(a, b, key) {
    if(b[key] && a[key]) {
      return 0;
    } else if(b[key]) {
      return -1;
    } else if(a[key]) {
      return 1;
    }
  }

  sortByAccessibilityBeforeAxe(a, b) {
    if(a.error || b.error) {
      return this._getBadKeyCheckSort(a, b, "error");
    }

    return b.accessibilityScore - a.accessibilityScore;
  }

  sortByAccessibility(a, b) {
    if(a.error || b.error) {
      return this._getBadKeyCheckSort(a, b, "error");
    }

    if(b.accessibilityScore === a.accessibilityScore) {
      if(!a.axe || !b.axe) {
        return this._getGoodKeyCheckSort(a, b, "axe");
      }

      if(a.axe.error || b.axe.error) {
        return this._getBadKeyCheckSort(a.axe, b.axe, "error");
      }

      if( b.axe.violations === a.axe.violations ) {
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
      return this._getBadKeyCheckSort(a, b, "error");
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
    return {
      url: result.requestedUrl,
      finalUrl: result.finalUrl,
      lighthouseScore: result.categories.performance.score,
      accessibilityScore: result.categories.accessibility.score,
      firstContentfulPaint: result.audits['first-contentful-paint'].numericValue,
      firstMeaningfulPaint: result.audits['first-meaningful-paint'].numericValue,
      speedIndex: result.audits['speed-index'].numericValue,
      diagnostics: result.audits.diagnostics.details.items[0],
      // totalWeight: result.audits.diagnostics.details.items[0].totalByteWeight,
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
    axeTester.readFromLogs = this.readFromLogs;

    await axeTester.start();

    let count = 0;
    let size = Object.keys(this.results).length;
    for(let url in this.results) {
      let result = this.getMedianResultForUrl(url, this.sortByAccessibilityBeforeAxe.bind(this));

      console.log( `Axe scan (${++count} of ${size}) for ${url}` );
      result.axe = await axeTester.getResults(url);
      a11yResults.push(result);
    }

    await axeTester.finish();

    a11yResults.sort(this.sortByAccessibility.bind(this)).forEach((entry, index) => {
      if(entry) {
        for(let perfResult of perfResults) {
          if(perfResult.url === entry.url) {
            entry.accessibilityRank = index + 1;
            perfResult.accessibilityRank = index + 1;
            perfResult.axe = entry.axe;
            return;
          }
        }
      }
    });

    return perfResults;
  }
}

module.exports = ResultLogger;