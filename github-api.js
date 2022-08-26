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
