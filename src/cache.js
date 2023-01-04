import { readFileSync, writeFileSync, existsSync } from "fs";
import { config } from "./config.js";

export const retrieveStorage = () => {
	// Check if store exists
	if (!existsSync(config.storeFile)) {
		return null;
	}

	// Read from store
	const rawData = readFileSync(config.storeFile, { encoding: "utf-8" });
	return JSON.parse(rawData);
};

export const updateStorage = data => {
	// Wrapper to store timestamp
	const dataStorage = {
		analysis: data,
		timestamp: new Date().toISOString()
	};

	// Write to store
	const jsonData = JSON.stringify(dataStorage);
	writeFileSync(config.storeFile, jsonData, { encoding: "utf-8" });
};
