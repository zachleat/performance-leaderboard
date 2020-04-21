const PerfLeaderboard = require("../.");

(async function() {
	let urls = [
		"https://www.gatsbyjs.org/",
		"https://www.11ty.dev/",
		// "https://vuejs.org/",
		// "https://reactjs.org/",
		// "https://nextjs.org/",
		// "https://amp.dev/",
		// "https://jekyllrb.com/",
		// "https://nuxtjs.org/",
		// "https://gridsome.org/",
		// "https://svelte.dev/",
		// "https://gohugo.io/",
		// "https://redwoodjs.com/"
	];

	console.log( await PerfLeaderboard(urls, 5) );
})();