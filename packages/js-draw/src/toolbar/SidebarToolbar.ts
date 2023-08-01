import Editor from '../Editor';
import { ToolbarLocalization } from './localization';
import BaseWidget from './widgets/BaseWidget';
import { toolbarCSSPrefix } from './constants';
import DropdownToolbar from './DropdownToolbar';
import SidebarLayoutManager from './widgets/layout/SidebarLayoutManager';
import { MutableReactiveValue, reactiveValueFromInitialValue } from '../util/ReactiveValue';

// TODO(!): Doesn't make sense to extend DropdownToolbar
export default class SidebarToolbar extends DropdownToolbar {
	private mainContainer: HTMLElement;
	private sidebarContainer: HTMLElement;
	private sidebarContent: HTMLElement;
	private closeButton: HTMLElement;

	private layoutManager: SidebarLayoutManager;

	private sidebarVisible: MutableReactiveValue<boolean>;
	private sidebarY: MutableReactiveValue<number>;

	/** @internal */
	public constructor(
		editor: Editor, parent: HTMLElement,
		localizationTable: ToolbarLocalization,
	) {
		super(editor, parent, localizationTable);

		this.sidebarVisible = reactiveValueFromInitialValue(false);
		this.sidebarY = reactiveValueFromInitialValue(0);

		// Create the container elements
		this.mainContainer = document.createElement('div');
		this.mainContainer.classList.add(`${toolbarCSSPrefix}sidebar-container`);

		this.sidebarContainer = document.createElement('div');
		this.sidebarContainer.classList.add(
			`${toolbarCSSPrefix}sidebar`,
			`${toolbarCSSPrefix}element`,
		);
		this.sidebarContainer.classList.add(`${toolbarCSSPrefix}tool-properties`);

		this.sidebarContent = document.createElement('div');

		// Setup resizing/dragging
		this.sidebarY.onUpdateAndNow(y => {
			if (y >= 0) {
				this.sidebarContainer.style.translate = `0 ${y}px`;
				this.sidebarContainer.style.paddingBottom = '';
			} else {
				this.sidebarContainer.style.translate = '';
				this.sidebarContainer.style.paddingBottom = `${-y}px`;
			}
		});

		this.closeButton = document.createElement('button');
		this.closeButton.classList.add('drag-elem');
		this.closeButton.setAttribute('alt', localizationTable.closeToolProperties);

		this.initDragListeners();

		// Initialize the layout manager
		const setSidebarContent = (...content: HTMLElement[]) => {
			this.sidebarContent.replaceChildren(...content);
			this.setupColorPickers();
		};

		this.layoutManager = new SidebarLayoutManager(
			setSidebarContent,
			this.sidebarVisible,
			editor.announceForAccessibility.bind(editor),
			localizationTable,
		);


		// Make things visible/keep hidden.
		this.listenForVisibilityChanges();

		this.sidebarContainer.replaceChildren(this.closeButton, this.sidebarContent);
		this.mainContainer.replaceChildren(this.sidebarContainer);
		parent.appendChild(this.mainContainer);
	}

	protected listenForVisibilityChanges() {
		let animationTimeout: ReturnType<typeof setTimeout>|null = null;
		const animationDuration = 150;

		if (!this.sidebarVisible.get()) {
			this.mainContainer.style.display = 'none';
		}

		this.sidebarVisible.onUpdate(visible => {
			const animationProperties = `${animationDuration}ms ease`;

			if (visible) {
				this.sidebarY.set(0);
				if (animationTimeout) {
					clearTimeout(animationTimeout);
					animationTimeout = null;
				}

				this.mainContainer.style.display = '';
				this.sidebarContainer.style.animation = `${animationProperties} ${toolbarCSSPrefix}-sidebar-transition-in`;
				this.mainContainer.style.animation = `${animationProperties} ${toolbarCSSPrefix}-sidebar-container-transition-in`;


				// Focus the close button when first shown.
				this.closeButton.focus();
			} else if (animationTimeout === null) {
				this.sidebarContainer.style.animation = ` ${animationProperties} ${toolbarCSSPrefix}-sidebar-transition-out`;
				this.mainContainer.style.animation = `${animationProperties} ${toolbarCSSPrefix}-sidebar-container-transition-out`;

				animationTimeout = setTimeout(() => {
					this.mainContainer.style.display = 'none';
					animationTimeout = null;
				}, animationDuration);
			}
		});
	}

	protected override addWidgetInternal(widget: BaseWidget) {
		widget.setLayoutManager(this.layoutManager);
		super.addWidgetInternal(widget);
	}

	protected override removeWidgetInternal(widget: BaseWidget): void {
		super.removeWidgetInternal(widget);
	}

	protected override onRemove() {
		super.onRemove();
		this.mainContainer.remove();
	}

	private initDragListeners() {
		let lastX = 0;
		let lastY = 0;
		let startX = 0;
		let startY = 0;
		let pointerDown = false;
		let capturedPointerId: number|null = null;

		const dragElements = [ this.closeButton, this.mainContainer ];

		this.mainContainer.onpointerdown = event => {
			if (event.isPrimary && dragElements.includes(event.target as HTMLElement)) {
				event.preventDefault();
				lastX = event.clientX;
				lastY = event.clientY;

				startX = event.clientX;
				startY = event.clientY;

				this.mainContainer.setPointerCapture(event.pointerId);
				capturedPointerId = event.pointerId;

				pointerDown = true;
			}
		};

		this.mainContainer.onpointermove = event => {
			if (!event.isPrimary || !pointerDown) {
				return;
			}
			event.preventDefault();

			const x = event.clientX;
			const y = event.clientY;
			const dx = x - lastX;
			const dy = y - lastY;

			this.handleDrag(dx, dy);

			lastX = x;
			lastY = y;
		};

		let gestureEndTimestamp = 0;
		const onGestureEnd = () => {
			// If the pointerup/pointercancel event was for a pointer not being tracked,
			if (!pointerDown) {
				return;
			}

			gestureEndTimestamp = Date.now();

			// Roughly a click? Close the sidebar
			if (Math.hypot(lastX - startX, lastY - startY) < 5) {
				this.sidebarVisible.set(false);
			}

			if (capturedPointerId !== null) {
				this.mainContainer.releasePointerCapture(capturedPointerId);
				capturedPointerId = null;
			}

			this.finalizeDrag();
			pointerDown = false;
		};

		this.closeButton.onclick = () => {
			const wasJustDragging = Date.now() - gestureEndTimestamp < 100;

			// Ignore the click event if it was caused by dragging the button.
			if (!wasJustDragging) {
				this.sidebarVisible.set(false);
			}
		};

		this.mainContainer.onpointerup = onGestureEnd;
		this.mainContainer.onpointercancel = onGestureEnd;
	}

	/**
	 * Updates the position of this menu **during** a drag. After a drag ends,
	 * {@link finalizeDrag} should be called.
	 */
	private handleDrag(_deltaX: number, deltaY: number) {
		this.sidebarContainer.style.transition = 'none';
		this.sidebarY.set(this.sidebarY.get() + deltaY);
	}

	/**
	 * Moves the menu to a valid location or closes it, depending on
	 * the position set by the drag.
	 */
	private finalizeDrag() {
		this.sidebarContainer.style.transition = '';
		if (this.sidebarY.get() > this.sidebarContainer.clientHeight / 2) {
			this.sidebarVisible.set(false);
		} else {
			this.sidebarY.set(0);
		}
	}
}
