const PerfLeaderboard = require("../.");

(async function() {
	let urls = [
		"https://www.gatsbyjs.com/",
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
		"https://www.netlify.com/",
	];

	let finalResults = await PerfLeaderboard(urls, 3, {
		beforeHook: function(url) {
			console.log( "hi to ", url );
		},
		afterHook: function(result) {
			console.log( result );
		}
	});
	// console.log( finalResults );
})();