import { Color4, Vec3 } from '@js-draw/math';
import Editor from '../Editor';

/**
 * Adjusts the current editor theme such that colors have appropriate contrast.
 *
 * As this method overrides CSS variables using the `.style` property,
 * **assumes** all original theme variables are set using CSS and not the `.style` property.
 *
 * If the editor changes theme in response to the system theme, this method should be
 * called whenever the system theme changes (e.g. by using [the `matchMedia`](https://developer.mozilla.org/en-US/docs/Web/API/Window/matchMedia)
 * method).
 *
 * @example
 * ```ts,runnable
 * import { Editor, adjustEditorThemeForContrast } from 'js-draw';
 *
 * const editor = new Editor(document.body);
 * editor.addToolbar();
 *
 * const css = `
 *   :root .imageEditorContainer {
 *     --background-color-1: #ffff77;
 *     --foreground-color-1: #fff;
 *     --background-color-2: #ffff99;
 *     --foreground-color-2: #ffff88;
 *     --background-color-3: #ddffff;
 *     --foreground-color-3: #eeffff;
 *     --selection-background-color: #9f7;
 *     --selection-foreground-color: #98f;
 *   }
 *
 *   @media screen and (prefers-color-scheme: dark) {
 *     :root .imageEditorContainer {
 *       --background-color-1: black;
 *     }
 *   }
 * `;
 * editor.addStyleSheet(css);
 *
 * adjustEditorThemeForContrast(editor);
 *
 * // Because adjustEditorThemeForContrast overrides the current theme, it should be called again
 * // to allow the editor to switch between light/dark themes.
 * window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
 *   adjustEditorThemeForContrast(editor);
 * });
 *
 * window.matchMedia('print').addEventListener('change', () => {
 *   adjustEditorThemeForContrast(editor);
 * });
 * ```
 */
const adjustEditorThemeForContrast = (editor: Editor) => {
	const editorElem = editor.getRootElement();

	// Each set of entries in colorPairs should resolve to colors with sufficient
	// contrast.
	const colorPairs: [string, string][] = [
		[ '--background-color-1', '--foreground-color-1'],
		[ '--background-color-2', '--foreground-color-2'],
		[ '--background-color-3', '--foreground-color-3'],
		[ '--selection-background-color', '--selection-foreground-color'],
	];

	// Clear any overrides
	for (const [ backgroundVar, foregroundVar ] of colorPairs) {
		editorElem.style.setProperty(backgroundVar, null);
		editorElem.style.setProperty(foregroundVar, null);
	}


	const styles = getComputedStyle(editorElem);
	const minContrast = 3;

	for (const [ backgroundVar, foregroundVar ] of colorPairs) {
		let color1 = Color4.fromString(styles.getPropertyValue(backgroundVar));
		let color2 = Color4.fromString(styles.getPropertyValue(foregroundVar));
		let swappedColors = false;

		// Ensure that color1 has the lesser luminance
		if (color1.relativeLuminance() < color2.relativeLuminance()) {
			const tmp = color1;
			color1 = color2;
			color2 = tmp;
			swappedColors = true;
		}

		let colorsUpdated = false;
		let currentContrast = Color4.contrastRatio(color1, color2);
		const iterations = 0;

		while (currentContrast < minContrast && iterations < 5) {
			const step = Vec3.of(0.1, 0.1, 0.1);
			color1 = Color4.fromRGBVector(color1.rgb.plus(step));
			color2 = Color4.fromRGBVector(color2.rgb.minus(step));

			currentContrast = Color4.contrastRatio(color1, color2);
			colorsUpdated = true;
		}

		if (colorsUpdated) {
			const newBackground = swappedColors ? color2 : color1;
			const newForeground = swappedColors ? color1 : color2;

			editorElem.style.setProperty(foregroundVar, newForeground.toHexString());
			editorElem.style.setProperty(backgroundVar, newBackground.toHexString());
		}
	}
};

export default adjustEditorThemeForContrast;
