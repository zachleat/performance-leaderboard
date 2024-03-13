const slugify = require("slugify");
const chromePuppeteerPath = require("puppeteer").executablePath();

const ResultLogger = require("./src/ResultLogger.js");
const writeLog = require("./src/WriteLog.js");
const readLog = require("./src/ReadLog.js");
const log = require("./src/LogUtil.js");

const NUMBER_OF_RUNS = 3;
const LOG_DIRECTORY = ".log";
const AXE_PUPPETEER_TIMEOUT = 30000;

// Fix for `ProtocolError: Protocol error (Target.getTargetInfo): 'Target.getTargetInfo' wasn't found`
process.on("unhandledRejection", (error, promise) => {
  log("Unhandled rejection in promise", error);
});

async function runLighthouse(urls, numberOfRuns = NUMBER_OF_RUNS, options = {}) {
  const chromeLauncher = await import("chrome-launcher");
  const { default: lighthouse } = await import("lighthouse");

  let opts = Object.assign({
    writeLogs: true,
    logDirectory: LOG_DIRECTORY,
    readFromLogDirectory: false,
    axePuppeteerTimeout: AXE_PUPPETEER_TIMEOUT,
    bypassAxe: [], // skip axe checks
    // onlyCategories: ["performance", "accessibility"],
    chromeFlags: [
      '--headless',
      '--disable-dev-shm-usage',
      '--ignore-certificate-errors',
      '--no-enable-error-reporting',
    ],
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
  resultLog.axePuppeteerTimeout = opts.axePuppeteerTimeout;
  resultLog.bypassAxe = opts.bypassAxe;

  log( `Testing ${urls.length} site${urls.length !== 1 ? "s" : ""}:` );

  // SpeedIndex was much lower on repeat runs if we don’t
  // kill the chrome instance between runs of the same site
  for(let j = 0; j < numberOfRuns; j++) {
    let count = 0;
    let chrome;
    let portNumber;

    if(!opts.readFromLogDirectory && opts.freshChrome === "run") {
      chrome = await chromeLauncher.launch(Object.assign({
        chromeFlags: opts.chromeFlags,
        // reuse puppeteer chrome path
        chromePath: chromePuppeteerPath,
      }, opts.launchOptions));

      portNumber = chrome.port;
    }
    for(let url of urls) {
      if(!opts.readFromLogDirectory && opts.freshChrome === "site") {
        chrome = await chromeLauncher.launch(Object.assign({
          chromeFlags: opts.chromeFlags,
          // reuse puppeteer chrome path
          chromePath: chromePuppeteerPath,
        }, opts.launchOptions));

        portNumber = chrome.port;
      }

      log( `Lighthouse ${++count}/${urls.length} Run ${j+1}/${numberOfRuns}: ${url}` );

      if(opts.beforeHook && typeof opts.beforeHook === "function") {
        await opts.beforeHook(url);
      }

      try {
        slugify.extend({":": "-", "/": "-"});
        let filename = `lighthouse-${slugify(url)}-${j+1}-of-${numberOfRuns}.json`;
        let rawResult;
        if(opts.readFromLogDirectory) {
          rawResult = readLog(filename, opts.logDirectory);
        } else {
          let { lhr } = await lighthouse(url, {
            // logLevel: "info",
            port: portNumber,
          }, config);

          rawResult = lhr;

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
        log( `Logged an error with ${url}: `, e );
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
