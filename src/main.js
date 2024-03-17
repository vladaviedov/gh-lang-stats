#!/usr/bin/env node
import { Octokit } from "octokit";
import { throttling } from "@octokit/plugin-throttling";
import { analyzeData } from "./analyze.js";
import { fillTemplate } from "./fill-template.js";
import { qlUserId, qlFullList, qlListFrom, rawLinguistYml } from "./github-api.js";
import { loadCommits } from "./load-commits.js";
import { config } from "./config.js";
import { retrieveStorage, updateStorage } from "./cache.js";
import { runChecker } from "./data-checker.js";

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

const aggregate = data => {
	return data.reduce((total, commit) => {
		Object.keys(commit.changes).forEach(lang => {
			total[lang] = (total[lang] ?? 0) + commit.changes[lang];
		});
		return total;
	}, {});
};

const main = async () => {
	const userId = await qlUserId(octokit);
	const linguist = await rawLinguistYml();
	
	// Check storage
	const dataStorage = retrieveStorage();
	const list = dataStorage ?
		await qlListFrom(octokit, userId, new Date(dataStorage.timestamp)) :
		await qlFullList(octokit, userId);

	// Process commits
	const commits = await loadCommits(octokit, list);
	const analysis = await analyzeData(commits, linguist);
	const combined = dataStorage ?
		[...dataStorage.analysis, ...analysis] :
		analysis;

	// Check for purge
	const { data: finalData, nextCheck } = dataStorage ?
		await runChecker(octokit, userId, combined, dataStorage.nextCheck) :
		await runChecker(octokit, userId, combined);

	fillTemplate(aggregate(finalData), aggregate(analysis), linguist);
	updateStorage(finalData, nextCheck);
};

main();
