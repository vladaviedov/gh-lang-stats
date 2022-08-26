import { Octokit } from "octokit";
import { qlUserId, qlUserCommits, restCommitDetails } from "./github-api.js";

const octokit = new Octokit({
	auth: process.env.ACCESS_KEY
});

const languageMap = new Map();

qlUserId(octokit).then(response => {
	return qlUserCommits(octokit, response.viewer.id);
}).then(response => {
	const repos = response.viewer.repositoriesContributedTo.nodes;
	return getData(repos);
}).then(arr => {
	arr.forEach(x => {
		const files = x.data.files;
		files.forEach(f => {
			const name = f.filename;
			if (name.indexOf(".") < 0 && name[0] != ".") return;
			const ext = name.split(".").pop();
			languageMap.set(ext, languageMap.has(ext) ? languageMap.get(ext) + f.changes : f.changes);
		});
	});
	console.log(languageMap);
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
}
