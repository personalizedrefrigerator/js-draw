// Allows the toolbar to register keyboard events.
// @packageDocumentation

import Editor from '../Editor';
import { KeyPressEvent } from '../types';
import BaseTool from './BaseTool';

// Returns true if the event was handled, false otherwise.
type KeyPressListener = (event: KeyPressEvent)=>boolean;

export default class ToolbarShortcutHandler extends BaseTool {
	private listeners: Set<KeyPressListener> = new Set([]);
	public constructor(editor: Editor) {
		super(editor.notifier, editor.localization.changeTool);
	}

	public registerListener(listener: KeyPressListener) {
		this.listeners.add(listener);
	}

	public removeListener(listener: KeyPressListener) {
		this.listeners.delete(listener);
	}

	public override onKeyPress(event: KeyPressEvent): boolean {
		// TypeScript seems to automatically convert for of loops into for(init;check;update)
		// loops (even with target set to es6). Thus, we cannot iterate directly through the
		// set here.
		// See https://stackoverflow.com/q/48886500
		const listeners = Array.from(this.listeners.values());
		for (const listener of listeners) {
			if (listener(event)) {
				return true;
			}
		}

		return false;
	}
}