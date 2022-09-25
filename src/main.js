#!/usr/bin/env node
import { Octokit } from "octokit";
import { analyzeData } from "./analyze.js";
import { fillTemplate } from "./fill-template.js";
import { qlUserId, qlFullList } from "./github-api.js";
import { loadCommits } from "./load-commits.js";

const octokit = new Octokit({
	auth: process.env.ACCESS_KEY
});

qlUserId(octokit)
	.then(id => qlFullList(octokit, id))
	.then(list => loadCommits(octokit, list))
	.then(analyzeData)
	.then(fillTemplate);
