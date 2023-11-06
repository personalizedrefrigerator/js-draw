import { Rect2 } from '@js-draw/math';
import AbstractRenderer from '../../rendering/renderers/AbstractRenderer';
import { StrokeDataPoint } from '../../types';
import Viewport from '../../Viewport';
import AbstractComponent from '../AbstractComponent';

export interface ComponentBuilder {
	getBBox(): Rect2;
	build(): AbstractComponent;
	preview(renderer: AbstractRenderer): void;

	// Called when the pen is stationary (or the user otherwise
	// activates autocomplete). This might attempt to fit the user's
	// drawing to a particular shape.
	//
	// Although this returns a Promise, it should return *as fast as
	// possible*.
	autocorrectShape?: ()=>Promise<AbstractComponent|null>;

	addPoint(point: StrokeDataPoint): void;
}

export type ComponentBuilderFactory = (startPoint: StrokeDataPoint, viewport: Viewport)=> ComponentBuilder;
