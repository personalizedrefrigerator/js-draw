
import bundledFiles from './bundledFiles';

async function build() {
	// Build all in parallel
	await Promise.all(bundledFiles.map(async file => {
		await file.build();
	}));
}

void build();