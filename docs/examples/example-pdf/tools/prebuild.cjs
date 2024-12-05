// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('node:fs/promises');

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { dirname, join } = require('node:path');

// Converts all SVG icons in src/icons into importable .ts files.
const copyMuPDF = async () => {
	let sourceDir = require.resolve('mupdf');
	if (sourceDir.endsWith('.js')) {
		sourceDir = dirname(sourceDir);
	}
	const targetDir = join(dirname(__dirname), 'dist', 'mupdf/');
	await fs.mkdir(targetDir, { recursive: true });

	console.log('cp', sourceDir, targetDir);
	await fs.cp(sourceDir, targetDir, { recursive: true });
};

module.exports = { default: copyMuPDF() };
