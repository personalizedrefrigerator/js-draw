export * from './builders/types';
export { makeFreehandLineBuilder } from './builders/FreehandLineBuilder';

import AbstractComponent from './AbstractComponent';
import Stroke from './Stroke';
import Text from './Text';

export {
	AbstractComponent,
	Stroke,
	Text,

	Text as TextComponent,
	Stroke as StrokeComponent,
};