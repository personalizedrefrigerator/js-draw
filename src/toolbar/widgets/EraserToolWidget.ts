import BaseToolWidget from './BaseToolWidget';

export default class EraserToolWidget extends BaseToolWidget {
	protected getTitle(): string {
		return this.localizationTable.eraser;
	}
	protected createIcon(): Element {
		return this.editor.icons.makeEraserIcon();
	}

	protected fillDropdown(_dropdown: HTMLElement): boolean {
		// No dropdown associated with the eraser
		return false;
	}
}
