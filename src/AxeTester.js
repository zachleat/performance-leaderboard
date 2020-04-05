const { AxePuppeteer } = require("axe-puppeteer");
const puppeteer = require("puppeteer");
const writeLog = require("./WriteLog");
const slugify = require("slugify");
 
class AxeTester {
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
    this.page = await this.browser.newPage();
    await this.page.setBypassCSP(true);
  }

  async fetchResults(url) {
    await this.page.goto(url);
    const results = await new AxePuppeteer(this.page).analyze();
    // TODO log results to .log/
    if(this.writeLogs) {
      await writeLog(`axe-${slugify(url)}.json`, results, this.logDirectory);
    }
    return {
      passes: results.passes.length,
      violations: results.violations.length
    };
  }

  async finish() {
    await this.page.close()
    await this.browser.close()
  }
}
module.exports = AxeTester;