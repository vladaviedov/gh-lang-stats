export const analyzeData = detailsList => {
	const analysis = detailsList.map(analyzeRepo).flat();
	const stats = { Total: 0 };

	return analysis.reduce((prev, current) => {
		if (current.name in prev)
			prev[current.name].changes += current.changes;
		else
			prev[current.name] = { color: current.color, changes: current.changes };
		stats.Total += current.changes;
		return prev;
	}, stats);
};

const analyzeRepo = repoDetails => {
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
