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
	// Get data from each year contributed
	const yearsContributed = (await client.graphql(queryContribYears))
		.viewer.contributionsCollection.contributionYears;
	const data = await Promise.all(yearsContributed.map(async year => {
		const start = new Date(year, 0);
		const end = new Date(year + 1, 0);
		return queryRange(client, id, start, end);
	}));
	
	return data.flat();
};

/**
 * Scan user contributions since a given date
 * @param {Octokit} client 
 * @param {string} id 
 * @param {Date} timestamp 
 * @returns Array of repositories with commits
 */
export const qlListFrom = async (client, id, timestamp) => {
	let data = [];

	let curEnd = new Date();
	let curStart = yearBefore(curEnd);
	while (timestamp < curEnd) {
		if (timestamp >= curStart) {
			curStart = timestamp;
		}

		const response = await queryRange(client, id, curStart, curEnd);
		data = [...data, ...response];
		curEnd = curStart;
		curStart = yearBefore(curStart);
	}

	return data;
};

/**
 * Query a contribution collection for a certain range (maximum: 1 year).
 *
 * @async
 * @param {Octokit} client - Octokit client.
 * @param {string} id - User ID.
 * @param {Date} start - Start timestamp.
 * @param {Date} end - End timestamp.
 * @returns Data from the range.
 */
const queryRange = async (client, id, start, end) => {
	try {
		// Query all repositories in this time range
		const collection = (await client.graphql(queryContribCollection, {
			id: id,
			start: start.toISOString(),
			end: end.toISOString(),
			since: start.toISOString(),
			until: end.toISOString()
		})).viewer.contributionsCollection;

		// We can only look at 100 repos with no paging
		// Thanks github
		// Split time range recursively, since we don't have any more info at this point
		if (collection.totalRepositoriesWithContributedCommits > 100) {
			const half = new Date(start.getTime() + (end.getTime() - start.getTime()) / 2);

			const bottom = queryRange(client, id, start, half);
			const top = queryRange(client, id, half, end);
			const results = await Promise.all([bottom, top]);

			return results.flat();
		}

		// Repos list
		const scan = collection.commitContributionsByRepository;

		// Fetch missed data inside repos
		const repos = await Promise.all(scan.map(async r => {
			r = r.repository;
			const commits = r.defaultBranchRef.target.history;
			const langs = r.languages;

			// Get all pages of commits
			let pageInfo = commits.pageInfo;
			while (pageInfo.hasNextPage) {
				const commitsNext = (await client.graphql(queryMoreCommits, {
					name: r.name, 
					owner: r.owner.login,
					id: id,
					after: pageInfo.endCursor,
					since: start.toISOString(),
					until: end.toISOString()
				})).repository.defaultBranchRef.target.history;
				pageInfo = commitsNext.pageInfo;
				commits.nodes = [...commits.nodes, ...commitsNext.nodes];
			}

			// Get all pages on languages
			// I don't think this can even trigger
			pageInfo = langs.pageInfo;
			while (pageInfo.hasNextPage) {
				const langsNext = (await client.graphql(queryMoreLangs, {
					name: r.name,
					owner: r.owner.login,
					after: pageInfo.endCursor
				})).repository.languages;
				pageInfo = langsNext.pageInfo;
				langs.nodes = [...langs.nodes, ...langsNext.nodes];
			}

			return r;
		}));

		return repos;
	} catch (ex) {
		handleHttpErr(ex.response);
	}
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

/**
 * Calculate the timestamp of one year before a date
 *
 * @param {Date} date - Date input.
 * @returns {Date} Date for one year before 'date'
 */
const yearBefore = date => {
	const yearAgo = new Date(date);
	yearAgo.setFullYear(date.getFullYear() - 1);
	return yearAgo;
};

const handleHttpErr = err => {
	if (err?.status == 401) {
		console.error("Request is unauthorized.");
	} else {
		console.error(err);
		console.error("An unknown error has occured.");
	}

	process.exit(1);
};

/* GraphQL Requests */

const queryUserId = `{
	viewer { id }
}`;

const queryContribYears = `{
	viewer { contributionsCollection { contributionYears } }
}`;

const queryContribCollection = `query (
		$id: ID,
		$start: DateTime,
		$end: DateTime,
		$since: GitTimestamp,
		$until: GitTimestamp
) {
	viewer {
		contributionsCollection(
			from: $start,
			to: $end
		) {
			totalRepositoriesWithContributedCommits
			commitContributionsByRepository(maxRepositories: 100) {
				repository {
					owner { login }
					name
					defaultBranchRef {
						target {
							... on Commit {
								history(
									first: 100,
									author: { id: $id },
									since: $since,
									until: $until
								) {
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
			}
		}
	}
}`;

const queryMoreCommits = `query (
		$name: String!,
		$owner: String!,
		$id: ID,
		$after: String,
		$since: GitTimestamp,
		$until: GitTimestamp
) {
	repository(name: $name, owner: $owner) {
		defaultBranchRef {
			target {
				... on Commit {
					history(
						first: 100,
						author: { id: $id },
						after: $after,
						since: $since,
						until: $until
					) {
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
