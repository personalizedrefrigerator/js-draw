import Editor from '../../Editor';
import Eraser, { EraserMode } from '../../tools/Eraser';
import { EditorEventType } from '../../types';
import { toolbarCSSPrefix } from '../constants';
import { ToolbarLocalization } from '../localization';
import HelpDisplay from '../utils/HelpDisplay';
import BaseToolWidget from './BaseToolWidget';
import { SavedToolbuttonState } from './BaseWidget';
import makeThicknessSlider from './components/makeThicknessSlider';

export default class EraserToolWidget extends BaseToolWidget {
	private updateInputs: ()=>void = () => {};

	public constructor(
		editor: Editor,
		private tool: Eraser,
		localizationTable?: ToolbarLocalization
	) {
		super(editor, tool, 'eraser-tool-widget', localizationTable);

		this.editor.notifier.on(EditorEventType.ToolUpdated, toolEvt => {
			if (toolEvt.kind === EditorEventType.ToolUpdated && toolEvt.tool === this.tool) {
				this.updateInputs();
				this.updateIcon();
			}
		});
	}

	protected override getHelpText(): string {
		return this.localizationTable.eraserDropdown__baseHelpText;
	}

	protected getTitle(): string {
		return this.localizationTable.eraser;
	}

	private makeIconForType(mode: EraserMode) {
		return this.editor.icons.makeEraserIcon(this.tool.getThickness(), mode);
	}

	protected createIcon(): Element {
		return this.makeIconForType(this.tool.getModeValue().get());
	}

	private static idCounter = 0;
	private makeEraserTypeSelector(helpDisplay?: HelpDisplay) {
		const container = document.createElement('div');
		const labelElement = document.createElement('label');
		const checkboxElement = document.createElement('input');

		checkboxElement.id = `${toolbarCSSPrefix}eraserToolWidget-${EraserToolWidget.idCounter++}`;
		labelElement.htmlFor = checkboxElement.id;
		labelElement.innerText = this.localizationTable.fullStrokeEraser;

		checkboxElement.type = 'checkbox';

		checkboxElement.oninput = () => {
			this.tool.getModeValue().set(checkboxElement.checked ? EraserMode.FullStroke : EraserMode.PartialStroke);
		};
		const updateValue = () => {
			checkboxElement.checked = this.tool.getModeValue().get() === EraserMode.FullStroke;
		};

		container.replaceChildren(labelElement, checkboxElement);
		helpDisplay?.registerTextHelpForElement(container, this.localizationTable.eraserDropdown__fullStrokeEraserHelpText);

		return {
			addTo: (parent: HTMLElement) => {
				parent.appendChild(container);
			},
			updateValue,
		};
	}

	protected override fillDropdown(dropdown: HTMLElement, helpDisplay?: HelpDisplay): boolean {
		const container = document.createElement('div');

		container.classList.add(`${toolbarCSSPrefix}spacedList`, `${toolbarCSSPrefix}nonbutton-controls-main-list`);

		const thicknessSlider = makeThicknessSlider(this.editor, thickness => {
			this.tool.setThickness(thickness);
		});
		thicknessSlider.setBounds(10, 55);
		helpDisplay?.registerTextHelpForElement(
			thicknessSlider.container,
			this.localizationTable.eraserDropdown__thicknessHelpText,
		);

		const modeSelector = this.makeEraserTypeSelector(helpDisplay);

		this.updateInputs = () => {
			thicknessSlider.setValue(this.tool.getThickness());
			modeSelector.updateValue();
		};
		this.updateInputs();

		container.replaceChildren(thicknessSlider.container);
		modeSelector.addTo(container);

		dropdown.replaceChildren(container);
		return true;
	}

	public override serializeState(): SavedToolbuttonState {
		return {
			...super.serializeState(),

			thickness: this.tool.getThickness(),
			mode: this.tool.getModeValue().get(),
		};
	}

	public override deserializeFrom(state: SavedToolbuttonState) {
		super.deserializeFrom(state);

		if (state.thickness) {
			const parsedThickness = parseFloat(state.thickness);

			if (typeof parsedThickness !== 'number' || !isFinite(parsedThickness)) {
				throw new Error(
					`Deserializing property ${parsedThickness} is not a number or is not finite.`
				);
			}

			this.tool.setThickness(parsedThickness);
		}

		if (state.mode) {
			const mode = state.mode;
			if (Object.values(EraserMode).includes(mode)) {
				this.tool.getModeValue().set(mode);
			}
		}
	}
}
