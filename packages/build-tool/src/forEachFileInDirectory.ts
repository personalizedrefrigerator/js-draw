import { readdir, stat } from 'fs/promises';
import path from 'path';

// Iterates over every JavaScript file in [directory].
const forEachFileInDirectory = async (directory: string, processFile: (filePath: string)=>Promise<void>) => {
	const files = await readdir(directory);

	await Promise.all(files.map(async (file) => {
		const filePath = path.join(directory, file);
		const stats = await stat(filePath);

		if (stats.isDirectory()) {
			await forEachFileInDirectory(filePath, processFile);
		} else if (stats.isFile()) {
			await processFile(filePath);
		} else {
			throw new Error('Unknown file type!');
		}
	}));
};

export default forEachFileInDirectory;