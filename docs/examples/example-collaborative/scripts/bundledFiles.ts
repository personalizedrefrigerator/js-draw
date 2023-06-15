import { dirname } from 'path';
import BundledFile from '../../../../build_tools/BundledFile';

const rootDir = dirname(__dirname);
export const bundledFiles: BundledFile[] = [
	new BundledFile(
		'jsdraw',
		`${rootDir}/script.ts`
	),
];

export default bundledFiles;