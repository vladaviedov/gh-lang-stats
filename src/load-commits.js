import { restCommitInfo } from "./github-api.js";

const maxConcurrent = 5;
const queue = [];

export const loadCommits = async (client, repos) => {
	const promises = repos.map(async r => {
		const commits = await repoCommits(client, r);
		return {
			languages: r.languages.nodes,
			commits: commits
		};
	});
	
	processQueue();
	
	const result = await Promise.all(promises);
	return result;
};

const repoCommits = async (client, repo) => {
	const owner = repo.owner.login;
	const name = repo.name;
	const commitHashes = repo.defaultBranchRef.target.history.nodes;

	const promises = commitHashes.map(hash => enqueueHash(client, owner, name, hash.oid));
	
	const commits = await Promise.all(promises);
	return commits;
};

const enqueueHash = (client, owner, name, hash) => {
	return new Promise(resolve => {
		queue.push({
			func: () => restCommitInfo(client, owner, name, hash),
			callback: resolve
		});
	});
};

const processQueue = async () => {
	const workers = [];

	// Start initial workers
	for (let i = 0; i < maxConcurrent; i++) {
		workers.push(worker(queue.pop(), i));
	}

	while (queue.length > 0) {
		// Wait for free slot
		const res = await Promise.any(workers);
		workers[res] = worker(queue.pop(), res);
	}
};

const worker = async (request, index) => {
	const response = await request.func();
	request.callback(response);
	return index;
};
