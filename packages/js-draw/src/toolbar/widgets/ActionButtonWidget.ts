import Editor from '../../Editor';
import { ToolbarLocalization } from '../localization';
import BaseWidget from './BaseWidget';

export default class ActionButtonWidget extends BaseWidget {
	#autoDisableInReadOnlyEditors: boolean;
	#helpText: string | undefined = undefined;

	public constructor(
		editor: Editor,
		id: string,

		protected makeIcon: () => Element | null,
		protected title: string,
		protected clickAction: () => void,

		localizationTable?: ToolbarLocalization,
		protected mustBeToplevel: boolean = false,
		autoDisableInReadOnlyEditors: boolean = true,
	) {
		super(editor, id, localizationTable);
		this.#autoDisableInReadOnlyEditors = autoDisableInReadOnlyEditors;
	}

	/**
	 * Sets the text shown in a help overlay for this button.
	 *
	 * See {@link getHelpText}.
	 */
	public setHelpText(helpText: string) {
		this.#helpText = helpText;
	}

	protected override getHelpText() {
		return this.#helpText;
	}

	protected override shouldAutoDisableInReadOnlyEditor(): boolean {
		return this.#autoDisableInReadOnlyEditors;
	}

	protected handleClick() {
		this.clickAction();
	}

	protected getTitle(): string {
		return this.title;
	}

	protected createIcon(): Element | null {
		return this.makeIcon();
	}

	protected override fillDropdown(_dropdown: HTMLElement): boolean {
		return false;
	}

	public override mustBeInToplevelMenu(): boolean {
		return this.mustBeToplevel;
	}
}
