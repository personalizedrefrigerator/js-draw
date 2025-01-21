// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('node:path');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('node:fs');

// eslint-disable-next-line @typescript-eslint/no-require-imports
const version = require('../package.json').version;

const updateVersion = () => {
	const versionPath = path.join(path.dirname(__dirname), 'src', 'version.ts');
	const versionContent = fs.readFileSync(versionPath, 'utf8');

	let didReplace = false;
	const updatedContent = versionContent.replace(/number: '.*'/, () => {
		didReplace = true;
		return `number: '${version}'`;
	});

	if (!didReplace) {
		throw new Error('Version number auto-updater: Unable to find a version number to update.');
	}

	fs.writeFileSync(versionPath, updatedContent);
};

updateVersion();
