const PerfLeaderboard = require("../.");

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
})();