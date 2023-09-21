import TextComponent from '../components/TextComponent';
import Editor from '../Editor';
import EditorImage from '../image/EditorImage';
import { Rect2, Mat33, Vec2, Color4 } from '@js-draw/math';
import { PointerDevice } from '../Pointer';
import { EditorEventType } from '../types';
import { PointerEvt } from '../inputEvents';
import BaseTool from './BaseTool';
import { ToolLocalization } from './localization';
import Erase from '../commands/Erase';
import uniteCommands from '../commands/uniteCommands';
import TextRenderingStyle from '../rendering/TextRenderingStyle';
import { MutableReactiveValue, ReactiveValue } from '../util/ReactiveValue';

const overlayCSSClass = 'textEditorOverlay';
export default class TextTool extends BaseTool {
	private textStyleValue: MutableReactiveValue<TextRenderingStyle>;

	// A reference to the current value of `textStyleValue`.
	private textStyle: TextRenderingStyle;

	private textEditOverlay: HTMLElement;
	private textInputElem: HTMLTextAreaElement|null = null;
	private textTargetPosition: Vec2|null = null;
	private textMeasuringCtx: CanvasRenderingContext2D|null = null;
	private textRotation: number;
	private textScale: Vec2 = Vec2.of(1, 1);

	private removeExistingCommand: Erase|null = null;

	public constructor(private editor: Editor, description: string, private localizationTable: ToolLocalization) {
		super(editor.notifier, description);
		this.textStyleValue = ReactiveValue.fromInitialValue({
			size: 32,
			fontFamily: 'sans-serif',
			renderingStyle: {
				fill: Color4.purple,
			},
		});
		this.textStyleValue.onUpdateAndNow(() => {
			this.textStyle = this.textStyleValue.get();

			this.updateTextInput();
			this.editor.notifier.dispatch(EditorEventType.ToolUpdated, {
				kind: EditorEventType.ToolUpdated,
				tool: this,
			});
		});

		this.textEditOverlay = document.createElement('div');
		this.textEditOverlay.classList.add(overlayCSSClass);
		this.editor.addStyleSheet(`
			.${overlayCSSClass} {
				height: 0;
				overflow: visible;
			}

			.${overlayCSSClass} textarea {
				background-color: rgba(0, 0, 0, 0);

				white-space: pre;
				overflow: hidden;

				padding: 0;
				margin: 0;
				border: none;
				padding: 0;

				min-width: 100px;
				min-height: 1.1em;
			}
		`);
		this.editor.createHTMLOverlay(this.textEditOverlay);
		this.editor.notifier.on(EditorEventType.ViewportChanged, () => this.updateTextInput());
	}

	private initTextMeasuringCanvas() {
		this.textMeasuringCtx ??= document.createElement('canvas').getContext('2d');
	}

	private getTextAscent(text: string, style: TextRenderingStyle): number {
		this.initTextMeasuringCanvas();
		if (this.textMeasuringCtx) {
			this.textMeasuringCtx.textBaseline = 'alphabetic';
			TextComponent.applyTextStyles(this.textMeasuringCtx, style);
			const measurement = this.textMeasuringCtx.measureText(text);
			return measurement.fontBoundingBoxAscent ?? measurement.actualBoundingBoxAscent;
		}

		// Estimate
		return style.size * 2 / 3;
	}

	// Take input from this' textInputElem and add it to the EditorImage.
	// If [removeInput], the HTML input element is removed. Otherwise, its value
	// is cleared.
	private flushInput(removeInput: boolean = true) {
		if (this.textInputElem && this.textTargetPosition) {
			const content = this.textInputElem.value.trimEnd();

			this.textInputElem.value = '';

			if (removeInput) {
				// In some browsers, .remove() triggers a .blur event (synchronously).
				// Clear this.textInputElem before removal
				const input = this.textInputElem;
				this.textInputElem = null;
				input.remove();
			}

			if (content === '') {
				return;
			}

			const textTransform = Mat33.translation(
				this.textTargetPosition
			).rightMul(
				this.getTextScaleMatrix()
			).rightMul(
				Mat33.scaling2D(this.editor.viewport.getSizeOfPixelOnCanvas())
			).rightMul(
				Mat33.zRotation(this.textRotation)
			);

			const textComponent = TextComponent.fromLines(content.split('\n'), textTransform, this.textStyle);

			const action = EditorImage.addElement(textComponent);
			if (this.removeExistingCommand) {
				// Unapply so that `removeExistingCommand` can be added to the undo stack.
				this.removeExistingCommand.unapply(this.editor);

				this.editor.dispatch(uniteCommands([ this.removeExistingCommand, action ]));
				this.removeExistingCommand = null;
			} else {
				this.editor.dispatch(action);
			}
		}
	}

	private getTextScaleMatrix() {
		return Mat33.scaling2D(this.textScale.times(1/this.editor.viewport.getSizeOfPixelOnCanvas()));
	}

	private updateTextInput() {
		if (!this.textInputElem || !this.textTargetPosition) {
			this.textInputElem?.remove();
			return;
		}

		const viewport = this.editor.viewport;
		const textScreenPos = viewport.canvasToScreen(this.textTargetPosition);
		this.textInputElem.placeholder = this.localizationTable.enterTextToInsert;
		this.textInputElem.style.fontFamily = this.textStyle.fontFamily;
		this.textInputElem.style.fontStyle = this.textStyle.fontStyle ?? '';
		this.textInputElem.style.fontVariant = this.textStyle.fontVariant ?? '';
		this.textInputElem.style.fontWeight = this.textStyle.fontWeight ?? '';
		this.textInputElem.style.fontSize = `${this.textStyle.size}px`;
		this.textInputElem.style.color = this.textStyle.renderingStyle.fill.toHexString();

		this.textInputElem.style.position = 'relative';
		this.textInputElem.style.left = `${textScreenPos.x}px`;
		this.textInputElem.style.top = `${textScreenPos.y}px`;
		this.textInputElem.style.margin = '0';

		this.textInputElem.style.width = `${this.textInputElem.scrollWidth}px`;
		this.textInputElem.style.height = `${this.textInputElem.scrollHeight}px`;

		// Get the ascent based on the font, using a string of characters
		// that is tall in most fonts.
		const tallText = 'Testing!';
		const ascent = this.getTextAscent(tallText, this.textStyle);
		const vertAdjust = ascent;

		const rotation = this.textRotation + viewport.getRotationAngle();
		const scale: Mat33 = this.getTextScaleMatrix();
		this.textInputElem.style.transform =
			`${scale.toCSSMatrix()} rotate(${rotation * 180 / Math.PI}deg) translate(0, ${-vertAdjust}px)`;
		this.textInputElem.style.transformOrigin = 'top left';

		// Match the line height of default rendered text.
		const lineHeight = Math.floor(this.textStyle.size);
		this.textInputElem.style.lineHeight = `${lineHeight}px`;
	}

	private startTextInput(textCanvasPos: Vec2, initialText: string) {
		this.flushInput();

		this.textInputElem = document.createElement('textarea');
		this.textInputElem.value = initialText;
		this.textInputElem.style.display = 'inline-block';
		this.textTargetPosition = this.editor.viewport.roundPoint(textCanvasPos);
		this.textRotation = -this.editor.viewport.getRotationAngle();
		this.textScale = Vec2.of(1, 1).times(this.editor.viewport.getSizeOfPixelOnCanvas());
		this.updateTextInput();

		// Update the input size/position/etc. after the placeHolder has had time to appear.
		setTimeout(() => this.updateTextInput(), 0);

		this.textInputElem.oninput = () => {
			if (this.textInputElem) {
				this.textInputElem.style.width = `${this.textInputElem.scrollWidth}px`;
				this.textInputElem.style.height = `${this.textInputElem.scrollHeight}px`;
			}
		};
		this.textInputElem.onblur = () => {
			// Delay removing the input -- flushInput may be called within a blur()
			// event handler
			const removeInput = false;
			const input = this.textInputElem;

			this.flushInput(removeInput);
			this.textInputElem = null;
			setTimeout(() => {
				input?.remove();
			}, 0);
		};
		this.textInputElem.onkeyup = (evt) => {
			if (evt.key === 'Enter' && !evt.shiftKey) {
				this.flushInput();
				this.editor.focus();
			} else if (evt.key === 'Escape') {
				// Cancel input.
				this.textInputElem?.remove();
				this.textInputElem = null;
				this.editor.focus();

				this.removeExistingCommand?.unapply(this.editor);
				this.removeExistingCommand = null;
			}
		};

		this.textEditOverlay.replaceChildren(this.textInputElem);
		setTimeout(() => this.textInputElem?.focus(), 0);
	}

	public override setEnabled(enabled: boolean) {
		super.setEnabled(enabled);

		if (!enabled) {
			this.flushInput();
		}

		this.textEditOverlay.style.display = enabled ? 'block' : 'none';
	}

	public override onPointerDown({ current, allPointers }: PointerEvt): boolean {
		if (current.device === PointerDevice.Eraser) {
			return false;
		}

		if (allPointers.length === 1) {

			// Are we clicking on a text node?
			const canvasPos = current.canvasPos;
			const halfTestRegionSize = Vec2.of(2.5, 2.5).times(this.editor.viewport.getSizeOfPixelOnCanvas());
			const testRegion = Rect2.fromCorners(canvasPos.minus(halfTestRegionSize), canvasPos.plus(halfTestRegionSize));
			const targetNodes = this.editor.image.getElementsIntersectingRegion(testRegion);
			let targetTextNodes = targetNodes.filter(node => node instanceof TextComponent) as TextComponent[];

			// Don't try to edit text nodes that contain the viewport (this allows us
			// to zoom in on text nodes and add text on top of them.)
			const visibleRect = this.editor.viewport.visibleRect;
			targetTextNodes = targetTextNodes.filter(node => !node.getBBox().containsRect(visibleRect));

			// End any TextNodes we're currently editing.
			this.flushInput();

			if (targetTextNodes.length > 0) {
				const targetNode = targetTextNodes[targetTextNodes.length - 1];
				this.setTextStyle(targetNode.getTextStyle());

				// Create and temporarily apply removeExistingCommand.
				this.removeExistingCommand = new Erase([ targetNode ]);
				this.removeExistingCommand.apply(this.editor);

				this.startTextInput(targetNode.getBaselinePos(), targetNode.getText());

				const transform = targetNode.getTransform();
				this.textRotation = transform.transformVec3(Vec2.unitX).angle();
				const scaleFactor = transform.transformVec3(Vec2.unitX).magnitude();
				this.textScale = Vec2.of(1, 1).times(scaleFactor);
				this.updateTextInput();
			} else {
				this.removeExistingCommand = null;
				this.startTextInput(current.canvasPos, '');
			}
			return true;
		}

		return false;
	}

	public override onGestureCancel(): void {
		this.flushInput();
		this.editor.focus();
	}

	public setFontFamily(fontFamily: string) {
		if (fontFamily !== this.textStyle.fontFamily) {
			this.textStyleValue.set({
				...this.textStyle,
				fontFamily: fontFamily,
			});
		}
	}

	public setColor(color: Color4) {
		if (!color.eq(this.textStyle.renderingStyle.fill)) {
			this.textStyleValue.set({
				...this.textStyle,
				renderingStyle: {
					...this.textStyle.renderingStyle,
					fill: color,
				},
			});
		}
	}

	public setFontSize(size: number) {
		if (size !== this.textStyle.size) {
			this.textStyleValue.set({
				...this.textStyle,
				size,
			});
		}
	}

	public getTextStyle(): TextRenderingStyle {
		return this.textStyle;
	}

	public getStyleValue(): MutableReactiveValue<TextRenderingStyle> {
		return this.textStyleValue;
	}

	private setTextStyle(style: TextRenderingStyle) {
		this.textStyleValue.set(style);
	}
}
