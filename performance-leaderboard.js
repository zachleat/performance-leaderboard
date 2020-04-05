const slugify = require("slugify");
const lighthouse = require("lighthouse");
const chromeLauncher = require("chrome-launcher");
const ResultLogger = require("./src/ResultLogger");
const writeLog = require("./src/WriteLog");

const NUMBER_OF_RUNS = 3;
const LOG_DIRECTORY = ".log";


async function runLighthouse(urls, numberOfRuns = NUMBER_OF_RUNS, options = {}) {
  let opts = Object.assign({
    writeLogs: true,
    logDirectory: LOG_DIRECTORY,
    onlyCategories: ["performance", "accessibility"],
    chromeFlags: ['--headless']
  }, options);
  let config = null;

  let resultLog = new ResultLogger();
  resultLog.logDirectory = opts.logDirectory;
  resultLog.writeLogs = opts.writeLogs;

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
          await writeLog(`lighthouse-${slugify(url)}-${j+1}-of-${numberOfRuns}.json`, rawResult, opts.logDirectory);
        }
      } catch(e) {
        console.log( `Logged an error with ${url}: `, e );
        resultLog.addError(url, e);
      }
    }

    // Note that this needs to kill between runs for a fresh chrome profile
    // We don’t want the second run to be a repeat full-cache serviceworker view
    await chrome.kill();
  }

  return await resultLog.getFinalSortedResults();
}

module.exports = runLighthouse;