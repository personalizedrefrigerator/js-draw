import Rect2 from '../../geometry/Rect2';
import AbstractRenderer from '../../rendering/renderers/AbstractRenderer';
import { StrokeDataPoint } from '../../types';
import Viewport from '../../Viewport';
import AbstractComponent from '../AbstractComponent';

export interface ComponentBuilder {
	getBBox(): Rect2;
	build(): AbstractComponent;
	preview(renderer: AbstractRenderer): void;

	addPoint(point: StrokeDataPoint): void;
}

export type ComponentBuilderFactory = (startPoint: StrokeDataPoint, viewport: Viewport)=> ComponentBuilder;
