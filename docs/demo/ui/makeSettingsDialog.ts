import { KeyboardShortcutManager, KeyBinding } from 'js-draw';
import { Localization } from '../localization';
import {
	getIsEdgeToolbar,
	isDebugWidgetEnabled,
	loadKeybindingOverrides,
	saveIsDebugWidgetEnabled,
	saveIsEdgeToolbar,
	saveKeybindingOverrides,
} from '../storage/settings';
import './settingsDialog.css';

/**
 * Creates a dialog that allows users to adjust settings (e.g. keybindings)
 * of the editor.
 *
 * Returns a promise that resolves when the dialog closes.
 */
const makeSettingsDialog = (localization: Localization): Promise<void> => {
	const container = document.createElement('dialog');
	container.classList.add('dialog-background');

	const dialog = document.createElement('div');
	dialog.classList.add('dialog');

	const saveButton = document.createElement('button');
	saveButton.innerText = localization.save;
	saveButton.classList.add('settings-save-button');

	const makeKeybindingSettings = () => {
		const keybindingsHeader = document.createElement('h2');
		keybindingsHeader.innerText = localization.keyboardShortcuts;

		const keybindingsContainer = document.createElement('ul');
		const changedShortcuts: Record<string, KeyBinding[]> = {};
		let keybindingInputIdCounter = 0;

		const keybindingOverrides = loadKeybindingOverrides();

		// Adds an input that allows users to specify custom keyboard shortcuts
		const addKeybindingInput = (id: string) => {
			const description =
				KeyboardShortcutManager.getShortcutDescription(id, navigator.languages) ?? id;
			const defaultBindings = KeyboardShortcutManager.getShortcutDefaultKeybindings(id);

			const rowContainer = document.createElement('li');
			rowContainer.style.display = 'flex';

			const resetButton = document.createElement('button');
			resetButton.innerText = localization.reset;
			resetButton.style.display = 'none';

			let currentBindings = defaultBindings;
			if (id in keybindingOverrides) {
				currentBindings = keybindingOverrides[id];
				changedShortcuts[id] = currentBindings;
				resetButton.style.display = 'inline-block';
			}

			const bindingListToString = (bindings: KeyBinding[]) =>
				bindings.map((binding) => binding.toString()).join(', ');
			const defaultBindingsStrings = bindingListToString(defaultBindings);

			const label = document.createElement('label');
			label.innerText = description;

			const input = document.createElement('input');
			input.value = bindingListToString(currentBindings);
			input.setAttribute('id', `keybinding-input-${keybindingInputIdCounter++}`);
			input.style.flexGrow = '1';

			label.htmlFor = input.id;

			const invalidWarning = document.createElement('span');
			invalidWarning.innerText = '⚠';
			invalidWarning.style.display = 'none';

			input.oninput = () => {
				let hadError = false;
				let errorMessage: string | null = null;
				try {
					const bindings = input.value.split(', ').map((binding) => KeyBinding.fromString(binding));

					if (bindingListToString(bindings) !== defaultBindingsStrings) {
						changedShortcuts[id] = bindings;
						resetButton.style.display = 'inline-block';
					} else {
						delete changedShortcuts[id];
						resetButton.style.display = 'none';
					}
				} catch (e) {
					console.warn('invalid input. Error: ', e);
					errorMessage = `${e}`;
					hadError = true;
				}

				if (hadError) {
					input.setAttribute('aria-invalid', 'true');
					invalidWarning.setAttribute(
						'title',
						localization.bindingParseError(errorMessage ?? 'null'),
					);
				}
				invalidWarning.style.display = hadError ? 'inline-block' : 'none';
			};

			resetButton.onclick = () => {
				input.value = defaultBindingsStrings;
				delete changedShortcuts[id];
				resetButton.style.display = 'none';
			};

			rowContainer.replaceChildren(label, input, invalidWarning, resetButton);
			keybindingsContainer.appendChild(rowContainer);
		};

		const keybindingIds = KeyboardShortcutManager.getAllShortcutIds();
		for (const id of keybindingIds) {
			addKeybindingInput(id);
		}

		dialog.appendChild(keybindingsHeader);
		dialog.appendChild(keybindingsContainer);

		const onSave = () => {
			saveKeybindingOverrides(changedShortcuts);
		};
		return onSave;
	};

	const makeCheckboxSection = (
		headerText: string,
		labelText: string,
		initialValue: boolean,
		onSave: (checked: boolean) => void,
	) => {
		const toolbarHeader = document.createElement('h2');
		toolbarHeader.innerText = headerText;

		const row = document.createElement('div');
		const labelElement = document.createElement('label');
		const checkboxElement = document.createElement('input');

		checkboxElement.id = 'toolbar-mode-setting-checkbox';
		labelElement.htmlFor = checkboxElement.id;
		labelElement.innerText = labelText;

		checkboxElement.type = 'checkbox';
		checkboxElement.checked = initialValue;

		row.replaceChildren(labelElement, checkboxElement);

		dialog.appendChild(toolbarHeader);
		dialog.appendChild(row);

		return () => {
			onSave(checkboxElement.checked);
		};
	};

	const makeToolbarSetting = () => {
		return makeCheckboxSection(
			localization.toolbarType,
			localization.useEdgeToolbar,
			getIsEdgeToolbar(),
			(checked) => saveIsEdgeToolbar(checked),
		);
	};

	const makeDebugSetting = () => {
		return makeCheckboxSection(
			localization.debugging,
			localization.enableDebugToolbarWidget,
			isDebugWidgetEnabled(),
			(checked) => saveIsDebugWidgetEnabled(checked),
		);
	};

	const saveKeybindings = makeKeybindingSettings();
	const saveDebugMode = makeDebugSetting();
	const saveToolbarMode = makeToolbarSetting();

	dialog.appendChild(saveButton);
	container.appendChild(dialog);
	document.body.appendChild(container);
	container.show();

	const saveResults = () => {
		saveKeybindings();
		saveDebugMode();
		saveToolbarMode();
	};

	return new Promise<void>((resolve, reject) => {
		saveButton.onclick = () => {
			try {
				saveResults();
				container.remove();
				resolve();
			} catch (error) {
				container.remove();
				// eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
				reject(error);
			}
		};

		container.onclick = (event) => {
			if (event.target === container) {
				container.remove();
				resolve();
			}
		};
	});
};

export default makeSettingsDialog;
