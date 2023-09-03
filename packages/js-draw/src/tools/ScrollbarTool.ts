import Editor from '../Editor';
import { DispatcherEventListener } from '../EventDispatcher';
import { Rect2 } from '@js-draw/math';
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

	private fadeOutTimeout: ReturnType<typeof setTimeout>|null = null;
	private updateScrollbars() {
		const viewport = this.editor.viewport;
		const screenSize = viewport.getScreenRectSize();
		const screenRect = new Rect2(0, 0, screenSize.x, screenSize.y);
		const imageRect = this.editor.getImportExportRect()
		// The scrollbars are positioned in screen coordinates, so the exportRect also needs
		// to be in screen coordinates
			.transformedBoundingBox(viewport.canvasToScreenTransform)

		// If the screenRect is outside of the exportRect, expand the image rectangle
			.union(screenRect);

		const scrollbarWidth = screenRect.width / imageRect.width * screenSize.x;
		const scrollbarHeight = screenRect.height / imageRect.height * screenSize.y;

		const scrollbarX = (screenRect.x - imageRect.x) / imageRect.width * (screenSize.x);
		const scrollbarY = (screenRect.y - imageRect.y) / imageRect.height * (screenSize.y);

		this.horizontalScrollbar.style.width = `${scrollbarWidth}px`;
		this.verticalScrollbar.style.height = `${scrollbarHeight}px`;

		this.horizontalScrollbar.style.marginLeft = `${scrollbarX}px`;
		this.verticalScrollbar.style.marginTop = `${scrollbarY}px`;

		// Style the scrollbars differently when there's no scroll (all content visible)
		const handleNoScrollStyling = (scrollbar: HTMLElement, size: number, fillSize: number) => {
			const fillsWindowClass = 'represents-no-scroll';
			if (Math.abs(size - fillSize) < 1e-8) {
				scrollbar.classList.add(fillsWindowClass);
			} else {
				scrollbar.classList.remove(fillsWindowClass);
			}
		};
		handleNoScrollStyling(this.horizontalScrollbar, scrollbarWidth, screenSize.x);
		handleNoScrollStyling(this.verticalScrollbar, scrollbarHeight, screenSize.y);

		// Fade out after a delay.
		if (this.fadeOutTimeout !== null) {
			clearTimeout(this.fadeOutTimeout);
		}

		const fadeOutDelay = 3000;
		this.fadeOutTimeout = setTimeout(() => {
			this.scrollbarOverlay.classList.remove('just-updated');
		}, fadeOutDelay);

		this.scrollbarOverlay.classList.add('just-updated');
	}
}
