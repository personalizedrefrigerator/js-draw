// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('node:fs/promises');

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { dirname, join, resolve, basename } = require('node:path');

// Converts all SVG icons in src/icons into importable .ts files.
const convertIcons = async () => {
	const iconsDir = join(dirname(__dirname), 'src', 'icons');

	const dirent = await fs.readdir(iconsDir);

	await Promise.all(
		[...dirent].map(async (fileName) => {
			const filePath = resolve(iconsDir, fileName);

			if (filePath.endsWith('.svg')) {
				console.log('[…] Converting', fileName);

				const iconName = basename(fileName)
					.replace(/\.svg$/, '')
					.replace(/[^a-zA-Z0-9]/, '_');
				const icon = await fs.readFile(filePath, 'utf-8');
				const updatedIcon = icon.replace(/([<]path)(.)/gi, '$1 style="fill: var(--icon-color);"$2');

				await fs.writeFile(
					filePath.replace(/\.svg$/, '') + '.ts',
					`
				// The following icon is part of the Material Icon pack and is licensed under
				// the Apache 2.0 license.
				// You should have received a copy of this license along with the software.


				// This file is an auto-generated wrapper around the content of the original icon,
				// modified to set the fill of the icon.
				// The icon was downloaded from https://fonts.google.com/icons

				import { OpaqueIconType } from '../types';

				export const ${iconName} = ${JSON.stringify(updatedIcon)} as unknown as OpaqueIconType;
				export default ${iconName};
			`,
				);
			}
		}),
	);
};

const readmeToJS = async () => {
	const readmePath = join(dirname(__dirname), 'src', 'icons', 'README.md');

	await fs.writeFile(
		readmePath.replace(/\.md$/, '') + '.ts',
		`
		export default ${JSON.stringify(await fs.readFile(readmePath, 'utf-8'))};
	`,
	);
};

module.exports = { default: Promise.all([convertIcons(), readmeToJS()]) };
