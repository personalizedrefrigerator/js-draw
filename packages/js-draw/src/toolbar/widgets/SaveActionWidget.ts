import { KeyPressEvent } from '../../inputEvents';
import Editor from '../../Editor';
import { ToolbarLocalization } from '../localization';
import ActionButtonWidget from './ActionButtonWidget';
import { ToolbarWidgetTag } from './BaseWidget';
import { saveKeyboardShortcut } from './keybindings';

class SaveActionWidget extends ActionButtonWidget {
	public constructor(editor: Editor, localization: ToolbarLocalization, saveCallback: ()=>void) {
		super(editor, 'save-button', editor.icons.makeSaveIcon, localization.save, saveCallback);
		this.setTags([ ToolbarWidgetTag.Save ]);
	}

	protected override onKeyPress(event: KeyPressEvent): boolean {
		if (this.editor.shortcuts.matchesShortcut(saveKeyboardShortcut, event)) {
			this.clickAction();
			return true;
		}

		// Run any default actions registered by the parent class.
		return super.onKeyPress(event);
	}

	public override mustBeInToplevelMenu(): boolean {
		return true;
	}
}

export default SaveActionWidget;
