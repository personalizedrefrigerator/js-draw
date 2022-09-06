import { makeEraserIcon } from '../icons';
import BaseToolbarWidget from './BaseToolbarWidget';

export default class EraserWidget extends BaseToolbarWidget {
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
