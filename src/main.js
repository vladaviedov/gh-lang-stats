#!/usr/bin/env node
import { Octokit } from "octokit";
import { throttling } from "@octokit/plugin-throttling";
import { analyzeData } from "./analyze.js";
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

const combineData = (oldData, newData) => {
	Object.keys(newData).forEach(lang => {
		if (lang == "Total") {
			oldData.Total += newData.Total;
			return;
		}
		
		if (oldData[lang]) {
			oldData[lang].changes += newData[lang].changes;
		} else {
			oldData[lang] = newData[lang];
		}
	});
	
	return oldData;
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
		const newList = await qlListFrom(octokit, userId, dataStorage.timestamp);
		const newCommits = await loadCommits(octokit, newList);
		const newAnalysis = await analyzeData(newCommits);
		
		analysis = combineData(dataStorage.analysis, newAnalysis);
	}
	
	updateStorage(analysis);
	fillTemplate(analysis);
};

main();
