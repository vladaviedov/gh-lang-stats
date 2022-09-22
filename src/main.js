#!/usr/bin/env node
import { Octokit } from "octokit";
import { analyzeData } from "./analyze.js";
import { fillTemplate } from "./fill-template.js";
import { qlUserId, qlFullList, restCommitInfo } from "./github-api.js";

const octokit = new Octokit({
	auth: process.env.ACCESS_KEY
});

const loadCommits = async repos => {
	const repoList = [];

	for (let i in repos) {
		const commits = await repoCommits(repos[i]);
		repoList.push({
			languages: repos[i].languages.nodes,
			commits: commits
		});
	}

	return repoList;
};


const repoCommits = async repo => {
	const owner = repo.owner.login;
	const name = repo.name;
	const commitHashes = repo.defaultBranchRef.target.history.nodes;

	const commits = [];

	for (let i in commitHashes) {
		const res = await restCommitInfo(octokit, owner, name, commitHashes[i].oid);
		commits.push(res);
	}
	
	return commits;
};

qlUserId(octokit)
	.then(id => qlFullList(octokit, id))
	.then(loadCommits)
	.then(analyzeData)
	.then(fillTemplate);
