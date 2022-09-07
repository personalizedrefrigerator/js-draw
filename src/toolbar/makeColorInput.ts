import Color4 from '../Color4';
import Editor from '../Editor';
import { EditorEventType } from '../types';

type OnColorChangeListener = (color: Color4)=>void;

export const makeColorInput = (editor: Editor, onColorChange: OnColorChangeListener) => {
	const colorInput = document.createElement('input');
	colorInput.type = 'button';
	colorInput.classList.add('coloris_input');

	let currentColor: Color4|undefined;
	colorInput.oninput = () => {
		currentColor = Color4.fromHex(colorInput.value);
		onColorChange(currentColor);
	};
	colorInput.addEventListener('open', () => {
		editor.notifier.dispatch(EditorEventType.ColorPickerToggled, {
			kind: EditorEventType.ColorPickerToggled,
			open: true,
		});
	});
	colorInput.addEventListener('close', () => {
		editor.notifier.dispatch(EditorEventType.ColorPickerToggled, {
			kind: EditorEventType.ColorPickerToggled,
			open: false,
			color: currentColor,
		});
	});

	return colorInput;
};

export default makeColorInput;