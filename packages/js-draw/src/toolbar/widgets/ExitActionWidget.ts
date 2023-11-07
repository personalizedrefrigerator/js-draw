import { KeyPressEvent } from '../../inputEvents';
import Editor from '../../Editor';
import { ToolbarLocalization } from '../localization';
import ActionButtonWidget from './ActionButtonWidget';
import { ToolbarWidgetTag } from './BaseWidget';
import { exitKeyboardShortcut } from './keybindings';
import { ActionButtonIcon } from '../types';

class ExitActionWidget extends ActionButtonWidget {
	public constructor(
		editor: Editor,
		localization: ToolbarLocalization,
		saveCallback: ()=>void,
		labelOverride: Partial<ActionButtonIcon> = {},
	) {
		super(
			editor,
			'exit-button',
			// Creates an icon
			() => {
				return labelOverride.icon ?? editor.icons.makeCloseIcon();
			},
			labelOverride.label ?? localization.exit,
			saveCallback
		);
		this.setTags([ ToolbarWidgetTag.Exit ]);
	}

	protected override shouldAutoDisableInReadOnlyEditor() {
		return false;
	}

	protected override onKeyPress(event: KeyPressEvent): boolean {
		if (this.editor.shortcuts.matchesShortcut(exitKeyboardShortcut, event)) {
			this.clickAction();
			return true;
		}
		return super.onKeyPress(event);
	}

	public override mustBeInToplevelMenu(): boolean {
		return true;
	}
}

export default ExitActionWidget;
