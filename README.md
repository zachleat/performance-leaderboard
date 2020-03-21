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
	let urls = new Set();

	urls.add("https://www.gatsbyjs.org/");
	urls.add("https://nextjs.org/");
	urls.add("https://www.11ty.dev/");
	urls.add("https://vuejs.org/");
	urls.add("https://reactjs.org/");
	urls.add("https://amp.dev/");

	console.log( await PerfLeaderboard(Array.from(urls)) );
})();
```

2. Run `node sample.js`.