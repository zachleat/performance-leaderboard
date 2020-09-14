const axios = require('axios');
const writeLog = require("./WriteLog");
const readLog = require("./ReadLog");
const slugify = require("slugify");

const APIUrl = 'https://api.websitecarbon.com/site?url=';

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

  async fetchNewResults(url) {
    const results = await axios.get(`${APIUrl}${url}`);

    // .then(resp => resp.json())
    // .then(data => console.log(data))
    // .catch(e => console.log(e))
    if(this.writeLogs) {
      await writeLog(this.getLogFilename(url), results.data, this.logDirectory);
    }

    return results;
  }

  async getResults(url) {
    try {
      let readResult = this.getLogResults(url);
      if(this.readFromLogs && readResult !== false) {
        return readResult;
      } else {
        return await this.fetchNewResults(url);
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
