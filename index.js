import { Octokit } from "octokit"
import { qlUserId, qlUserCommits } from "./graphql.js";

const octokit = new Octokit({
	auth: process.env.ACCESS_KEY
});

qlUserId(octokit).then(data => {
	return qlUserCommits(octokit, data.viewer.id)
}).then(data => {
	console.log(data)
});
