import Color4 from '../Color4';
import Editor from '../Editor';
import PipetteTool from '../tools/PipetteTool';
import { EditorEventType } from '../types';

type OnColorChangeListener = (color: Color4)=>void;
type SetColorCallback = (color: Color4|string) => void;

// Returns [ color input, input container, callback to change the color value ].
export const makeColorInput = (
	editor: Editor, onColorChange: OnColorChangeListener
): [ HTMLInputElement, HTMLElement, SetColorCallback ] => {

	const colorInputContainer = document.createElement('span');
	const colorInput = document.createElement('input');

	colorInput.type = 'button';
	colorInput.classList.add('coloris_input');
	colorInputContainer.classList.add('color-input-container');

	colorInputContainer.appendChild(colorInput);
	const pipetteController = addPipetteTool(editor, colorInputContainer, (color: Color4) => {
		colorInput.value = color.toHexString();
		onInputEnd();

		// Update the color preview, if it exists (may be managed by Coloris).
		const parentElem = colorInput.parentElement;
		if (parentElem && parentElem.classList.contains('clr-field')) {
			parentElem.style.color = colorInput.value;
		}
	});

	let currentColor: Color4|undefined;
	const handleColorInput = () => {
		currentColor = Color4.fromHex(colorInput.value);
	};

	// Only change the pen color when we finish sending input (this limits the number of
	// editor events triggered and accessibility announcements).
	const onInputEnd = () => {
		handleColorInput();

		if (currentColor) {
			editor.announceForAccessibility(
				editor.localization.colorChangedAnnouncement(currentColor.toHexString())
			);
			onColorChange(currentColor);
			editor.notifier.dispatch(EditorEventType.ColorPickerColorSelected, {
				kind: EditorEventType.ColorPickerColorSelected,
				color: currentColor,
			});
		}
	};

	colorInput.oninput = handleColorInput;
	colorInput.addEventListener('open', () => {
		editor.notifier.dispatch(EditorEventType.ColorPickerToggled, {
			kind: EditorEventType.ColorPickerToggled,
			open: true,
		});
		pipetteController.cancel();

		// Focus the Coloris color picker, if it exists.
		const colorPickerElem: HTMLElement|null = document.querySelector('#clr-picker > #clr-color-value');
		colorPickerElem?.focus();
	});
	colorInput.addEventListener('close', () => {
		editor.notifier.dispatch(EditorEventType.ColorPickerToggled, {
			kind: EditorEventType.ColorPickerToggled,
			open: false,
		});
		onInputEnd();

		// Restore focus to the input that opened the color picker
		colorInput.focus();
	});

	const setColorInputValue = (color: Color4|string) => {
		if (typeof color === 'object') {
			color = color.toHexString();
		}

		colorInput.value = color;

		// Fire all color event listeners. See
		// https://github.com/mdbassit/Coloris#manually-updating-the-thumbnail
		colorInput.dispatchEvent(new Event('input', { bubbles: true }));
	};

	return [ colorInput, colorInputContainer, setColorInputValue ];
};

const addPipetteTool = (editor: Editor, container: HTMLElement, onColorChange: OnColorChangeListener) => {
	const pipetteButton = document.createElement('button');
	pipetteButton.classList.add('pipetteButton');
	pipetteButton.title = editor.localization.pickColorFromScreen;
	pipetteButton.setAttribute('alt', pipetteButton.title);

	const updatePipetteIcon = (color?: Color4) => {
		pipetteButton.replaceChildren(editor.icons.makePipetteIcon(color));
	};
	updatePipetteIcon();

	const pipetteTool: PipetteTool|undefined = editor.toolController.getMatchingTools(PipetteTool)[0];

	const endColorSelectMode = () => {
		pipetteTool?.clearColorListener();
		updatePipetteIcon();
		pipetteButton.classList.remove('active');
	};

	const pipetteColorSelect = (color: Color4|null) => {
		endColorSelectMode();

		if (color) {
			onColorChange(color);
		}
	};

	const pipetteColorPreview = (color: Color4|null) => {
		if (color) {
			updatePipetteIcon(color);
		} else {
			updatePipetteIcon();
		}
	};

	pipetteButton.onclick = () => {
		// If already picking, cancel it.
		if (pipetteButton.classList.contains('active')) {
			endColorSelectMode();
			editor.announceForAccessibility(editor.localization.colorSelectionCanceledAnnouncement);
			return;
		}

		pipetteTool?.setColorListener(
			pipetteColorPreview,
			pipetteColorSelect,
		);

		if (pipetteTool) {
			pipetteButton.classList.add('active');
			editor.announceForAccessibility(editor.localization.clickToPickColorAnnouncement);
		}
	};

	container.appendChild(pipetteButton);

	return {
		// Cancel a pipette color selection if one is in progress.
		cancel: () => {
			endColorSelectMode();
		},
	};
};

export default makeColorInput;