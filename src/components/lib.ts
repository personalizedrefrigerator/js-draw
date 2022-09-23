export * from './builders/types';
export { makeFreehandLineBuilder } from './builders/FreehandLineBuilder';

export * from './AbstractComponent';
export { default as AbstractComponent } from './AbstractComponent';
import Stroke from './Stroke';
import Text from './Text';
import ImageComponent from './ImageComponent';

export {
	Stroke,
	Text,

	Text as TextComponent,
	Stroke as StrokeComponent,
	ImageComponent,
};