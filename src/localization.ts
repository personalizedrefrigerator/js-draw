import { CommandLocalization, defaultCommandLocalization } from './commands/localization';
import { defaultComponentLocalization, ImageComponentLocalization } from './components/localization';
import { defaultTextRendererLocalization, TextRendererLocalization } from './rendering/localization';
import { defaultToolbarLocalization, ToolbarLocalization } from './toolbar/localization';
import { defaultToolLocalization, ToolLocalization } from './tools/localization';


export interface EditorLocalization extends ToolbarLocalization, ToolLocalization, CommandLocalization, ImageComponentLocalization, TextRendererLocalization {
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
	loading: (percentage: number) => `Loading ${percentage}%...`,
	imageEditor: 'Image Editor',
	doneLoading: 'Done loading',

	undoAnnouncement: (commandDescription: string) => `Undid ${commandDescription}`,
	redoAnnouncement: (commandDescription: string) => `Redid ${commandDescription}`,
};