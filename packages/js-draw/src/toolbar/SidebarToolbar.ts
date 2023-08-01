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

	/** @internal */
	public constructor(
		editor: Editor, parent: HTMLElement,
		localizationTable: ToolbarLocalization,
	) {
		super(editor, parent, localizationTable);

		this.sidebarVisible = reactiveValueFromInitialValue(false);

		this.mainContainer = document.createElement('div');
		this.mainContainer.classList.add(`${toolbarCSSPrefix}sidebar-container`);

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
			this.sidebarVisible,
			editor.announceForAccessibility.bind(editor),
			localizationTable,
		);

		this.mainContainer.replaceChildren(this.sidebarContainer);
		parent.appendChild(this.mainContainer);

		this.sidebarVisible.onUpdateAndNow(visible => {
			if (visible) {
				this.mainContainer.style.display = '';
			} else {
				this.mainContainer.style.display = 'none';
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
}
