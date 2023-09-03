import { readFileSync, writeFileSync } from "fs";
import { config } from "./config.js";

export const fillTemplate = async (combined, delta, linguist) => {
	const sorted = sortToArray(combined, delta, linguist);

	const combinedTotal = total(combined);
	const deltaTotal = total(delta);
	
	let svg = readFileSync(config.inputFile, { encoding: "utf-8" });
	svg = replaceBar(svg, sorted, combinedTotal, deltaTotal);
	svg = replaceList(svg, sorted, combinedTotal, deltaTotal);

	writeFileSync(config.outputFile, svg, { encoding: "utf-8" });
};

const total = data => {
	const values = Object.values(data);
	return values.reduce((total, next) => total + next, 0);
};

const sortToArray = (data, delta, linguist) => {
	const unsortedArr = Object.keys(data).map(lang => {
		return {
			name: lang,
			color: linguist[lang].color,
			changes: data[lang],
			delta: (delta && delta[lang]) ? delta[lang] : 0
		};
	});

	return unsortedArr.sort((a, b) => b.changes - a.changes);
};

const replaceBar = (svg, data, total, deltaTotal) => {
	const templateStart = svg.indexOf("__template_bar__") + "__template_bar__".length + 1;
	const templateEnd = svg.indexOf("__end__", templateStart) - 1;

	const template = svg.substring(templateStart, templateEnd);
	return svg.replace("__bar__", generateFromTemplate(template, data, total, deltaTotal));
};

const replaceList = (svg, data, total, deltaTotal) => {
	const templateStart = svg.indexOf("__template_list__") + "__template_list__".length + 1;
	const templateEnd = svg.indexOf("__end__", templateStart) - 1;

	const template = svg.substring(templateStart, templateEnd);
	return svg.replace("__list__", generateFromTemplate(template, data, total, deltaTotal));
};

const generateFromTemplate = (template, data, total, deltaTotal) => {
	let prev = 0.0;
	let string = "";

	data = data.slice(0, 8);
	let half = Math.floor(data.length / 2);

	data.forEach((lang, index) => {
		const cur = lang.changes / total * 100;
		const delta = deltaTotal ? lang.delta / deltaTotal * 75 + 25 : 0;
		string += template
			.replaceAll("$prev", prev.toFixed(2))
			.replaceAll("$cur", cur.toFixed(2))
			.replaceAll("$color", lang.color)
			.replaceAll("$name", lang.name)
			.replaceAll("$xCoord", ((index + 1) > half ? 1 : 0) * 50 + "%")
			.replaceAll("$yCoord", (index % (half) * 25) + "%")
			.replaceAll("$delta", delta.toFixed(2));
		prev += cur;
	});

	return string;
};
