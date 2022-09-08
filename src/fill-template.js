import { readFileSync, writeFileSync } from "fs";

export const fillTemplate = data => {
	const total = data.Total;
	delete data.Total;
	const sorted = sortToArray(data);

	let svg = readFileSync("template.svg", { encoding: "utf-8" });
	svg = replaceBar(svg, sorted, total);
	svg = replaceList(svg, sorted, total);

	writeFileSync("generated.svg", svg, { encoding: "utf-8" });
};

const sortToArray = unsorted => {
	const unsortedArr = Object.keys(unsorted).map(lang => {
		return {
			name: lang,
			color: unsorted[lang].color,
			changes: unsorted[lang].changes
		};
	});

	return unsortedArr.sort((a, b) => b.changes - a.changes);
};

const replaceBar = (svg, data, total) => {
	const templateStart = svg.indexOf("__template_bar__") + "__template_bar__".length + 1;
	const templateEnd = svg.indexOf("__end__", templateStart) - 1;

	const template = svg.substring(templateStart, templateEnd);
	return svg.replace("__bar__", generateFromTemplate(template, data, total));
};

const replaceList = (svg, data, total) => {
	const templateStart = svg.indexOf("__template_list__") + "__template_list__".length + 1;
	const templateEnd = svg.indexOf("__end__", templateStart) - 1;

	const template = svg.substring(templateStart, templateEnd);
	return svg.replace("__list__", generateFromTemplate(template, data, total));
};

const generateFromTemplate = (template, data, total) => {
	let prev = 0.0;
	let string = "";

	data = data.slice(0, 9);
	let half = Math.floor(data.length / 2);

	data.forEach((lang, index) => {
		let cur = lang.changes / total * 100;
		string += template
			.replaceAll("$prev", prev.toFixed(2))
			.replaceAll("$cur", cur.toFixed(2))
			.replaceAll("$color", lang.color)
			.replaceAll("$name", lang.name)
			.replaceAll("$xCoord", ((index + 1) > half ? 1 : 0) * 50 + "%")
			.replaceAll("$yCoord", (index % (half + 1) * 25) + "%");
		prev += cur;
	});

	return string;
};
