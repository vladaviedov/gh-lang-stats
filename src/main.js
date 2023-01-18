#!/usr/bin/env node
import { Octokit } from "octokit";
import { throttling } from "@octokit/plugin-throttling";
import { analyzeData, aggregate } from "./analyze.js";
import { fillTemplate } from "./fill-template.js";
import { qlUserId, qlFullList, qlListFrom } from "./github-api.js";
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

const main = async () => {
	const userId = await qlUserId(octokit);
	
	// Check storage
	const dataStorage = retrieveStorage();
	const list = dataStorage ?
		await qlListFrom(octokit, userId, dataStorage.timestamp) :
		await qlFullList(octokit, userId);

	// Process commits
	const commits = await loadCommits(octokit, list);
	const analysis = await analyzeData(commits);
	const combined = dataStorage ?
		[...dataStorage.analysis, ...analysis] :
		analysis;

	console.log(aggregate(analysis));
	console.log(aggregate(combined));

	// let analysis;

	// if (dataStorage == null) {
	// 	const list = await qlFullList(octokit, userId);
	// 	const commits = await loadCommits(octokit, list);
		
	// 	analysis = await analyzeData(commits);
	// 	fillTemplate(analysis, null);
	// } else {
	// 	const newList = await qlListFrom(octokit, userId, dataStorage.timestamp);
	// 	const newCommits = await loadCommits(octokit, newList);
	// 	const newAnalysis = await analyzeData(newCommits);

	// 	analysis = combineData(dataStorage.analysis, newAnalysis);
	// 	fillTemplate(analysis, newAnalysis);
	// }
	
	updateStorage(combined);
};

main();
