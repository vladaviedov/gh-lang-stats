import { rawLinguistYml } from "./github-api.js";

export const analyzeData = async detailsList => {
	const linguistYaml = await rawLinguistYml();
	const lookup = makeLookupObject(linguistYaml);

	const analysis = detailsList.map(r => analyzeRepo(r, lookup)).flat();
	return analysis.reduce((prev, current) => {
		if (current.changes == 0) return prev;

		if (current.name in prev) {
			prev[current.name].changes += current.changes;
		} else {
			prev[current.name] = { color: current.color, changes: current.changes };
		}
		prev.Total += current.changes;
		return prev;
	}, { Total: 0 });
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
	const langs = repoDetails.languages;
	
	const langChanges = {};
	langs.forEach(l => {
		langChanges[l.name] = {
			color: l.color,
			changes: 0
		};
	});
	
	repoDetails.commits.forEach(commit => {
		const files = commit.data.files;
		files.forEach(file => {
			const fn = file.filename;
			const fnResult = lookup.filename[fn];
			if (fnResult) {
				const possibleLangs = [];
				for (let i = 0; i < fnResult.length; i++) {
					const result = fnResult[i];
					if (lookup.linguist[result].type == "programming" && result in langChanges) {
						possibleLangs.push(result);
					}
				}
				if (possibleLangs.length == 1) {
					const result = possibleLangs[0];
					langChanges[result].changes = langChanges[result].changes + file.changes;
				} else if (possibleLangs.length >= 2) {
					console.log(`Ambiguous file. Filename: ${fn}, Options: ${possibleLangs}`);
				}
			}

			const ext = fn.substring(fn.lastIndexOf("."), fn.length);
			const extResult = lookup.extension[ext];
			if (extResult) {
				const possibleLangs = [];
				for (let i = 0; i < extResult.length; i++) {
					const result = extResult[i];
					if (lookup.linguist[result].type == "programming" && result in langChanges) {
						possibleLangs.push(result);
					}
				}
				if (possibleLangs.length == 1) {
					const result = possibleLangs[0];
					langChanges[result].changes = langChanges[result].changes + file.changes;
				} else if (possibleLangs.length >= 2) {
					console.log(`Ambiguous file. Filename: ${fn}, Options: ${possibleLangs}`);
				}
			}
		});
	});

	return Object.keys(langChanges).map(lang => {
		return {
			name: lang,
			color: langChanges[lang].color,
			changes: langChanges[lang].changes
		};
	});
};
