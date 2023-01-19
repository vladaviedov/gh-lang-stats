export const analyzeData = (detailsList, linguist) => {
	const lookup = makeLookupObject(linguist);

	return detailsList.map(r => analyzeRepo(r, lookup)).flat();
};

const makeLookupObject = linguist => {
	// Extension lookup
	const extLookup = {};
	Object.keys(linguist).forEach(key => {
		linguist[key].extensions?.forEach(ext => {
			if (ext in extLookup) {
				extLookup[ext].push(key);
			} else {
				extLookup[ext] = [ key ];
			}
		});
	});
	
	// Filename lookup
	const fnLookup = {};
	Object.keys(linguist).forEach(key => {
		linguist[key].filenames?.forEach(fn => {
			if (fn in fnLookup) {
				fnLookup[fn].push(key);
			} else {
				fnLookup[fn] = [ key ];
			}
		});
	});
	
	return {
		linguist: linguist,
		extension: extLookup,
		filename: fnLookup
	};
};

const analyzeRepo = (repoDetails, lookup) => {
	// Possible languages
	const langs = repoDetails.languages.map(lang => lang.name);

	return repoDetails.commits.map(commit => {
		// Running total for commit
		const changes = {};

		commit.data.files.forEach(file => {
			// Specific filename lookup (Makefile, Dockerfile, etc.)
			const name = file.filename.split("/").pop();
			const nameResult = lookup.filename[name];
			if (nameResult) {
				const choice = chooseResult(nameResult, langs);
				if (choice) {
					changes[choice] = changes[choice] ?? 0 + file.changes;
					return;
				}
			}

			// Standard extension lookup
			const ext = name.substring(name.lastIndexOf("."), name.length);
			const extResult = lookup.extension[ext];
			if (extResult) {
				const choice = chooseResult(extResult, langs);
				if (choice) {
					changes[choice] = changes[choice] ?? 0 + file.changes;
					return;
				}
			}
		});

		return {
			hash: commit.data.sha,
			changes: changes
		};
	});
};

const chooseResult = (result, langs) => {
	const choices = [];
	result.forEach(lang => {
		if (langs.includes(lang)) {
			choices.push(lang);
		}
	});

	if (choices.length == 1) {
		return choices[0];
	}

	// TODO: proper handling
	if (choices.length >= 2) {
		console.log(`Ambiguous file. Options: ${choices}`);
	}

	return null;
};
