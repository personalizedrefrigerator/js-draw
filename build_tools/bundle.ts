import { dirname } from 'path';
import BundledFile from './BundledFile';

const rootDir = dirname(__dirname);
const mainBundle = new BundledFile(
	'jsdraw',
	`${rootDir}/src/bundle/bundled.ts`,
	`${rootDir}/dist/bundle.js`,
);

void mainBundle.build();