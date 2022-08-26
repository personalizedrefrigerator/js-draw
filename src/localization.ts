import { CommandLocalization, defaultCommandLocalization } from './commands/localization';
import { defaultComponentLocalization, ImageComponentLocalization } from './components/localization';
import HTMLToolbar from './toolbar/HTMLToolbar';
import { ToolbarLocalization } from './toolbar/types';
import { defaultToolLocalization, ToolLocalization } from './tools/localization';


export interface EditorLocalization extends ToolbarLocalization, ToolLocalization, CommandLocalization, ImageComponentLocalization {
	undoAnnouncement: (actionDescription: string)=> string;
	redoAnnouncement: (actionDescription: string)=> string;
	doneLoading: string;
	loading: (percentage: number)=>string;
	imageEditor: string;
}

export const defaultEditorLocalization: EditorLocalization = {
	...HTMLToolbar.defaultLocalization,
	...defaultToolLocalization,
	...defaultCommandLocalization,
	...defaultComponentLocalization,
	loading: (percentage: number) => `Loading ${percentage}%...`,
	imageEditor: 'Image Editor',
	doneLoading: 'Done loading',

	undoAnnouncement: (commandDescription: string) => `Undid ${commandDescription}`,
	redoAnnouncement: (commandDescription: string) => `Redid ${commandDescription}`,
};