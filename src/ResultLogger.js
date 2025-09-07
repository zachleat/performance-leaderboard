const lodashGet = require("lodash.get");
const byteSize = require('byte-size');

const AxeTester = require("./AxeTester.js");
const LighthouseMedianRun = require("../lib/lh-median-run.js");
const log = require("./LogUtil.js");

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

  set axePuppeteerTimeout(timeout) {
    this._axePuppeteerTimeout = timeout;
  }

  get axePuppeteerTimeout() {
    return this._axePuppeteerTimeout;
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
  _getUndefinedCheckSort(a, b) {
    if(b === undefined && a === undefined) {
      return 0;
    } else if(b === undefined) {
      return -1;
    } else if(a === undefined) {
      return 1;
    }
  }

  sortByAccessibilityBeforeAxe(a, b) {
    if(a.error || b.error) {
      return this._getBadKeyCheckSort(a, b, "error");
    }

    // We want the lowest score here
    return (a?.lighthouse?.accessibility || 0) - (b?.lighthouse?.accessibility || 0);
  }

  sortByAccessibility(a, b) {
    if(a.error || b.error) {
      return this._getBadKeyCheckSort(a, b, "error");
    }

    if(b?.lighthouse?.accessibility === a?.lighthouse?.accessibility) {
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

    return b?.lighthouse?.accessibility - a?.lighthouse?.accessibility;
  }

  sortByPerformance(a, b) {
    if(a.error || b.error) {
      return this._getBadKeyCheckSort(a, b, "error");
    }

    if(b?.lighthouse?.performance === a?.lighthouse?.performance) {
      // lower speed index scores are better
      return a.speedIndex - b.speedIndex;
    }
    // higher lighthouse scores are better
    return b?.lighthouse?.performance - a?.lighthouse?.performance;
  }

  // image, script, document, font, stylesheets only (no videos, no third parties)
  getTiebreakerWeight(result) {
    let upperLimitImages = 400000; // bytes
    let upperLimitFonts = 100000; // bytes

    return result.weight.document +
      result.weight.stylesheet +
      result.weight.script +
      Math.min(result.weight.font, upperLimitFonts) +
      Math.min(result.weight.image, upperLimitImages);
  }

  // speed index per KB
  // low speed index with high weight is more impressive 😇 (lower is better)
  // also add in TTFB and TBT
  getTiebreakerValue(result) {
    let weight = this.getTiebreakerWeight(result);
    return 50000 * result.speedIndex / weight + result.timeToFirstByte + result.totalBlockingTime;
  }

  getLighthouseSum(result) {
    return result?.lighthouse?.performance + result?.lighthouse?.accessibility + result?.lighthouse?.seo + result?.lighthouse?.bestPractices;
  }

  sortByTotalHundos(a, b) {
    if(a.error || b.error) {
      return this._getBadKeyCheckSort(a, b, "error");
    }

    let bSum = this.getLighthouseSum(b);
    let aSum = this.getLighthouseSum(a);
    if(bSum === aSum) {
      // lower is better
      return this.getTiebreakerValue(a) - this.getTiebreakerValue(b);
    }

    // higher is better
    return bSum - aSum;
  }

  sortByCumulativeScore(a, b) {
    if(a.error || b.error) {
      return this._getBadKeyCheckSort(a, b, "error");
    }

    let bSum = this.getLighthouseSum(b);
    let aSum = this.getLighthouseSum(a);
    if(bSum === aSum) {
      if(a.axe === undefined || b.axe === undefined) {
        return this._getUndefinedCheckSort(a.axe, b.axe);
      }
      if(a.axe.error || b.axe.error) {
        return this._getBadKeyCheckSort(a.axe, b.axe, "error");
      }

      if(a.axe.violations !== b.axe.violations) {
        // lower violations are better
        return a.axe.violations - b.axe.violations;
      }

      // lower is better
      return this.getTiebreakerValue(a) - this.getTiebreakerValue(b);
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

  _getResultResourceSummaryItem(items, resourceType, prop) {
    let count = 0;
    let size = 0;
    if(items && items.length) {
      let subItems = items;
      if(resourceType) {
        subItems = items.filter(entry => {
          return (entry.resourceType || "").toLowerCase() === resourceType.toLowerCase();
        });
      }

      for(let item of subItems) {
        count++;
        size += item.transferSize;
      }
    }
    // prop: transferSize, requestCount
    if(prop === "transferSize") {
      return size;
    }
    if(prop === "requestCount") {
      return count;
    }
    return NaN;
  }

  mapResult(result) {
    let category = result?.categories;
    if(!category) {
      return {
        url: result.finalUrl,
        error: "Unknown error (no result categories)."
      };
    }

    // Bad certificate, maybe
    if(!category?.performance?.score &&
      !category?.accessibility?.score &&
      !category?.['best-practices']?.score &&
      !category?.seo?.score) {
      return {
        url: result.finalUrl,
        error: "Unknown error (no scores)."
      };
    }


    let requestSummary = {
      requestCount: 0,
      transferSize: 0,
    };

    let networkItems = result.audits['network-requests'].details.items;
    for (let request of networkItems) {
      requestSummary.requestCount += 1;
      requestSummary.transferSize += request.transferSize;
    }
    // 27 requests • 209 KiB
    let normalizedTransferSize = byteSize(requestSummary.transferSize, { units: 'iec' });
    let requestSummaryDisplayValue = `${requestSummary.requestCount} request${requestSummary.requestCount !== 1 ? "s" : ""} • ${normalizedTransferSize.value} ${normalizedTransferSize.unit}`;

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
        seo: result.categories.seo.score,
        total: result.categories.performance.score * 100 +
          result.categories.accessibility.score * 100 +
          result.categories['best-practices'].score * 100 +
          result.categories.seo.score * 100
      },
      firstContentfulPaint: result.audits['first-contentful-paint'].numericValue,
      firstMeaningfulPaint: result.audits['first-meaningful-paint'].numericValue,
      speedIndex: result.audits['speed-index'].numericValue,
      largestContentfulPaint: result.audits['largest-contentful-paint'].numericValue,
      totalBlockingTime: result.audits['total-blocking-time'].numericValue,
      cumulativeLayoutShift: result.audits['cumulative-layout-shift'].numericValue,
      timeToInteractive: result.audits['interactive'].numericValue,
      maxPotentialFirstInputDelay: result.audits['max-potential-fid'].numericValue,
      timeToFirstByte: result.audits['server-response-time'].numericValue,
      weight: {
        summary: requestSummaryDisplayValue,
        total: result.audits['total-byte-weight'].numericValue,
        image: this._getResultResourceSummaryItem(networkItems, "image", "transferSize"),
        imageCount: this._getResultResourceSummaryItem(networkItems, "image", "requestCount"),
        script: this._getResultResourceSummaryItem(networkItems, "script", "transferSize"),
        scriptCount: this._getResultResourceSummaryItem(networkItems, "script", "requestCount"),
        document: this._getResultResourceSummaryItem(networkItems, "document", "transferSize"),
        font: this._getResultResourceSummaryItem(networkItems, "font", "transferSize"),
        fontCount: this._getResultResourceSummaryItem(networkItems, "font", "requestCount"),
        stylesheet: this._getResultResourceSummaryItem(networkItems, "stylesheet", "transferSize"),
        stylesheetCount: this._getResultResourceSummaryItem(networkItems, "stylesheet", "requestCount"),
        thirdParty: this._getResultResourceSummaryItem(result.audits['third-party-summary'].details?.items, false, "transferSize"),
        thirdPartyCount: this._getResultResourceSummaryItem(result.audits['third-party-summary'].details?.items, false, "requestCount"),
      },
    };
  }

  getMedianResultForUrl(url) {
    if(this.results[url] && this.results[url].length) {
      let goodResults = this.results[url].filter(entry => entry && !entry.error && entry?.lighthouse?.performance !== null);

      goodResults = goodResults.map((entry, j) => {
        entry.run = {
          number: j + 1,
          total: goodResults.length
        };
        return entry;
      })

      if(!goodResults.length) {
        // if they’re all errors just return the first
        return this.results[url][0];
      }

      return LighthouseMedianRun.computeMedianRun(goodResults, url);
    }
  }

  getLowestResultForUrl(url, sortFn) {
    if(this.results[url] && this.results[url].length) {
      let results = this.results[url].filter(entry => entry && !entry.error).sort(sortFn);
      return results.length ? results[0] : null;
    }
  }

  async getFinalSortedResults() {
    let perfResults = [];
    // let errorResults = [];
    for(let url in this.results) {
      let result = this.getMedianResultForUrl(url);
      // if(result.error) {
        // errorResults.push(result);
      // } else {
        perfResults.push(result);
      // }
    }

    let sortByHundosFn = this.sortByTotalHundos.bind(this);
    perfResults.sort(sortByHundosFn).map((entry, index) => {
      if(entry && entry.ranks) {
        entry.ranks.hundos = index + 1;
      }
      return entry;
    });

    // Side quests
    let sideQuestProperties = [
      "-weight.total",
      "+weight.total",
      "-weight.document",
      "+weight.document",
      "-weight.script",
      "+weight.script",
      "-weight.image",
      "+weight.image",
      "-weight.font",
      "+weight.font",
      "+weight.fontCount",
      "-timeToFirstByte",
      "-totalBlockingTime",
      "-largestContentfulPaint",
    ];

    for(let prop of sideQuestProperties) {
      let [order, key] = [prop.slice(0, 1), prop.slice(1)];

      let incrementRank = 1;
      let incrementRankValue;

      perfResults.sort((a, b) => {
        if(order === "-") { // ascending, lower is better
          return lodashGet(a, key) - lodashGet(b, key);
        } else { // order === "+", descending, higher is better
          return lodashGet(b, key) - lodashGet(a, key);
        }
      }).map((entry, index) => {
        if(!entry.sidequests) {
          entry.sidequests = {};
        }

        let value = lodashGet(entry, key);
        if(!incrementRankValue) {
          incrementRankValue = value;
        } else if(incrementRankValue !== value) {
          incrementRank++;
        }

        entry.sidequests[prop] = incrementRank;
        incrementRankValue = value;

        return entry;
      });
    }

    let sortByPerfFn = this.sortByPerformance.bind(this);
    perfResults.sort(sortByPerfFn).map((entry, index) => {
      if(entry && entry.ranks) {
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
    axeTester.puppeteerTimeout = this.axePuppeteerTimeout;
    axeTester.bypassAxe = this.bypassAxe;

    await axeTester.start();

    let count = 0;
    let size = Object.keys(this.results).length;
    for(let url in this.results) {
      let result = this.getLowestResultForUrl(url, this.sortByAccessibilityBeforeAxe.bind(this));

      if(result) {
        log(`Axe scan ${++count}/${size}: ${url}`);
        result.axe = await axeTester.getResults(url);

        a11yResults.push(result);
      }
    }

    await axeTester.finish();

    a11yResults.sort(this.sortByAccessibility.bind(this));

    let a11yRank = 1;
    for(let a11yResult of a11yResults) {
      for(let perfResult of perfResults) {
        if(perfResult.url === a11yResult.url) {
          // overwrite the original Accessibility Score
          // as the lowest a11y result of X runs may be different than the median performance result from X runs
          if(perfResult) {
            if(perfResult.lighthouse) {
              perfResult.lighthouse.accessibility = a11yResult.lighthouse.accessibility;
            }
            if(perfResult.ranks) {
              perfResult.ranks.accessibility = a11yRank;
            }
            perfResult.axe = a11yResult.axe;
          }
        }
      }

      a11yRank++;
    }

    // Cumulative Score (must run after axe scores)
    let sortByCumulativeFn = this.sortByCumulativeScore.bind(this);
    perfResults.sort(sortByCumulativeFn).map((entry, index) => {
      if(entry && entry.ranks) {
        entry.ranks.cumulative = index + 1;
      }
      return entry;
    });

    return perfResults;
  }
}

module.exports = ResultLogger;
