import { CommandLocalization, defaultCommandLocalization } from './commands/localization';
import { defaultComponentLocalization, ImageComponentLocalization } from './components/localization';
import { defaultTextRendererLocalization, TextRendererLocalization } from './rendering/localization';
import { defaultToolbarLocalization, ToolbarLocalization } from './toolbar/localization';
import { defaultToolLocalization, ToolLocalization } from './tools/localization';


export interface EditorLocalization extends ToolbarLocalization, ToolLocalization, CommandLocalization, ImageComponentLocalization, TextRendererLocalization {
	accessibilityInputInstructions: string;
	undoAnnouncement: (actionDescription: string)=> string;
	redoAnnouncement: (actionDescription: string)=> string;
	doneLoading: string;
	loading: (percentage: number)=>string;
	imageEditor: string;
}

export const defaultEditorLocalization: EditorLocalization = {
	...defaultToolbarLocalization,
	...defaultToolLocalization,
	...defaultCommandLocalization,
	...defaultComponentLocalization,
	...defaultTextRendererLocalization,
	accessibilityInputInstructions: [
		'Press "t" to read the contents of the viewport as text.',
		'Use the arrow keys to move the viewport, click and drag to draw strokes.',
		'Press "w" to zoom in and "s" to zoom out.',
	].join(' '),
	loading: (percentage: number) => `Loading ${percentage}%...`,
	imageEditor: 'Image Editor',
	doneLoading: 'Done loading',

	undoAnnouncement: (commandDescription: string) => `Undid ${commandDescription}`,
	redoAnnouncement: (commandDescription: string) => `Redid ${commandDescription}`,
};