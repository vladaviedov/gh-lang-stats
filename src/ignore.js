import { readFileSync, existsSync } from "fs";
import { basename } from "path";
import { config } from "./config.js";
import YAML from "yaml";

export const loadIgnoreList = () => {
	if (!existsSync(config.ignoreFile)) {
		return null;
	}

	const file = readFileSync(config.ignoreFile, { encoding: "utf-8" });
	return YAML.parse(file);
};

export const isIgnored = (ignoreList, repoName, file) => {
	const repoRules = ignoreList.filter(r => r.repo == repoName);
	repoRules.forEach(r => {
		if (r.dir && checkDirIgnore(r, file)) {
			return true;
		}

		if (r.file && checkFileIgnore(r, file)) {
			return true;
		}

		if (r.exact && checkExactIgnore(r, file)) {
			return true;
		}
	});

	return false;
};

const checkDirIgnore = (rule, file) => {
	rule.dir.forEach(dir => {
		if (file.startsWith(dir)) {
			console.log(`Hit: ${file}`);
			return true;
		}
	});

	return false;
};

const checkFileIgnore = (rule, file) => {
	rule.file.forEach(name => {
		if (basename(file) == name) {
			return true;
		}
	});

	return false;
};

const checkExactIgnore = (rule, file) => {
	rule.file.forEach(match => {
		if (file == match) {
			return true;
		}
	});

	return false;
}
