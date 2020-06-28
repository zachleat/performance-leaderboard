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

    // We want the lowest score here
    return a.lighthouse.accessibility - b.lighthouse.accessibility;
  }

  sortByAccessibility(a, b) {
    if(a.error || b.error) {
      return this._getBadKeyCheckSort(a, b, "error");
    }

    if(b.lighthouse.accessibility === a.lighthouse.accessibility) {
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

    return b.lighthouse.accessibility - a.lighthouse.accessibility;
  }

  sortByPerformance(a, b) {
    if(a.error || b.error) {
      return this._getBadKeyCheckSort(a, b, "error");
    }

    if(b.lighthouse.performance === a.lighthouse.performance) {
      // lower speed index scores are better
      return a.speedIndex - b.speedIndex;
    }
    // higher lighthouse scores are better
    return b.lighthouse.performance - a.lighthouse.performance;
  }

  sortByTotalHundos(a, b) {
    if(a.error || b.error) {
      return this._getBadKeyCheckSort(a, b, "error");
    }

    let bSum = b.lighthouse.performance + b.lighthouse.accessibility + b.lighthouse.seo + b.lighthouse.bestPractices;
    let aSum = a.lighthouse.performance + a.lighthouse.accessibility + a.lighthouse.seo + a.lighthouse.bestPractices;
    if(bSum === aSum) {
      // speed index per KB
      // lower is better

      // low speed index with high weight is more impressive 😇
      return a.speedIndex / a.weight.total - b.speedIndex / b.weight.total;
    }

    // higher is better
    return bSum - aSum;
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
      url: result.finalUrl,
      requestedUrl: result.requestedUrl,
      timestamp: Date.now(),
      ranks: {},
      lighthouse: {
        version: result.lighthouseVersion,
        performance: result.categories.performance.score,
        accessibility: result.categories.accessibility.score,
        bestPractices: result.categories['best-practices'].score,
        seo: result.categories['seo'].score,
      },
      firstContentfulPaint: result.audits['first-contentful-paint'].numericValue,
      speedIndex: result.audits['speed-index'].numericValue,
      largestContentfulPaint: result.audits['largest-contentful-paint'].numericValue,
      totalBlockingTime: result.audits['total-blocking-time'].numericValue,
      cumulativeLayoutShift: result.audits['cumulative-layout-shift'].numericValue,
      timeToInteractive: result.audits['interactive'].numericValue,
      maxPotentialFirstInputDelay: result.audits['max-potential-fid'].numericValue,
      timeToFirstByte: result.audits['server-response-time'].numericValue,
      weight: {
        summary: result.audits['resource-summary'].displayValue,
        total: result.audits.diagnostics.details.items[0].totalByteWeight,
        image: result.audits['resource-summary'].details.items.filter(entry => entry.resourceType === 'image')[0].transferSize,
        imageCount: result.audits['resource-summary'].details.items.filter(entry => entry.resourceType === 'image')[0].requestCount,
        script: result.audits['resource-summary'].details.items.filter(entry => entry.resourceType === 'script')[0].transferSize,
        scriptCount: result.audits['resource-summary'].details.items.filter(entry => entry.resourceType === 'script')[0].requestCount,
        document: result.audits['resource-summary'].details.items.filter(entry => entry.resourceType === 'document')[0].transferSize,
        font: result.audits['resource-summary'].details.items.filter(entry => entry.resourceType === 'font')[0].transferSize,
        fontCount: result.audits['resource-summary'].details.items.filter(entry => entry.resourceType === 'font')[0].requestCount,
        thirdParty: result.audits['resource-summary'].details.items.filter(entry => entry.resourceType === 'third-party')[0].transferSize,
        thirdPartyCount: result.audits['resource-summary'].details.items.filter(entry => entry.resourceType === 'third-party')[0].requestCount,
      },
    };
  }

  getMedianResultForUrl(url, sortFn) {
    if(this.results[url] && this.results[url].length) {
      // Log all runs
      // console.log( this.results[url] );
      return this.results[url].filter(() => true).sort(sortFn)[Math.floor(this.results[url].length / 2)];
    }
  }

  getLowestResultForUrl(url, sortFn) {
    if(this.results[url] && this.results[url].length) {
      return this.results[url].filter(() => true).sort(sortFn)[0];
    }
  }

  async getFinalSortedResults() {
    let perfResults = [];
    let sortByPerfFn = this.sortByPerformance.bind(this);
    for(let url in this.results) {
      perfResults.push(this.getMedianResultForUrl(url, sortByPerfFn));
    }

    let sortByHundosFn = this.sortByTotalHundos.bind(this);
    perfResults.sort(sortByHundosFn).map((entry, index) => {
      if(entry) {
        entry.ranks.hundos = index + 1;
      }
      return entry;
    });

    perfResults.sort(sortByPerfFn).map((entry, index) => {
      if(entry) {
        entry.ranks.performance = index + 1;
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
      let result = this.getLowestResultForUrl(url, this.sortByAccessibilityBeforeAxe.bind(this));

      console.log( `Axe scan (${++count} of ${size}) for ${url}` );
      result.axe = await axeTester.getResults(url);
      a11yResults.push(result);
    }

    await axeTester.finish();

    a11yResults.sort(this.sortByAccessibility.bind(this));

    let a11yRank = 1;
    for(let a11yResult of a11yResults) {
      for(let perfResult of perfResults) {
        if(perfResult.url === a11yResult.url) {
          // overwrite the original Accessibility Score
          // as the lowest a11y result of X runs may be different than the median performance result from X runs
          perfResult.lighthouse.accessibility = a11yResult.lighthouse.accessibility;
          perfResult.ranks.accessibility = a11yRank;
          perfResult.axe = a11yResult.axe;
        }
      }
      a11yRank++;
    }

    return perfResults;
  }
}

module.exports = ResultLogger;