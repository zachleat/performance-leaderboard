const PerfLeaderboard = require("../.");

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