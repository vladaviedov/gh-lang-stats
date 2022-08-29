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
		lingust: linguist,
		extension: extLookup,
		filename: fnLookup
	};
};

const analyzeRepo = (repoDetails, lookup) => {
	const langs = repoDetails.languages;
	const dummy = [];
	langs.forEach(l => {
		dummy.push({
			name: l.name,
			color: l.color,
			changes: 1
		});
	});
	return dummy;
};
