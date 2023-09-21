import Editor from './Editor';
import createEditor from './testing/createEditor';

const loadTestImage = async (editor: Editor, numPaths: number) => {
	const paths = [];
	for (let i = 0; i < numPaths; i++) {
		paths.push(`<path d="M${i * 10},0 l100, 100 l-10,0 z" fill="red"/>`);
	}

	await editor.loadFromSVG(`
		<svg
			viewBox="-10 -10 1000 1000" width="1000" height="500"
			version="1.1"
			baseProfile="full"
			xmlns="http://www.w3.org/2000/svg"
		>
			${paths.join('\n')}
		</svg>
	`);
};

describe('Editor.toSVGAsync', () => {
	it('should be cancelable', async () => {
		const editor = createEditor();

		// Needed to evaluate requestAnimationFrame/setTimeout delays in toSVGAsync
		jest.useRealTimers();

		const numTotalPaths = 500;
		await loadTestImage(editor, numTotalPaths);

		const svg = await editor.toSVGAsync({
			onProgress: async (componentIndex) => {
				return componentIndex <= 250;
			},
		});

		// Should be cancelled before all 500.
		expect(svg.querySelectorAll('svg > *')).toHaveLength(250);
	});

	it('should have same output as toSVG', async () => {
		const editor = createEditor();

		// Needed to evaluate requestAnimationFrame/setTimeout delays in toSVGAsync
		jest.useRealTimers();

		const numTotalPaths = 520;
		await loadTestImage(editor, numTotalPaths);

		const asyncSVG = await editor.toSVGAsync();
		const syncSVG = editor.toSVG();

		expect(asyncSVG.outerHTML).toBe(syncSVG.outerHTML);
	});
});

