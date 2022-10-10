import Color4 from '../Color4';
import TextComponent, { TextStyle } from '../components/Text';
import Editor from '../Editor';
import EditorImage from '../EditorImage';
import Rect2 from '../math/Rect2';
import Mat33 from '../math/Mat33';
import { Vec2 } from '../math/Vec2';
import { PointerDevice } from '../Pointer';
import { EditorEventType, PointerEvt } from '../types';
import BaseTool from './BaseTool';
import { ToolLocalization } from './localization';
import Erase from '../commands/Erase';
import uniteCommands from '../commands/uniteCommands';

const overlayCssClass = 'textEditorOverlay';
export default class TextTool extends BaseTool {
	private textStyle: TextStyle;

	private textEditOverlay: HTMLElement;
	private textInputElem: HTMLDivElement|null = null;
	private textTargetPosition: Vec2|null = null;
	private textMeasuringCtx: CanvasRenderingContext2D|null = null;
	private textRotation: number;
	private textScale: Vec2 = Vec2.of(1, 1);

	private removeExistingCommand: Erase|null = null;

	public constructor(private editor: Editor, description: string, private localizationTable: ToolLocalization) {
		super(editor.notifier, description);
		this.textStyle = {
			size: 32,
			fontFamily: 'sans-serif',
			renderingStyle: {
				fill: Color4.purple,
			},
		};

		this.textEditOverlay = document.createElement('div');
		this.textEditOverlay.classList.add(overlayCssClass);
		this.editor.addStyleSheet(`
			.${overlayCssClass} {
				height: 0;
				overflow: visible;
			}

			.${overlayCssClass} div[contentEditable] {
				background-color: rgba(0, 0, 0, 0);
				padding: 0;
				margin: 0;
				border: none;
				padding: 0;
				min-width: 40px;
				min-height: 40px;
	
				outline: 1px solid var(--primary-foreground-color);
			}
		`);
		this.editor.createHTMLOverlay(this.textEditOverlay);
		this.editor.notifier.on(EditorEventType.ViewportChanged, () => this.updateTextInput());
	}

	private getTextAscent(text: string, style: TextStyle): number {
		this.textMeasuringCtx ??= document.createElement('canvas').getContext('2d');
		if (this.textMeasuringCtx) {
			TextComponent.applyTextStyles(this.textMeasuringCtx, style);
			return this.textMeasuringCtx.measureText(text).actualBoundingBoxAscent;
		}

		// Estimate
		return style.size * 2 / 3;
	}

	private flushInput() {
		if (this.textInputElem && this.textTargetPosition) {
			const content = this.textInputElem.innerText;
			this.textInputElem.remove();
			this.textInputElem = null;

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
		this.textInputElem.setAttribute('aria-placeholder', this.localizationTable.enterTextToInsert);
		this.textInputElem.style.fontFamily = this.textStyle.fontFamily;
		this.textInputElem.style.fontVariant = this.textStyle.fontVariant ?? '';
		this.textInputElem.style.fontWeight = this.textStyle.fontWeight ?? '';
		this.textInputElem.style.fontSize = `${this.textStyle.size}px`;
		this.textInputElem.style.color = this.textStyle.renderingStyle.fill.toHexString();

		this.textInputElem.style.position = 'relative';
		this.textInputElem.style.left = `${textScreenPos.x}px`;
		this.textInputElem.style.top = `${textScreenPos.y}px`;
		this.textInputElem.style.margin = '0';

		const rotation = this.textRotation + viewport.getRotationAngle();
		const ascent = this.getTextAscent(this.textInputElem.innerText || 'W', this.textStyle);
		const scale: Mat33 = this.getTextScaleMatrix();
		this.textInputElem.style.transform = `${scale.toCSSMatrix()} rotate(${rotation * 180 / Math.PI}deg) translate(0, ${-ascent}px)`;
		this.textInputElem.style.transformOrigin = 'top left';
	}

	private startTextInput(textCanvasPos: Vec2, initialText: string) {
		this.flushInput();

		this.textInputElem = document.createElement('div');
		this.textInputElem.setAttribute('role', 'textarea');
		this.textInputElem.innerText = initialText;
		this.textInputElem.contentEditable = 'true';
		this.textInputElem.style.wordBreak = 'pre';
		this.textInputElem.style.display = 'inline-block';
		this.textTargetPosition = textCanvasPos;
		this.textRotation = -this.editor.viewport.getRotationAngle();
		this.textScale = Vec2.of(1, 1).times(this.editor.viewport.getSizeOfPixelOnCanvas());
		this.updateTextInput();

		this.textInputElem.onblur = () => {
			// Don't remove the input within the context of a blur event handler.
			// Doing so causes errors.
			setTimeout(() => this.flushInput(), 0);
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
			}
		};

		this.textEditOverlay.replaceChildren(this.textInputElem);
		setTimeout(() => this.textInputElem?.focus(), 0);
	}

	public setEnabled(enabled: boolean) {
		super.setEnabled(enabled);

		if (!enabled) {
			this.flushInput();
		}

		this.textEditOverlay.style.display = enabled ? 'block' : 'none';
	}

	public onPointerDown({ current, allPointers }: PointerEvt): boolean {
		if (current.device === PointerDevice.Eraser) {
			return false;
		}

		if (allPointers.length === 1) {

			// Are we clicking on a text node?
			const canvasPos = current.canvasPos;
			const halfTestRegionSize = Vec2.of(2.5, 2.5).times(this.editor.viewport.getSizeOfPixelOnCanvas());
			const testRegion = Rect2.fromCorners(canvasPos.minus(halfTestRegionSize), canvasPos.plus(halfTestRegionSize));
			const targetNodes = this.editor.image.getElementsIntersectingRegion(testRegion);
			const targetTextNodes = targetNodes.filter(node => node instanceof TextComponent) as TextComponent[];

			if (targetTextNodes.length > 0) {
				const targetNode = targetTextNodes[targetTextNodes.length - 1];
				this.setTextStyle(targetNode.getTextStyle());

				// Create and temporarily apply removeExistingCommand.
				this.removeExistingCommand = new Erase([ targetNode ]);
				this.removeExistingCommand.apply(this.editor);

				this.startTextInput(targetNode.getBaselinePos(), targetNode.getText());

				this.textRotation = targetNode.getTransform().transformVec3(Vec2.zero).angle();
				this.textScale = targetNode.getTransform().transformVec3(Vec2.of(1, 1));
				this.updateTextInput();
			} else {
				this.removeExistingCommand = null;
				this.startTextInput(current.canvasPos, '');
			}
			return true;
		}

		return false;
	}

	public onGestureCancel(): void {
		this.flushInput();
		this.editor.focus();
	}

	private dispatchUpdateEvent() {
		this.updateTextInput();
		this.editor.notifier.dispatch(EditorEventType.ToolUpdated, {
			kind: EditorEventType.ToolUpdated,
			tool: this,
		});
	}

	public setFontFamily(fontFamily: string) {
		if (fontFamily !== this.textStyle.fontFamily) {
			this.textStyle = {
				...this.textStyle,
				fontFamily: fontFamily,
			};

			this.dispatchUpdateEvent();
		}
	}

	public setColor(color: Color4) {
		if (!color.eq(this.textStyle.renderingStyle.fill)) {
			this.textStyle = {
				...this.textStyle,
				renderingStyle: {
					...this.textStyle.renderingStyle,
					fill: color,
				},
			};

			this.dispatchUpdateEvent();
		}
	}

	public setFontSize(size: number) {
		if (size !== this.textStyle.size) {
			this.textStyle = {
				...this.textStyle,
				size,
			};

			this.dispatchUpdateEvent();
		}
	}

	public getTextStyle(): TextStyle {
		return this.textStyle;
	}

	private setTextStyle(style: TextStyle) {
		// Copy the style — we may change parts of it.
		this.textStyle = {...style};
		this.dispatchUpdateEvent();
	}
}
