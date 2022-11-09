import LineSegment2 from '../math/LineSegment2';
import Mat33 from '../math/Mat33';
import Path from '../math/Path';
import Rect2 from '../math/Rect2';
import AbstractRenderer, { RenderablePathSpec } from '../rendering/renderers/AbstractRenderer';
import RenderingStyle, { styleFromJSON, styleToJSON } from '../rendering/RenderingStyle';
import AbstractComponent from './AbstractComponent';
import { ImageComponentLocalization } from './localization';

interface StrokePart extends RenderablePathSpec {
	path: Path;
}

export default class Stroke extends AbstractComponent {
	private parts: StrokePart[];
	protected contentBBox: Rect2;

	// Creates a `Stroke` from the given `parts`.
	public constructor(parts: RenderablePathSpec[]) {
		super('stroke');

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
		}
		this.contentBBox ??= Rect2.empty;
	}

	public intersects(line: LineSegment2): boolean {
		for (const part of this.parts) {
			if (part.path.intersection(line).length > 0) {
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

				const muchBiggerThanVisible = bbox.size.x > visibleRect.size.x * 2 || bbox.size.y > visibleRect.size.y * 2;
				if (muchBiggerThanVisible && !part.path.roughlyIntersects(visibleRect, part.style.stroke?.width ?? 0)) {
					continue;
				}
			}

			canvas.drawPath(part);
		}
		canvas.endObject(this.getLoadSaveData());
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
