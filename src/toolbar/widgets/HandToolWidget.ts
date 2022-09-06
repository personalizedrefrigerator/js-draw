import Editor from '../../Editor';
import Mat33 from '../../geometry/Mat33';
import PanZoom, { PanZoomMode } from '../../tools/PanZoom';
import { EditorEventType } from '../../types';
import Viewport from '../../Viewport';
import { toolbarCSSPrefix } from '../HTMLToolbar';
import { makeHandToolIcon } from '../icons';
import { ToolbarLocalization } from '../localization';
import BaseToolbarWidget from './BaseToolbarWidget';

const makeZoomControl = (localizationTable: ToolbarLocalization, editor: Editor) => {
	const zoomLevelRow = document.createElement('div');

	const increaseButton = document.createElement('button');
	const decreaseButton = document.createElement('button');
	const zoomLevelDisplay = document.createElement('span');
	increaseButton.innerText = '+';
	decreaseButton.innerText = '-';
	zoomLevelRow.replaceChildren(zoomLevelDisplay, increaseButton, decreaseButton);

	zoomLevelRow.classList.add(`${toolbarCSSPrefix}zoomLevelEditor`);
	zoomLevelDisplay.classList.add('zoomDisplay');

	let lastZoom: number|undefined;
	const updateZoomDisplay = () => {
		let zoomLevel = editor.viewport.getScaleFactor() * 100;

		if (zoomLevel > 0.1) {
			zoomLevel = Math.round(zoomLevel * 10) / 10;
		} else {
			zoomLevel = Math.round(zoomLevel * 1000) / 1000;
		}

		if (zoomLevel !== lastZoom) {
			zoomLevelDisplay.innerText = localizationTable.zoomLevel(zoomLevel);
			lastZoom = zoomLevel;
		}
	};
	updateZoomDisplay();

	editor.notifier.on(EditorEventType.ViewportChanged, (event) => {
		if (event.kind === EditorEventType.ViewportChanged) {
			updateZoomDisplay();
		}
	});

	const zoomBy = (factor: number) => {
		const screenCenter = editor.viewport.visibleRect.center;
		const transformUpdate = Mat33.scaling2D(factor, screenCenter);
		editor.dispatch(new Viewport.ViewportTransform(transformUpdate), false);
	};

	increaseButton.onclick = () => {
		zoomBy(5.0/4);
	};

	decreaseButton.onclick = () => {
		zoomBy(4.0/5);
	};

	return zoomLevelRow;
};

export default class HandToolWidget extends BaseToolbarWidget {
	public constructor(
		editor: Editor, protected tool: PanZoom, localizationTable: ToolbarLocalization
	) {
		super(editor, tool, localizationTable);
		this.container.classList.add('dropdownShowable');
	}

	protected getTitle(): string {
		return this.localizationTable.handTool;
	}

	protected createIcon(): Element {
		return makeHandToolIcon();
	}

	protected fillDropdown(dropdown: HTMLElement): boolean {
		type OnToggle = (checked: boolean)=>void;
		let idCounter = 0;
		const addCheckbox = (label: string, onToggle: OnToggle) => {
			const rowContainer = document.createElement('div');
			const labelElem = document.createElement('label');
			const checkboxElem = document.createElement('input');

			checkboxElem.type = 'checkbox';
			checkboxElem.id = `${toolbarCSSPrefix}hand-tool-option-${idCounter++}`;
			labelElem.setAttribute('for', checkboxElem.id);

			checkboxElem.oninput = () => {
				onToggle(checkboxElem.checked);
			};
			labelElem.innerText = label;

			rowContainer.replaceChildren(checkboxElem, labelElem);
			dropdown.appendChild(rowContainer);

			return checkboxElem;
		};

		const setModeFlag = (enabled: boolean, flag: PanZoomMode) => {
			const mode = this.tool.getMode();
			if (enabled) {
				this.tool.setMode(mode | flag);
			} else {
				this.tool.setMode(mode & ~flag);
			}
		};

		const touchPanningCheckbox = addCheckbox(this.localizationTable.touchPanning, checked => {
			setModeFlag(checked, PanZoomMode.OneFingerTouchGestures);
		});

		const anyDevicePanningCheckbox = addCheckbox(this.localizationTable.anyDevicePanning, checked => {
			setModeFlag(checked, PanZoomMode.SinglePointerGestures);
		});

		dropdown.appendChild(makeZoomControl(this.localizationTable, this.editor));

		const updateInputs = () => {
			const mode = this.tool.getMode();
			anyDevicePanningCheckbox.checked = !!(mode & PanZoomMode.SinglePointerGestures);
			if (anyDevicePanningCheckbox.checked) {
				touchPanningCheckbox.checked = true;
				touchPanningCheckbox.disabled = true;
			} else {
				touchPanningCheckbox.checked = !!(mode & PanZoomMode.OneFingerTouchGestures);
				touchPanningCheckbox.disabled = false;
			}
		};

		updateInputs();
		this.editor.notifier.on(EditorEventType.ToolUpdated, event => {
			if (event.kind === EditorEventType.ToolUpdated && event.tool === this.tool) {
				updateInputs();
			}
		});

		return true;
	}

	protected updateSelected(_active: boolean) {
	}

	protected handleClick() {
		this.setDropdownVisible(!this.isDropdownVisible());
	}
}