import sendKeyPressRelease from './sendKeyPressRelease';

interface Options {
	clear?: boolean;
}

/** Sets the content of the given `input` or textarea to be `text`. */
const fillInput = (
	input: HTMLInputElement | HTMLTextAreaElement,
	text: string,
	{ clear = false }: Options = {},
) => {
	const dispatchUpdate = () => {
		input.dispatchEvent(new InputEvent('input'));
	};
	if (clear) {
		input.value = '';
		dispatchUpdate();
	}

	for (const character of text.split('')) {
		input.value += character;
		sendKeyPressRelease(input, character);
		dispatchUpdate();
	}
};

export default fillInput;
