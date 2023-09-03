import Editor from '../Editor';
import { DispatcherEventListener } from '../EventDispatcher';
import { EditorEventType } from '../types';
import BaseTool from './BaseTool';

/**
 * This tool, when enabled, renders scrollbars reflecting the current position
 * of the view relative to the import/export area of the image.
 *
 * **Note**: These scrollbars are currently not draggable. This may change in
 * a future release.
 */
export default class ScrollbarTool extends BaseTool {
	private scrollbarOverlay: HTMLElement;
	private verticalScrollbar: HTMLElement;
	private horizontalScrollbar: HTMLElement;

	public constructor(private editor: Editor) {
		super(editor.notifier, 'scrollbar');

		this.scrollbarOverlay = document.createElement('div');
		this.scrollbarOverlay.classList.add('ScrollbarTool-overlay');

		this.verticalScrollbar = document.createElement('div');
		this.verticalScrollbar.classList.add('vertical-scrollbar');

		this.horizontalScrollbar = document.createElement('div');
		this.horizontalScrollbar.classList.add('horizontal-scrollbar');

		this.scrollbarOverlay.replaceChildren(this.verticalScrollbar, this.horizontalScrollbar);
		let overlay: ReturnType<typeof editor.createHTMLOverlay>|null = null;

		let viewportListener: DispatcherEventListener|null = null;
		this.enabledValue().onUpdateAndNow(enabled => {
			overlay?.remove();
			viewportListener?.remove();
			viewportListener = null;
			overlay = null;

			if (enabled) {
				viewportListener = editor.notifier.on(EditorEventType.ViewportChanged, _event => {
					this.updateScrollbars();
				});
				this.updateScrollbars();

				overlay = editor.createHTMLOverlay(this.scrollbarOverlay);
			}
		});
	}

	private updateScrollbars() {
		const viewport = this.editor.viewport;
		const visibleRect = viewport.visibleRect;
		const exportRect = this.editor.getImportExportRect().union(visibleRect);
		const screenSize = viewport.getScreenRectSize();

		const scrollbarWidth = visibleRect.width / exportRect.width * screenSize.x;
		const scrollbarHeight = visibleRect.height / exportRect.height * screenSize.y;

		const scrollbarX = Math.max(0, Math.min(1, visibleRect.x / exportRect.width)) * screenSize.x;
		const scrollbarY = Math.max(0, Math.min(1, visibleRect.y / exportRect.height)) * screenSize.y;

		this.horizontalScrollbar.style.width = `${scrollbarWidth}px`;
		this.verticalScrollbar.style.height = `${scrollbarHeight}px`;

		this.horizontalScrollbar.style.marginLeft = `${scrollbarX}px`;
		this.verticalScrollbar.style.marginTop = `${scrollbarY}px`;
	}
}
