import Editor from '../../Editor';
import { Mat33 } from '@js-draw/math';
import PanZoom, { PanZoomMode } from '../../tools/PanZoom';
import ToolController from '../../tools/ToolController';
import { EditorEventType } from '../../types';
import Viewport from '../../Viewport';
import { toolbarCSSPrefix } from '../constants';
import { ToolbarLocalization } from '../localization';
import BaseToolWidget from './BaseToolWidget';
import BaseWidget, { SavedToolbuttonState } from './BaseWidget';
import makeSeparator from './components/makeSeparator';
import HelpDisplay from '../utils/HelpDisplay';

const makeZoomControl = (
	localizationTable: ToolbarLocalization,
	editor: Editor,
	helpDisplay?: HelpDisplay,
) => {
	const zoomLevelRow = document.createElement('div');

	const increaseButton = document.createElement('button');
	const decreaseButton = document.createElement('button');
	const resetViewButton = document.createElement('button');
	const zoomLevelDisplay = document.createElement('span');
	increaseButton.innerText = '+';
	decreaseButton.innerText = '-';
	resetViewButton.innerText = localizationTable.resetView;
	zoomLevelRow.replaceChildren(zoomLevelDisplay, increaseButton, decreaseButton, resetViewButton);

	zoomLevelRow.classList.add(`${toolbarCSSPrefix}zoomLevelEditor`);
	zoomLevelDisplay.classList.add('zoomDisplay');

	let lastZoom: number | undefined;
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

			// Can't reset if already reset.
			resetViewButton.disabled = event.newTransform.eq(Mat33.identity);
		}
	});

	const zoomBy = (factor: number) => {
		const screenCenter = editor.viewport.visibleRect.center;
		const transformUpdate = Mat33.scaling2D(factor, screenCenter);
		editor.dispatch(Viewport.transformBy(transformUpdate), false);
	};

	increaseButton.onclick = () => {
		zoomBy(5.0 / 4);
	};

	decreaseButton.onclick = () => {
		zoomBy(4.0 / 5);
	};

	resetViewButton.onclick = () => {
		const addToHistory = false;
		editor.dispatch(
			Viewport.transformBy(editor.viewport.canvasToScreenTransform.inverse()),
			addToHistory,
		);
	};

	helpDisplay?.registerTextHelpForElement(
		increaseButton,
		localizationTable.handDropdown__zoomInHelpText,
	);
	helpDisplay?.registerTextHelpForElement(
		decreaseButton,
		localizationTable.handDropdown__zoomOutHelpText,
	);
	helpDisplay?.registerTextHelpForElement(
		resetViewButton,
		localizationTable.handDropdown__resetViewHelpText,
	);
	helpDisplay?.registerTextHelpForElement(
		zoomLevelDisplay,
		localizationTable.handDropdown__zoomDisplayHelpText,
	);

	return zoomLevelRow;
};

class HandModeWidget extends BaseWidget {
	public constructor(
		editor: Editor,

		protected tool: PanZoom,
		protected flag: PanZoomMode,
		protected makeIcon: () => Element,
		private title: string,
		private helpText: string,

		localizationTable?: ToolbarLocalization,
	) {
		super(editor, `pan-mode-${flag}`, localizationTable);

		editor.notifier.on(EditorEventType.ToolUpdated, (toolEvt) => {
			if (toolEvt.kind === EditorEventType.ToolUpdated && toolEvt.tool === tool) {
				const allEnabled = !!(tool.getMode() & PanZoomMode.SinglePointerGestures);
				this.setSelected(!!(tool.getMode() & flag) || allEnabled);

				// Unless this widget toggles all single pointer gestures, toggling while
				// single pointer gestures are enabled should have no effect
				this.setDisabled(allEnabled && flag !== PanZoomMode.SinglePointerGestures);
			}
		});
		this.setSelected(false);
	}

	protected override shouldAutoDisableInReadOnlyEditor(): boolean {
		return false;
	}

	private setModeFlag(enabled: boolean) {
		this.tool.setModeEnabled(this.flag, enabled);
	}

	protected handleClick() {
		this.setModeFlag(!this.isSelected());
	}

	protected getTitle(): string {
		return this.title;
	}

	protected createIcon(): Element {
		return this.makeIcon();
	}

	protected override fillDropdown(_dropdown: HTMLElement): boolean {
		return false;
	}

	protected override getHelpText() {
		return this.helpText;
	}
}

/** This toolbar widget allows controlling the editor's {@link PanZoom} tool(s). */
export default class HandToolWidget extends BaseToolWidget {
	private allowTogglingBaseTool: boolean;

	// Pan zoom tool that overrides all other tools (enabling this tool for a device
	// causes that device to pan/zoom instead of interact with the primary tools)
	protected overridePanZoomTool: PanZoom;

	public constructor(
		editor: Editor,
		// Can either be the primary pan/zoom tool (in the primary tools list) or
		// the override pan/zoom tool.
		// If the override pan/zoom tool, the primary will be gotten from the editor's
		// tool controller.
		// If the primary, the override will be gotten from the editor's tool controller.
		tool: PanZoom,
		localizationTable: ToolbarLocalization,
	) {
		const isGivenToolPrimary = editor.toolController.getPrimaryTools().includes(tool);
		const primaryTool =
			(isGivenToolPrimary ? tool : HandToolWidget.getPrimaryHandTool(editor.toolController)) ??
			tool;
		super(editor, primaryTool, 'hand-tool-widget', localizationTable);

		this.overridePanZoomTool =
			(isGivenToolPrimary ? HandToolWidget.getOverrideHandTool(editor.toolController) : tool) ??
			tool;

		// Only allow toggling a hand tool if we're using the primary hand tool and not the override
		// hand tool for this button.
		this.allowTogglingBaseTool = primaryTool !== null;

		// Allow showing/hiding the dropdown, even if `overridePanZoomTool` isn't enabled.
		if (!this.allowTogglingBaseTool) {
			this.container.classList.add('dropdownShowable');
		}

		// Controls for the overriding hand tool.
		const touchPanningWidget = new HandModeWidget(
			editor,

			this.overridePanZoomTool,
			PanZoomMode.OneFingerTouchGestures,
			() => this.editor.icons.makeTouchPanningIcon(),

			localizationTable.touchPanning,
			localizationTable.handDropdown__touchPanningHelpText,

			localizationTable,
		);

		const rotationLockWidget = new HandModeWidget(
			editor,

			this.overridePanZoomTool,
			PanZoomMode.RotationLocked,
			() => this.editor.icons.makeRotationLockIcon(),

			localizationTable.lockRotation,
			localizationTable.handDropdown__lockRotationHelpText,

			localizationTable,
		);

		this.addSubWidget(touchPanningWidget);
		this.addSubWidget(rotationLockWidget);
	}

	private static getPrimaryHandTool(toolController: ToolController): PanZoom | null {
		const primaryPanZoomToolList = toolController
			.getPrimaryTools()
			.filter((tool) => tool instanceof PanZoom);
		const primaryPanZoomTool = primaryPanZoomToolList[0];
		return primaryPanZoomTool as PanZoom | null;
	}

	private static getOverrideHandTool(toolController: ToolController): PanZoom | null {
		const panZoomToolList = toolController.getMatchingTools(PanZoom);
		const panZoomTool = panZoomToolList[0];
		return panZoomTool as PanZoom | null;
	}

	protected override shouldAutoDisableInReadOnlyEditor(): boolean {
		return false;
	}

	protected getTitle(): string {
		return this.localizationTable.handTool;
	}

	protected createIcon(): Element {
		return this.editor.icons.makeHandToolIcon();
	}

	protected override handleClick(): void {
		if (this.allowTogglingBaseTool) {
			super.handleClick();
		} else {
			this.setDropdownVisible(!this.isDropdownVisible());
		}
	}

	protected override getHelpText(): string {
		return this.localizationTable.handDropdown__baseHelpText;
	}

	protected override fillDropdown(dropdown: HTMLElement, helpDisplay?: HelpDisplay): boolean {
		super.fillDropdown(dropdown, helpDisplay);

		// The container for all actions that come after the toolbar buttons.
		const nonbuttonActionContainer = document.createElement('div');
		nonbuttonActionContainer.classList.add(`${toolbarCSSPrefix}nonbutton-controls-main-list`);

		makeSeparator().addTo(nonbuttonActionContainer);

		const zoomControl = makeZoomControl(this.localizationTable, this.editor, helpDisplay);
		nonbuttonActionContainer.appendChild(zoomControl);
		dropdown.appendChild(nonbuttonActionContainer);

		return true;
	}

	public override setSelected(selected: boolean): void {
		if (this.allowTogglingBaseTool) {
			super.setSelected(selected);
		}
	}

	public override serializeState(): SavedToolbuttonState {
		const toolMode = this.overridePanZoomTool.getMode();

		return {
			...super.serializeState(),
			touchPanning: toolMode & PanZoomMode.OneFingerTouchGestures,
			rotationLocked: toolMode & PanZoomMode.RotationLocked,
		};
	}

	public override deserializeFrom(state: SavedToolbuttonState): void {
		if (state.touchPanning !== undefined) {
			this.overridePanZoomTool.setModeEnabled(
				PanZoomMode.OneFingerTouchGestures,
				!!state.touchPanning,
			);
		}

		if (state.rotationLocked !== undefined) {
			this.overridePanZoomTool.setModeEnabled(PanZoomMode.RotationLocked, !!state.rotationLocked);
		}

		super.deserializeFrom(state);
	}
}
