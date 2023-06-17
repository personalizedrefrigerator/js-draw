import { dirname } from 'path';
import { BundledFile } from '@js-draw/build-tool';

const rootDir = dirname(__dirname);
export const bundledFiles: BundledFile[] = [
	new BundledFile(
		'jsdraw',
		`${rootDir}/example.ts`
	),
];

export default bundledFiles;