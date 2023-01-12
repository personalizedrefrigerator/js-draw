/**
 * The main entrypoint for the NPM package. Everything exported by this file
 * is available through the `js-draw` package.
 * 
 * @example
 * ```
 * import { Editor, Vec3, Mat33 } from 'js-draw';
 * ```
 * 
 * @see
 * {@link Editor}
 * 
 * @packageDocumentation
 */

import Editor, { EditorSettings } from './Editor';
export { default as EditorImage } from './EditorImage';
export * from './types';
export { default as getLocalizationTable } from './localizations/getLocalizationTable';
export * from './localization';

export { default as Color4 } from './Color4';
export { default as SVGLoader } from './SVGLoader';
export { default as Viewport } from './Viewport';
export * from './math/lib';
export * from './components/lib';
export * from './commands/lib';
export * from './tools/lib';
export * from './toolbar/lib';
export * from './rendering/lib';
export { default as Pointer, PointerDevice } from './Pointer';
export { default as HTMLToolbar } from './toolbar/HTMLToolbar';

export { Editor, EditorSettings };
export default Editor;