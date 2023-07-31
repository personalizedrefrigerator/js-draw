import { mapReactiveValue, reactiveValueFromImmutable, reactiveValueFromInitialValue } from 'js-draw/src/util/ReactiveValue';
import { BaseToolbarLocalization } from '../localization';
import { MenuButtonSpec, ToolButtonSpec, ToolbarSpec, ToolbarWidgetSpec, ToolbarWidgetType } from '../types';
import { PenTool, EraserTool, SelectionTool, TextTool, PanZoomTool } from '../../../tools/lib';
import Editor from '../../../Editor';
import makeToolButtonSpecification from './makeToolButtonSpecification';
import makePenToolSpecification from './makePenToolSpecification';
import { IconSpec, IconType } from '../icon';

export interface ToolbarContext {
	localization: BaseToolbarLocalization,
}

export const makeEraserToolSpecification = (
	tool: EraserTool, _context: ToolbarContext
): ToolButtonSpec => {
	const thicknessValue = tool.getThicknessValue();
	const icon = mapReactiveValue(thicknessValue, value => {
		const result: IconSpec = {
			kind: IconType.Eraser,
			eraserThickness: value,
		};
		return result;
	});
	const menu: ToolbarWidgetSpec[] = [];

	return makeToolButtonSpecification(tool, icon, [ 'eraser' ], menu);
};

export const makeSelectionToolSpecification = (
	tool: SelectionTool, _context: ToolbarContext
): ToolButtonSpec => {
	const icon = reactiveValueFromImmutable({ kind: IconType.Selection });
	const menu: ToolbarWidgetSpec[] = [];

	return makeToolButtonSpecification(tool, icon, [ 'select' ], menu);
};

export const makeTextToolSpecification = (
	tool: TextTool, _context: ToolbarContext,
): ToolButtonSpec => {
	const styleValue = tool.getStyleValue();
	const icon = mapReactiveValue(styleValue, style => {
		return {
			kind: IconType.TextTool,
			textStyle: style,
		};
	});
	const menu: ToolbarWidgetSpec[] = [];

	return makeToolButtonSpecification(tool, icon, [ 'text' ], menu);
};

export const makePanZoomToolSpecification = (
	tool: PanZoomTool, _context: ToolbarContext,
): ToolButtonSpec => {
	const icon = reactiveValueFromImmutable({ kind: IconType.HandTool });
	const menu: ToolbarWidgetSpec[] = [];

	return makeToolButtonSpecification(tool, icon, [ 'pan-zoom', 'hand' ], menu);
};

export const makeInsertImageSpecification = (
	editor: Editor, context: ToolbarContext,
): ToolbarWidgetSpec => {
	const menuOpen = reactiveValueFromInitialValue(false);
	const menuItems = reactiveValueFromImmutable([

	]);

	const widget: MenuButtonSpec = {
		kind: ToolbarWidgetType.MenuButton,
		label: {
			icon: reactiveValueFromImmutable({ kind: IconType.ImageTool }),
			title: context.localization.image,
		},
		menu: {
			open: menuOpen,
			items: menuItems,
		},
	};

	return widget;
};

/**
 * Returns the default toolbar specification from the given tool controller.
 */
export const makeDefaultToolbarSpecification = (
	editor: Editor, localization: BaseToolbarLocalization,
): ToolbarSpec => {
	const toolbarSpec: ToolbarWidgetSpec[] = [];

	const context: ToolbarContext = {
		localization,
	};
	const toolController = editor.toolController;

	for (const tool of toolController.getMatchingTools(PenTool)) {
		toolbarSpec.push(makePenToolSpecification(tool, context));
	}

	for (const tool of toolController.getMatchingTools(EraserTool)) {
		toolbarSpec.push(makeEraserToolSpecification(tool, context));
	}

	for (const tool of toolController.getMatchingTools(SelectionTool)) {
		toolbarSpec.push(makeSelectionToolSpecification(tool, context));
	}

	for (const tool of toolController.getMatchingTools(TextTool)) {
		toolbarSpec.push(makeTextToolSpecification(tool, context));
	}

	const panZoomTool = toolController.getMatchingTools(PanZoomTool)[0];
	if (panZoomTool) {
		toolbarSpec.push(makePanZoomToolSpecification(panZoomTool, context));
	}

	//this.addWidget(new InsertImageWidget(this.editor, this.localizationTable));
	//this.addWidget(new DocumentPropertiesWidget(this.editor, this.localizationTable));
	//this.addUndoRedoButtons();

	return {
		items: reactiveValueFromImmutable(toolbarSpec),
	};
};

