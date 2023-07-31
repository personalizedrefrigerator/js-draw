import Editor from '../../Editor';
import { Mat33 } from '@js-draw/math';
import PanZoom, { PanZoomMode } from '../../tools/PanZoom';
import ToolController from '../../tools/ToolController';
import { EditorEventType } from '../../types';
import Viewport from '../../Viewport';
import { toolbarCSSPrefix } from '../HTMLToolbar';
import { ToolbarLocalization } from '../localization';
import BaseToolWidget from './BaseToolWidget';
import BaseWidget, { SavedToolbuttonState } from './BaseWidget';

const makeZoomControl = (localizationTable: ToolbarLocalization, editor: Editor) => {
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
		zoomBy(5.0/4);
	};

	decreaseButton.onclick = () => {
		zoomBy(4.0/5);
	};

	resetViewButton.onclick = () => {
		editor.dispatch(Viewport.transformBy(
			editor.viewport.canvasToScreenTransform.inverse()
		), true);
	};

	return zoomLevelRow;
};

class ZoomWidget extends BaseWidget {
	public constructor(editor: Editor, localizationTable?: ToolbarLocalization) {
		super(editor, 'zoom-widget', localizationTable);

		// Make it possible to open the dropdown, even if this widget isn't selected.
		this.container.classList.add('dropdownShowable');
	}

	protected getTitle(): string {
		return this.localizationTable.zoom;
	}

	protected createIcon(): Element {
		return this.editor.icons.makeZoomIcon();
	}

	protected handleClick(): void {
		this.setDropdownVisible(!this.isDropdownVisible());
	}

	protected override fillDropdown(dropdown: HTMLElement): boolean {
		dropdown.replaceChildren(makeZoomControl(this.localizationTable, this.editor));
		return true;
	}
}

class HandModeWidget extends BaseWidget {
	public constructor(
		editor: Editor,

		protected tool: PanZoom, protected flag: PanZoomMode, protected makeIcon: ()=> Element,
		private title: string,

		localizationTable?: ToolbarLocalization,
	) {
		super(editor, `pan-mode-${flag}`, localizationTable);

		editor.notifier.on(EditorEventType.ToolUpdated, toolEvt => {
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
}

export default class HandToolWidget extends BaseToolWidget {
	private allowTogglingBaseTool: boolean;

	public constructor(
		editor: Editor,

		// Pan zoom tool that overrides all other tools (enabling this tool for a device
		// causes that device to pan/zoom instead of interact with the primary tools)
		protected overridePanZoomTool: PanZoom,

		localizationTable: ToolbarLocalization,
	) {
		const primaryHandTool = HandToolWidget.getPrimaryHandTool(editor.toolController);
		const tool = primaryHandTool ?? overridePanZoomTool;
		super(editor, tool, 'hand-tool-widget', localizationTable);

		// Only allow toggling a hand tool if we're using the primary hand tool and not the override
		// hand tool for this button.
		this.allowTogglingBaseTool = primaryHandTool !== null;

		// Allow showing/hiding the dropdown, even if `overridePanZoomTool` isn't enabled.
		if (!this.allowTogglingBaseTool) {
			this.container.classList.add('dropdownShowable');
		}

		// Controls for the overriding hand tool.
		const touchPanningWidget = new HandModeWidget(
			editor,

			overridePanZoomTool, PanZoomMode.OneFingerTouchGestures,
			() => this.editor.icons.makeTouchPanningIcon(),

			localizationTable.touchPanning,

			localizationTable,
		);

		const rotationLockWidget = new HandModeWidget(
			editor,

			overridePanZoomTool, PanZoomMode.RotationLocked,
			() => this.editor.icons.makeRotationLockIcon(),

			localizationTable.lockRotation,
			localizationTable,
		);

		this.addSubWidget(touchPanningWidget);
		this.addSubWidget(rotationLockWidget);
		this.addSubWidget(
			new ZoomWidget(editor, localizationTable)
		);
	}

	private static getPrimaryHandTool(toolController: ToolController): PanZoom|null {
		const primaryPanZoomToolList = toolController.getPrimaryTools().filter(tool => tool instanceof PanZoom);
		const primaryPanZoomTool = primaryPanZoomToolList[0];
		return primaryPanZoomTool as PanZoom|null;
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
			this.overridePanZoomTool.setModeEnabled(PanZoomMode.OneFingerTouchGestures, state.touchPanning);
		}

		if (state.rotationLocked !== undefined) {
			this.overridePanZoomTool.setModeEnabled(PanZoomMode.RotationLocked, state.rotationLocked);
		}

		super.deserializeFrom(state);
	}
}