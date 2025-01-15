/**
 * # `@js-draw/material-icons`
 *
 * Provides a material icon theme for `js-draw`.
 *
 * @example
 * ```ts,runnable
 * import { Editor, makeEdgeToolbar } from 'js-draw';
 * import { MaterialIconProvider } from '@js-draw/material-icons';
 *
 * // Apply js-draw CSS
 * import 'js-draw/styles';
 *
 * const editor = new Editor(document.body, {
 *   iconProvider: new MaterialIconProvider(),
 * });
 *
 * // Ensure that there is enough room for the toolbar
 * editor.getRootElement().style.minHeight = '500px';
 *
 * // Add a toolbar
 * const toolbar = makeEdgeToolbar(editor);
 *
 * // ...with the default elements
 * toolbar.addDefaults();
 * ```
 *
 * @see
 * {@link MaterialIconProvider}
 *
 * @packageDocumentation
 */

import { EraserMode, IconProvider, SelectionMode } from 'js-draw';
import makeMaterialIconProviderClass from './makeMaterialIconProvider';

/**
 * An {@link js-draw!IconProvider | IconProvider} that uses [material icons](https://github.com/google/material-design-icons).
 */
const MaterialIconProvider = makeMaterialIconProviderClass({
	IconProvider,
	EraserMode,
	SelectionMode,
});

export { MaterialIconProvider, makeMaterialIconProviderClass };
export default MaterialIconProvider;
