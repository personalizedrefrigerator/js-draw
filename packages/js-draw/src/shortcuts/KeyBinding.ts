
export interface KeyCombination {
	/** A key (e.g. `a`, `b`, `control`). */
	readonly key: string;

	/**
	 * Whether the shift key must be pressed to trigger the shortcut.
	 */
	readonly shiftKey: boolean|undefined;

	/** Whether the control key must be pressed to trigger the shortcut */
	readonly ctrlKey: boolean;

	/** Whether the alt key must be pressed to trigger the shortcut */
	readonly altKey: boolean;

	/** Whether the meta key must be pressed to trigger the shortcut */
	readonly metaKey: boolean;

	/** True if this shortcut/key combination applies for either control or meta. */
	readonly controlOrMeta: boolean;
}

/** Represents a key combination that can trigger a keyboard shortcut. */
export default class KeyBinding implements KeyCombination {
	/** @inheritdoc */
	public readonly key: string;

	/**
	 * If undefined, the state of the shift key is ignored.
	 */
	public readonly shiftKey: boolean|undefined;

	/** @inheritdoc */
	public readonly ctrlKey: boolean;

	/** @inheritdoc */
	public readonly altKey: boolean;

	/** @inheritdoc */
	public readonly metaKey: boolean;

	/** @inheritdoc */
	public readonly controlOrMeta: boolean;

	public constructor(trigger: KeyCombination) {
		this.key = trigger.key;
		this.shiftKey = trigger.shiftKey;
		this.ctrlKey = trigger.ctrlKey;
		this.altKey = trigger.altKey;
		this.metaKey = trigger.metaKey;
		this.controlOrMeta = trigger.controlOrMeta;
	}

	/** Returns true if and only if `keyEvent` should trigger this shortcut. */
	public matchesEvent(keyEvent: Partial<KeyCombination>) {
		const key = keyEvent.key?.toLowerCase();

		// Determine whether the input is an upper case letter or not.
		const isUpperCaseKey = keyEvent.key?.toUpperCase() === keyEvent.key
			&& keyEvent.key?.toLowerCase() !== keyEvent.key
			&& keyEvent.key?.length === 1;

		const ctrlKey = (keyEvent.ctrlKey ?? false) || key === 'control';
		const altKey = (keyEvent.altKey ?? false) || key === 'alt';
		const metaKey = (keyEvent.metaKey ?? false) || key === 'meta';
		const shiftKey =
				(keyEvent.shiftKey ?? isUpperCaseKey) || key === 'shift';
		const keyEventHasCtrlOrMeta =
				keyEvent.controlOrMeta || keyEvent.ctrlKey || keyEvent.metaKey || false;

		// Different keys entirely? They don't match.
		if (this.key.toLowerCase() !== key) {
			return false;
		}

		const shortcutControlOrMeta = this.controlOrMeta;
		// Match ctrl/meta if the shortcut doesn't have controlOrMeta specified
		// (controlOrMeta should match either).
		const ctrlAndMetaMatches =
			ctrlKey === this.ctrlKey
			&& metaKey === this.metaKey
			&& !shortcutControlOrMeta;

		const matches =
			(ctrlAndMetaMatches || (shortcutControlOrMeta && keyEventHasCtrlOrMeta))
			&& altKey === this.altKey
			&& (shiftKey === this.shiftKey || this.shiftKey === undefined);
		return matches;
	}

	/**
	 * Returns a string representation of this shortcut in the same format accepted by
	 * {@link fromString}.
	 */
	public toString() {
		const result = [];

		if (this.ctrlKey && this.key !== 'control') {
			result.push('Ctrl');
		}
		if (this.controlOrMeta) {
			result.push('CtrlOrMeta');
		}
		if (this.altKey && this.key !== 'alt') {
			result.push('Alt');
		}
		if (this.metaKey && this.key !== 'meta') {
			result.push('Meta');
		}
		if (this.shiftKey && this.key !== 'shift') {
			result.push('Shift');
		}
		result.push(this.key);

		return result.join('+');
	}

	/**
	 * Accepts a string in the form `modifier1+modifier2+...+key` (e.g. `Ctrl+Shift+a`)
	 * and returns the corresponding `KeyboardShortcut`.
	 */
	public static fromString(shortcutStr: string): KeyBinding {
		const hasNoModifiers = shortcutStr.search(/[-+]/) === -1 || shortcutStr.length === 1;
		if (hasNoModifiers) {
			const key = shortcutStr.toLowerCase();
			const isUpperCaseLetter =
				shortcutStr === shortcutStr.toUpperCase()
				&& shortcutStr !== shortcutStr.toLowerCase()
				&& shortcutStr.length === 1;

			const isLowerCaseLetter =
				shortcutStr !== shortcutStr.toUpperCase()
				&& shortcutStr === shortcutStr.toLowerCase()
				&& shortcutStr.length === 1;

			let shiftKey: boolean|undefined = isUpperCaseLetter;
			// If neither uppercase nor lowercase (or both)
			if (!isLowerCaseLetter && !isUpperCaseLetter) {
				// Use undefined rather than false: Expected behaviour is probably
				// to ignore shift
				shiftKey = undefined;
			}

			// shiftKey should always be true if the key is 'shift'
			if (key === 'shift') {
				shiftKey = true;
			}

			return new KeyBinding({
				key: shortcutStr,
				shiftKey: shiftKey,
				ctrlKey: key === 'control' || key === 'ctrl',
				altKey: key === 'alt',
				metaKey: key === 'meta',
				controlOrMeta: key === 'control or meta' || key === 'ctrlormeta',
			});
		}

		const keyModifiersExp = /^(.*[-+])?(.+)$/g;
		const match = keyModifiersExp.exec(shortcutStr);

		if (!match) {
			throw new Error(`Invalid shortcut expression, ${shortcutStr}!`);
		}

		const key = match[2].toLowerCase(); // TODO: .toLocaleLowerCase()?
		const modifiers = (match[1] ?? '').split(/[-+]/);

		let shiftKey = undefined;
		let ctrlKey = false;
		let altKey = false;
		let metaKey = false;
		let controlOrMeta = false;

		for (const modifier of modifiers) {
			if (modifier === '') {
				continue;
			}

			switch (modifier.toLowerCase()) {
			case 'shift':
				shiftKey = true;
				break;
			case 'noshift':
				shiftKey = false;
				break;
			case 'ctrl':
			case 'control':
				ctrlKey = true;
				break;
			case 'meta':
				metaKey = true;
				break;
			case 'ctrlormeta':
			case 'ctrl or meta':
			case 'controlormeta':
				controlOrMeta = true;
				break;
			case 'alt':
				altKey = true;
				break;
			default:
				throw new Error(`Unknown modifier: "${modifier}" in shortcut ${shortcutStr}.`);
			}
		}

		const shortcut = new KeyBinding({
			key,
			shiftKey,
			ctrlKey,
			altKey,
			metaKey,
			controlOrMeta,
		});
		return shortcut;
	}
}
