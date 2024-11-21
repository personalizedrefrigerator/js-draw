import Editor from '../../Editor';
import { PenTool } from '../../tools/lib';
import createEditor from '../../testing/createEditor';
import { makeDropdownToolbar } from '../DropdownToolbar';
import PenToolWidget, { PenTypeRecord } from './PenToolWidget';
import findNodeWithText from '../../testing/findNodeWithText';

// Exposes protected methods for testing
class TestPenToolWidget extends PenToolWidget {
	public getDropdownVisible() {
		return this.isDropdownVisible();
	}
	public toggleDropdownVisible() {
		this.setDropdownVisible(!this.getDropdownVisible());
	}
}

const addAndOpenTestWidget = (editor: Editor) => {
	const toolbar = makeDropdownToolbar(editor);

	const pen = editor.toolController.getMatchingTools(PenTool)[0];
	const toolWidget = new TestPenToolWidget(editor, pen);
	toolbar.addWidget(toolWidget);

	toolWidget.toggleDropdownVisible();
	expect(toolWidget.getDropdownVisible()).toBe(true);
};

describe('PenToolWidget', () => {
	test.each([
		{
			filter: (p: PenTypeRecord) => p.id === 'pressure-sensitive-pen',
			shouldFind: ['Flat'],
			shouldNotFind: ['Line', 'Outlined circle', 'Polyline'],
		},
		{
			filter: (p: PenTypeRecord) => p.id !== 'pressure-sensitive-pen',
			shouldFind: ['Line', 'Outlined circle', 'Polyline'],
			shouldNotFind: ['Flat'],
		},
	])(
		'should support hiding pen types with filterPenTypes (case %#)',
		({ filter, shouldFind, shouldNotFind }) => {
			const editor = createEditor({
				pens: {
					filterPenTypes: filter,
				},
			});
			addAndOpenTestWidget(editor);

			const opionExists = (name: string) => {
				return !!document.querySelector(`.toolbar-grid-selector *[title=${JSON.stringify(name)}]`);
			};

			for (const expected of shouldFind) {
				expect(opionExists(expected)).toBe(true);
			}
			for (const unexpected of shouldNotFind) {
				expect(opionExists(unexpected)).toBe(false);
			}

			editor.remove();
		},
	);

	test.each([true, false])(
		'if there are no shape pens, the shape type selector should be invisible (or vice versa) (where mustBeShapeBuilder = %j)',
		(mustBeShapeBuilder) => {
			const editor = createEditor({
				pens: {
					filterPenTypes: (penType) => !!penType.isShapeBuilder === mustBeShapeBuilder,
				},
			});
			addAndOpenTestWidget(editor);

			expect(!!findNodeWithText('Pen type', editor.getRootElement(), { tag: 'label' })).toBe(
				!mustBeShapeBuilder,
			);
			expect(!!findNodeWithText('Shape', editor.getRootElement(), { tag: 'label' })).toBe(
				mustBeShapeBuilder,
			);
		},
	);
});
