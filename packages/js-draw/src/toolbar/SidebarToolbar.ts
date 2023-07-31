import Editor from '../Editor';
import { ToolbarLocalization } from './localization';
import BaseWidget from './widgets/BaseWidget';
import { toolbarCSSPrefix } from './constants';
import DropdownToolbar from './DropdownToolbar';
import SidebarLayoutManager from './widgets/layout/SidebarLayoutManager';

// TODO(!): Doesn't make sense to extend DropdownToolbar
export default class SidebarToolbar extends DropdownToolbar {
	private mainContainer: HTMLElement;
	private sidebarContainer: HTMLElement;
	private layoutManager: SidebarLayoutManager;

	/** @internal */
	public constructor(
		editor: Editor, parent: HTMLElement,
		localizationTable: ToolbarLocalization,
	) {
		super(editor, parent, localizationTable);


		this.sidebarContainer = document.createElement('div');
		this.sidebarContainer.classList.add(
			`${toolbarCSSPrefix}sidebar`,
			`${toolbarCSSPrefix}element`,
		);
		this.sidebarContainer.classList.add(`${toolbarCSSPrefix}tool-properties`);

		const setSidebarContent = (...content: HTMLElement[]) => {
			this.sidebarContainer.replaceChildren(...content);
			this.setupColorPickers();
		};

		this.layoutManager = new SidebarLayoutManager(
			setSidebarContent,
			this.setSidebarVisible.bind(this),
			this.isSidebarVisible.bind(this),
			editor.announceForAccessibility.bind(editor),
			localizationTable,
		);

		parent.appendChild(this.sidebarContainer);
	}

	private isSidebarVisible() {
		return this.sidebarContainer.style.display === 'block';
	}

	private setSidebarVisible(visible: boolean) {
		const currentlyVisible = this.isSidebarVisible();
		if (currentlyVisible === visible) {
			return;
		}

		if (visible) {
			this.sidebarContainer.style.display = 'block';
		} else {
			this.sidebarContainer.style.display = 'none';
		}
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
}
