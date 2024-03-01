import Editor from '../../Editor';
import Eraser, { EraserMode } from '../../tools/Eraser';
import { EditorEventType } from '../../types';
import { toolbarCSSPrefix } from '../constants';
import { ToolbarLocalization } from '../localization';
import BaseToolWidget from './BaseToolWidget';
import { SavedToolbuttonState } from './BaseWidget';
import makeGridSelector from './components/makeGridSelector';
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

	private makeIconForType(mode: EraserMode) {
		if (mode === EraserMode.FullStroke) {
			return this.editor.icons.makeEraserIcon(this.tool.getThickness());
		} else if (mode === EraserMode.PartialStroke) {
			return this.editor.icons.makeCloseIcon();//this.tool.getThickness());
		} else {
			const exhaustivenessCheck: never = mode;
			return exhaustivenessCheck;
		}
	}

	protected createIcon(): Element {
		return this.makeIconForType(this.tool.getModeValue().get());
	}

	private makeEraserTypeSelector() {
		const eraserTypeChoices = [ EraserMode.FullStroke, EraserMode.PartialStroke ].map(mode => ({
			id: mode,
			makeIcon: () => this.makeIconForType(mode),
			title: mode === EraserMode.FullStroke ? this.localizationTable.fullStrokeEraser : this.localizationTable.partialStrokeEraser,
		}));
		const selector = makeGridSelector(
			this.localizationTable.eraserType,
			this.tool.getModeValue().get(),
			eraserTypeChoices,
		);
		selector.value.onUpdate(value => {
			this.tool.getModeValue().set(value);
		});

		return {
			addTo: (parent: HTMLElement) => {
				selector.addTo(parent);
			},
			setValue: (value: EraserMode) => {
				selector.value.set(value);
			},
		};
	}

	protected override fillDropdown(dropdown: HTMLElement): boolean {
		const container = document.createElement('div');

		container.classList.add(`${toolbarCSSPrefix}spacedList`, `${toolbarCSSPrefix}nonbutton-controls-main-list`);

		const thicknessSlider = makeThicknessSlider(this.editor, thickness => {
			this.tool.setThickness(thickness);
		});
		thicknessSlider.setBounds(10, 55);

		const modeSelector = this.makeEraserTypeSelector();

		this.updateInputs = () => {
			thicknessSlider.setValue(this.tool.getThickness());
			modeSelector.setValue(this.tool.getModeValue().get());
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
