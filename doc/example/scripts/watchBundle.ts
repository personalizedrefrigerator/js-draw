
import { bundledFiles } from '../build_tools/BundledFile';
console.log('Watching for changes...');

function watch() {
	// Watch for changes
	for (const file of bundledFiles) {
		file.startWatching();
	}
}

watch();