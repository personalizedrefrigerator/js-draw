import Color4 from '../Color4';
import Editor from '../Editor';
import PipetteTool from '../tools/PipetteTool';
import { ToolType } from '../tools/ToolController';
import { EditorEventType } from '../types';
import { makePipetteIcon } from './icons';

type OnColorChangeListener = (color: Color4)=>void;


// Returns [ input, container ].
export const makeColorInput = (editor: Editor, onColorChange: OnColorChangeListener): [ HTMLInputElement, HTMLElement ] => {
	const colorInputContainer = document.createElement('span');
	const colorInput = document.createElement('input');

	colorInput.type = 'button';
	colorInput.classList.add('coloris_input');
	colorInputContainer.classList.add('color-input-container');

	colorInputContainer.appendChild(colorInput);
	addPipetteTool(editor, colorInputContainer, (color: Color4) => {
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
	});
	colorInput.addEventListener('close', () => {
		editor.notifier.dispatch(EditorEventType.ColorPickerToggled, {
			kind: EditorEventType.ColorPickerToggled,
			open: false,
		});
		onInputEnd();
	});

	return [ colorInput, colorInputContainer ];
};

const addPipetteTool = (editor: Editor, container: HTMLElement, onColorChange: OnColorChangeListener) => {
	const pipetteButton = document.createElement('button');
	pipetteButton.classList.add('pipetteButton');
	pipetteButton.title = editor.localization.pickColorFromScreen;
	pipetteButton.setAttribute('alt', pipetteButton.title);

	const updatePipetteIcon = (color?: Color4) => {
		pipetteButton.replaceChildren(makePipetteIcon(color));
	};
	updatePipetteIcon();

	const pipetteTool: PipetteTool|undefined = editor.toolController.getMatchingTools(ToolType.Pipette)[0] as PipetteTool|undefined;
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
};

export default makeColorInput;