#!/usr/bin/env node
import { Octokit } from "octokit";
import { throttling } from "@octokit/plugin-throttling";
import { analyzeData } from "./analyze.js";
import { fillTemplate } from "./fill-template.js";
import { qlUserId, qlFullList } from "./github-api.js";
import { loadCommits } from "./load-commits.js";
import { config } from "./config.js";

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

qlUserId(octokit)
	.then(id => qlFullList(octokit, id))
	.then(list => loadCommits(octokit, list))
	.then(analyzeData)
	.then(fillTemplate);
