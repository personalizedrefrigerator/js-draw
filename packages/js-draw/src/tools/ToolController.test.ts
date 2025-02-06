import Editor, {
	Color4,
	InputEvtType,
	Vec2,
	makeOutlinedCircleBuilder,
	sendPenEvent,
} from '../lib';
import createEditor from '../testing/createEditor';
import { EraserTool, PenStyle, PenTool, TextTool } from './lib';

const tryToDraw = (editor: Editor) => {
	sendPenEvent(editor, InputEvtType.PointerDownEvt, Vec2.zero);
	sendPenEvent(editor, InputEvtType.PointerMoveEvt, Vec2.of(10, 10));
	sendPenEvent(editor, InputEvtType.PointerUpEvt, Vec2.of(10, 10));
};

describe('ToolController', () => {
	it('should support removing tools', () => {
		const editor = createEditor();
		const toolController = editor.toolController;

		// Should initially have no elements
		expect(editor.image.getAllComponents()).toHaveLength(0);

		tryToDraw(editor);

		// Drawing should add an element
		expect(editor.image.getAllComponents()).toHaveLength(1);

		// Remove all pen tools
		const penTools = toolController.getMatchingTools(PenTool);
		expect(penTools).toHaveLength(3);

		// First pen should have a tool group (be a primary tool)
		expect(penTools[0].getToolGroup()).not.toBeFalsy();

		toolController.removeAndDestroyTools(penTools);

		// Tools should not be present in the tool controller
		expect(toolController.getMatchingTools(PenTool)).toHaveLength(0);

		// Should still have other tools
		expect(toolController.getMatchingTools(EraserTool).length).toBeGreaterThan(0);
		expect(toolController.getMatchingTools(TextTool).length).toBeGreaterThan(0);

		// First pen should no longer have a tool group
		expect(penTools[0].getToolGroup()).toBeFalsy();

		// Should not be able to draw
		expect(penTools[0].isEnabled()).toBe(true);

		tryToDraw(editor);

		// Drawing should not add an element.
		expect(editor.image.getAllComponents()).toHaveLength(1);
	});

	it('should support inserting new tools', () => {
		const editor = createEditor();
		const toolController = editor.toolController;

		const penStyle: PenStyle = {
			color: Color4.red,
			// Draw circles by default
			factory: jest.fn(makeOutlinedCircleBuilder),
			thickness: 4,
		};

		const newPen = new PenTool(editor, 'My custom pen', penStyle);

		expect(penStyle.factory).not.toHaveBeenCalled();

		const existingPens = toolController.getMatchingTools(PenTool);
		toolController.insertToolsBefore(existingPens[0], [newPen]);

		// Should now be included
		expect(toolController.getMatchingTools(PenTool).includes(newPen)).toBe(true);

		// Should now be 4 pens
		expect(toolController.getMatchingTools(PenTool)).toHaveLength(4);

		// Make the new pen a primary tool
		toolController.addPrimaryTool(newPen);

		// Should only be included once
		expect(toolController.getMatchingTools(PenTool).filter((pen) => pen === newPen)).toHaveLength(
			1,
		);

		// Drawing should trigger the pen
		expect(penStyle.factory).not.toHaveBeenCalled();
		tryToDraw(editor);
		expect(penStyle.factory).toHaveBeenCalled();

		// Enabling one of the default pens should disable the new pen
		expect(newPen.isEnabled()).toBe(true);
		existingPens[1].setEnabled(true);
		expect(newPen.isEnabled()).toBe(false);

		// Calling insertToolsAfter should move the newPen
		expect(toolController.getMatchingTools(PenTool)[0]).toBe(newPen);
		toolController.insertToolsAfter(existingPens[2], [newPen]);
		expect(toolController.getMatchingTools(PenTool)[0]).not.toBe(newPen);
		expect(toolController.getMatchingTools(PenTool)[3]).toBe(newPen);
	});
});
