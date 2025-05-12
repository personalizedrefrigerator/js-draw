import { Color4 } from '@js-draw/math';
import Editor from '../Editor';
import EditorImage from '../image/EditorImage';
import Pointer, { PointerDevice } from '../Pointer';
import { makeFreehandLineBuilder } from '../components/builders/FreehandLineBuilder';
import { EditorEventType, StrokeDataPoint } from '../types';
import { KeyPressEvent, PointerEvt } from '../inputEvents';
import BaseTool from './BaseTool';
import { ComponentBuilder, ComponentBuilderFactory } from '../components/builders/types';
import { undoKeyboardShortcutId } from './keybindings';
import { decreaseSizeKeyboardShortcutId, increaseSizeKeyboardShortcutId } from './keybindings';
import InputStabilizer from './InputFilter/InputStabilizer';
import { MutableReactiveValue, ReactiveValue } from '../util/ReactiveValue';
import StationaryPenDetector, {
	defaultStationaryDetectionConfig,
} from './util/StationaryPenDetector';
import AbstractComponent from '../components/AbstractComponent';
import AbstractRenderer from '../rendering/renderers/AbstractRenderer';

export interface PenStyle {
	readonly color: Color4;
	readonly thickness: number;
	readonly factory: ComponentBuilderFactory;
}

/**
 * A tool that allows drawing shapes and freehand lines.
 *
 * To change the type of shape drawn by the pen (e.g. to switch to the rectangle
 * pen type), see {@link setStrokeFactory}.
 */
export default class Pen extends BaseTool {
	protected builder: ComponentBuilder | null = null;
	private lastPoint: StrokeDataPoint | null = null;
	private startPoint: StrokeDataPoint | null = null;
	private currentDeviceType: PointerDevice | null = null;
	private currentPointerId: number | null = null;
	private styleValue: MutableReactiveValue<PenStyle>;
	private wetInkRenderer: AbstractRenderer;
	private style: PenStyle;

	private shapeAutocompletionEnabled: boolean = false;
	private pressureSensitivityEnabled: boolean = true;
	private autocorrectedShape: AbstractComponent | null = null;
	private lastAutocorrectedShape: AbstractComponent | null = null;
	private removedAutocorrectedShapeTime: number = 0;
	private stationaryDetector: StationaryPenDetector | null = null;

	public constructor(
		private editor: Editor,
		description: string,
		style: Partial<PenStyle>,
	) {
		super(editor.notifier, description);

		this.styleValue = ReactiveValue.fromInitialValue<PenStyle>({
			factory: makeFreehandLineBuilder,
			color: Color4.blue,
			thickness: 4,
			...style,
		});

		this.styleValue.onUpdateAndNow((newValue) => {
			this.style = newValue;
			this.noteUpdated();
		});

		this.wetInkRenderer = this.editor.display.getWetInkRenderer();
	}

	private getPressureMultiplier() {
		const thickness = this.style.thickness;
		return (1 / this.editor.viewport.getScaleFactor()) * thickness;
	}

	// Converts a `pointer` to a `StrokeDataPoint`.
	protected toStrokePoint(pointer: Pointer): StrokeDataPoint {
		const minPressure = 0.3;
		const defaultPressure = 0.5; // https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/pressure#value
		let pressure = Math.max(pointer.pressure ?? 1.0, minPressure);

		if (!isFinite(pressure)) {
			console.warn('Non-finite pressure!', pointer);
			pressure = minPressure;
		}
		console.assert(isFinite(pointer.canvasPos.length()), 'Non-finite canvas position!');
		console.assert(isFinite(pointer.screenPos.length()), 'Non-finite screen position!');
		console.assert(isFinite(pointer.timeStamp), 'Non-finite timeStamp on pointer!');

		const pos = pointer.canvasPos;

		if (!this.getPressureSensitivityEnabled()) {
			pressure = defaultPressure;
		}

		return {
			pos,
			width: pressure * this.getPressureMultiplier(),
			color: this.style.color,
			time: pointer.timeStamp,
		};
	}

	// Displays the stroke that is currently being built with the display's `wetInkRenderer`.
	protected previewStroke() {
		this.editor.clearWetInk();
		if (this.autocorrectedShape) {
			const visibleRect = this.editor.viewport.visibleRect;
			this.autocorrectedShape.render(this.wetInkRenderer, visibleRect);
		} else if (this.builder) {
			this.builder.preview(this.wetInkRenderer);

			if (this.builder.inkTrailStyle) {
				const trailStyle = this.builder.inkTrailStyle();
				const draftInkPresenter = this.wetInkRenderer.getDraftInkPresenter();
				draftInkPresenter.updateStyle(trailStyle);
			}
		}
	}

	// Throws if no stroke builder exists.
	protected addPointToStroke(point: StrokeDataPoint) {
		if (!this.builder) {
			throw new Error('No stroke is currently being generated.');
		}
		this.builder.addPoint(point);
		this.lastPoint = point;
		this.previewStroke();
	}

	public override onPointerDown(event: PointerEvt): boolean {
		// Avoid canceling an existing stroke
		if (this.builder && !this.eventCanCancelStroke(event)) {
			return true;
		}

		const { current, allPointers } = event;
		const isEraser = current.device === PointerDevice.Eraser;
		const isPen = current.device === PointerDevice.Pen;

		// Always start strokes if the current device is a pen. This is useful in the case
		// where an accidental touch gesture from a user's hand is ongoing. This gesture
		// should not prevent the user from drawing.
		if ((allPointers.length === 1 && !isEraser) || isPen) {
			this.startPoint = this.toStrokePoint(current);
			this.builder = this.style.factory(this.startPoint, this.editor.viewport);
			this.currentDeviceType = current.device;
			this.currentPointerId = current.id;

			if (this.shapeAutocompletionEnabled) {
				this.stationaryDetector = new StationaryPenDetector(
					current,
					defaultStationaryDetectionConfig,
					(pointer) => this.autocorrectShape(pointer),
				);
			} else {
				this.stationaryDetector = null;
			}
			this.lastAutocorrectedShape = null;
			this.removedAutocorrectedShapeTime = 0;
			if (this.builder.inkTrailStyle) {
				// Accelerate inking
				this.wetInkRenderer.getDraftInkPresenter().setEnabled(current.id, true);
			}
			return true;
		}

		return false;
	}

	private eventCanCancelStroke(event: PointerEvt) {
		// If there has been a delay since the last input event,
		// it's always okay to cancel
		const lastInputTime = this.lastPoint?.time ?? 0;
		if (event.current.timeStamp - lastInputTime > 1000) {
			return true;
		}

		const isPenStroke = this.currentDeviceType === PointerDevice.Pen;
		const isTouchEvent = event.current.device === PointerDevice.Touch;

		// Don't allow pen strokes to be cancelled by touch events.
		if (isPenStroke && isTouchEvent) {
			return false;
		}

		return true;
	}

	public override eventCanBeDeliveredToNonActiveTool(event: PointerEvt) {
		return this.eventCanCancelStroke(event);
	}

	public override onPointerMove({ current }: PointerEvt): void {
		if (!this.builder) return;
		if (current.device !== this.currentDeviceType) return;
		if (current.id !== this.currentPointerId) return;

		const isStationary = this.stationaryDetector?.onPointerMove(current);

		if (!isStationary) {
			this.addPointToStroke(this.toStrokePoint(current));

			if (this.autocorrectedShape) {
				this.removedAutocorrectedShapeTime = performance.now();
				this.autocorrectedShape = null;

				this.editor.announceForAccessibility(this.editor.localization.autocorrectionCanceled);
			}
		}
	}

	public override onPointerUp({ current }: PointerEvt) {
		if (!this.builder) return false;
		if (current.id !== this.currentPointerId) {
			// this.builder still exists, so we're handling events from another
			// device type.
			return true;
		}

		this.stationaryDetector?.onPointerUp(current);

		// onPointerUp events can have zero pressure. Use the last pressure instead.
		const currentPoint = this.toStrokePoint(current);
		const strokePoint = {
			...currentPoint,
			width: this.lastPoint?.width ?? currentPoint.width,
		};

		this.addPointToStroke(strokePoint);
		this.finalizeStroke();

		return false;
	}

	private postGestureCleanup() {
		if (this.currentPointerId !== null) {
			this.wetInkRenderer.getDraftInkPresenter().setEnabled(this.currentPointerId, false);
		}

		this.builder = null;
		this.lastPoint = null;
		this.autocorrectedShape = null;
		this.lastAutocorrectedShape = null;
		this.editor.clearWetInk();

		this.stationaryDetector?.destroy();
		this.stationaryDetector = null;
	}

	public override onGestureCancel() {
		this.postGestureCleanup();
	}

	private removedAutocorrectedShapeRecently() {
		return this.removedAutocorrectedShapeTime > performance.now() - 320;
	}

	private async autocorrectShape(_lastPointer: Pointer) {
		if (!this.builder || !this.builder.autocorrectShape) return;
		if (!this.shapeAutocompletionEnabled) return;

		// If already corrected, do nothing
		if (this.autocorrectedShape) return;

		// Activate stroke fitting
		const correctedShape = await this.builder.autocorrectShape();
		if (!this.builder || !correctedShape) {
			return;
		}

		// Don't complete to empty shapes.
		const bboxArea = correctedShape.getBBox().area;
		if (bboxArea === 0 || !isFinite(bboxArea)) {
			return;
		}

		const shapeDescription = correctedShape.description(this.editor.localization);
		this.editor.announceForAccessibility(
			this.editor.localization.autocorrectedTo(shapeDescription),
		);

		this.autocorrectedShape = correctedShape;
		this.lastAutocorrectedShape = correctedShape;
		this.previewStroke();
	}

	private finalizeStroke() {
		if (this.builder) {
			// If autocorrectedShape was cleared recently enough, it was
			// probably by mistake. Reset it.
			if (this.lastAutocorrectedShape && this.removedAutocorrectedShapeRecently()) {
				this.autocorrectedShape = this.lastAutocorrectedShape;
			}

			const stroke = this.autocorrectedShape ?? this.builder.build();
			this.previewStroke();

			if (stroke.getBBox().area > 0) {
				if (stroke === this.autocorrectedShape) {
					this.editor.announceForAccessibility(
						this.editor.localization.autocorrectedTo(stroke.description(this.editor.localization)),
					);
				}

				const canFlatten = true;
				const action = EditorImage.addComponent(stroke, canFlatten);
				this.editor.dispatch(action);
			} else {
				console.warn('Pen: Not adding empty stroke', stroke, 'to the canvas.');
			}
		}
		this.postGestureCleanup();
	}

	private noteUpdated() {
		this.editor.notifier.dispatch(EditorEventType.ToolUpdated, {
			kind: EditorEventType.ToolUpdated,
			tool: this,
		});
	}

	public setColor(color: Color4): void {
		if (color.toHexString() !== this.style.color.toHexString()) {
			this.styleValue.set({
				...this.style,
				color,
			});
		}
	}

	public setThickness(thickness: number) {
		if (thickness !== this.style.thickness) {
			this.styleValue.set({
				...this.style,
				thickness,
			});
		}
	}

	/**
	 * Changes the type of stroke created by the pen. The given `factory` can be one of the built-in
	 * stroke factories (e.g. {@link makeFreehandLineBuilder}) or a custom stroke factory.
	 *
	 * Example:
	 * [[include:doc-pages/inline-examples/changing-pen-types.md]]
	 */
	public setStrokeFactory(factory: ComponentBuilderFactory) {
		if (factory !== this.style.factory) {
			this.styleValue.set({
				...this.style,
				factory,
			});
		}
	}

	public setHasStabilization(hasStabilization: boolean) {
		const hasInputMapper = !!this.getInputMapper();

		// TODO: Currently, this assumes that there is no other input mapper.
		if (hasStabilization === hasInputMapper) {
			return;
		}

		if (hasInputMapper) {
			this.setInputMapper(null);
		} else {
			this.setInputMapper(new InputStabilizer(this.editor.viewport));
		}
		this.noteUpdated();
	}

	public setStrokeAutocorrectEnabled(enabled: boolean) {
		if (enabled !== this.shapeAutocompletionEnabled) {
			this.shapeAutocompletionEnabled = enabled;
			this.noteUpdated();
		}
	}

	public getStrokeAutocorrectionEnabled() {
		return this.shapeAutocompletionEnabled;
	}

	public setPressureSensitivityEnabled(enabled: boolean) {
		if (enabled !== this.pressureSensitivityEnabled) {
			this.pressureSensitivityEnabled = enabled;
			this.noteUpdated();
		}
	}

	public getPressureSensitivityEnabled() {
		return this.pressureSensitivityEnabled;
	}

	public getThickness() {
		return this.style.thickness;
	}
	public getColor() {
		return this.style.color;
	}
	public getStrokeFactory() {
		return this.style.factory;
	}
	public getStyleValue() {
		return this.styleValue;
	}

	public override onKeyPress(event: KeyPressEvent): boolean {
		const shortcuts = this.editor.shortcuts;

		// Ctrl+Z: End the stroke so that it can be undone/redone.
		const isCtrlZ = shortcuts.matchesShortcut(undoKeyboardShortcutId, event);
		if (this.builder && isCtrlZ) {
			this.finalizeStroke();

			// Return false: Allow other listeners to handle the event (e.g.
			// undo/redo).
			return false;
		}

		let newThickness: number | undefined;
		if (shortcuts.matchesShortcut(decreaseSizeKeyboardShortcutId, event)) {
			newThickness = (this.getThickness() * 2) / 3;
		} else if (shortcuts.matchesShortcut(increaseSizeKeyboardShortcutId, event)) {
			newThickness = (this.getThickness() * 3) / 2;
		}

		if (newThickness !== undefined) {
			newThickness = Math.min(Math.max(1, newThickness), 256);
			this.setThickness(newThickness);
			return true;
		}

		return false;
	}
}
