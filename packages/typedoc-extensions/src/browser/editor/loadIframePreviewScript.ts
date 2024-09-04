import { join } from 'path';
import { assetsPath } from '../constants';

let iframePreviewScript: string | null = null; // null if not loaded

/**
 * Loads the script used to set up the editor's iframe.
 *
 * @internal
 */
const loadIframePreviewScript = async () => {
	if (iframePreviewScript) {
		return iframePreviewScript;
	}

	const scriptPath = join(assetsPath, 'js-draw-typedoc-extension--iframe.js');

	const scriptRequest = await fetch(scriptPath);
	const scriptContent = await scriptRequest.text();

	// Allow including inline in the iframe.
	iframePreviewScript = scriptContent.replace(/<[/]script>/g, '<\\/script>');
	return iframePreviewScript;
};

export default loadIframePreviewScript;
