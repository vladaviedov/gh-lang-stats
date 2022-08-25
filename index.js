import { Octokit } from "octokit"
import { qlUserId, qlUserCommits } from "./graphql.js";

const accessToken = ""
const octokit = new Octokit({
	auth: accessToken
});

qlUserId(octokit).then(data => {
	return qlUserCommits(octokit, data.viewer.id)
}).then(data => {
	console.log(data)
});
