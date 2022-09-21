#!/usr/bin/env node
import { Octokit } from "octokit";
import { analyzeData } from "./analyze.js";
import { fillTemplate } from "./fill-template.js";
import { qlUserId, qlFullList, restCommitInfo } from "./github-api.js";

const octokit = new Octokit({
	auth: process.env.ACCESS_KEY
});

qlUserId(octokit).then(id => {
	return qlFullList(octokit, id);
}).then(async response => {
	const repos = response.nodes;
	const commitList = [];

	for (let i in repos) {
		const commits = await repoCommits(repos[i]);
		commitList.push({
			languages: repos[i].languages.nodes,
			commits: commits
		});
	}

	return commitList;
}).then(analyzeData).then(fillTemplate);

const repoCommits = repo => {
	const owner = repo.owner.login;
	const name = repo.name;
	const commitHashes = repo.defaultBranchRef.target.history.nodes;

	const promises = [];
	commitHashes.forEach(hash => {
		promises.push(restCommitInfo(octokit, owner, name, hash.oid));
	});
	return Promise.all(promises);
};
