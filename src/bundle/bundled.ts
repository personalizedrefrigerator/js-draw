// Main entrypoint for Webpack when building a bundle for release.

import '../styles';
import Editor from '../Editor';
import { EditorEventType } from '../types';
import getLocalizationTable from '../localizations/getLocalizationTable';

import Color4 from '../Color4';
import { Mat33, Path, Rect2, Vec2, Vec3 } from '../math/lib';
import { Text, Stroke, AbstractComponent, } from '../components/lib';
import { SerializableCommand, Command, Erase, Duplicate, invertCommand } from '../commands/lib';

export default Editor;
export {
	Editor,
	EditorEventType,
	getLocalizationTable,

	Mat33, Vec3, Vec2, Color4,
	Rect2, Path,

	Stroke, Text, AbstractComponent,
	SerializableCommand, Command, Erase, Duplicate,
	invertCommand,
};