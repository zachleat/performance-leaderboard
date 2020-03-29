const fsp = require("fs").promises;
const slugify = require("slugify");
const lighthouse = require("lighthouse");
const chromeLauncher = require("chrome-launcher");
const ResultLogger = require("./src/ResultLogger");

const NUMBER_OF_RUNS = 3;

function writeLog(fileSlug, rawResult) {
  let date = new Date().toISOString().substr(0, 10);
  return fsp.writeFile(`log/${date}-${fileSlug}`, JSON.stringify(rawResult, null, 2));
}

async function runLighthouse(urls, numberOfRuns = NUMBER_OF_RUNS) {
  let opts = {
    onlyCategories: ["performance", "accessibility"]
  };
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
        await writeLog(`${slugify(url)}-${j+1}-of-${numberOfRuns}.json`, rawResult);
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