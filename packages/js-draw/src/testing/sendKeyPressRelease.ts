import type Editor from '../Editor';
import { InputEvtType } from '../inputEvents';

const sendKeyPressRelease = (editor: Editor, key: string) => {
	editor.sendKeyboardEvent(InputEvtType.KeyPressEvent, key);
	editor.sendKeyboardEvent(InputEvtType.KeyUpEvent, key);
};

export default sendKeyPressRelease;