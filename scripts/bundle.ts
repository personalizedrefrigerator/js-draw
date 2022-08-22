
import { bundledFiles } from '../build_tools/BundledFile';

async function build() {
	// Build all in parallel
	await Promise.all(bundledFiles.map(async file => {
		await file.build();
	}));
}

void build();