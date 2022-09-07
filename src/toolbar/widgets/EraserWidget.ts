import { makeEraserIcon } from '../icons';
import BaseToolWidget from './BaseToolWidget';

export default class EraserWidget extends BaseToolWidget {
	protected getTitle(): string {
		return this.localizationTable.eraser;
	}
	protected createIcon(): Element {
		return makeEraserIcon();
	}

	protected fillDropdown(_dropdown: HTMLElement): boolean {
		// No dropdown associated with the eraser
		return false;
	}
}
