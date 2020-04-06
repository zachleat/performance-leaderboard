const { AxePuppeteer } = require("axe-puppeteer");
const puppeteer = require("puppeteer");
const writeLog = require("./WriteLog");
const readLog = require("./ReadLog");
const slugify = require("slugify");
 
class AxeTester {
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

  async start() {
    this.browser = await puppeteer.launch();
  }

  getLogFilename(url) {
    return `axe-${slugify(url)}.json`;
  }

  cleanResults(rawResults) {
    return {
      passes: rawResults.passes.length,
      violations: rawResults.violations.length
    }
  }

  getLogResults(url) {
    let rawResults = readLog(this.getLogFilename(url), this.logDirectory);
    return this.cleanResults(rawResults);
  }

  async fetchNewResults(url) {
    this.page = await this.browser.newPage();
    await this.page.setBypassCSP(true);
    await this.page.goto(url, {
      waitUntil: ["load", "networkidle0"]
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
      if(this.readFromLogs) {
        return this.getLogResults(url);
      } else {
        return await fetchNewResults(url);
      }
    } catch(e) {
      console.log( `Axe error with ${url}`, e );
      if(this.page) {
        await this.page.close();
      }

      return {
        error: e
      }
    }
  }

  async finish() {
    await this.browser.close()
  }
}
module.exports = AxeTester;