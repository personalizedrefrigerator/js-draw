import SerializableCommand from '../commands/SerializableCommand';
import LineSegment2 from '../math/LineSegment2';
import Mat33, { Mat33Array } from '../math/Mat33';
import Rect2 from '../math/Rect2';
import Editor from '../Editor';
import { Vec2 } from '../math/Vec2';
import AbstractRenderer from '../rendering/renderers/AbstractRenderer';
import { cloneTextStyle, TextRenderingStyle, textStyleFromJSON, textStyleToJSON } from '../rendering/TextRenderingStyle';
import AbstractComponent from './AbstractComponent';
import { ImageComponentLocalization } from './localization';
import RestyleableComponent, { ComponentStyle, createRestyleComponentCommand } from './RestylableComponent';

const componentTypeId = 'text';

export enum TextTransformMode {
	/** Absolutely positioned in both the X and Y dimensions. */
	ABSOLUTE_XY,

	/** Relatively positioned in both the X and Y dimensions. */
	RELATIVE_XY,

	/**Relatively positioned in the X direction, absolutely positioned in the Y direction. */
	RELATIVE_X_ABSOLUTE_Y,

	/**Relatively positioned in the Y direction, absolutely positioned in the X direction. */
	RELATIVE_Y_ABSOLUTE_X,
}

type TextElement = TextComponent|string;

/**
 * Displays text.
 */
export default class TextComponent extends AbstractComponent implements RestyleableComponent {
	protected contentBBox: Rect2;

	// eslint-disable-next-line @typescript-eslint/prefer-as-const
	readonly isRestylableComponent: true = true;

	/**
	 * Creates a new text object from a list of component text or child TextComponents.
	 *
	 * @see {@link fromLines}
	 */
	public constructor(
		protected readonly textObjects: Array<TextElement>,

		// Transformation relative to this component's parent element.
		private transform: Mat33,
		private style: TextRenderingStyle,

		// @internal
		private transformMode: TextTransformMode = TextTransformMode.ABSOLUTE_XY,
	) {
		super(componentTypeId);
		this.recomputeBBox();

		// If this has no direct children, choose a style representative of this' content
		// (useful for estimating the style of the TextComponent).
		const hasDirectContent = textObjects.some(obj => typeof obj === 'string');
		if (!hasDirectContent && textObjects.length > 0) {
			this.style = (textObjects[0] as TextComponent).getTextStyle();
		}
	}

	public static applyTextStyles(ctx: CanvasRenderingContext2D, style: TextRenderingStyle) {
		// Quote the font family if necessary.
		const fontFamily = style.fontFamily.match(/\s/) ? style.fontFamily.replace(/["]/g, '\\"') : style.fontFamily;

		ctx.font =	[
			style.fontStyle ?? '',
			style.fontWeight ?? '',
			(style.size ?? 12) + 'px',
			`${fontFamily}`
		].join(' ');

		// TODO: Support RTL
		ctx.textAlign = 'left';
	}

	private static textMeasuringCtx: CanvasRenderingContext2D|null = null;

	// Roughly estimate the bounding box of `text`. Use if no CanvasRenderingContext2D is available.
	private static estimateTextDimens(text: string, style: TextRenderingStyle): Rect2 {
		const widthEst = text.length * style.size;
		const heightEst = style.size;

		// Text is drawn with (0, 0) as its baseline. As such, the majority of the text's height should
		// be above (0, 0).
		return new Rect2(0, -heightEst * 2/3, widthEst, heightEst);
	}

	// Returns the bounding box of `text`. This is approximate if no Canvas is available.
	private static getTextDimens(text: string, style: TextRenderingStyle): Rect2 {
		TextComponent.textMeasuringCtx ??= document.createElement('canvas').getContext('2d') ?? null;
		if (!TextComponent.textMeasuringCtx) {
			return this.estimateTextDimens(text, style);
		}

		const ctx = TextComponent.textMeasuringCtx;
		TextComponent.applyTextStyles(ctx, style);

		const measure = ctx.measureText(text);

		// Text is drawn with (0,0) at the bottom left of the baseline.
		const textY = -measure.actualBoundingBoxAscent;
		const textHeight = measure.actualBoundingBoxAscent + measure.actualBoundingBoxDescent;
		return new Rect2(0, textY, measure.width, textHeight);
	}

	private computeUntransformedBBoxOfPart(part: TextElement) {
		if (typeof part === 'string') {
			return TextComponent.getTextDimens(part, this.style);
		} else {
			return part.contentBBox;
		}
	}

	private recomputeBBox() {
		let bbox: Rect2|null = null;
		const cursor = new TextComponent.TextCursor(this.transform, this.style);

		for (const textObject of this.textObjects) {
			const transform = cursor.update(textObject);
			const currentBBox = this.computeUntransformedBBoxOfPart(textObject).transformedBoundingBox(transform);

			bbox ??= currentBBox;
			bbox = bbox.union(currentBBox);
		}

		this.contentBBox = bbox ?? Rect2.empty;
	}

	private renderInternal(canvas: AbstractRenderer) {
		const cursor = new TextComponent.TextCursor(this.transform, this.style);

		for (const textObject of this.textObjects) {
			const transform = cursor.update(textObject);

			if (typeof textObject === 'string') {
				canvas.drawText(textObject, transform, this.style);
			} else {
				canvas.pushTransform(transform);
				textObject.renderInternal(canvas);
				canvas.popTransform();
			}
		}
	}

	public render(canvas: AbstractRenderer, _visibleRect?: Rect2): void {
		canvas.startObject(this.contentBBox);
		this.renderInternal(canvas);
		canvas.endObject(this.getLoadSaveData());
	}

	public override getProportionalRenderingTime(): number {
		return this.textObjects.length;
	}

	public intersects(lineSegment: LineSegment2): boolean {
		const cursor = new TextComponent.TextCursor(this.transform, this.style);

		for (const subObject of this.textObjects) {
			// Convert canvas space to internal space relative to the current object.
			const invTransform = cursor.update(subObject).inverse();
			const transformedLine = lineSegment.transformedBy(invTransform);

			if (typeof subObject === 'string') {
				const textBBox = TextComponent.getTextDimens(subObject, this.style);

				// TODO: Use a better intersection check. Perhaps draw the text onto a CanvasElement and
				// use pixel-testing to check for intersection with its contour.
				if (textBBox.getEdges().some(edge => transformedLine.intersection(edge) !== null)) {
					return true;
				}
			} else {
				if (subObject.intersects(transformedLine)) {
					return true;
				}
			}
		}

		return false;
	}

	public getStyle(): ComponentStyle {
		return {
			color: this.style.renderingStyle.fill,

			// Make a copy
			textStyle: {
				...this.style,
				renderingStyle: {
					...this.style.renderingStyle,
				},
			},
		};
	}

	public updateStyle(style: ComponentStyle): SerializableCommand {
		return createRestyleComponentCommand(this.getStyle(), style, this);
	}

	public forceStyle(style: ComponentStyle, editor: Editor|null): void {
		if (style.textStyle) {
			this.style = cloneTextStyle(style.textStyle);
		} else if (style.color) {
			this.style = {
				...this.style,
				renderingStyle: {
					...this.style.renderingStyle,
					fill: style.color,
				},
			};
		} else {
			return;
		}

		for (const child of this.textObjects) {
			if (child instanceof TextComponent) {
				child.forceStyle(style, editor);
			}
		}

		if (editor) {
			editor.image.queueRerenderOf(this);
			editor.queueRerender();
		}
	}

	// See {@link getStyle}
	public getTextStyle(): TextRenderingStyle {
		return cloneTextStyle(this.style);
	}

	public getBaselinePos() {
		return this.transform.transformVec2(Vec2.zero);
	}

	public getTransform(): Mat33 {
		return this.transform;
	}

	protected applyTransformation(affineTransfm: Mat33): void {
		this.transform = affineTransfm.rightMul(this.transform);
		this.recomputeBBox();
	}

	protected createClone(): AbstractComponent {
		const clonedTextObjects = this.textObjects.map(obj => {
			if (typeof obj === 'string') {
				return obj;
			} else {
				return obj.createClone() as TextComponent;
			}
		});
		return new TextComponent(clonedTextObjects, this.transform, this.style);
	}

	public getText() {
		const result: string[] = [];

		for (const textObject of this.textObjects) {
			if (typeof textObject === 'string') {
				result.push(textObject);
			} else {
				result.push(textObject.getText());
			}
		}

		return result.join('\n');
	}

	public description(localizationTable: ImageComponentLocalization): string {
		return localizationTable.text(this.getText());
	}

	// Do not rely on the output of `serializeToJSON` taking any particular format.
	protected serializeToJSON(): Record<string, any> {
		const serializableStyle = textStyleToJSON(this.style);

		const serializedTextObjects = this.textObjects.map(text => {
			if (typeof text === 'string') {
				return {
					text,
				};
			} else {
				return {
					json: text.serializeToJSON(),
				};
			}
		});

		return {
			textObjects: serializedTextObjects,
			transform: this.transform.toArray(),
			style: serializableStyle,
		};
	}

	// @internal
	public static deserializeFromString(json: any): TextComponent {
		if (typeof json === 'string') {
			json = JSON.parse(json);
		}

		const style = textStyleFromJSON(json.style);

		const textObjects: Array<TextElement> = json.textObjects.map((data: any) => {
			if ((data.text ?? null) !== null) {
				return data.text;
			}

			return TextComponent.deserializeFromString(data.json);
		});

		json.transform = json.transform.filter((elem: any) => typeof elem === 'number');
		if (json.transform.length !== 9) {
			throw new Error(`Unable to deserialize transform, ${json.transform}.`);
		}

		const transformData = json.transform as Mat33Array;
		const transform = new Mat33(...transformData);

		return new TextComponent(textObjects, transform, style);
	}

	/**
	 * Creates a `TextComponent` from `lines`.
	 *
	 * @example
	 * ```ts
	 * const textStyle = {
	 *   size: 12,
	 *   fontFamily: 'serif',
	 *   renderingStyle: { fill: Color4.black },
	 * };
	 *
	 * const text = TextComponent.fromLines('foo\nbar'.split('\n'), Mat33.identity, textStyle);
	 * ```
	 */
	public static fromLines(lines: string[], transform: Mat33, style: TextRenderingStyle): AbstractComponent {
		let lastComponent: TextComponent|null = null;
		const components: TextComponent[] = [];

		for (const line of lines) {
			let position = Vec2.zero;
			if (lastComponent) {
				const lineMargin = Math.floor(style.size);
				position = lastComponent.getBBox().bottomLeft.plus(Vec2.unitY.times(lineMargin));
			}

			const component = new TextComponent([ line ], Mat33.translation(position), style);
			components.push(component);
			lastComponent = component;
		}

		return new TextComponent(components, transform, style);
	}

	private static TextCursor = class {
		public transform: Mat33 = Mat33.identity;
		public constructor(
			private parentTransform: Mat33 = Mat33.identity, private parentStyle: TextRenderingStyle
		) { }

		/**
		 * Based on previous calls to `update`, returns the transformation of
		 * the given `element` (including the parentTransform given to this cursor's
		 * constructor).
		 *
		 * The result does not take into account
		 */
		public update(elem: TextElement) {
			let elementTransform = Mat33.identity;
			let elemInternalTransform = Mat33.identity;
			let textSize;
			if (typeof(elem) === 'string') {
				textSize = TextComponent.getTextDimens(elem, this.parentStyle);
			} else {
				// TODO: Double-check whether we need to take elem.transform into account here.
				// elementTransform = elem.transform;
				elemInternalTransform = elem.transform;
				textSize = elem.getBBox();
			}
			const positioning = typeof(elem) === 'string' ? TextTransformMode.RELATIVE_XY : elem.transformMode;

			if (positioning === TextTransformMode.RELATIVE_XY) {
				// Position relative to the previous element's transform.
				elementTransform = this.transform.rightMul(elementTransform);
			} else if (positioning === TextTransformMode.RELATIVE_X_ABSOLUTE_Y || positioning === TextTransformMode.RELATIVE_Y_ABSOLUTE_X) {
				// Zero the absolute component of this.transform's translation
				const transform = this.transform.mapEntries((component, [row, col]) => {
					if (positioning === TextTransformMode.RELATIVE_X_ABSOLUTE_Y) {
						// Zero the y component of this.transform's translation
						return row === 1 && col === 2 ? 0 : component;
					} else if (positioning === TextTransformMode.RELATIVE_Y_ABSOLUTE_X) {
						// Zero the x component of this.transform's translation
						return row === 0 && col === 2 ? 0 : component;
					}

					throw new Error('Unreachable');
					return 0;
				});

				elementTransform = transform.rightMul(elementTransform);
			}

			// Update this.transform so that future calls to update return correct values.
			const endShiftTransform = Mat33.translation(Vec2.of(textSize.width, 0));
			this.transform = elementTransform.rightMul(elemInternalTransform).rightMul(endShiftTransform);

			return this.parentTransform.rightMul(elementTransform);
		}
	};
}

AbstractComponent.registerComponent(componentTypeId, (data: string) => TextComponent.deserializeFromString(data));