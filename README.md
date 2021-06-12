# performance-leaderboard

A plugin to run Lighthouse against a set of urls to see which site is the fastest.

## Installation

```sh
npm install performance-leaderboard
```

## Features

* Median Run Selection: `performance-leaderboard` will run Lighthouse on the same site multiple times and select the Median run. It factors in First Contentful Paint, Largest Contentful Paint, and Time to Interactive when [selecting the median run](https://github.com/zachleat/performance-leaderboard/blob/master/lib/lh-median-run.js#L55).

## Usage

1. Create a test file, say `sample.js`:

```js
const PerfLeaderboard = require("performance-leaderboard");

(async function() {

	let urls = [
		"https://www.gatsbyjs.org/",
		"https://nextjs.org/",
		"https://www.11ty.dev/",
		"https://vuejs.org/",
		"https://reactjs.org/",
		"https://jekyllrb.com/",
		"https://nuxtjs.org/",
		"https://gohugo.io/",
	];

  // Create the options object (not required)
  const options = {
    writeLogs: true, // Store audit data
    carbonAudit: true, // Carbon audits are disabed by default
    logDirectory: '.log', // Default audit data files stored at `.log`
    readFromLogDirectory: false, // Skip tests with existing logs
    // onlyCategories: ["performance", "accessibility"],
    chromeFlags: ['--headless'],
    freshChrome: "site", // or "run"
    launchOptions: {}, // Puppeteer launch options
  }

	// Run each site 3 times with default options
	console.log( await PerfLeaderboard(urls) );

	// Or run each site 5 times with default options
  console.log( await PerfLeaderboard(urls, 5) );

	// Or run each site 5 times with custom options
	console.log( await PerfLeaderboard(urls, 5, options) );
})();
```

2. Run `node sample.js`.

## Sample Output

```js
[ { url: 'https://www.11ty.dev/',
    requestedUrl: 'https://www.11ty.dev/',
    timestamp: 1595203240682,
    ranks:
     { hundos: 1, performance: 1, accessibility: 1, cumulative: 1 },
    lighthouse:
     { version: '6.1.0',
       performance: 1,
       accessibility: 1,
       bestPractices: 1,
       seo: 1,
       total: 400 },
    firstContentfulPaint: 1222.9119999999998,
    firstMeaningfulPaint: 4687.105999999999,
    speedIndex: 1345.9715418833482,
    largestContentfulPaint: 1222.9119999999998,
    totalBlockingTime: 125.99999999999989,
    cumulativeLayoutShift: 0,
    timeToInteractive: 1398.9119999999998,
    maxPotentialFirstInputDelay: 257.9999999999998,
    timeToFirstByte: 49.84300000000002,
    weight:
     { summary: '21 requests • 80 KiB',
       total: 94115,
       image: 28931,
       imageCount: 17,
       script: 7429,
       scriptCount: 1,
       document: 26378,
       font: 15549,
       fontCount: 1,
       stylesheet: 3196,
       stylesheetCount: 1,
       thirdParty: 15549,
       thirdPartyCount: 1 },
    axe: { passes: 682, violations: 0 },
    carbon:
     { url: "11ty.dev",
       bytes: 123059,
       green: false,
       id: 1591854,
       timestamp: 1600177336,
       statistics: {
         adjustedBytes: 92909,
         energy: 0.00015618348959833383,
         co2: {
           grid: {
             grams: 0.07418715755920857,
             litres: 0.04126289703443181
           },
           renewable: {
             grams: 0.06723491815534086,
             litres: 0.037396061478000585
           }
         }
       },
       cleanerThan: 0.93
     } } ]
```

## Rankings

In the return object you’ll see a `ranks` object listing how this site compares to the other sites in the set. There are a bunch of different scoring algorithms you can choose from:

* `ranks.performance`
	* The highest Lighthouse performance score.
	* Tiebreaker given to the lower SpeedIndex score.
* `ranks.accessibility`
	* The highest Lighthouse accessibility score.
	* Tiebreaker given to lower Axe violations.
	* Second tiebreaker given to highest Axe passes (warning: each instance of an Axe rule passing is treated separately so this will weigh heavily in favor of larger pages)
* `ranks.hundos`
	* The sum of all four Lighthouse scores.
	* Tiebreaker given to the lower Speed Index / Total Page Weight ratio.
* `ranks.cumulative` (the same as `hundos` but with an Axe tiebreaker)
	* The sum of all four Lighthouse scores.
	* Tiebreaker given to the lower Axe violations.
	* Second tiebreaker given to the lower Speed Index / Total Page Weight ratio.

## Carbon Footprint

By default carbon auditing is disabed but can be enabled in the options by setting `{ carbonAudit: true }`. The results then will be available as a `carbon` object, check the sample output above

## Changelog

* `v4.0.0` Major version upgrade of `lighthouse` dependency from v6.5 to v7.2
* `v4.1.0` Update `lighthouse` to v7.3
* `v5.0.0` Update `lighthouse` to v8.0

