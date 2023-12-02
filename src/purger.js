export const purge = (data, freshList) => {
	console.log("Starting purge");

	const storedHashes = data.map(obj => obj.hash);
	const freshHashes = freshList
		.map(repo => repo.defaultBranchRef.target.history.nodes)
		.flat()
		.map(obj => obj.oid);

	const diff = storedHashes.filter(hash => !freshHashes.includes(hash))
	const filteredData = data.filter(obj => !diff.includes(obj.hash));
	
	console.log(`${data.length - filteredData.length} record(s) purged`);
	console.log("Purge complete");
	return filteredData;
};
