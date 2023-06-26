// Displays a find dialog that allows the user to search for and focus text.
//
// @packageDocumentation

import Editor from '../Editor';
import TextComponent from '../components/TextComponent';
import Rect2 from '../math/shapes/Rect2';
import { KeyPressEvent } from '../types';
import BaseTool from './BaseTool';
import { toggleFindVisibleShortcutId } from './keybindings';

const cssPrefix = 'find-tool';

export default class FindTool extends BaseTool {
	private overlay: HTMLElement;
	private searchInput: HTMLInputElement;
	private currentMatchIdx: number = 0;

	public constructor(private editor: Editor) {
		super(editor.notifier, editor.localization.findLabel);

		this.overlay = document.createElement('div');
		this.fillOverlay();
		editor.createHTMLOverlay(this.overlay);

		this.overlay.style.display = 'none';
		this.overlay.classList.add(`${cssPrefix}-overlay`);
	}

	private getMatches(searchFor: string): Rect2[] {
		searchFor = searchFor.toLocaleLowerCase();
		const allTextComponents = this.editor.image.getAllElements()
			.filter(
				elem => elem instanceof TextComponent
			) as TextComponent[];

		const matches = allTextComponents.filter(
			text => text.getText().toLocaleLowerCase().indexOf(searchFor) !== -1
		);

		return matches.map(match => match.getBBox());
	}

	private focusCurrentMatch() {
		const matches = this.getMatches(this.searchInput.value);
		let matchIdx = this.currentMatchIdx % matches.length;

		if (matchIdx < 0) {
			matchIdx = matches.length + matchIdx;
		}

		if (matchIdx < matches.length) {
			const undoable = false;
			this.editor.dispatch(this.editor.viewport.zoomTo(matches[matchIdx], true, true), undoable);
			this.editor.announceForAccessibility(
				this.editor.localization.focusedFoundText(matchIdx + 1, matches.length)
			);
		}
	}

	private toNextMatch() {
		this.currentMatchIdx ++;
		this.focusCurrentMatch();
	}

	private toPrevMatch() {
		this.currentMatchIdx --;
		this.focusCurrentMatch();
	}

	private fillOverlay() {
		const label = document.createElement('label');
		this.searchInput = document.createElement('input');
		const nextBtn = document.createElement('button');
		const closeBtn = document.createElement('button');

		// Math.random() ensures that the ID is unique (to allow us to refer to it
		// with an htmlFor).
		this.searchInput.setAttribute('id', `${cssPrefix}-searchInput-${Math.random()}`);
		label.htmlFor = this.searchInput.getAttribute('id')!;

		label.innerText = this.editor.localization.findLabel;
		nextBtn.innerText = this.editor.localization.toNextMatch;
		closeBtn.innerText = this.editor.localization.closeFindDialog;

		this.searchInput.onkeydown = (ev: KeyboardEvent) => {
			if (ev.key === 'Enter') {
				if (ev.shiftKey) {
					this.toPrevMatch();
				} else {
					this.toNextMatch();
				}
			}
			else if (ev.key === 'Escape') {
				this.setVisible(false);
			}
			else if (this.editor.shortcuts.matchesShortcut(toggleFindVisibleShortcutId, ev)) {
				ev.preventDefault();
				this.toggleVisible();
			}
		};

		nextBtn.onclick = () => {
			this.toNextMatch();
		};

		closeBtn.onclick = () => {
			this.setVisible(false);
		};

		this.overlay.replaceChildren(label, this.searchInput, nextBtn, closeBtn);
	}

	private isVisible() {
		return this.overlay.style.display !== 'none';
	}

	private setVisible(visible: boolean) {
		if (visible !== this.isVisible()) {
			this.overlay.style.display = visible ? 'block' : 'none';

			if (visible) {
				this.searchInput.focus();
				this.editor.announceForAccessibility(this.editor.localization.findDialogShown);
			} else {
				this.editor.focus();
				this.editor.announceForAccessibility(this.editor.localization.findDialogHidden);
			}
		}
	}

	private toggleVisible() {
		this.setVisible(!this.isVisible());
	}

	public override onKeyPress(event: KeyPressEvent): boolean {
		if (this.editor.shortcuts.matchesShortcut(toggleFindVisibleShortcutId, event)) {
			this.toggleVisible();

			return true;
		}

		return false;
	}

	public override setEnabled(enabled: boolean) {
		super.setEnabled(enabled);

		if (enabled) {
			this.setVisible(false);
		}
	}
}
