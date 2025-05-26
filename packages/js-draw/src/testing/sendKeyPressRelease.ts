import Editor from '../Editor';
import { InputEvtType } from '../inputEvents';
import guessKeyCodeFromKey from '../util/guessKeyCodeFromKey';

const sendKeyPressRelease = (target: Editor | HTMLElement, key: string) => {
	if (target instanceof Editor) {
		target.sendKeyboardEvent(InputEvtType.KeyPressEvent, key);
		target.sendKeyboardEvent(InputEvtType.KeyUpEvent, key);
	} else {
		const code = guessKeyCodeFromKey(key);
		target.dispatchEvent(new KeyboardEvent('keydown', { key, code }));
		target.dispatchEvent(new KeyboardEvent('keyup', { key, code }));
	}
};

export default sendKeyPressRelease;
