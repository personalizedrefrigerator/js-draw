import version from './version';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'path';

describe('version', () => {
	it('version should be correct', async () => {
		const packageJSONString = await readFile(join(dirname(__dirname), 'package.json'), 'utf-8');
		const packageJSON = JSON.parse(packageJSONString);

		expect(packageJSON['version']).toBe(version.number);
	});
});
