import { get as httpsGet } from "https";
import YAML from "yaml";

/**
 * Fetch the user's node ID
 * @param {Octokit} client Octokit Client
 * @returns {string} User's GitHub (Node) ID
 */
export const qlUserId = async client => {
	try {
		const response = await client.graphql(queryUserId);
		return response.viewer.id;
	} catch (ex) {
		handleHttpErr(ex.response);
	}
};

/**
 * Scan user contributions
 * @param {Octokit} client Octokit Client
 * @param {string} id User's Node ID
 * @returns 
 */
export const qlFullList = async (client, id) => {
	try {
		// Initial scan
		const scan = await client.graphql(queryScan, { id: id })
			.viewer.repositoriesContributedTo;
		
		// Get all pages of repos
		let pageInfo = scan.pageInfo;
		while (pageInfo.hasNextPage) {
			const scanNext = await client.graphql(queryScanNext,
				{ id: id, after: pageInfo.endCursor })
				.viewer.repositoriesContributedTo;
			pageInfo = scanNext.pageInfo;
			scan.nodes += scanNext.nodes;
		}
	} catch (ex) {
		handleHttpErr(ex.response);
	}
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

const handleHttpErr = err => {
	if (err.status == 401) {
		console.error("Request is unauthorized.");
	}

	process.exit(1);
};

/* GraphQL Requests */
	
const queryUserId = `{
	viewer { id }
}`;

const queryScan = `query ($id: ID) {
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
					pageInfo {
						endCursor
						hasNextPage
					}
				}
			}
			pageInfo {
				endCursor
				hasNextPage
			}
		}
	}
}`;

const queryScanNext = `query ($id: ID, $after: String) {
	viewer {
		repositoriesContributedTo(
			first: 100
			contributionTypes: [COMMIT, PULL_REQUEST]
			includeUserRepositories: true
			after: $after
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
					pageInfo {
						endCursor
						hasNextPage
					}
				}
			}
			pageInfo {
				endCursor
				hasNextPage
			}
		}
	}
}`;
