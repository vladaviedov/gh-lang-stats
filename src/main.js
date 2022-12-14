#!/usr/bin/env node
import { Octokit } from "octokit";
import { throttling } from "@octokit/plugin-throttling";
import { analyzeData } from "./analyze.js";
import { fillTemplate } from "./fill-template.js";
import { qlUserId, qlFullList, qlNewList } from "./github-api.js";
import { loadCommits } from "./load-commits.js";
import { config } from "./config.js";
import { retrieveStorage, updateStorage } from "./cache.js";

const OctokitPlug = Octokit.plugin(throttling);
const octokit = new OctokitPlug({
	auth: config.token,
	throttle: {
		onRateLimit: retryAfter => {
			console.error(`Ratelimit hit. Waiting ${retryAfter} seconds`);
			return true;
		},
		onSecondaryRateLimit: retryAfter => {
			console.error(`Secondary ratelimit hit. Waiting ${retryAfter} seconds`);
			return true;
		}
	}
});

const combineData = (oldData, newData) => {
	// TODO: implement
	return null;
};

const main = async () => {
	const userId = await qlUserId(octokit);
	
	const dataStorage = retrieveStorage();
	let analysis;

	if (dataStorage == null) {
		const list = await qlFullList(octokit, userId);
		const commits = await loadCommits(octokit, list);
		analysis = await analyzeData(commits);
	} else {
		const newList = await qlNewList(octokit, userId, dataStorage.timestamp);
		const newCommits = await loadCommits(octokit, newList);
		const newAnalysis = await analyzeData(newCommits);
		
		analysis = combineData(dataStorage.analysis, newAnalysis);
	}
	
	updateStorage(analysis);
	fillTemplate(analysis);
};

main();
