
// Copies this repository's root README and its resources to the js-draw folder
// prior to bundling. This allows the README to be shown on NPM.
import * as fs from 'node:fs';
import * as path from 'node:path';

// Path to the root repository
const packagePath = path.dirname(__dirname);
const rootPath = path.dirname(path.dirname(packagePath));

const relativeReadmeResourcesPath = path.join('docs', 'img', 'readme-images');
const originalReadmePath = path.join(rootPath, 'README.md');
const targetReadmePath = path.join(packagePath, 'README.md');
const originalReadmeResourcesPath = path.join(rootPath, relativeReadmeResourcesPath);
const targetReadmeResourcesPath = path.join(packagePath, relativeReadmeResourcesPath);

const lastArg = process.argv[process.argv.length - 1];
if (lastArg !== 'revert' && lastArg !== 'copy') {
	console.log(`Usage: ${process.argv0} revert`);
	console.log(`  or   ${process.argv0} copy`);
	process.exit(1);
}

if (lastArg === 'copy') {
	console.log('Copying README.md and its dependencies to the js-draw package...');
	if (fs.existsSync(targetReadmePath)) {
		console.error('ERROR: README already exists in target location. Exiting.');
		console.error('Be careful running postpack: It will DELETE this README and associated resources');
		process.exit(1);
	}

	if (fs.existsSync(targetReadmeResourcesPath)) {
		console.error('ERROR: README resources directory already exists in this package. Exiting.');
		console.error('Be careful running postpack: It will delete this resources directory.');
		process.exit(1);
	}

	fs.copyFileSync(originalReadmePath, targetReadmePath);
	fs.mkdirSync(targetReadmeResourcesPath, { recursive: true });

	for (const filePath of fs.readdirSync(originalReadmeResourcesPath)) {
		const sourcePath = path.join(originalReadmeResourcesPath, filePath);
		const targetPath = path.join(targetReadmeResourcesPath, filePath);
		fs.copyFileSync(sourcePath, targetPath);
	}
} else {
	console.log('Removing the copied README.md and its dependencies from the js-draw package...');
	if (!fs.existsSync(targetReadmePath)) {
		console.error('ERROR: README does not exist in target location. Exiting.');
		process.exit(1);
	}

	if (!fs.existsSync(targetReadmeResourcesPath)) {
		console.error('ERROR: README resources directory does not exist in the target location. Exiting.');
		process.exit(1);
	}

	fs.unlinkSync(targetReadmePath);
	fs.rmSync(targetReadmeResourcesPath, { recursive: true });
}


