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
	bbox: Rect2;
}

export default class Stroke extends AbstractComponent {
	private parts: StrokePart[];
	protected contentBBox: Rect2;

	public constructor(parts: RenderablePathSpec[]) {
		super('stroke');

		this.parts = parts.map(section => {
			const path = Path.fromRenderable(section);
			const pathBBox = this.bboxForPart(path.bbox, section.style);

			if (!this.contentBBox) {
				this.contentBBox = pathBBox;
			} else {
				this.contentBBox = this.contentBBox.union(pathBBox);
			}

			return {
				path,
				bbox: pathBBox,

				// To implement RenderablePathSpec
				startPoint: path.startPoint,
				style: section.style,
				commands: path.parts,
			};
		});
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
			const bbox = part.bbox;
			if (!visibleRect || bbox.intersects(visibleRect)) {
				canvas.drawPath(part);
			}
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
			const newBBox = this.bboxForPart(newPath.bbox, part.style);

			if (isFirstPart) {
				this.contentBBox = newBBox;
				isFirstPart = false;
			} else {
				this.contentBBox = this.contentBBox.union(newBBox);
			}

			return {
				path: newPath,
				bbox: newBBox,
				startPoint: newPath.startPoint,
				commands: newPath.parts,
				style: part.style,
			};
		});
	}

	public getPath() {
		return this.parts.reduce((accumulator: Path|null, current: StrokePart) => {
			return accumulator?.union(current.path) ?? current.path;
		}, null) ?? Path.empty;
	}

	public description(localization: ImageComponentLocalization): string {
		return localization.stroke;
	}

	protected createClone(): AbstractComponent {
		return new Stroke(this.parts);
	}

	protected serializeToString(): string | null {
		return JSON.stringify(this.parts.map(part => {
			return {
				style: styleToJSON(part.style),
				path: part.path.serialize(),
			};
		}));
	}

	public static deserializeFromString(data: string): Stroke {
		const json = JSON.parse(data);
		if (typeof json !== 'object' || typeof json.length !== 'number') {
			throw new Error(`${data} is missing required field, parts, or parts is of the wrong type.`);
		}

		const pathSpec: RenderablePathSpec[] = json.map((part: any) => {
			const style = styleFromJSON(part.style);
			return Path.fromString(part.path).toRenderable(style);
		});
		return new Stroke(pathSpec);
	}
}

AbstractComponent.registerComponent('stroke', Stroke.deserializeFromString);
