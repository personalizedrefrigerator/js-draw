// Main entrypoint for Webpack when building a bundle for release.

import '../styles';
import Editor from '../Editor';
import getLocalizationTable from '../localizations/getLocalizationTable';

import Mat33 from '../math/Mat33';
import Vec3 from '../math/Vec3';
import { Vec2 } from '../math/Vec2';
import Color4 from '../Color4';
import Rect2 from '../math/Rect2';
import Path from '../math/Path';
import Stroke from '../components/Stroke';
import Text from '../components/Text';

export default Editor;
export {
	Editor,
	getLocalizationTable,

	Mat33, Vec3, Vec2, Color4,
	Rect2, Path,

	Stroke, Text,
};