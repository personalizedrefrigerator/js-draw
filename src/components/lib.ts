export * from './builders/types';
export { makeFreehandLineBuilder } from './builders/FreehandLineBuilder';
export { makePressureSensitiveFreehandLineBuilder } from './builders/PressureSensitiveFreehandLineBuilder';
export { default as StrokeSmoother, Curve as StrokeSmootherCurve } from './util/StrokeSmoother';

export * from './AbstractComponent';
export { default as AbstractComponent } from './AbstractComponent';
import Stroke from './Stroke';
import TextComponent from './TextComponent';
import ImageComponent from './ImageComponent';
import RestyleableComponent, { createRestyleComponentCommand, isRestylableComponent } from './RestylableComponent';
import ImageBackground from './ImageBackground';

export {
	Stroke,
	TextComponent as Text,
	RestyleableComponent,
	createRestyleComponentCommand,
	isRestylableComponent,

	TextComponent,
	Stroke as StrokeComponent,
	ImageBackground as BackgroundComponent,
	ImageComponent,
};
