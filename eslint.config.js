export default [
	{
		languageOptions: {
			sourceType: "module",
			ecmaVersion: "latest"
		},
		rules: {
			"indent": [
				"error",
				"tab",
				{ "SwitchCase": 1 }
			],
			// TODO: Fix deprecated rule
			"linebreak-style": [
				"error",
				"unix"
			],
			"quotes": [
				"error",
				"double"
			],
			"semi": [
				"error",
				"always"
			]
		}
	}
]
