import HelpDisplay from '../../utils/HelpDisplay';
import { isRestylableComponent } from '../../../components/RestylableComponent';
import { Color4 } from '@js-draw/math';
import Editor from '../../../Editor';
import uniteCommands from '../../../commands/uniteCommands';
import SelectionTool from '../../../tools/SelectionTool/SelectionTool';
import { ToolbarLocalization } from '../../localization';
import makeColorInput from '../components/makeColorInput';
import { toolbarCSSPrefix } from '../../constants';

const makeFormatMenu = (
	editor: Editor,
	selectionTool: SelectionTool,
	localizationTable: ToolbarLocalization,
) => {
	const container = document.createElement('div');
	container.classList.add(
		'selection-format-menu', `${toolbarCSSPrefix}spacedList`, `${toolbarCSSPrefix}indentedList`
	);

	const colorRow = document.createElement('div');
	const colorLabel = document.createElement('label');
	const colorInputControl = makeColorInput(editor, color => {
		const selection = selectionTool.getSelection();

		if (selection) {
			const updateStyleCommands = [];

			for (const elem of selection.getSelectedObjects()) {
				if (isRestylableComponent(elem)) {
					updateStyleCommands.push(elem.updateStyle({ color }));
				}
			}

			const unitedCommand = uniteCommands(updateStyleCommands);
			editor.dispatch(unitedCommand);
		}
	});
	const { input: colorInput, container: colorInputContainer } = colorInputControl;

	colorLabel.innerText = localizationTable.colorLabel;

	const update = () => {
		const selection = selectionTool.getSelection();
		if (selection && selection.getSelectedItemCount() > 0) {
			colorInput.disabled = false;
			container.classList.remove('disabled');

			const colors = [];
			for (const elem of selection.getSelectedObjects()) {
				if (isRestylableComponent(elem)) {
					const color = elem.getStyle().color;
					if (color) {
						colors.push(color);
					}
				}
			}
			colorInputControl.setValue(Color4.average(colors));
		} else {
			colorInput.disabled = true;
			container.classList.add('disabled');
			colorInputControl.setValue(Color4.transparent);
		}
	};

	colorRow.replaceChildren(colorLabel, colorInputContainer);
	container.replaceChildren(colorRow);

	return {
		addTo: (parent: HTMLElement) => {
			parent.appendChild(container);
		},
		update,
		registerHelpText: (helpDisplay: HelpDisplay) => {
			helpDisplay.registerTextHelpForElement(colorRow, localizationTable.selectionDropdown__changeColorHelpText);
			colorInputControl.registerWithHelpTextDisplay(helpDisplay);
		},
	};
};

export default makeFormatMenu;