// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('node:fs/promises');

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { dirname, join } = require('node:path');

const patchMuPDF = async (targetDir) => {
	const missingTypeDefsFile = join(targetDir, 'mupdf-wasm.d.ts');
	await fs.writeFile(
		missingTypeDefsFile,
		`
		// PATCH:
		// This change allows mupdf to build with the current TypeScript settings.
		export type Pointer<T> = any;
	`,
		'utf-8',
	);
};

const copyMuPDF = async () => {
	let sourceDir = require.resolve('mupdf');
	if (sourceDir.endsWith('.js')) {
		sourceDir = dirname(sourceDir);
	}
	const targetDir = join(dirname(__dirname), 'dist', 'mupdf/');
	await fs.mkdir(targetDir, { recursive: true });

	console.log('cp', sourceDir, targetDir);
	await fs.cp(sourceDir, targetDir, { recursive: true });

	await patchMuPDF(targetDir);
};

module.exports = { default: copyMuPDF() };
