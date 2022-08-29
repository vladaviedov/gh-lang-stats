import { get as httpsGet } from "https";
import YAML from "yaml";

export const qlUserId = (client) => {
	return client.graphql(`{
		viewer { id }
	}`);
};

export const qlUserCommits = (client, id) => {
	return client.graphql(`query ($id: ID) {
		viewer {
			repositoriesContributedTo(
				first: 100
				contributionTypes: [COMMIT, PULL_REQUEST]
				includeUserRepositories: true
			) {
				totalCount
				nodes {
					name
					owner { login }
					defaultBranchRef {
						target {
							... on Commit {
								history(first: 100, author: {id: $id}) {
									nodes { oid }
									pageInfo {
										endCursor
										startCursor
									}
								}
							}
						}
					}
					languages(first: 100) {
						nodes {
							name
							color
						}
					}
				}
				pageInfo {
					endCursor
					hasNextPage
				}
			}
		}
	}`, { id: id });
};

export const restCommitDetails = (client, owner, repo, ref) => {
	return client.request("GET /repos/{owner}/{repo}/commits/{ref}", {
		owner: owner,
		repo: repo,
		ref: ref 
	});
};

export const rawLinguistYml = () => {
	return new Promise((resolve, reject) => httpsGet("https://raw.githubusercontent.com/github/linguist/master/lib/linguist/languages.yml", res => {
		const buffer = [];
		res.on("data", data => {
			buffer.push(data);
		}).on("end", () => {
			const yaml = Buffer.concat(buffer);
			resolve(YAML.parse(yaml + ""));
		}).on("error", err => {
			reject(err);
		});
	}));
};
