import Editor from '../../Editor';
import { ToolbarLocalization } from '../localization';
import BaseWidget from './BaseWidget';


export default class OverflowWidget extends BaseWidget {
	private overflowChildren: BaseWidget[] = [];
	private overflowContainer: HTMLElement;
	
	public constructor(editor: Editor, localizationTable?: ToolbarLocalization) {
		super(editor, 'overflow-widget', localizationTable);


		this.container.classList.add('toolbar-overflow-widget');

		// Make the dropdown openable
		this.container.classList.add('dropdownShowable');
		this.overflowContainer ??= document.createElement('div');
	}

	protected getTitle(): string {
		return this.localizationTable.toggleOverflow;
	}

	protected createIcon(): Element | null {
		return this.editor.icons.makeOverflowIcon();
	}

	protected handleClick(): void {
		this.setDropdownVisible(!this.isDropdownVisible());
	}

	protected fillDropdown(dropdown: HTMLElement) {
		this.overflowContainer ??= document.createElement('div');
		if (this.overflowContainer.parentElement) {
			this.overflowContainer.remove();
		}

		this.overflowContainer.classList.add('toolbar-overflow-widget-overflow-list');
		dropdown.appendChild(this.overflowContainer);

		return true;
	}

	/**
	 * Removes all `BaseWidget`s from this and returns them.
	 */
	public clearChildren(): BaseWidget[] {
		this.overflowContainer.replaceChildren();

		const overflowChildren = this.overflowChildren;
		this.overflowChildren = [];
		return overflowChildren;
	}

	public getChildWidgets(): BaseWidget[] {
		return [ ...this.overflowChildren ];
	}

	public hasAsChild(widget: BaseWidget) {
		for (const otherWidget of this.overflowChildren) {
			if (widget === otherWidget) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Adds `widget` to this.
	 * `widget`'s previous parent is still responsible
	 * for serializing/deserializing its state.
	 */
	public addToOverflow(widget: BaseWidget) {
		this.overflowChildren.push(widget);
		widget.addTo(this.overflowContainer);
		widget.setIsToplevel(false);
	}

	// This always returns false.
	// Don't try to move the overflow menu to itself.
	public canBeInOverflowMenu(): boolean {
		return false;
	}
}
