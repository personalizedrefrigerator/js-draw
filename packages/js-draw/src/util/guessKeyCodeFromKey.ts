
// See https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_code_values for
// more
const keyToKeyCode: Record<string, string> = {
	'Control': 'ControlLeft',
	'=': 'Equal',
	'-': 'Minus',
	';': 'Semicolon',
	' ': 'Space',
};

/**
 * Attempts to guess the .code value corresponding to the given key.
 *
 * Use this to facilitate testing.
 *
 * If no matching keycode is found, returns `key`.
 */
const guessKeyCodeFromKey = (key: string) => {
	const upperKey = key.toUpperCase();
	if ('A' <= upperKey && upperKey <= 'Z') {
		return `Key${upperKey}`;
	}

	if ('0' <= key && key <= '9') {
		return `Digit${key}`;
	}

	if (key in keyToKeyCode) {
		return keyToKeyCode[key];
	}

	return key;
};

export default guessKeyCodeFromKey;
