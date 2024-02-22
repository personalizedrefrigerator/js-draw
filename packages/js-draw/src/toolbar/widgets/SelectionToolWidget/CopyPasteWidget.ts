import Editor from '../../../Editor';
import SelectionTool from '../../../tools/SelectionTool/SelectionTool';
import { EditorEventType } from '../../../types';
import { ToolbarLocalization } from '../../localization';
import ClipboardHandler from '../../../util/ClipboardHandler';
import BaseWidget from '../BaseWidget';
import { DispatcherEventListener } from '../../../EventDispatcher';

enum CopyPasteWidgetMode {
	Copy,
	Copied,
	Paste,
}

export default class CopyPasteWidget extends BaseWidget {
	#toolUpdateListener: DispatcherEventListener;
	#pastePermissionStatus?: PermissionStatus;
	#copyPermissionStatus?: PermissionStatus;

	public constructor(
		editor: Editor,
		id: string,
		private tool: SelectionTool,
		private clipboardHandler: ClipboardHandler,
		localizationTable?: ToolbarLocalization
	) {
		super(editor, id, localizationTable);

		this.#toolUpdateListener = this.editor.notifier.on(EditorEventType.ToolUpdated, toolEvt => {
			if (toolEvt.kind !== EditorEventType.ToolUpdated) {
				throw new Error('Invalid event type!');
			}

			if (toolEvt.tool === this.tool) {
				const selection = this.tool.getSelection();
				const hasSelection = !!selection && selection.getSelectedItemCount() > 0;

				this.#setMode(hasSelection ? CopyPasteWidgetMode.Copy : CopyPasteWidgetMode.Paste);
			}
		});
		void this.#permissionsSetup();
	}

	async #permissionsSetup() {
		this.#pastePermissionStatus = await navigator.permissions.query({
			name: 'clipboard-read',
			allowWithoutGesture: false,
		} as any);
		this.#copyPermissionStatus = await navigator.permissions.query({
			name: 'clipboard-write',
			allowWithoutGesture: false,
		} as any);
		this.#onPermissionStatusChanged();
		this.#pastePermissionStatus.addEventListener('change', this.#onPermissionStatusChanged);
	}

	#updateDisabled() {
		if (this.#mode === CopyPasteWidgetMode.Paste && this.#pastePermissionStatus?.state === 'denied') {
			this.setDisabled(true);
		} else if (this.#mode === CopyPasteWidgetMode.Copy && this.#copyPermissionStatus?.state === 'denied') {
			this.setDisabled(true);
		} else {
			this.setDisabled(false);
		}
	}

	#onPermissionStatusChanged = () => {
		this.#updateDisabled();
	};

	#mode: CopyPasteWidgetMode;
	#setMode(mode: CopyPasteWidgetMode) {
		if (mode === this.#mode) return;

		this.#mode = mode;

		this.updateIcon();
		this.updateTitle();
		this.#updateDisabled();
	}

	protected override getTitle(): string {
		if (this.#mode === CopyPasteWidgetMode.Copy) {
			return this.localizationTable.copyButton__copy;
		} else if (this.#mode === CopyPasteWidgetMode.Copied) {
			return this.localizationTable.copyButton__copied;
		} else {
			return this.localizationTable.copyButton__paste;
		}
	}

	protected override createIcon(): Element | null {
		if (this.#mode === CopyPasteWidgetMode.Copy) {
			return this.editor.icons.makeCopyIcon();
		} else if (this.#mode === CopyPasteWidgetMode.Copied) {
			return this.editor.icons.makeCheckIcon();
		} else {
			return this.editor.icons.makePasteIcon();
		}
	}

	protected override handleClick(): void {
		if (this.#mode === CopyPasteWidgetMode.Paste) {
			this.clipboardHandler.paste();
		} else if (this.#mode === CopyPasteWidgetMode.Copy) {
			this.clipboardHandler.copy();

			this.#setMode(CopyPasteWidgetMode.Copied);

			setTimeout(() => {
				if (this.#mode === CopyPasteWidgetMode.Copied) {
					this.#setMode(CopyPasteWidgetMode.Paste);
				}
			}, 600);
		}
	}

	public override onRemove(): void {
		this.#toolUpdateListener.remove();
		this.#copyPermissionStatus?.removeEventListener?.('change', this.#onPermissionStatusChanged);
		this.#pastePermissionStatus?.removeEventListener?.('change', this.#onPermissionStatusChanged);
	}
}
