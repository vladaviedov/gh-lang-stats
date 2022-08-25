export const qlUserId = async (client) => {
	return await client.graphql(`{
		viewer { id }
	}`)
}

export const qlUserCommits = async (client, id) => {
	return await client.graphql(`query ($id: ID) {
		viewer {
			repositoriesContributedTo(
				first: 100
				contributionTypes: [COMMIT, PULL_REQUEST]
				includeUserRepositories: true
			) {
				totalCount
				nodes {
					nameWithOwner
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
	}`, { id: id })
}
