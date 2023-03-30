import SerializableCommand from '../commands/SerializableCommand';
import LineSegment2 from '../math/LineSegment2';
import Mat33 from '../math/Mat33';
import Path from '../math/Path';
import Rect2 from '../math/Rect2';
import Editor from '../Editor';
import AbstractRenderer, { RenderablePathSpec } from '../rendering/renderers/AbstractRenderer';
import RenderingStyle, { styleFromJSON, styleToJSON } from '../rendering/RenderingStyle';
import AbstractComponent from './AbstractComponent';
import { ImageComponentLocalization } from './localization';
import RestyleableComponent, { ComponentStyle, createRestyleComponentCommand } from './RestylableComponent';

interface StrokePart extends RenderablePathSpec {
	path: Path;
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
	 *     path.toRenderable({ fill: Color4.red })
	 * ]);
	 * ```
	 */
	public constructor(parts: RenderablePathSpec[]) {
		super('stroke');

		this.approximateRenderingTime = 0;
		this.parts = [];

		for (const section of parts) {
			const path = Path.fromRenderable(section);
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

	public intersects(line: LineSegment2): boolean {
		for (const part of this.parts) {
			const strokeWidth = part.style.stroke?.width;
			const strokeRadius = strokeWidth ? strokeWidth / 2 : undefined;

			if (part.path.intersection(line, strokeRadius).length > 0) {
				return true;
			}
		}
		return false;
	}

	public render(canvas: AbstractRenderer, visibleRect?: Rect2): void {
		canvas.startObject(this.getBBox());
		for (const part of this.parts) {
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

	public getProportionalRenderingTime(): number {
		return this.approximateRenderingTime;
	}

	// Grows the bounding box for a given stroke part based on that part's style.
	private bboxForPart(origBBox: Rect2, style: RenderingStyle) {
		if (!style.stroke) {
			return origBBox;
		}

		return origBBox.grownBy(style.stroke.width / 2);
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

	public description(localization: ImageComponentLocalization): string {
		return localization.stroke;
	}

	protected createClone(): AbstractComponent {
		return new Stroke(this.parts);
	}

	protected serializeToJSON() {
		return this.parts.map(part => {
			return {
				style: styleToJSON(part.style),
				path: part.path.serialize(),
			};
		});
	}

	/** @internal */
	public static deserializeFromJSON(json: any): Stroke {
		if (typeof json === 'string') {
			json = JSON.parse(json);
		}

		if (typeof json !== 'object' || typeof json.length !== 'number') {
			throw new Error(`${json} is missing required field, parts, or parts is of the wrong type.`);
		}

		const pathSpec: RenderablePathSpec[] = json.map((part: any) => {
			const style = styleFromJSON(part.style);
			return Path.fromString(part.path).toRenderable(style);
		});
		return new Stroke(pathSpec);
	}
}

AbstractComponent.registerComponent('stroke', Stroke.deserializeFromJSON);
