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

		this.sidebarY.onUpdateAndNow(y => {
			this.sidebarContainer.style.translate = `0 ${y}px`;
		});

		// Initialize the layout manager
		const setSidebarContent = (...content: HTMLElement[]) => {
			this.sidebarContainer.replaceChildren(...content);
			this.setupColorPickers();
		};

		this.layoutManager = new SidebarLayoutManager(
			setSidebarContent,
			this.sidebarVisible,
			editor.announceForAccessibility.bind(editor),
			localizationTable,
		);


		// Make things visible/keep hidden.
		this.sidebarVisible.onUpdateAndNow(visible => {
			if (visible) {
				this.mainContainer.style.display = '';
			} else {
				this.mainContainer.style.display = 'none';
			}
		});

		this.mainContainer.replaceChildren(this.sidebarContainer);
		parent.appendChild(this.mainContainer);

		this.initDragListeners();
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
		let pointerDown = false;

		this.mainContainer.onpointerdown = event => {
			if (event.isPrimary && event.target === this.mainContainer) {
				lastX = event.clientX;
				lastY = event.clientY;

				pointerDown = true;
			}
		};

		this.mainContainer.onpointermove = event => {
			if (!event.isPrimary || !pointerDown) {
				return;
			}

			const x = event.clientX;
			const y = event.clientY;
			const dx = x - lastX;
			const dy = y - lastY;

			this.handleDrag(dx, dy);

			lastX = x;
			lastY = y;
		};

		const onGestureEnd = () => {
			this.finalizeDrag();
			pointerDown = false;
		};

		this.mainContainer.onpointerup = onGestureEnd;
		this.mainContainer.onpointercancel = onGestureEnd;
	}

	/**
	 * Updates the position of this menu **during** a drag. After a drag ends,
	 * {@link finalizeDrag} should be called.
	 */
	private handleDrag(_deltaX: number, deltaY: number) {
		this.sidebarY.set(this.sidebarY.get() + deltaY);
	}

	/**
	 * Moves the menu to a valid location or closes it, depending on
	 * the position set by the drag.
	 */
	private finalizeDrag() {
		if (this.sidebarY.get() > this.sidebarContainer.clientHeight / 2) {
			this.sidebarVisible.set(false);
		}

		this.sidebarY.set(0);
	}
}
