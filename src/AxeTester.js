const slugify = require("slugify");
const puppeteer = require("puppeteer");
const { AxePuppeteer } = require("@axe-core/puppeteer");

const writeLog = require("./WriteLog.js");
const readLog = require("./ReadLog.js");
const log = require("./LogUtil.js");

class AxeTester {
  constructor() {
    this.bypassAxe = [];
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

  set puppeteerTimeout(timeout) {
    this._puppeteerTimeout = timeout;
  }

  get puppeteerTimeout() {
    return this._puppeteerTimeout;
  }

  set logDirectory(dir) {
    this._logDir = dir;
  }

  get logDirectory() {
    return this._logDir;
  }

  async start() {
    this.browser = await puppeteer.launch({
      headless: "new"
    });
  }

  getLogFilename(url) {
    return `axe-${slugify(url)}.json`;
  }

  count(rawResults, key) {
    let count = 0;
    for(let entry of rawResults[key]) {
      if(entry.nodes.length) {
        count += entry.nodes.length;
      } else {
        count++;
      }
    }
    return count;
  }

  cleanResults(rawResults) {
    return {
      passes: this.count(rawResults, "passes"),
      violations: this.count(rawResults, "violations")
    }
  }

  getLogResults(url) {
    let rawResults = readLog(this.getLogFilename(url), this.logDirectory);
    if(rawResults === false) {
      return false;
    }
    return this.cleanResults(rawResults);
  }

  async fetchNewResults(url) {
    if((this.bypassAxe || []).includes(url)) {
      return {
        error: "Skipping via configuration option."
      }
    }

    this.page = await this.browser.newPage();
    await this.page.setBypassCSP(true);
    await this.page.goto(url, {
      waitUntil: ["load", "networkidle0"],
      timeout: this.puppeteerTimeout
    });

    const results = await new AxePuppeteer(this.page).analyze();
    if(this.writeLogs) {
      await writeLog(this.getLogFilename(url), results, this.logDirectory);
    }
    await this.page.close();

    return this.cleanResults(results);
  }

  async getResults(url) {
    try {
      let readResult = this.getLogResults(url);
      if(this.readFromLogs && readResult !== false) {
        return readResult;
      } else {
        return await this.fetchNewResults(url);
      }
    } catch(e) {
      log( `Axe error with ${url}`, e );
      if(this.page) {
        await this.page.close();
      }

      return {
        error: JSON.stringify(e)
      }
    }
  }

  async finish() {
    await this.browser.close()
  }
}
module.exports = AxeTester;
