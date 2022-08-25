const { Octokit } = require("octokit");

const accessToken = "TOKEN"
const octokit = new Octokit({
	auth: accessToken
});

const qlUserId = async () => {
	return await octokit.graphql(
		`{
			viewer {
				id
			}
		}`
	)
}

const qlUserCommits = async (id) => {
	return await octokit.graphql(`
	query ($id: ID) {
		viewer {
		repositoriesContributedTo(
			first: 100
			contributionTypes: [COMMIT, PULL_REQUEST]
			includeUserRepositories: true
		) {
			totalCount
			nodes {
			defaultBranchRef {
				target {
				... on Commit {
					history(first: 100, author: {id: $id}) {
						nodes {
							oid
						}
						pageInfo {
							endCursor
							startCursor
						}
					}
				}
				}
			}
			nameWithOwner
		}
		pageInfo {
			endCursor
			hasNextPage
		}
	}
}
}
	`, { id: id })
}

qlUserId().then(data => {
	return qlUserCommits(data.viewer.id)
}).then(data => {
	console.log(data)
});
