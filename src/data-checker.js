import { analyzeData } from "./analyze.js";
import { qlFullList, rawLinguistYml } from "./github-api.js";
import { loadCommits } from "./load-commits.js";

export const runChecker = async (client, userId, data, nextCheck = new Date()) => {
	const now = new Date();
	if (new Date(nextCheck) <= now) {
		// Generate next check date
		const next = new Date();
		next.setDate(now.getDate() + 28);

		// Get fresh list
		const freshList = await qlFullList(client, userId);

		// Purge & Restore
		const purged = purge(data, freshList);
		const restored = await restore(client, purged, freshList);

		const result = {
			data: restored,
			nextCheck: next
		};

		console.log(`Next check scheduled for ${next}`);
		return result;
	}

	return {
		data: data,
		nextCheck: nextCheck
	};
};

const purge = (data, freshList) => {
	console.log("Starting purge");

	// Make hash arrays
	const storedHashes = data.map(obj => obj.hash);
	const freshHashes = freshList
		.map(repo => repo.defaultBranchRef.target.history.nodes)
		.flat()
		.map(obj => obj.oid);

	// Filter extra items
	const diff = storedHashes.filter(hash => !freshHashes.includes(hash));
	
	if (diff.length > 0) {
		const filteredData = data.filter(obj => !diff.includes(obj.hash));
		console.log(`${diff.length} record(s) purged`);
		console.log("Purge complete");
		return filteredData;
	}

	console.log("Nothing to purge!");
	return data;
};

const restore = async (client, data, freshList) => {
	console.log("Starting restore");

	const storedHashes = data.map(obj => obj.hash);
	const pullList = freshList.filter(repo => {
		const commitsToRestore = repo.defaultBranchRef.target.history.nodes
			.filter(commit => !storedHashes.includes(commit.oid));
		repo.defaultBranchRef.target.history.nodes = commitsToRestore;
		return commitsToRestore.length > 0;
	});

	if (pullList.length > 0) {
		const commits = await loadCommits(client, pullList);
		const analysis = await analyzeData(commits, await rawLinguistYml());
		const newList = [...data, ...analysis];

		console.log(`${newList.length - data.length} record(s) restored`);
		console.log("Restore complete");
		return newList;
	}

	console.log("Nothing to restore!");
	return data;
};
