import { dirname } from 'path';
import BundledFile from './BundledFile';

const rootDir = dirname(__dirname);
const mainBundle = new BundledFile(
	'jsdraw',
	`${rootDir}/src/bundle/bundled.ts`,
	`${rootDir}/dist/bundle.js`,
);
const stylesBundle = new BundledFile(
	'jsdrawStyles',
	`${rootDir}/src/styles.js`,
	`${rootDir}/dist/bundledStyles.js`,
);

void mainBundle.build();
void stylesBundle.build();