import LineSegment2 from '../geometry/LineSegment2';
import Mat33 from '../geometry/Mat33';
import Rect2 from '../geometry/Rect2';
import AbstractRenderer from '../rendering/renderers/AbstractRenderer';
import RenderingStyle, { styleFromJSON, styleToJSON } from '../rendering/RenderingStyle';
import AbstractComponent from './AbstractComponent';
import { ImageComponentLocalization } from './localization';

export interface TextStyle {
	size: number;
	fontFamily: string;
	fontWeight?: string;
	fontVariant?: string;
	renderingStyle: RenderingStyle;
}

type GetTextDimensCallback = (text: string, style: TextStyle) => Rect2;

const componentTypeId = 'text';
export default class Text extends AbstractComponent {
	protected contentBBox: Rect2;

	public constructor(
		protected readonly textObjects: Array<string|Text>,
		private transform: Mat33,
		private readonly style: TextStyle,

		// If not given, an HtmlCanvasElement is used to determine text boundaries.
		private readonly getTextDimens: GetTextDimensCallback = Text.getTextDimens,
	) {
		super(componentTypeId);
		this.recomputeBBox();
	}

	public static applyTextStyles(ctx: CanvasRenderingContext2D, style: TextStyle) {
		// Quote the font family if necessary.
		const fontFamily = style.fontFamily.match(/\s/) ? style.fontFamily.replace(/["]/g, '\\"') : style.fontFamily;

		ctx.font =	[
			(style.size ?? 12) + 'px',
			style.fontWeight ?? '',
			`${fontFamily}`,
			style.fontWeight
		].join(' ');

		ctx.textAlign = 'left';
	}

	private static textMeasuringCtx: CanvasRenderingContext2D;
	private static getTextDimens(text: string, style: TextStyle): Rect2 {
		Text.textMeasuringCtx ??= document.createElement('canvas').getContext('2d')!;
		const ctx = Text.textMeasuringCtx;
		Text.applyTextStyles(ctx, style);

		const measure = ctx.measureText(text);

		// Text is drawn with (0,0) at the bottom left of the baseline.
		const textY = -measure.actualBoundingBoxAscent;
		const textHeight = measure.actualBoundingBoxAscent + measure.actualBoundingBoxDescent;
		return new Rect2(0, textY, measure.width, textHeight);
	}

	private computeBBoxOfPart(part: string|Text) {
		if (typeof part === 'string') {
			const textBBox = this.getTextDimens(part, this.style);
			return textBBox.transformedBoundingBox(this.transform);
		} else {
			const bbox = part.contentBBox.transformedBoundingBox(this.transform);
			return bbox;
		}
	}

	private recomputeBBox() {
		let bbox: Rect2|null = null;

		for (const textObject of this.textObjects) {
			const currentBBox = this.computeBBoxOfPart(textObject);
			bbox ??= currentBBox;
			bbox = bbox.union(currentBBox);
		}

		this.contentBBox = bbox ?? Rect2.empty;
	}

	public render(canvas: AbstractRenderer, _visibleRect?: Rect2): void {
		const cursor = this.transform;

		canvas.startObject(this.contentBBox);
		for (const textObject of this.textObjects) {
			if (typeof textObject === 'string') {
				canvas.drawText(textObject, cursor, this.style);
			} else {
				canvas.pushTransform(cursor);
				textObject.render(canvas);
				canvas.popTransform();
			}
		}
		canvas.endObject(this.getLoadSaveData());
	}

	public intersects(lineSegment: LineSegment2): boolean {

		// Convert canvas space to internal space.
		const invTransform = this.transform.inverse();
		const p1InThisSpace = invTransform.transformVec2(lineSegment.p1);
		const p2InThisSpace = invTransform.transformVec2(lineSegment.p2);
		lineSegment = new LineSegment2(p1InThisSpace, p2InThisSpace);

		for (const subObject of this.textObjects) {
			if (typeof subObject === 'string') {
				const textBBox = Text.getTextDimens(subObject, this.style);

				// TODO: Use a better intersection check. Perhaps draw the text onto a CanvasElement and
				// use pixel-testing to check for intersection with its contour.
				if (textBBox.getEdges().some(edge => lineSegment.intersection(edge) !== null)) {
					return true;
				}
			} else {
				if (subObject.intersects(lineSegment)) {
					return true;
				}
			}
		}

		return false;
	}

	protected applyTransformation(affineTransfm: Mat33): void {
		this.transform = affineTransfm.rightMul(this.transform);
		this.recomputeBBox();
	}

	protected createClone(): AbstractComponent {
		return new Text(this.textObjects, this.transform, this.style);
	}

	private getText() {
		const result: string[] = [];

		for (const textObject of this.textObjects) {
			if (typeof textObject === 'string') {
				result.push(textObject);
			} else {
				result.push(textObject.getText());
			}
		}

		return result.join(' ');
	}

	public description(localizationTable: ImageComponentLocalization): string {
		return localizationTable.text(this.getText());
	}

	protected serializeToString(): string {
		const serializableStyle = {
			...this.style,
			renderingStyle: styleToJSON(this.style.renderingStyle),
		};

		const textObjects = this.textObjects.map(text => {
			if (typeof text === 'string') {
				return {
					text,
				};
			} else {
				return {
					json: text.serializeToString(),
				};
			}
		});

		return JSON.stringify({
			textObjects,
			transform: this.transform.toArray(),
			style: serializableStyle,
		});
	}

	public static deserializeFromString(data: string, getTextDimens: GetTextDimensCallback = Text.getTextDimens): Text {
		const json = JSON.parse(data);

		const style: TextStyle = {
			renderingStyle: styleFromJSON(json.style.renderingStyle),
			size: json.style.size,
			fontWeight: json.style.fontWeight,
			fontVariant: json.style.fontVariant,
			fontFamily: json.style.fontFamily,
		};

		const textObjects: Array<string|Text> = json.textObjects.map((data: any) => {
			if ((data.text ?? null) !== null) {
				return data.text;
			}

			return Text.deserializeFromString(data.json);
		});

		json.transform = json.transform.filter((elem: any) => typeof elem === 'number');
		if (json.transform.length !== 9) {
			throw new Error(`Unable to deserialize transform, ${json.transform}.`);
		}

		const transformData = json.transform as [
			number, number, number,
			number, number, number,
			number, number, number,
		];
		const transform = new Mat33(...transformData);

		return new Text(textObjects, transform, style, getTextDimens);
	}
}

AbstractComponent.registerComponent(componentTypeId, (data: string) => Text.deserializeFromString(data));