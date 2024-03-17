import SerializableCommand from '../commands/SerializableCommand';
import { Mat33, Path, Rect2, LineSegment2, PathCommandType, Point2, PathIntersectionResult, comparePathIndices } from '@js-draw/math';
import Editor from '../Editor';
import AbstractRenderer from '../rendering/renderers/AbstractRenderer';
import RenderingStyle, { styleFromJSON, styleToJSON } from '../rendering/RenderingStyle';
import AbstractComponent from './AbstractComponent';
import { ImageComponentLocalization } from './localization';
import RestyleableComponent, { ComponentStyle, createRestyleComponentCommand } from './RestylableComponent';
import RenderablePathSpec, { RenderablePathSpecWithPath, pathFromRenderable, pathToRenderable, simplifyPathToFullScreenOrEmpty } from '../rendering/RenderablePathSpec';
import Viewport from '../Viewport';

interface StrokePart extends RenderablePathSpec {
	path: Path;
}

interface SimplificationRecord {
	forVisibleRect: Rect2;
	parts: StrokePart[];
	occludes: boolean;
}

/**
 * Represents an {@link AbstractComponent} made up of one or more {@link Path}s.
 *
 * @example
 * For some {@link Editor} editor and `Stroke` stroke,
 *
 * **Restyling**:
 * ```ts
 * editor.dispatch(stroke.updateStyle({ color: Color4.red }));
 * ```
 *
 * **Transforming**:
 * ```ts
 * editor.dispatch(stroke.transformBy(Mat33.translation(Vec2.of(10, 0))));
 * ```
 *
 * **Adding**:
 * [[include:doc-pages/inline-examples/adding-a-stroke.md]]
 */
export default class Stroke extends AbstractComponent implements RestyleableComponent {
	private parts: StrokePart[];
	protected contentBBox: Rect2;

	// @internal
	// eslint-disable-next-line @typescript-eslint/prefer-as-const
	readonly isRestylableComponent: true = true;

	// See `getProportionalRenderingTime`
	private approximateRenderingTime: number;

	/**
	 * Creates a `Stroke` from the given `parts`. All parts should have the
	 * same color.
	 *
	 * @example
	 * ```ts
	 * // A path that starts at (1,1), moves to the right by (2, 0),
	 * // then moves down and right by (3, 3)
	 * const path = Path.fromString('m1,1 2,0 3,3');
	 *
	 * const stroke = new Stroke([
	 *     // Fill with red
	 *     pathToRenderable(path, { fill: Color4.red })
	 * ]);
	 * ```
	 */
	public constructor(parts: RenderablePathSpec[], initialZIndex?: number) {
		super('stroke', initialZIndex);

		this.approximateRenderingTime = 0;
		this.parts = [];

		for (const section of parts) {
			const path = pathFromRenderable(section);
			const pathBBox = this.bboxForPart(path.bbox, section.style);

			if (!this.contentBBox) {
				this.contentBBox = pathBBox;
			} else {
				this.contentBBox = this.contentBBox.union(pathBBox);
			}

			this.parts.push({
				path,

				// To implement RenderablePathSpec
				startPoint: path.startPoint,
				style: section.style,
				commands: path.parts,
			});

			this.approximateRenderingTime += path.parts.length;
		}
		this.contentBBox ??= Rect2.empty;
	}

	public getStyle(): ComponentStyle {
		if (this.parts.length === 0) {
			return { };
		}
		const firstPart = this.parts[0];

		if (
			firstPart.style.stroke === undefined
			|| firstPart.style.stroke.width === 0
		) {
			return {
				color: firstPart.style.fill,
			};
		}

		return {
			color: firstPart.style.stroke.color,
		};
	}

	public updateStyle(style: ComponentStyle): SerializableCommand {
		return createRestyleComponentCommand(this.getStyle(), style, this);
	}

	public forceStyle(style: ComponentStyle, editor: Editor|null): void {
		if (!style.color) {
			return;
		}

		this.parts = this.parts.map((part) => {
			const newStyle = {
				...part.style,
				stroke: part.style.stroke ? {
					...part.style.stroke,
				} : undefined,
			};

			// Change the stroke color if a stroked shape. Else,
			// change the fill.
			if (newStyle.stroke && newStyle.stroke.width > 0) {
				newStyle.stroke.color = style.color!;
			} else {
				newStyle.fill = style.color!;
			}

			return {
				path: part.path,
				startPoint: part.startPoint,
				commands: part.commands,
				style: newStyle,
			};
		});

		if (editor) {
			editor.image.queueRerenderOf(this);
			editor.queueRerender();
		}
	}

	/** @beta -- May fail for concave `path`s */
	public override withRegionErased(path: Path, viewport: Viewport) {
		const polyline = path.polylineApproximation();
		const originalDivPath = path;

		const isPointInsideOriginalPath = (point: Point2) => {
			return originalDivPath.closedContainsPoint(point);
		};

		const newStrokes: Stroke[] = [];
		let failedAssertions = false;
		for (const part of this.parts) {
			const path = part.path;

			const makeStroke = (path: Path): Stroke|null => {
				if (part.style.fill.a > 0) {
					// Remove visually empty paths.
					if (path.parts.length < 1 || (path.parts.length === 1 && path.parts[0].kind === PathCommandType.LineTo)) {
						// TODO: If this isn't present, a very large number of strokes are created while erasing.
						// TODO: Debug this.
						return null;
					} else {
						// Filled paths must be closed (allows for optimizations elsewhere)
						path = path.asClosed();
					}
				}
				console.assert(!isNaN(path.getExactBBox().area), 'Creating a stroke with NaN area');
				return new Stroke([ pathToRenderable(path, part.style) ], this.getZIndex());
			};

			const intersectionPoints: PathIntersectionResult[] = [];
			for (const segment of polyline) {
				intersectionPoints.push(...path.intersection(segment));
			}

			// Sort first by curve index, then by parameter value
			intersectionPoints.sort(comparePathIndices);

			const isFirstPointInside = !!intersectionPoints.length && isPointInsideOriginalPath(intersectionPoints[0].point);

			let intersectionCount = isFirstPointInside ? 1 : 0;
			const addNewPath = (path: Path, knownToBeInside?: boolean) => {
				const component = makeStroke(path);

				let isInside = intersectionCount % 2 === 1;
				intersectionCount ++;

				if (knownToBeInside !== undefined) {
					isInside = knownToBeInside;
				}

				// Here, we work around bugs in the underlying Bezier curve library
				// (including https://github.com/Pomax/bezierjs/issues/179).
				// Even if not all intersections are returned correctly, we still want
				// isInside to be roughly correct.
				if (knownToBeInside === undefined && !isInside && isPointInsideOriginalPath(path.getExactBBox().center)) {
					isInside = !isInside;
				}

				if (!component) {
					return;
				}

				// Assertion: Avoid deleting sections that are much larger than the eraser.
				failedAssertions ||= isInside && path.getExactBBox().maxDimension > originalDivPath.getExactBBox().maxDimension * 2;

				if (!isInside) {
					newStrokes.push(component);
				}
			};

			if (part.style.fill.a === 0) {
				const split = path.splitAt(intersectionPoints, { mapNewPoint: p => viewport.roundPoint(p) });
				for (const splitPart of split) {
					addNewPath(splitPart);
				}
			} else if (intersectionPoints.length === 2) {
				const createCutOut = (reverse: boolean): Path => {
					const fullDivPath = reverse ? originalDivPath.reversed() : originalDivPath;

					const p0 = fullDivPath.nearestPointTo(intersectionPoints[0].point);
					const p1 = fullDivPath.nearestPointTo(intersectionPoints[1].point);

					const cutOut = fullDivPath.spliced(p0, p1, undefined, { mapNewPoint: p => viewport.roundPoint(p), });
					return cutOut;
				};

				const tangentPointsInwardAt = (p: Point2) => {
					const pointOnEraser = originalDivPath.nearestPointTo(p);
					const checkLength = viewport.getSizeOfPixelOnCanvas() / 2;
					return path.closedContainsPoint(
						originalDivPath.tangentAt(pointOnEraser).times(checkLength).plus(p)
					);
				};

				const reverse = tangentPointsInwardAt(intersectionPoints[0].point);
				if (reverse === tangentPointsInwardAt(intersectionPoints[1].point)) {
					addNewPath(path, false);
					failedAssertions = true;
				} else {
					const cutOut = createCutOut(reverse);

					let pa = path.nearestPointTo(intersectionPoints[0].point);
					let pb = path.nearestPointTo(intersectionPoints[1].point);

					// Handle the case where the start point is in the eraser, and we
					// need to splice in the opposite direction:
					//
					//  |  STROKE   |
					//  |           |
					//  \ %%%%%%%   |
					//   \%    /%---|
					//    %--./ % <-- start
					//    %%%%%%%
					//
					if (originalDivPath.closedContainsPoint(part.startPoint)) {
						const temp = pa;
						pa = pb;
						pb = temp;
					}
					const remainder = path.spliced(pa, pb, cutOut.reversed(), { mapNewPoint: p => viewport.roundPoint(p) });

					addNewPath(remainder, false);
					addNewPath(cutOut);
				}
			} else if (intersectionPoints.length > 2) {
				// We currently assume that a 4-point intersection means that the intersection
				// looks similar to this:
				//   -----------
				//  |   STROKE  |
				//  |           |
				//%%x-----------x%%%%%%%
				//%                    %
				//%      ERASER        %
				//%                    %
				//%%x-----------x%%%%%%%
				//  |   STROKE  |
				//   -----------
				//
				// Our goal is to separate STROKE into the contiguous parts outside
				// of the eraser (as shown above).
				//
				// To do this, we split STROKE at each intersection:
				//   3 3 3 3 3 3
				//  3   STROKE  3
				//  3           3
				//  x           x
				//  2           4
				//  2   STROKE  4
				//  2           4
				//  x           x
				//  1   STROKE  5
				//   . 5 5 5 5 5
				//   ^
				// Start
				//
				// The difficulty here is correctly pairing edges to create the the output
				// strokes, particularly because we don't know the order of intersection points.
				const parts = path.splitAt(intersectionPoints, { mapNewPoint: p => viewport.roundPoint(p) });
				for (let i = 0; i < Math.floor(parts.length / 2); i++) {
					addNewPath(parts[i].union(parts[parts.length - i - 1]).asClosed());
				}
				if (parts.length % 2 !== 0) {
					addNewPath(parts[Math.floor(parts.length / 2)].asClosed());
				}
			} else {
				addNewPath(path, false);
			}
		}

		if (failedAssertions) {
			return [this];
		}

		return newStrokes;
	}

	public override intersects(line: LineSegment2): boolean {
		for (const part of this.parts) {
			const strokeWidth = part.style.stroke?.width;
			const strokeRadius = strokeWidth ? strokeWidth / 2 : undefined;

			if (part.path.intersection(line, strokeRadius).length > 0) {
				return true;
			}
		}
		return false;
	}

	public override intersectsRect(rect: Rect2): boolean {
		// AbstractComponent::intersectsRect can be inexact for strokes with non-zero
		// stroke radius (has many false negatives). As such, additional checks are
		// done here, before passing to the superclass.

		if (!rect.intersects(this.getBBox())) {
			return false;
		}

		// The following check only checks for the positive case:
		// Sample a set of points that are known to be within each part of this
		// stroke. For example, the points marked with an "x" below:
		//   ___________________
		//  /                   \
		//  | x              x  |
		//  \_____________      |
		//                |  x  |
		//                \_____/
		//
		// Because we don't want the following case to result in selection,
		//   __________________
		//  /.___.             \
		//  || x |          x  |    <-  /* The
		//  |·---·             |            .___.
		//  \____________      |            |   |
		//               |  x  |            ·---·
		//               \_____/           denotes the input rectangle */
		//
		// we need to ensure that the rectangle intersects each point **and** the
		// edge of the rectangle.
		for (const part of this.parts) {
			// As such, we need to shrink the input rectangle to verify that the original,
			// unshrunken rectangle would have intersected the edge of the stroke if it
			// intersects a point within the stroke.
			const interiorRect = rect.grownBy(-(part.style.stroke?.width ?? 0));
			if (interiorRect.area === 0) {
				continue;
			}

			for (const point of part.path.startEndPoints()) {
				if (interiorRect.containsPoint(point)) {
					return true;
				}
			}
		}

		return super.intersectsRect(rect);
	}

	// A simplification of the path for a given visibleRect. Intended
	// to help check for occlusion.
	private simplifiedPath: SimplificationRecord|null = null;
	private computeSimplifiedPathFor(visibleRect: Rect2): SimplificationRecord {
		const simplifiedParts: StrokePart[] = [];
		let occludes = false;
		let skipSimplification = false;

		for (const part of this.parts) {
			if (
				skipSimplification

				// Simplification currently only works for stroked paths
				|| !part.style.stroke

				// One of the main purposes of this is to check for occlusion.
				// We can't occlude things if the stroke is partially transparent.
				|| part.style.stroke.color.a < 0.99
			) {
				simplifiedParts.push(part);
				continue;
			}

			const mapping = simplifyPathToFullScreenOrEmpty(part, visibleRect);

			if (mapping) {
				simplifiedParts.push(mapping.path);

				if (mapping.fullScreen) {
					occludes = true;
					skipSimplification = true;
				}
			} else {
				simplifiedParts.push(part);
			}
		}

		return {
			forVisibleRect: visibleRect,
			parts: simplifiedParts,
			occludes,
		};
	}

	public override occludesEverythingBelowWhenRenderedInRect(rect: Rect2) {
		// Can't occlude if doesn't contain.
		if (!this.getBBox().containsRect(rect)) {
			return false;
		}

		if (!this.simplifiedPath || !this.simplifiedPath.forVisibleRect.eq(rect)) {
			this.simplifiedPath = this.computeSimplifiedPathFor(rect);
		}

		return this.simplifiedPath.occludes;
	}

	public override render(canvas: AbstractRenderer, visibleRect?: Rect2): void {
		canvas.startObject(this.getBBox());

		// Can we use a cached simplified path for faster rendering?
		let parts = this.parts;
		if (visibleRect && this.simplifiedPath?.forVisibleRect?.containsRect(visibleRect)) {
			parts = this.simplifiedPath.parts;
		} else {
			// Save memory
			this.simplifiedPath = null;
		}

		for (const part of parts) {
			const bbox = this.bboxForPart(part.path.bbox, part.style);
			if (visibleRect) {
				if (!bbox.intersects(visibleRect)) {
					continue;
				}

				const muchBiggerThanVisible = bbox.size.x > visibleRect.size.x * 3 || bbox.size.y > visibleRect.size.y * 3;
				if (muchBiggerThanVisible && !part.path.roughlyIntersects(visibleRect, part.style.stroke?.width ?? 0)) {
					continue;
				}
			}

			canvas.drawPath(part);
		}
		canvas.endObject(this.getLoadSaveData());
	}

	public override getProportionalRenderingTime(): number {
		return this.approximateRenderingTime;
	}

	// Grows the bounding box for a given stroke part based on that part's style.
	private bboxForPart(origBBox: Rect2, style: RenderingStyle) {
		if (!style.stroke) {
			return origBBox;
		}

		return origBBox.grownBy(style.stroke.width / 2);
	}

	public override getExactBBox(): Rect2 {
		let bbox: Rect2|null = null;

		for (const { path, style } of this.parts) {
			// Paths' default .bbox can be
			const partBBox = this.bboxForPart(path.getExactBBox(), style);
			bbox ??= partBBox;

			bbox = bbox.union(partBBox);
		}

		return bbox ?? Rect2.empty;
	}

	protected applyTransformation(affineTransfm: Mat33): void {
		this.contentBBox = Rect2.empty;
		let isFirstPart = true;

		// Update each part
		this.parts = this.parts.map((part) => {
			const newPath = part.path.transformedBy(affineTransfm);
			const newStyle = {
				...part.style,
				stroke: part.style.stroke ? {
					...part.style.stroke,
				} : undefined,
			};

			// Approximate the scale factor.
			if (newStyle.stroke) {
				const scaleFactor = affineTransfm.getScaleFactor();
				newStyle.stroke.width *= scaleFactor;
			}

			const newBBox = this.bboxForPart(newPath.bbox, newStyle);

			if (isFirstPart) {
				this.contentBBox = newBBox;
				isFirstPart = false;
			} else {
				this.contentBBox = this.contentBBox.union(newBBox);
			}

			return {
				path: newPath,
				startPoint: newPath.startPoint,
				commands: newPath.parts,
				style: newStyle,
			};
		});
	}

	/**
	 * @returns A list of the parts that make up this path. Many paths only have one part.
	 *
	 * Each part (a {@link RenderablePathSpec}) contains information about the style and geometry
	 * of that part of the stroke. Use the `.path` property to do collision detection and other
	 * operations involving the stroke's geometry.
	 *
	 * Note that many of {@link Path}'s methods (e.g. {@link Path.intersection}) take a
	 * `strokeWidth` parameter that can be gotten from {@link RenderablePathSpec.style} `.stroke.width`.
	 */
	public getParts(): Readonly<RenderablePathSpecWithPath>[] {
		return [...this.parts];
	}

	/**
	 * @returns the {@link Path.union} of all paths that make up this stroke.
	 */
	public getPath() {
		let result: Path|null = null;
		for (const part of this.parts) {
			if (result) {
				result = result.union(part.path);
			} else {
				result ??= part.path;
			}
		}
		return result ?? Path.empty;
	}

	public override description(localization: ImageComponentLocalization): string {
		return localization.stroke;
	}

	protected override createClone(): AbstractComponent {
		return new Stroke(this.parts);
	}

	protected override serializeToJSON() {
		return this.parts.map(part => {
			return {
				style: styleToJSON(part.style),
				path: part.path.serialize(),
			};
		});
	}

	/** @internal */
	public static deserializeFromJSON(this: void, json: any): Stroke {
		if (typeof json === 'string') {
			json = JSON.parse(json);
		}

		if (typeof json !== 'object' || typeof json.length !== 'number') {
			throw new Error(`${json} is missing required field, parts, or parts is of the wrong type.`);
		}

		const pathSpec: RenderablePathSpec[] = json.map((part: any) => {
			const style = styleFromJSON(part.style);
			return pathToRenderable(Path.fromString(part.path), style);
		});
		return new Stroke(pathSpec);
	}
}

AbstractComponent.registerComponent('stroke', Stroke.deserializeFromJSON);
