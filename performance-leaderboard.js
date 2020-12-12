const slugify = require("slugify");
const lighthouse = require("lighthouse");
const chromeLauncher = require("chrome-launcher");
const ResultLogger = require("./src/ResultLogger");
const writeLog = require("./src/WriteLog");
const readLog = require("./src/ReadLog");
const chromePath = require("puppeteer").executablePath()

const NUMBER_OF_RUNS = 3;
const LOG_DIRECTORY = ".log";

async function runLighthouse(urls, numberOfRuns = NUMBER_OF_RUNS, options = {}) {
  let opts = Object.assign({
    writeLogs: true,
    carbonAudit: false,
    logDirectory: LOG_DIRECTORY,
    readFromLogDirectory: false,
    // onlyCategories: ["performance", "accessibility"],
    chromeFlags: ['--headless'],
    freshChrome: "site", // or "run"
    launchOptions: {},
    // callback before each lighthouse test
    beforeHook: function(url) {}, // async compatible
    // callback after each lighthouse result
    afterHook: function(result) {}, // async compatible
    // deprecated
    resultHook: function(result) {}, // async compatible
  }, options);
  let config = null;

  let resultLog = new ResultLogger();
  resultLog.logDirectory = opts.logDirectory;
  resultLog.writeLogs = opts.writeLogs;
  resultLog.readFromLogs = opts.readFromLogDirectory;
  resultLog.carbonAudit = opts.carbonAudit;

  console.log( `Testing ${urls.length} site${urls.length !== 1 ? "s" : ""}:` );

  // SpeedIndex was much lower on repeat runs if we don’t
  // kill the chrome instance between runs of the same site
  for(let j = 0; j < numberOfRuns; j++) {
    let count = 0;
    let chrome;

    if(!opts.readFromLogDirectory && opts.freshChrome === "run") {
      chrome = await chromeLauncher.launch(Object.assign({
        chromeFlags: opts.chromeFlags,
        // reuse puppeteer chrome path
        chromePath: chromePath,
      }, opts.launchOptions));
      opts.port = chrome.port;
    }
    for(let url of urls) {
      if(!opts.readFromLogDirectory && opts.freshChrome === "site") {
        chrome = await chromeLauncher.launch(Object.assign({
          chromeFlags: opts.chromeFlags,
          // reuse puppeteer chrome path
          chromePath: chromePath,
        }, opts.launchOptions));
        opts.port = chrome.port;
      }

      console.log( `(Site ${++count} of ${urls.length}, run ${j+1} of ${numberOfRuns}): ${url}` );

      if(opts.beforeHook && typeof opts.beforeHook === "function") {
        await opts.beforeHook(url);
      }

      try {
        let filename = `lighthouse-${slugify(url)}-${j+1}-of-${numberOfRuns}.json`;
        let rawResult;
        if(opts.readFromLogDirectory) {
          rawResult = readLog(filename, opts.logDirectory);
        } else {
          rawResult = await lighthouse(url, opts, config).then(results => results.lhr);

          if(opts.writeLogs) {
            await writeLog(filename, rawResult, opts.logDirectory);
          }
        }

        let afterHook = opts.afterHook || opts.resultHook; // resultHook is deprecated (renamed)
        if(afterHook && typeof afterHook === "function") {
          await afterHook(resultLog.mapResult(rawResult), rawResult);
        }

        resultLog.add(url, rawResult);
      } catch(e) {
        console.log( `Logged an error with ${url}: `, e );
        resultLog.addError(url, e);
      }

      if(chrome && opts.freshChrome === "site") {
        await chrome.kill();
      }
    }

    if(chrome && opts.freshChrome === "run") {
      // Note that this needs to kill between runs for a fresh chrome profile
      // We don’t want the second run to be a repeat full-cache serviceworker view
      await chrome.kill();
    }
  }

  return await resultLog.getFinalSortedResults();
}

module.exports = runLighthouse;
