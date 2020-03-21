# performance-leaderboard

A plugin to run Lighthouse against a set of urls to see which site is the fastest.

## Installation

```sh
npm install performance-leaderboard
```

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
		"https://amp.dev/"
	];

	console.log( await PerfLeaderboard(urls) );

	// Run each site 5 times (default is 3)
	console.log( await PerfLeaderboard(urls, 5) );
})();
```

2. Run `node sample.js`.