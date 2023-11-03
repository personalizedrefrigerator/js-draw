import { Rect2, Point2, LineSegment2 } from '@js-draw/math';
import Viewport from '../../../Viewport';
import { StrokeDataPoint } from '../../../types';
import AbstractComponent from '../../AbstractComponent';
import { ComponentBuilder, ComponentBuilderFactory } from '../types';
import AbstractRenderer from '../../../rendering/renderers/AbstractRenderer';

const makeShapeFitAutocomplete = (sourceFactory: ComponentBuilderFactory): ComponentBuilderFactory => {
	return (startPoint: StrokeDataPoint, viewport: Viewport) => {
		return new ShapeFitBuilder(sourceFactory, startPoint, viewport);
	};
};

export default makeShapeFitAutocomplete;

const makeLineTemplate = (startPoint: Point2, points: Point2[], _bbox: Rect2) => {
	return [
		startPoint,
		points[points.length - 1],
	];
};

const makeRectangleTemplate = (_startPoint: Point2, _points: Point2[], bbox: Rect2) => {
	return [ ...bbox.corners, bbox.corners[0] ];
};

class ShapeFitBuilder implements ComponentBuilder {
	private builder: ComponentBuilder;
	private points: StrokeDataPoint[];

	public constructor(
		private sourceFactory: ComponentBuilderFactory,
		private startPoint: StrokeDataPoint,
		private viewport: Viewport
	) {
		this.builder = sourceFactory(startPoint, viewport);
		this.points = [ startPoint ];
	}

	public getBBox(): Rect2 {
		return this.builder.getBBox();
	}

	public build(): AbstractComponent {
		return this.builder.build();
	}

	public preview(renderer: AbstractRenderer) {
		this.builder.preview(renderer);
	}

	public addPoint(point: StrokeDataPoint): void {
		this.points.push(point);
		this.builder.addPoint(point);
	}

	public async autocompleteShape() {
		// Use screen points so that snapped shapes rotate with the screen.
		const startPoint = this.viewport.canvasToScreen(this.startPoint.pos);
		const points = this.points.map(point => this.viewport.canvasToScreen(point.pos));
		const bbox = Rect2.bboxOf(points);

		// Only fit larger shapes
		if (bbox.maxDimension < 32) {
			return null;
		}

		const maxError = Math.min(30, bbox.maxDimension / 4);

		// Create templates
		const templates = [
			makeLineTemplate(startPoint, points, bbox),
			makeRectangleTemplate(startPoint, points, bbox),
		];

		// Find a good fit fit
		const selectTemplate = (maximumError: number) => {
			for (const template of templates) {
				const templateAt = (index: number) => {
					while (index < 0) {
						index += template.length;
					}

					index %= template.length;
					return template[index];
				};

				let closestToFirst: Point2|null = null;
				let closestToFirstSqrDist = Infinity;
				let templateStartIndex = 0;

				// Find the closest point to the startPoint
				for (let i = 0; i < template.length; i++) {
					const current = template[i];
					const currentSqrDist = current.minus(startPoint).magnitudeSquared();
					if (!closestToFirst || currentSqrDist < closestToFirstSqrDist) {
						closestToFirstSqrDist = currentSqrDist;
						closestToFirst = current;
						templateStartIndex = i;
					}
				}

				// Walk through the points and find the maximum error
				let maximumSqrError = 0;
				let templateIndex = templateStartIndex;
				for (const point of points) {
					let minimumCurrentSqrError = Infinity;
					let minimumErrorAtIndex = templateIndex;

					const windowRadius = 6;
					for (let i = -windowRadius; i <= windowRadius; i++) {
						const index = templateIndex + i;

						const prevTemplatePoint = templateAt(index - 1);
						const currentTemplatePoint = templateAt(index);
						const nextTemplatePoint = templateAt(index + 1);

						const prevToCurrent = new LineSegment2(prevTemplatePoint, currentTemplatePoint);
						const currentToNext = new LineSegment2(currentTemplatePoint, nextTemplatePoint);

						const prevToCurrentDist = prevToCurrent.distance(point);
						const nextToCurrentDist = currentToNext.distance(point);

						const error = Math.min(prevToCurrentDist, nextToCurrentDist);
						const squareError = error * error;

						if (squareError < minimumCurrentSqrError) {
							minimumCurrentSqrError = squareError;
							minimumErrorAtIndex = index;
						}
					}

					templateIndex = minimumErrorAtIndex;
					maximumSqrError = Math.max(minimumCurrentSqrError, maximumSqrError);

					if (maximumSqrError > maximumError * maximumError) {
						break;
					}
				}

				if (maximumSqrError < maximumError * maximumError) {
					return template;
				}
			}

			return null;
		};

		const template = selectTemplate(maxError);

		if (!template) {
			return null;
		}

		const lastDataPoint = this.points[this.points.length - 1];
		const startWidth = this.startPoint.width;
		const endWidth = lastDataPoint.width;
		const startColor = this.startPoint.color;
		const endColor = lastDataPoint.color;
		const startTime = this.startPoint.time;
		const endTime = lastDataPoint.time;

		const templateIndexToStrokeDataPoint = (index: number): StrokeDataPoint => {
			const prevPoint = template[Math.max(0, Math.floor(index))];
			const nextPoint = template[Math.min(Math.ceil(index), template.length - 1)];
			const point = prevPoint.lerp(nextPoint, index - Math.floor(index));
			const fractionToEnd = index / template.length;

			return {
				pos: this.viewport.screenToCanvas(point),
				width: startWidth * (1 - fractionToEnd) + endWidth * fractionToEnd,
				color: startColor.mix(endColor, fractionToEnd),
				time: startTime * (1 - fractionToEnd) + endTime * fractionToEnd,
			};
		};

		const builder = this.sourceFactory(templateIndexToStrokeDataPoint(0), this.viewport);

		// Prevent the original builder from doing stroke smoothing if the template is short
		// enough to likely have sharp corners.
		const preventSmoothing = template.length < 10;

		for (let i = 0; i < template.length; i++) {
			if (preventSmoothing) {
				builder.addPoint(templateIndexToStrokeDataPoint(i - 0.001));
			}
			builder.addPoint(templateIndexToStrokeDataPoint(i));
			if (preventSmoothing) {
				builder.addPoint(templateIndexToStrokeDataPoint(i + 0.001));
			}
		}

		return builder.build();
	}
}