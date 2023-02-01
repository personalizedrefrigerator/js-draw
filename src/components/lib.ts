export * from './builders/types';
export { makeFreehandLineBuilder } from './builders/FreehandLineBuilder';
export { makePressureSensitiveFreehandLineBuilder } from './builders/PressureSensitiveFreehandLineBuilder';
export { default as StrokeSmoother, Curve as StrokeSmootherCurve } from './util/StrokeSmoother';

export * from './AbstractComponent';
export { default as AbstractComponent } from './AbstractComponent';
import Stroke from './Stroke';
import TextComponent from './TextComponent';
import ImageComponent from './ImageComponent';
import RestyleableComponent, { createRestyleComponentCommand } from './RestylableComponent';

export {
	Stroke,
	TextComponent as Text,
	RestyleableComponent,
	createRestyleComponentCommand,

	TextComponent,
	Stroke as StrokeComponent,
	ImageComponent,
};
