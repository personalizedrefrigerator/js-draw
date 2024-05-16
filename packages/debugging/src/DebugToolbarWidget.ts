
import { BaseWidget, Editor, EditorImage } from 'js-draw';
import { Localization, getLocalizationTable } from './localization';

export default class DebugToolbarWidget extends BaseWidget {
	private localizations: Localization;

	public constructor(editor: Editor) {
		super(editor, 'custom-pen-widget');
		this.localizations = getLocalizationTable();
		this.container.classList.add('dropdownShowable');
	}

	protected override handleClick() {
		this.setDropdownVisible(!this.isDropdownVisible());
	}

	protected getTitle(): string {
		return this.localizations.debugWidgetTitle;
	}

	protected createIcon(): Element {
		const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		icon.innerHTML = `
			<style>
				.debug-icon path {
					stroke-linecap:round;
					stroke-linejoin:round;
					stroke-width: 48;
					stroke: #ff4e4e;
					fill: none;
				}
			</style>
			<g class="debug-icon">
				<path d="M159,149q37-43 53-45q33-4 46,46q3,10 -11,10q-23,1 -92,3q-18,0 -39,60q-35,101 30,132q69,33 121,1q71-43 37-138q-5-15 -38-52"/>
				<path d="M307,205q14-13 58-47"/>
				<path d="M316,264q22,3 87,13"/>
				<path d="M304,341q70,54 71,54"/>
				<path d="M133,197q-21-3 -85-14"/>
				<path d="M103,267q-38,10 -70,24q-1,0 -1,0"/>
				<path d="M102,333q-50,39 -50,41"/>
				<path d="M167,182q-42,95 -40,122q0,1 40-94q16-37 12-17q-30,164 -18,131q14-39 53-158q11-34 -16,140q-11,69 2,33q15-39 49-160q11-40 -12,167q0,3 11-10q13-15 25-73q1-4 11,11q6,11 -5,51q-1,4 1-15q12-86 -3-94"/>
				<path d="M198,140q10,2 38,9"/>
			</g>
		`;
		icon.setAttribute('width', '32');
		icon.setAttribute('height', '32');
		icon.setAttribute('viewBox', '8 76 419 343');
		return icon;
	}

	private idCounter = 0;
	protected override fillDropdown(dropdown: HTMLElement): boolean {
		const container = document.createElement('div');
		container.classList.add('toolbar-spacedList', 'toolbar-nonbutton-controls-main-list');

		const addLabeledInput = (label: string, input: HTMLInputElement) => {
			const id = `debugwidget-input-${this.idCounter ++}`;

			const newContainer = document.createElement('div');
			const labelElement = document.createElement('label');
			labelElement.htmlFor = id;
			input.id = id;

			labelElement.innerText = label;

			newContainer.replaceChildren(labelElement, input);
			container.appendChild(newContainer);
		};

		const dprInput = document.createElement('input');
		dprInput.type = 'number';
		dprInput.min = '0.1';
		dprInput.max = '10';
		dprInput.oninput = () => {
			this.editor.display.setDevicePixelRatio(parseFloat(dprInput.value));
		};
		dprInput.value = `${window.devicePixelRatio}`;
		addLabeledInput('DPR', dprInput);


		const cacheDebugModeCheckbox = document.createElement('input');
		cacheDebugModeCheckbox.type = 'checkbox';
		cacheDebugModeCheckbox.oninput = () => {
			this.editor.display.getCache().setIsDebugMode(cacheDebugModeCheckbox.checked);
		};
		addLabeledInput('Cache debugging', cacheDebugModeCheckbox);


		const rendererDebugModeCheckbox = document.createElement('input');
		rendererDebugModeCheckbox.type = 'checkbox';
		rendererDebugModeCheckbox.oninput = () => {
			EditorImage.setDebugMode(rendererDebugModeCheckbox.checked);

			// Enabling renderer debugging disables the cache.
			cacheDebugModeCheckbox.disabled = rendererDebugModeCheckbox.checked;
			if (cacheDebugModeCheckbox.checked) {
				cacheDebugModeCheckbox.checked = false;
			}
		};
		addLabeledInput('EditorImage debugging', rendererDebugModeCheckbox);


		const rightToLeftModeCheckbox = document.createElement('input');
		rightToLeftModeCheckbox.type = 'checkbox';
		rightToLeftModeCheckbox.oninput = () => {
			this.editor.getRootElement().style.direction = rightToLeftModeCheckbox.checked ? 'rtl' : 'ltr';
		};
		rightToLeftModeCheckbox.checked = getComputedStyle(this.editor.getRootElement()).direction === 'rtl';
		addLabeledInput('RTL', rightToLeftModeCheckbox);


		dropdown.replaceChildren(container);

		// We filled the dropdown (returning false disables the dropdown)
		return true;
	}
}
