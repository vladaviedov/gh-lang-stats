import { Octokit } from "octokit";
import { qlUserId, qlUserCommits, restCommitDetails } from "./github-api.js";

const octokit = new Octokit({
	auth: process.env.ACCESS_KEY
});

qlUserId(octokit).then(response => {
	return qlUserCommits(octokit, response.viewer.id);
}).then(response => {
	const repos = response.viewer.repositoriesContributedTo.nodes;
	return Promise.all(repos.map(async r => {
		return {
			languages: r.languages.nodes,
			commits: await repoCommits(r)
		};
	}));
}).then(details => {
	console.log(details);
});

const repoCommits = repo => {
	const owner = repo.owner.login;
	const name = repo.name;
	const commitHashes = repo.defaultBranchRef.target.history.nodes;

	const promises = [];
	commitHashes.forEach(hash => {
		promises.push(restCommitDetails(octokit, owner, name, hash.oid));
	});
	return Promise.all(promises);
};
