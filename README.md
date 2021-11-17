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
		axePuppeteerTimeout: 30000, // 30 seconds
		writeLogs: true, // Store audit data
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

<details>
<summary>Sample Output</summary>

```js
[
	{
		url: 'https://www.11ty.dev/',
		requestedUrl: 'https://www.11ty.dev/',
		timestamp: 1623525988492,
		ranks: { hundos: 1, performance: 1, accessibility: 1, cumulative: 1 },
		lighthouse: {
			version: '8.0.0',
			performance: 1,
			accessibility: 1,
			bestPractices: 1,
			seo: 1,
			total: 400
		},
		firstContentfulPaint: 1152.3029999999999,
		firstMeaningfulPaint: 1152.3029999999999,
		speedIndex: 1152.3029999999999,
		largestContentfulPaint: 1152.3029999999999,
		totalBlockingTime: 36,
		cumulativeLayoutShift: 0.02153049045138889,
		timeToInteractive: 1238.3029999999999,
		maxPotentialFirstInputDelay: 97,
		timeToFirstByte: 54.63900000000001,
		weight: {
			summary: '14 requests • 178 KiB',
			total: 182145,
			image: 124327,
			imageCount: 10,
			script: 7824,
			scriptCount: 1,
			document: 30431,
			font: 15649,
			fontCount: 1,
			stylesheet: 3914,
			stylesheetCount: 1,
			thirdParty: 15649,
			thirdPartyCount: 1
		},
		run: { number: 2, total: 3 },
		axe: { passes: 850, violations: 0 },
	}
]
```

</details>

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

## Changelog

* `v4.0.0` Major version upgrade of `lighthouse` dependency from v6.5 to v7.2
* `v4.1.0` Update `lighthouse` to v7.3
* `v5.0.0` Update `lighthouse` to v8.0
* `v5.1.0` Adds `axePuppeteerTimeout` option. Adds `carbonAudit` option.
* `v5.2.0` Update `lighthouse` from v8.0 to v8.2
* `v5.3.0` Update `lighthouse` from v8.2 to v8.5
* `v9.0.0` Update `lighthouse` to v9.0. Removes `carbonAudit`, upstream API was removed.
