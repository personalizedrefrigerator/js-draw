import { InputEvt, InputEvtType, PointerEvt } from '../../types';
import InputMapper from './InputMapper';
import KeyboardShortcutManager from '../../shortcuts/KeyboardShortcutManager';
import { lineLockKeyboardShortcutId, snapToGridKeyboardShortcutId } from '../keybindings';
import Viewport from '../../Viewport';
import Pointer from '../../Pointer';
import { Point2 } from '../../math/Vec2';
import Editor from '../../Editor';

/**
 * Provides keyboard shortcuts that provide some amount of control over
 * drawing (e.g. snap to grid, plane lock).
 */
export default class StrokeKeyboardControl extends InputMapper {
	private snapToGridEnabled: boolean = false;
	private angleLockEnabled: boolean = false;

	// The point at which the last pointerDown event happened (or null if
	// no such event has occurred).
	private startPointCanvas: Point2|null = null;

	public constructor(
		private shortcuts: KeyboardShortcutManager, private viewport: Viewport
	) {
		super(null);
	}

	// Snap the given pointer to the nearer of the x/y axes.
	private xyAxesSnap(pointer: Pointer) {
		if (!this.startPointCanvas) {
			return pointer;
		}

		// Convert this.startPointCanvas here because the viewport might change
		// while drawing a stroke.
		const screenPos = this.viewport.canvasToScreen(this.startPointCanvas);
		return pointer.lockedToXYAxesScreen(screenPos, this.viewport);
	}

	private mapPointerEvent(event: PointerEvt): PointerEvt {
		const mapPointer = (pointer: Pointer) => {
			// Only map if there's exactly one pointer.
			if (event.allPointers.length > 1) {
				return pointer;
			}

			if (this.snapToGridEnabled) {
				return pointer.snappedToGrid(this.viewport);
			}

			if (this.angleLockEnabled && this.startPointCanvas) {
				return this.xyAxesSnap(pointer);
			}

			return pointer;
		};

		return {
			kind: event.kind,
			current: mapPointer(event.current),
			allPointers: event.allPointers.map(mapPointer),
		};
	}

	public override onEvent(event: InputEvt): boolean {
		const shortcuts = this.shortcuts;

		if (event.kind === InputEvtType.PointerDownEvt || event.kind === InputEvtType.PointerMoveEvt || event.kind === InputEvtType.PointerUpEvt) {
			if (event.kind === InputEvtType.PointerDownEvt) {
				this.startPointCanvas = event.current.canvasPos;
			}

			event = this.mapPointerEvent(event);
		}

		let handled = this.emit(event);

		// Handle keyboard shortcuts (if not already handled by another source).
		// Only handle if !handled already -- some tools (e.g. the selection tool)
		// may use these keyboard shortcuts as unrelated modifiers that we don't want
		// to override.
		if (!handled && (event.kind === InputEvtType.KeyPressEvent || event.kind === InputEvtType.KeyUpEvent)) {
			const isKeyPress = event.kind === InputEvtType.KeyPressEvent;

			if (shortcuts.matchesShortcut(snapToGridKeyboardShortcutId, event)) {
				this.snapToGridEnabled = isKeyPress;
				handled = true;
			}

			if (shortcuts.matchesShortcut(lineLockKeyboardShortcutId, event)) {
				this.angleLockEnabled = isKeyPress;
				handled = true;
			}
		}

		return handled;
	}

	public static fromEditor(editor: Editor) {
		return new StrokeKeyboardControl(editor.shortcuts, editor.viewport);
	}
}
