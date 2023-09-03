import { readFileSync, existsSync } from "fs";
import { basename } from "path";
import { config } from "./config.js";
import YAML from "yaml";

export const loadIgnoreList = () => {
	if (!existsSync(config.ignoreFile)) {
		return null;
	}

	const file = readFileSync(config.ignoreFile, { encoding: "utf-8" });
	if (!file) {
		return null;
	}

	return YAML.parse(file);
};

export const isIgnored = (ignoreList, repoName, file) => {
	if (!ignoreList) {
		return false;
	}

	const repoRules = ignoreList.filter(r => {
		if (!r.repo) {
			return false;
		}

		return r.repo == repoName
	});
	repoRules.forEach(r => {
		if (r.dir && checkDirIgnore(r.dir, file)) {
			return true;
		}

		if (r.file && checkFileIgnore(r.file, file)) {
			return true;
		}

		if (r.exact && checkExactIgnore(r.exact, file)) {
			return true;
		}
	});

	return false;
};

const checkDirIgnore = (rules, file) => {
	return rules.some(dir => {
		if (file.startsWith(dir)) {
			return true;
		}
	});
};

const checkFileIgnore = (rules, file) => {
	return rules.some(name => {
		if (basename(file) == name) {
			return true;
		}
	});
};

const checkExactIgnore = (rules, file) => {
	return rules.some(match => {
		if (file == match) {
			return true;
		}
	});
};
