import { rawLinguistYml } from "./github-api.js";

export const analyzeData = async detailsList => {
	const linguistYaml = await rawLinguistYml();
	const lookup = makeLookupObject(linguistYaml);

	const analysis = detailsList.map(r => analyzeRepo(r, lookup)).flat();
	const stats = { Total: 0 };

	return analysis.reduce((prev, current) => {
		if (current.name in prev) {
			prev[current.name].changes += current.changes;
		} else {
			prev[current.name] = { color: current.color, changes: current.changes };
		}
		stats.Total += current.changes;
		return prev;
	}, stats);
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
				for (let i = 0; i < fnResult.length; i++) {
					const result = fnResult[i];
					if (lookup.linguist[result].type == "programming" && result in langChanges) {
						langChanges[result].changes = langChanges[result].changes + file.changes;
						break;
					}
				}
				return;
			}

			const ext = fn.substring(fn.lastIndexOf("."), fn.length);
			const extResult = lookup.extension[ext];
			if (extResult) {
				for (let i = 0; i < extResult.length; i++) {
					const result = extResult[i];
					if (lookup.linguist[result].type == "programming" && result in langChanges) {
						langChanges[result].changes = langChanges[result].changes + file.changes;
						break;
					}
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
