const { co2 } = require('@tgwf/co2')
const writeLog = require("./WriteLog");
const readLog = require("./ReadLog");
const slugify = require("slugify");

class CarbonTester {
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

  async start() { return; }

  getLogFilename(url) {
    return `carbon-${slugify(url)}.json`;
  }

  cleanResults(rawResults) {
    return rawResults
  }

  getLogResults(url) {
    let rawResults = readLog(this.getLogFilename(url), this.logDirectory);
    if (rawResults === false) {
      return false;
    }
    return rawResults;
  }

  async calculateNewResult(url, totalWeight) {
    let results;

    try {
        const emissions = new co2({ model: "swd" });
        results = emissions.perByte(totalWeight);

      if(this.writeLogs && results) {
        await writeLog(this.getLogFilename(url), results, this.logDirectory);
      }
    } catch (e) {
      console.log( `Carbon Audit error with ${url}`, e );
    }

    return results;
  }

  async getResults(url, totalWeight) {
    try {
      let readResult = this.getLogResults(url);
      if(this.readFromLogs && readResult !== false) {
        return readResult;
      } else {
        return await this.calculateNewResult(url, totalWeight);
      }
    } catch (e) {
      console.log(`Carbon API error with ${url}`, e);

      return {
        error: e
      }
    }
  }

  async finish() { return; }
}
module.exports = CarbonTester;