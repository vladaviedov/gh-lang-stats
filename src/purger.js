export const runPurger = (data, freshList, nextPurge = new Date()) => {
	const now = new Date();
	if (nextPurge <= now) {
		const next = new Date();
		next.setDate(now.getDate() + 28);

		const result = {
			data: purge(data, freshList),
			nextPurge: next
		};

		console.log(`Next purge scheduled for ${next}`);
		return result;
	}

	return {
		data: data,
		nextPurge: nextPurge
	};
};

export const purge = (data, freshList) => {
	console.log("Starting purge");

	const storedHashes = data.map(obj => obj.hash);
	const freshHashes = freshList
		.map(repo => repo.defaultBranchRef.target.history.nodes)
		.flat()
		.map(obj => obj.oid);

	const diff = storedHashes.filter(hash => !freshHashes.includes(hash));
	const filteredData = data.filter(obj => !diff.includes(obj.hash));
	
	console.log(`${data.length - filteredData.length} record(s) purged`);
	console.log("Purge complete");
	return filteredData;
};
