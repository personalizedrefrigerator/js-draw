import Editor from '../../Editor';
import Eraser from '../../tools/Eraser';
import { EditorEventType } from '../../types';
import { toolbarCSSPrefix } from '../HTMLToolbar';
import { ToolbarLocalization } from '../localization';
import BaseToolWidget from './BaseToolWidget';
import { SavedToolbuttonState } from './BaseWidget';

export default class EraserToolWidget extends BaseToolWidget {
	private thicknessInput: HTMLInputElement|null = null;
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

	private updateInputs() {
		if (this.thicknessInput) {
			this.thicknessInput.value = `${this.tool.getThickness()}`;
		}
	}

	private static nextThicknessInputId = 0;

	protected override fillDropdown(dropdown: HTMLElement): boolean {
		const thicknessLabel = document.createElement('label');
		this.thicknessInput = document.createElement('input');

		this.thicknessInput.type = 'range';
		this.thicknessInput.min = '4';
		this.thicknessInput.max = '40';
		this.thicknessInput.oninput = () => {
			this.tool.setThickness(parseFloat(this.thicknessInput!.value));
		};
		this.thicknessInput.id = `${toolbarCSSPrefix}eraserThicknessInput${EraserToolWidget.nextThicknessInputId++}`;

		thicknessLabel.innerText = this.localizationTable.thicknessLabel;
		thicknessLabel.htmlFor = this.thicknessInput.id;

		this.updateInputs();
		dropdown.replaceChildren(thicknessLabel, this.thicknessInput);
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
