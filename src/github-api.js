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
 * @returns Array of repositories with commits
 */
export const qlFullList = async (client, id) => {
	try {
		// Initial scan
		const scan = (await client.graphql(queryScan, {
			id: id
		})).viewer.repositoriesContributedTo;
		
		// Get all pages of repos
		let pageInfo = scan.pageInfo;
		while (pageInfo.hasNextPage) {
			const scanNext = (await client.graphql(queryScanNext, {
				id: id,
				after: pageInfo.endCursor
			})).viewer.repositoriesContributedTo;
			pageInfo = scanNext.pageInfo;
			scan.nodes = [...scan.nodes, ...scanNext.nodes];
		}

		scan.nodes = await Promise.all(scan.nodes.map(async r => {
			const commits = r.defaultBranchRef.target.history;
			const langs = r.languages;

			// Get all pages of commits
			let pageInfo2 = commits.pageInfo;
			while (pageInfo2.hasNextPage) {
				const commitsNext = (await client.graphql(queryMoreCommits, {
					name: r.name, 
					owner: r.owner.login,
					id: id,
					after: pageInfo2.endCursor
				})).repository.defaultBranchRef.target.history;
				pageInfo2 = commitsNext.pageInfo;
				commits.nodes = [...commits.nodes, ...commitsNext.nodes];
			}
			
			// Get all pages on lnaguages
			// I don't think this can even trigger
			pageInfo2 = langs.pageInfo;
			while (pageInfo2.hasNextPage) {
				const langsNext = (await client.graphql(queryMoreLangs, {
					name: r.name,
					owner: r.owner.login,
					after: pageInfo2.endCursor
				})).repository.languages;
				pageInfo2 = langsNext.pageInfo;
				langs.nodes = [...langs.nodes, ...langsNext.nodes];
			}

			return r;
		}));
		
		return scan.nodes;
	} catch (ex) {
		handleHttpErr(ex.response);
	}
};

export const qlNewList = async (client, id, timestamp) => {
	// TODO: implement
	return null;
};

/**
 * Get info about a commit
 * @param {Octokit} client Octokit Client
 * @param {string} owner Repository owner (user or org)
 * @param {string} repo Repository name
 * @param {string} hash Commit Hash
 * @returns Commit information
 */
export const restCommitInfo = async (client, owner, repo, hash) => {
	try {
		const response = await client.request(reqCommitInfo, {
			owner: owner,
			repo: repo,
			ref: hash 
		});

		return response;
	} catch (ex) {
		handleHttpErr(ex.response);
	}
};

/**
 * Download GitHub Linguist's languages.yml
 * @returns languages.yml as an object
 */
export const rawLinguistYml = () => {
	return new Promise((resolve, reject) => httpsGet(urlLinguistYml, res => {
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
	} else {
		console.error("An unknown error has occured.");
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
									hasNextPage
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
									hasNextPage
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

const queryMoreCommits = `query ($name: String!, $owner: String!, $id: ID, $after: String) {
	repository(name: $name, owner: $owner) {
		defaultBranchRef {
			target {
				... on Commit {
					history(first: 100, author: {id: $id}, after: $after) {
						nodes { oid }
						pageInfo {
							endCursor
							hasNextPage
						}
					}
				}
			}
		}
	}
}`;

const queryMoreLangs = `query ($name: String!, $owner: String!, $id: ID) {
	repository(name: $name, owner: $owner) {
		languages(first: 100, after: $after) {
			nodes {
				color
				name
			}
			pageInfo {
				endCursor
				hasNextPage
			}
		}
	}
}`;

/* Rest/Raw Requests */

const reqCommitInfo = "GET /repos/{owner}/{repo}/commits/{ref}";
const urlLinguistYml = "https://raw.githubusercontent.com/github/linguist/master/lib/linguist/languages.yml";
