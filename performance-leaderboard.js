const fs = require("fs-extra");
const path = require("path");
const slugify = require("slugify");
const lighthouse = require("lighthouse");
const chromeLauncher = require("chrome-launcher");
const ResultLogger = require("./src/ResultLogger");

const NUMBER_OF_RUNS = 3;
const LOG_DIRECTORY = ".log";

async function writeLog(fileSlug, rawResult, logDirectory) {
  let date = new Date().toISOString().substr(0, 10);
  let dir = path.join(path.resolve("."), logDirectory, date);
  await fs.ensureDir(dir);

  let filepath = path.join(dir, `${fileSlug}`);
  return fs.writeJson(filepath, rawResult, { spaces: 2 });
}

async function runLighthouse(urls, numberOfRuns = NUMBER_OF_RUNS, options = {}) {
  let opts = Object.assign({
    writeLogs: true,
    logDirectory: LOG_DIRECTORY,
    onlyCategories: ["performance", "accessibility"],
    chromeFlags: ['--headless']
  }, options);
  let config = null;
  let resultLog = new ResultLogger();

  console.log( `Testing ${urls.length} sites:` );

  // SpeedIndex was much lower on repeat runs if we don’t
  // kill the chrome instance between runs of the same site
  for(let j = 0; j < numberOfRuns; j++) {
    let count = 0;
    let chrome = await chromeLauncher.launch({chromeFlags: opts.chromeFlags});
    opts.port = chrome.port;

    for(let url of urls) {
      console.log( `(Site ${++count} of ${urls.length}, run ${j+1} of ${numberOfRuns}): ${url}` );
      try {
        let rawResult = await lighthouse(url, opts, config).then(results => results.lhr);
        resultLog.add(url, rawResult);
        if(opts.writeLogs) {
          await writeLog(`${slugify(url)}-${j+1}-of-${numberOfRuns}.json`, rawResult, opts.logDirectory);
        }
      } catch(e) {
        console.log( `Logged an error with ${url}: `, e );
        resultLog.addError(url, e);
      }
    }

    await chrome.kill();
  }

  return resultLog.getFinalSortedResults();
}

module.exports = runLighthouse;