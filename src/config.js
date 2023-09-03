export const config = {
	token: process.env.TOKEN,
	maxConcur: process.env.MAX_CONCUR ?? 5,
	inputFile: process.env.INPUT_FILE ?? "template.svg",
	outputFile: process.env.OUTPUT_FILE ?? "generated.svg",
	storeFile: process.env.STORE_FILE ?? "data.json",
	ignoreFile: process.env.IGNORE_FILE ?? "ignore.yml"
};
