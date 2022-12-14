import { readFileSync, writeFileSync, existsSync } from "fs";
import { config } from "./config.js";

export const retrieveStorage = () => {
	if (!existsSync(config.storeFile)) {
		return { Total: 0 };
	}

	const rawData = readFileSync(config.storeFile, { encoding: "utf-8" });
	const data = JSON.parse(rawData);
	console.log(data);
	return data;
};

export const updateStorage = data => {
	// data.fetchDate = 

	const jsonData = JSON.stringify(data);
	writeFileSync(config.storeFile, jsonData, { encoding: "utf-8" });
	return data;
};
