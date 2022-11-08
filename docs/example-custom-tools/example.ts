//import * as jsdraw from 'js-draw';
//import 'js-draw/styles';
import * as jsdraw from '../../src/bundle/bundled';

const editor = new jsdraw.Editor(document.body);
const defaultLayout = false;
const toolbar = editor.addToolbar(defaultLayout);

// A very simple version of the full pen tool.
// A better way to do this is to extend jsdraw.PenTool
class CustomPenTool extends jsdraw.BaseTool {
	private lineBuilder: jsdraw.ComponentBuilder|null;

	public constructor(
		private editor: jsdraw.Editor,
		description: string,
		private style: jsdraw.PenStyle,
	) {
		super(editor.notifier, description);
	}

	protected toStrokePoint(pointer: jsdraw.Pointer): jsdraw.StrokeDataPoint {
		return {
			pos: pointer.canvasPos,
			width: this.style.thickness * this.editor.viewport.getSizeOfPixelOnCanvas(),
			color: this.style.color,
			time: pointer.timeStamp,
		};
	}

	protected previewStroke() {
		this.editor.clearWetInk();
		this.lineBuilder?.preview(this.editor.display.getWetInkRenderer());
	}

	protected addPointToStroke(point: jsdraw.StrokeDataPoint) {
		this.lineBuilder?.addPoint(point);
		this.previewStroke();
	}





	public onPointerDown({ current, allPointers }: jsdraw.PointerEvt): boolean {
		if (allPointers.length === 1) {
			this.lineBuilder = jsdraw.makeFreehandLineBuilder(this.toStrokePoint(current), this.editor.viewport);

			// Return true: We're handling the event.
			return true;
		}

		return false;
	}

	public onPointerMove({ current }: jsdraw.PointerEvt): void {
		this.addPointToStroke(this.toStrokePoint(current));
	}

	public onPointerUp({ current }: jsdraw.PointerEvt): void {
		if (!this.lineBuilder) {
			return;
		}

		this.addPointToStroke(this.toStrokePoint(current));
		const stroke = this.lineBuilder.build();

		// Don't add empty strokes.
		if (stroke.getBBox().area > 0) {
			const action = jsdraw.EditorImage.addElement(stroke);
			this.editor.dispatch(action);
		}

		this.lineBuilder = null;
		this.editor.clearWetInk();
	}

	public onGestureCancel() {
		this.editor.clearWetInk();
	}

	private noteUpdated() {
		this.editor.notifier.dispatch(jsdraw.EditorEventType.ToolUpdated, {
			kind: jsdraw.EditorEventType.ToolUpdated,
			tool: this,
		});
	}

	public setThickness(thickness: number) {
		if (thickness !== this.style.thickness) {
			this.style = {
				...this.style,
				thickness,
			};
			this.noteUpdated();
		}
	}

	public getStyle() { return this.style; }
}


// TODO: Localize these!
const strings = {
	customPenDescription: 'Custom pen',
	panZoomDescription: 'Pan & zoom',
	eraser: 'Eraser',
};

class CustomPenToolbarWidget extends jsdraw.BaseToolWidget {
	public constructor(editor: jsdraw.Editor, private pen: CustomPenTool) {
		super(editor, pen, 'custom-pen-widget');
	}

	protected getTitle(): string {
		return strings.customPenDescription;
	}
	protected createIcon(): Element {
		const style = this.pen.getStyle();
		return editor.icons.makePenIcon(style.thickness, style.color);
	}

	protected fillDropdown(dropdown: HTMLElement): boolean {
		const thicknessSlider = document.createElement('input');
		thicknessSlider.type = 'range';
		thicknessSlider.min = '1';
		thicknessSlider.max = '10';

		thicknessSlider.oninput = () => {
			this.pen.setThickness(parseFloat(thicknessSlider.value));
			this.updateIcon();
		};

		const updateSlider = () => {
			thicknessSlider.value = `${this.pen.getStyle().thickness}`;
		};
		updateSlider();

		this.editor.notifier.on(jsdraw.EditorEventType.ToolUpdated, (evt) => {
			if (evt.kind === jsdraw.EditorEventType.ToolUpdated && evt.tool === this.pen) {
				updateSlider();
			}
		});

		dropdown.appendChild(thicknessSlider);

		// We filled the dropdown (returning false disables the dropdown)
		return true;
	}
}

const pen = new CustomPenTool(editor, strings.customPenDescription, { thickness: 1, color: jsdraw.Color4.red });
const eraser = new jsdraw.EraserTool(editor, strings.eraser);
const panZoom = new jsdraw.PanZoomTool(editor, jsdraw.PanZoomMode.TwoFingerTouchGestures | jsdraw.PanZoomMode.Keyboard, strings.panZoomDescription);

editor.toolController.setTools([]);

// Only one primary tool can be enabled at a time.
// Try changing these to .addTool().
editor.toolController.addPrimaryTool(pen);
editor.toolController.addPrimaryTool(eraser);
editor.toolController.addTool(panZoom);

toolbar.addWidget(new CustomPenToolbarWidget(editor, pen));
toolbar.addWidget(new jsdraw.EraserToolWidget(editor, eraser, editor.localization));
toolbar.addUndoRedoButtons();