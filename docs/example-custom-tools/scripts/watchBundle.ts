import bundledFiles from './bundledFiles';

function watch() {
	// Watch for changes
	for (const file of bundledFiles) {
		file.startWatching();
	}
}

console.log('Watching for changes...');
watch();