import { Octokit } from "octokit";
import { qlUserId, qlUserCommits, restCommitDetails } from "./github-api.js";

const octokit = new Octokit({
	auth: process.env.ACCESS_KEY
});

qlUserId(octokit).then(response => {
	return qlUserCommits(octokit, response.viewer.id);
}).then(response => {
	const repos = response.viewer.repositoriesContributedTo.nodes;
	return getData(repos);
}).then(arr => {
	console.log(arr);
	// TODO: do things with data
});

const getData = repos => {
	let promises = [];
	repos.forEach(r => {
		const owner = r.owner.login;
		const repo = r.name;
		
		const commits = r.defaultBranchRef.target.history.nodes;
		commits.forEach(c => {
			promises.push(restCommitDetails(octokit, owner, repo, c.oid));
		});
	});
	return Promise.all(promises);
};
