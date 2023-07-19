
export interface KeyCombination {
	/** A key (e.g. `a`, `b`, `control`). */
	readonly key: string;

	/**
	 * The layout-independent name of the key being pressed. For example,
	 * KeyA for the `a` key.
	 */
	readonly code?: string;

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

const isUppercaseLetter = (text: string) => {
	return text.toUpperCase() === text
		&& text.toLowerCase() !== text
		&& text.length === 1;
};

const isLowercaseLetter = (text: string) => {
	return text.toLowerCase() === text
		&& text.toUpperCase() !== text
		&& text.length === 1;
};

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
		const lowercaseKey = keyEvent.key?.toLowerCase();

		// Determine whether the input is an upper case letter or not.
		const isUpperCaseKey = isUppercaseLetter(keyEvent.key ?? '');
		const isLowercaseKey = isLowercaseLetter(keyEvent.key ?? '');

		const ctrlKey = (keyEvent.ctrlKey ?? false) || lowercaseKey === 'control';
		const altKey = (keyEvent.altKey ?? false) || lowercaseKey === 'alt';
		const metaKey = (keyEvent.metaKey ?? false) || lowercaseKey === 'meta';
		const shiftKey =
				(keyEvent.shiftKey ?? isUpperCaseKey) || lowercaseKey === 'shift';
		const keyEventHasCtrlOrMeta =
				keyEvent.controlOrMeta || keyEvent.ctrlKey || keyEvent.metaKey || false;

		// If we're not working with key codes,
		if (this.key !== keyEvent.code) {
			// Different keys entirely? They don't match.
			if (this.key.toLowerCase() !== lowercaseKey) {
				return false;
			}

			// If a case where the ASCII case of the given key might matter,
			// compare.
			if ((isUpperCaseKey || isLowercaseKey) && this.key !== keyEvent.key) {
				// this.shiftKey may be interpreted as allowing this shortcut to be uppercased.
				// If so, try making this.key uppercase and matching the shortcut.
				const uppercaseKeyMatches = this.shiftKey === true && this.key.toUpperCase() === keyEvent.key;
				if (!uppercaseKeyMatches) {
					return false;
				}
			}
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
		const getDefaultModifiers = (key: string) => {
			// Unless a letter, as long as the given key matches, it shouldn't matter whether
			// the shift key is pressed.
			let shiftKey: boolean|undefined = undefined;

			if (isUppercaseLetter(key)) {
				shiftKey = true;
			}
			else if (isLowercaseLetter(key)) {
				shiftKey = false;
			}
			// If not just a single character (e.g. a key code like KeyA), shift must
			// be specified manually.
			else if (key.length > 1) {
				shiftKey = false;
			}

			const lowercaseKey = key.toLowerCase();

			// shiftKey should always be true if the key is 'shift'
			if (lowercaseKey === 'shift') {
				shiftKey = true;
			}

			return {
				shiftKey,
				ctrlKey: lowercaseKey === 'control' || lowercaseKey === 'ctrl',
				altKey: lowercaseKey === 'alt',
				metaKey: lowercaseKey === 'meta',
				controlOrMeta: lowercaseKey === 'control or meta' || lowercaseKey === 'ctrlormeta',
			};
		};

		const hasNoModifiers = shortcutStr.search(/[-+]/) === -1 || shortcutStr.length === 1;
		if (hasNoModifiers) {
			const modifiers = getDefaultModifiers(shortcutStr);

			return new KeyBinding({
				key: shortcutStr,
				...modifiers,
			});
		}

		const keyModifiersExp = /^(.*[-+])?(.+)$/g;
		const match = keyModifiersExp.exec(shortcutStr);

		if (!match) {
			throw new Error(`Invalid shortcut expression, ${shortcutStr}!`);
		}

		const key = match[2];
		const defaultModifiers = getDefaultModifiers(key);
		const modifierStrings = (match[1] ?? '').split(/[-+]/);

		let shiftKey = defaultModifiers.shiftKey;
		let ctrlKey = defaultModifiers.ctrlKey;
		let altKey = defaultModifiers.altKey;
		let metaKey = defaultModifiers.metaKey;
		let controlOrMeta = defaultModifiers.controlOrMeta;

		for (const modifier of modifierStrings) {
			if (modifier === '') {
				continue;
			}

			switch (modifier.toLowerCase()) {
			case 'shift':
				shiftKey = true;
				break;
			case 'anyshift':
				shiftKey = undefined;
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
