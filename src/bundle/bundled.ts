// Main entrypoint for Webpack when building a bundle for release.

import '../styles';
import Editor from '../Editor';
import getLocalizationTable from '../localizations/getLocalizationTable';
import Mat33 from '../math/Mat33';
import Vec3 from '../math/Vec3';
import { Vec2 } from '../math/Vec2';

export default Editor;
export {
	Editor,
	getLocalizationTable,

	Mat33, Vec3, Vec2,
};