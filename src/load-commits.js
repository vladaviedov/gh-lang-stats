const maxConcurrent = 3;
const queue = [];

export const loadCommits = async repos => {
	const promises = repos.map(async r => {
		const commits = await repoCommits(r);
		return {
			languages: r.languages.nodes,
			commits: commits
		};
	});
	
	const repoCommits = await Promise.all(promises);
	return repoCommits;
};

const repoCommits = async repo => {
	const owner = repo.owner.login;
	const name = repo.name;
	const commitHashes = repo.defaultBranchRef.target.history.nodes;

	const promises = commitHashes.map(hash => processHash(owner, name, hash));
	
	const commits = await Promise.all(promises);
	return commits;
};

const processHash = async (owner, name, hash) => {
	// TODO: process hash
};
