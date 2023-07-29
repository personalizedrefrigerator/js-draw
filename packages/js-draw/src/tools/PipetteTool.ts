// @internal @packageDocumentation

import { Color4 } from '@js-draw/math';
import Editor from '../Editor';
import { PointerEvt } from '../inputEvents';
import BaseTool from './BaseTool';

type ColorListener = (color: Color4|null)=>void;

export default class PipetteTool extends BaseTool {
	private colorPreviewListener: ColorListener|null = null;
	private colorSelectListener: ColorListener|null = null;

	public constructor(
		private editor: Editor,
		description: string,
	) {
		super(editor.notifier, description);
	}

	public setColorListener(
		colorPreviewListener: ColorListener,

		// Called when the gesture ends -- when the user has selected a color.
		colorSelectListener: ColorListener,
	) {
		this.colorPreviewListener = colorPreviewListener;
		this.colorSelectListener = colorSelectListener;
	}

	public clearColorListener() {
		this.colorPreviewListener = null;
		this.colorSelectListener = null;
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
