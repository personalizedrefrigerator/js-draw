import Editor from '../../Editor';
import Eraser from '../../tools/Eraser';
import { EditorEventType } from '../../types';
import { toolbarCSSPrefix } from '../constants';
import { ToolbarLocalization } from '../localization';
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

	protected getTitle(): string {
		return this.localizationTable.eraser;
	}

	protected createIcon(): Element {
		return this.editor.icons.makeEraserIcon(this.tool.getThickness());
	}

	protected override fillDropdown(dropdown: HTMLElement): boolean {
		const container = document.createElement('div');

		container.classList.add(`${toolbarCSSPrefix}spacedList`);

		const thicknessSlider = makeThicknessSlider(this.editor, thickness => {
			this.tool.setThickness(thickness);
		});
		thicknessSlider.setBounds(10, 55);

		this.updateInputs = () => {
			thicknessSlider.setValue(this.tool.getThickness());
		};

		this.updateInputs();

		const spacer = document.createElement('div');
		spacer.style.height = '5px';

		container.replaceChildren(thicknessSlider.container, spacer);

		dropdown.replaceChildren(container);
		return true;
	}

	public override serializeState(): SavedToolbuttonState {
		return {
			...super.serializeState(),

			thickness: this.tool.getThickness(),
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
	}
}
