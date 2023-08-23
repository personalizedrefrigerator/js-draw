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
const adjustEditorThemeForContrast = (editor: Editor, options?: { dontClearOverrides: boolean }) => {
	const editorElem = editor.getRootElement();

	// Each set of entries in colorPairs should resolve to colors with sufficient
	// contrast.
	const colorPairs: [string, string, boolean, boolean][] = [
		[ '--background-color-1', '--foreground-color-1', true, true],
		[ '--background-color-2', '--foreground-color-2', true, true],
		[ '--background-color-3', '--foreground-color-3', true, true],
		[ '--selection-background-color', '--selection-foreground-color', false, true],
	];

	if (!options?.dontClearOverrides) {
		// Clear any overrides
		for (const [ backgroundVar, foregroundVar ] of colorPairs) {
			editorElem.style.setProperty(backgroundVar, null);
			editorElem.style.setProperty(foregroundVar, null);
		}
	}

	const styles = getComputedStyle(editorElem);
	const updatedColors: Record<string, Color4> = Object.create(null);

	const adjustVariablesForContrast = (
		var1: string,
		var2: string,
		minContrast: number,

		// true if the variable can be updated
		updateVar1: boolean,
		updateVar2: boolean,
	) => {
		// Fetch from updatedColors if available -- styles isn't updated dynamically.
		let color1 = updatedColors[var1] ? updatedColors[var1] : Color4.fromString(styles.getPropertyValue(var1));
		let color2 = updatedColors[var2] ? updatedColors[var2] : Color4.fromString(styles.getPropertyValue(var2));

		// Ensure that color1 has the lesser luminance
		if (color1.relativeLuminance() < color2.relativeLuminance()) {
			const tmp = color1;
			color1 = color2;
			color2 = tmp;

			const oldVar2 = var2;
			var2 = var1;
			var1 = oldVar2;

			const oldUpdateVar1 = updateVar1;
			updateVar1 = updateVar2;
			updateVar2 = oldUpdateVar1;
		}

		let colorsUpdated = false;
		let currentContrast = Color4.contrastRatio(color1, color2);
		let iterations = 0;

		// Step the brightness of color1 and color2 in different directions while necessary
		while (currentContrast < minContrast && iterations < 8) {
			const step = Vec3.of(0.1, 0.1, 0.1);
			if (updateVar1) {
				if (color2.eq(Color4.white) && !updateVar2) {
					color2 = Color4.black;
				}
				color1 = Color4.fromRGBVector(color1.rgb.plus(step));
			}

			if (updateVar2) {
				if (color2.eq(Color4.black) && !updateVar1) {
					color2 = Color4.white;
				}
				color2 = Color4.fromRGBVector(color2.rgb.minus(step));
			}

			currentContrast = Color4.contrastRatio(color1, color2);
			colorsUpdated = true;
			iterations ++;
		}

		// Update the CSS variables if necessary
		if (colorsUpdated) {
			editorElem.style.setProperty(var1, color1.toHexString());
			editorElem.style.setProperty(var2, color2.toHexString());
			updatedColors[var1] = color1;
			updatedColors[var2] = color2;
		}
	};

	// Also adjust the selection background
	adjustVariablesForContrast('--selection-background-color', '--background-color-2', 1.29, true, false);

	for (const [ backgroundVar, foregroundVar, updateBackground, updateForeground ] of colorPairs) {
		const minContrast = 4.5;
		adjustVariablesForContrast(backgroundVar, foregroundVar, minContrast, updateBackground, updateForeground);
	}
};

export default adjustEditorThemeForContrast;
