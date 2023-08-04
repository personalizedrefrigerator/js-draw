// @internal @packageDocumentation

import { Color4 } from '@js-draw/math';
import Editor from '../Editor';
import { PointerEvt } from '../inputEvents';
import BaseTool from './BaseTool';

type ColorListener = (color: Color4|null)=>void;

/**
 * A tool used internally to pick colors from the canvas.
 *
 * When color selection is in progress, the `pipette--color-selection-in-progress` class
 * is added to the root element. This can be used by themes.
 *
 * @internal
 */
export default class PipetteTool extends BaseTool {
	private colorPreviewListener: ColorListener|null = null;
	private colorSelectListener: ColorListener|null = null;

	public constructor(
		private editor: Editor,
		description: string,
	) {
		super(editor.notifier, description);

		this.enabledValue().onUpdateAndNow(() => {
			this.updateSelectingStatus();
		});
	}

	// Ensures that the root editor element correctly reflects whether color selection
	// is in progress.
	private updateSelectingStatus() {
		const className = 'pipette--color-selection-in-progress';

		if (this.isEnabled() && this.colorSelectListener && this.colorPreviewListener) {
			this.editor.getRootElement().classList.add(className);
		}
		else {
			this.editor.getRootElement().classList.remove(className);
		}
	}

	public setColorListener(
		colorPreviewListener: ColorListener,

		// Called when the gesture ends -- when the user has selected a color.
		colorSelectListener: ColorListener,
	) {
		this.colorPreviewListener = colorPreviewListener;
		this.colorSelectListener = colorSelectListener;

		this.updateSelectingStatus();
	}

	public clearColorListener() {
		this.colorPreviewListener = null;
		this.colorSelectListener = null;

		this.updateSelectingStatus();
	}

	public override onPointerDown({ current, allPointers }: PointerEvt): boolean {
		if (this.colorPreviewListener && allPointers.length === 1) {
			this.colorPreviewListener(this.editor.display.getColorAt(current.screenPos));
			return true;
		}
		return false;
	}

	public override onPointerMove({ current }: PointerEvt): void {
		this.colorPreviewListener?.(this.editor.display.getColorAt(current.screenPos));
	}

	public override onPointerUp({ current }: PointerEvt): void {
		this.colorSelectListener?.(this.editor.display.getColorAt(current.screenPos));
	}

	public override onGestureCancel(): void {
		this.colorSelectListener?.(null);
	}
}
